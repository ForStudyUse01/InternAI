import { test, expect } from "../fixtures/roles.fixture";
import { FIXTURE_CREDENTIALS } from "../fixtures/roles.fixture";
import type { APIRequestContext, Page } from "@playwright/test";
import { COMPANY_CEO_BASE, COMPANY_HR_BASE } from "../helpers/routes";

const BACKEND_URL = "http://localhost:5000";
const E2E_INTERNSHIP_ROLE = "E2E Fixture Frontend Intern";

// HR's application/internship visibility is scoped to assignedRecruiter ===
// their own user id (company-access.service.js applicationScopeFilter) --
// unlike Owner/CEO, who see the whole company. The fixture internship starts
// unassigned, so HR would otherwise always see an empty pipeline and this
// test would perpetually skip without ever exercising the real action. Owner
// assigns it once via the real endpoint (POST /internships/:id/assign-
// recruiter, which cascades assignedRecruiter onto its Applications too) --
// same shared-fixture, not-reverted convention as the stage move itself
// below (single real backend round trip, no per-test isolation at
// workers:1).
async function assignFixtureInternshipToHr(request: APIRequestContext) {
  const ownerLogin = await request.post(`${BACKEND_URL}/api/auth/company/login`, {
    data: { email: FIXTURE_CREDENTIALS.companyOwner.email, password: FIXTURE_CREDENTIALS.companyOwner.password }
  });
  const ownerBody = await ownerLogin.json();
  const ownerHeaders = { Authorization: `Bearer ${ownerBody.data.accessToken || ownerBody.data.token}` };

  const hrInsightsRes = await request.get(`${BACKEND_URL}/api/company/hr/insights`, { headers: ownerHeaders });
  const hrInsightsBody = await hrInsightsRes.json();
  const hrUser = (hrInsightsBody.data.hrUsers as { id: string; email: string }[]).find(
    (u) => u.email === FIXTURE_CREDENTIALS.companyHr.email
  );
  if (!hrUser) return;

  const internshipsRes = await request.get(`${BACKEND_URL}/api/company/internships`, { headers: ownerHeaders });
  const internshipsBody = await internshipsRes.json();
  const internships = internshipsBody.data.internships || internshipsBody.internships || [];
  const fixtureInternship = internships.find((i: { role: string }) => i.role === E2E_INTERNSHIP_ROLE);
  if (!fixtureInternship) return;

  await request.post(`${BACKEND_URL}/api/company/internships/${fixtureInternship._id}/assign-recruiter`, {
    headers: ownerHeaders,
    data: { recruiterUserId: hrUser.id }
  });
}

// Each kanban card renders its own <select aria-label="Move {name} to
// stage"> (kanban-candidate-card.tsx) -- a reliable non-drag-and-drop way to
// change stage. The select's option values are the kanban COLUMN keys
// (HIRING_PIPELINE_STAGES in hiring-utils.ts), and the backend transition
// graph (applications/services/pipeline.service.js) is strictly one-way:
// backward moves are rejected (the optimistic UI update reverts), and
// everything past the Interview column is terminal -- moving there would
// permanently close the fixture application out for every later run. So find
// a card still in a column with a legal, non-terminal forward move. Shared by
// both the Owner and HR variants below (HR also holds pipeline:update,
// roles.js) so the two tests don't duplicate this lookup.
async function findForwardMovableCandidate(page: Page) {
  const moveSelects = page.locator('select[aria-label^="Move "]');
  // The pipeline data itself loads via a client-side fetch after navigation,
  // so .count() checked immediately after goto() would race that fetch and
  // always read 0 -- wait for the first card (or a real timeout) first.
  await moveSelects.first().waitFor({ state: "visible", timeout: 5000 }).catch(() => undefined);
  const count = await moveSelects.count();
  const FORWARD_TARGET: Record<string, string> = {
    applied: "shortlisted",
    reviewed: "shortlisted",
    shortlisted: "interview"
  };
  for (let i = 0; i < count; i++) {
    const candidate = moveSelects.nth(i);
    const value = await candidate.inputValue();
    if (FORWARD_TARGET[value]) {
      return { select: candidate, target: FORWARD_TARGET[value] };
    }
  }
  return null;
}

test.describe("Company workflow: hiring pipeline stage move", () => {
  test("moving a candidate to a new stage via the per-card selector updates it", async ({ companyOwnerPage }) => {
    await companyOwnerPage.goto(`${COMPANY_CEO_BASE}/hiring/pipeline`);
    // Skips gracefully if this dev DB's E2E Test Company currently has no
    // applications in a movable (non-terminal) stage (re-running
    // backend/scripts/seed-e2e-fixtures.js resets the fixture to "applied").
    const found = await findForwardMovableCandidate(companyOwnerPage);
    test.skip(!found, "No candidate in a forward-movable (non-terminal) stage for E2E Test Company in this dev DB run.");

    await found!.select.selectOption(found!.target);
    await expect(found!.select).toHaveValue(found!.target);
  });

  // HR holds pipeline:update (roles.js PLATFORM_ROLES.HR) same as Owner/CEO --
  // this is HR's own authenticated session performing the mutation, not Owner
  // acting on HR's behalf (contrast withTemporaryHrPermissions in
  // permissions/company-module-gating.spec.ts, where Owner is the actor).
  test("HR moves a candidate to a new stage via the per-card selector", async ({ request, companyHrPage }) => {
    await assignFixtureInternshipToHr(request);
    await companyHrPage.goto(`${COMPANY_HR_BASE}/hiring/pipeline`);
    const found = await findForwardMovableCandidate(companyHrPage);
    test.skip(!found, "No candidate in a forward-movable (non-terminal) stage for E2E Test Company in this dev DB run.");

    await found!.select.selectOption(found!.target);
    await expect(found!.select).toHaveValue(found!.target);
  });
});

test.describe("Company workflow: candidate search", () => {
  test("a nonsense query returns an empty result set, not a crash", async ({ companyOwnerPage }) => {
    await companyOwnerPage.goto(`${COMPANY_CEO_BASE}/matching/search`);
    const searchBox = companyOwnerPage.locator('input[type="search"], input[placeholder*="earch" i]').first();
    await searchBox.waitFor({ state: "visible", timeout: 5000 }).catch(() => undefined);
    test.skip((await searchBox.count()) === 0, "Candidate search input not present for this account/module state.");

    await searchBox.fill("zzzznonexistentcandidatequery9999");
    await companyOwnerPage.waitForTimeout(600); // debounce (350ms in company-dashboard-page.tsx) + settle
    await expect(companyOwnerPage.locator("body")).not.toContainText(/something went wrong/i);
  });
});

test.describe("Company workflow: AI Insight modal", () => {
  test("opens with either real analysis or the insufficient-data notice, and closes via the Close button", async ({ companyOwnerPage }) => {
    await companyOwnerPage.goto(`${COMPANY_CEO_BASE}/matching/ai`);
    // Matched candidates load via a client-side fetch after navigation, so
    // checking .count() immediately after goto() races that fetch and always
    // reads 0 -- wait for the first button (or a real timeout) first.
    const insightButtons = companyOwnerPage.getByRole("button", { name: "AI Insight" });
    await insightButtons.first().waitFor({ state: "visible", timeout: 5000 }).catch(() => undefined);
    test.skip((await insightButtons.count()) === 0, "No matched candidates available for E2E Test Company in this dev DB run.");

    await insightButtons.first().click();
    const dialog = companyOwnerPage.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "AI Insight" })).toBeVisible();
    // explainMatch() is synchronous (no fetch) -- it either has enough data to
    // explain the ranking, or it doesn't. Both are valid, non-crash outcomes.
    const hasAnalysis = await dialog.getByText("Why This Candidate Was Ranked").isVisible().catch(() => false);
    const hasEmptyState = await dialog.getByRole("status").filter({ hasText: "Insufficient data for AI analysis." }).isVisible().catch(() => false);
    expect(hasAnalysis || hasEmptyState).toBe(true);

    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
  });

  test("closes on Escape", async ({ companyOwnerPage }) => {
    await companyOwnerPage.goto(`${COMPANY_CEO_BASE}/matching/ai`);
    // Matched candidates load via a client-side fetch after navigation, so
    // checking .count() immediately after goto() races that fetch and always
    // reads 0 -- wait for the first button (or a real timeout) first.
    const insightButtons = companyOwnerPage.getByRole("button", { name: "AI Insight" });
    await insightButtons.first().waitFor({ state: "visible", timeout: 5000 }).catch(() => undefined);
    test.skip((await insightButtons.count()) === 0, "No matched candidates available for E2E Test Company in this dev DB run.");

    await insightButtons.first().click();
    const dialog = companyOwnerPage.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await companyOwnerPage.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("renders correctly in light and dark appearance", async ({ companyOwnerPage }) => {
    await companyOwnerPage.goto(`${COMPANY_CEO_BASE}/matching/ai`);
    // Matched candidates load via a client-side fetch after navigation, so
    // checking .count() immediately after goto() races that fetch and always
    // reads 0 -- wait for the first button (or a real timeout) first.
    const insightButtons = companyOwnerPage.getByRole("button", { name: "AI Insight" });
    await insightButtons.first().waitFor({ state: "visible", timeout: 5000 }).catch(() => undefined);
    test.skip((await insightButtons.count()) === 0, "No matched candidates available for E2E Test Company in this dev DB run.");

    await insightButtons.first().click();
    const dialog = companyOwnerPage.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await companyOwnerPage.evaluate(() => document.documentElement.classList.add("dark"));
    await expect(dialog).toBeVisible();
    await expect(companyOwnerPage.locator("body")).not.toContainText(/something went wrong/i);

    await companyOwnerPage.evaluate(() => document.documentElement.classList.remove("dark"));
    await expect(dialog).toBeVisible();
  });
});

test.describe("Company workflow: duplicate heading regression", () => {
  // Both pages used to render their title twice: once as the page intro <h1>
  // (CompanyDashboardPageIntro) and once as a nested section/panel heading
  // with the exact same text (CompanyDashboardSection / SectionPanel).
  test("the AI Matched Candidates page renders its heading exactly once", async ({ companyOwnerPage }) => {
    await companyOwnerPage.goto(`${COMPANY_CEO_BASE}/matching/ai`);
    await expect(companyOwnerPage.getByRole("heading", { name: "AI Matched Candidates", exact: true })).toHaveCount(1);
  });

  test("the Calendar page renders its heading exactly once", async ({ companyOwnerPage }) => {
    await companyOwnerPage.goto(`${COMPANY_CEO_BASE}/hiring/calendar`);
    await expect(companyOwnerPage.getByRole("heading", { name: "Calendar", exact: true })).toHaveCount(1);
  });
});
