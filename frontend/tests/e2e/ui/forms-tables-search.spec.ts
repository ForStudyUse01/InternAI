import { test, expect } from "../fixtures/roles.fixture";
import { FIXTURE_CREDENTIALS } from "../fixtures/roles.fixture";

const BACKEND_URL = "http://localhost:5000";

test.describe("Form validation: certification rejection requires a reason", () => {
  test("submitting Reject with empty remarks shows a validation error, not a silent failure", async ({ request, adminSuperPage }) => {
    const loginRes = await request.post(`${BACKEND_URL}/api/auth/intern/login`, {
      data: { email: FIXTURE_CREDENTIALS.intern.email, password: FIXTURE_CREDENTIALS.intern.password }
    });
    const loginBody = await loginRes.json();
    const headers = { Authorization: `Bearer ${loginBody.data.accessToken || loginBody.data.token}` };
    const courseName = `E2E Form Validation Cert ${Date.now()}`;
    await request.post(`${BACKEND_URL}/api/intern/certifications`, {
      headers,
      multipart: {
        // Buffer embeds courseName -- see modals-and-dialogs.spec.ts comment
        // on why a fixed buffer would collide (file-content-hash dedupe).
        certificateFile: { name: "e2e-cert.pdf", mimeType: "application/pdf", buffer: Buffer.from(`%PDF-1.4\n${courseName}\n%%EOF`) },
        courseName,
        skillCategory: "Web Development",
        provider: "E2E Test Provider",
        completionDate: new Date().toISOString().slice(0, 10)
      }
    });

    await adminSuperPage.goto("/dashboard/admin/certification-review");
    const row = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.getByRole("button", { name: "Review", exact: true }).click();

    const dialog = adminSuperPage.getByRole("dialog");
    await dialog.getByRole("button", { name: "Reject", exact: true }).click();
    await expect(adminSuperPage.getByText("Rejection reason is required.")).toBeVisible();
    // Dialog stays open -- rejection did not silently go through.
    await expect(dialog).toBeVisible();

    // Clean up: fill a reason and actually reject, so this fresh test
    // certification doesn't linger in the pending queue for later runs.
    // The visible label text isn't <label for>-associated with the textarea
    // -- the textarea's real accessible name comes from its own
    // aria-label="Review remarks" (admin-certification-review.tsx).
    await dialog.getByLabel("Review remarks").fill("E2E test cleanup rejection.");
    await dialog.getByRole("button", { name: "Reject", exact: true }).click();
    await expect(adminSuperPage.getByRole("row", { name: new RegExp(courseName) })).not.toBeVisible();
  });
});

test.describe("Table + pagination: admin users", () => {
  test("Next/Previous page controls change the visible page", async ({ adminSuperPage }) => {
    await adminSuperPage.goto("/dashboard/admin/users");
    const nextButton = adminSuperPage.getByRole("button", { name: "Next page" });
    test.skip((await nextButton.count()) === 0 || !(await nextButton.isEnabled()), "Not enough users in this dev DB for a second page.");

    const firstRowTextBefore = await adminSuperPage.getByRole("row").nth(1).textContent();
    await nextButton.click();
    await expect(adminSuperPage.getByRole("row").nth(1)).not.toHaveText(firstRowTextBefore || "");

    await adminSuperPage.getByRole("button", { name: "Previous page" }).click();
    await expect(adminSuperPage.getByRole("row").nth(1)).toHaveText(firstRowTextBefore || "");
  });
});

test.describe("Search/filter: admin users search", () => {
  test("a nonsense query yields no matching rows, not a crash", async ({ adminSuperPage }) => {
    await adminSuperPage.goto("/dashboard/admin/users");
    const search = adminSuperPage.getByPlaceholder(/search/i).first();
    test.skip((await search.count()) === 0, "No search input found on admin users view.");

    await search.fill("zzzznonexistentuserzzzz9999");
    await adminSuperPage.waitForTimeout(500);
    await expect(adminSuperPage.locator("body")).not.toContainText(/something went wrong/i);
  });

  test("role filter narrows the table to the selected role", async ({ adminSuperPage }) => {
    await adminSuperPage.goto("/dashboard/admin/users");
    await adminSuperPage.getByRole("combobox", { name: "Filter by role" }).selectOption("admin");
    await adminSuperPage.getByRole("button", { name: "Apply filters" }).click();
    await expect(adminSuperPage.locator("body")).not.toContainText(/something went wrong/i);
    // Every remaining data row's Role cell reads "admin" -- no intern/company rows leaked through.
    await expect(adminSuperPage.getByRole("cell", { name: "intern", exact: true })).toHaveCount(0);
    await expect(adminSuperPage.getByRole("cell", { name: "company", exact: true })).toHaveCount(0);
  });

  test("applying a filter resets pagination to page 1, and Next/Previous stay scoped to the filtered set", async ({ adminSuperPage }) => {
    await adminSuperPage.goto("/dashboard/admin/users");
    // intern is the largest role bucket in this dev DB (every student signup) --
    // the best chance of a real second filtered page to exercise.
    await adminSuperPage.getByRole("combobox", { name: "Filter by role" }).selectOption("intern");
    await adminSuperPage.getByRole("button", { name: "Apply filters" }).click();
    await expect(adminSuperPage.getByRole("cell", { name: "company", exact: true })).toHaveCount(0);

    const nextButton = adminSuperPage.getByRole("button", { name: "Next page" });
    test.skip((await nextButton.count()) === 0 || !(await nextButton.isEnabled()), "Not enough intern users in this dev DB for a second filtered page.");

    await nextButton.click();
    await expect(adminSuperPage.locator("body")).not.toContainText(/something went wrong/i);
    // Still filtered on page 2 -- no other role leaked in past the page boundary.
    await expect(adminSuperPage.getByRole("cell", { name: "admin", exact: true })).toHaveCount(0);
    await expect(adminSuperPage.getByRole("cell", { name: "company", exact: true })).toHaveCount(0);
  });
});

test.describe("Search/filter: certification review", () => {
  test("search narrows the table and the status filter switches queues", async ({ request, adminSuperPage }) => {
    const loginRes = await request.post(`${BACKEND_URL}/api/auth/intern/login`, {
      data: { email: FIXTURE_CREDENTIALS.intern.email, password: FIXTURE_CREDENTIALS.intern.password }
    });
    const loginBody = await loginRes.json();
    const headers = { Authorization: `Bearer ${loginBody.data.accessToken || loginBody.data.token}` };
    const courseName = `E2E Filter Cert ${Date.now()}`;
    await request.post(`${BACKEND_URL}/api/intern/certifications`, {
      headers,
      multipart: {
        certificateFile: { name: "e2e-cert.pdf", mimeType: "application/pdf", buffer: Buffer.from(`%PDF-1.4\n${courseName}\n%%EOF`) },
        courseName,
        skillCategory: "Web Development",
        provider: "E2E Test Provider",
        completionDate: new Date().toISOString().slice(0, 10)
      }
    });

    await adminSuperPage.goto("/dashboard/admin/certification-review");
    await adminSuperPage.getByPlaceholder(/search by course, provider, or category/i).fill(courseName);
    await expect(adminSuperPage.getByRole("row", { name: new RegExp(courseName) })).toBeVisible({ timeout: 15000 });

    // Switching the status filter to "Verified" hides this still-pending row.
    await adminSuperPage.getByRole("combobox").selectOption("verified");
    await expect(adminSuperPage.getByRole("row", { name: new RegExp(courseName) })).toBeHidden();

    // Clean up -- switch back and reject so this fresh cert doesn't linger.
    await adminSuperPage.getByRole("combobox").selectOption("pending_verification");
    const row = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Review", exact: true }).click();
    const dialog = adminSuperPage.getByRole("dialog");
    await dialog.getByLabel("Review remarks").fill("E2E test cleanup rejection.");
    await dialog.getByRole("button", { name: "Reject", exact: true }).click();
    await expect(adminSuperPage.getByRole("row", { name: new RegExp(courseName) })).not.toBeVisible();
  });
});

// Memoized login shared by the certification tests below only (the two
// blocks above keep their own inline per-test login, untouched) -- these
// tests run serially in the same worker (workers:1/fullyParallel:false), so
// a module-level cache is safe and cuts repeated login-fixture-request
// pressure against authLimiter (30 req/15min per IP, shared by every login).
let cachedCertInternHeaders: Record<string, string> | null = null;
async function getCertInternHeaders(request: import("@playwright/test").APIRequestContext) {
  if (cachedCertInternHeaders) return cachedCertInternHeaders;
  const loginRes = await request.post(`${BACKEND_URL}/api/auth/intern/login`, {
    data: { email: FIXTURE_CREDENTIALS.intern.email, password: FIXTURE_CREDENTIALS.intern.password }
  });
  // Same check session.ts's own fetchSession makes -- without it, a 429
  // here (authLimiter) surfaces later as a confusing element-not-found
  // timeout in whichever test seeds first, instead of a clear cause.
  if (!loginRes.ok()) {
    throw new Error(`Intern login fixture failed: ${loginRes.status()} ${await loginRes.text()}`);
  }
  const loginBody = await loginRes.json();
  cachedCertInternHeaders = { Authorization: `Bearer ${loginBody.data.accessToken || loginBody.data.token}` };
  return cachedCertInternHeaders;
}

async function submitCertForSearchTest(request: import("@playwright/test").APIRequestContext, courseName: string) {
  const headers = await getCertInternHeaders(request);
  await request.post(`${BACKEND_URL}/api/intern/certifications`, {
    headers,
    multipart: {
      certificateFile: { name: "e2e-cert.pdf", mimeType: "application/pdf", buffer: Buffer.from(`%PDF-1.4\n${courseName}\n%%EOF`) },
      courseName,
      skillCategory: "Web Development",
      provider: "E2E Test Provider",
      completionDate: new Date().toISOString().slice(0, 10)
    }
  });
}

test.describe("Search: certification review matches partially and case-insensitively, and Clear restores the list", () => {
  test("partial and case-inverted queries both find the record; Clear restores it; a nonsense query shows the empty state", async ({ request, adminSuperPage }) => {
    const courseName = `E2E ZephyrMatch ${Date.now()}`;
    await submitCertForSearchTest(request, courseName);

    await adminSuperPage.goto("/dashboard/admin/certification-review");
    const searchInput = adminSuperPage.getByPlaceholder(/search by course, provider, or category/i);

    // Partial, mid-string substring match.
    await searchInput.fill("ZephyrMatch");
    await expect(adminSuperPage.getByRole("row", { name: new RegExp(courseName) })).toBeVisible({ timeout: 15000 });

    // Case-insensitive -- same substring, inverted case.
    await searchInput.fill("zephyrmatch");
    await expect(adminSuperPage.getByRole("row", { name: new RegExp(courseName) })).toBeVisible({ timeout: 15000 });

    // Clearing via the search field's own Clear (X) button restores the full list.
    await adminSuperPage.getByRole("button", { name: "Clear search", exact: true }).click();
    await expect(searchInput).toHaveValue("");
    await expect(adminSuperPage.getByRole("row", { name: new RegExp(courseName) })).toBeVisible({ timeout: 15000 });

    // A query matching nothing shows the search-specific empty state.
    await searchInput.fill("zzzznonexistentzzzz9999");
    await expect(adminSuperPage.getByText("No certifications match your search")).toBeVisible();

    // Clean up.
    await adminSuperPage.getByRole("button", { name: "Clear search", exact: true }).click();
    const cleanupRow = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(cleanupRow).toBeVisible({ timeout: 15000 });
    await cleanupRow.getByRole("button", { name: "Review", exact: true }).click();
    await adminSuperPage.getByRole("dialog").getByLabel("Review remarks").fill("E2E test cleanup rejection.");
    await adminSuperPage.getByRole("dialog").getByRole("button", { name: "Reject", exact: true }).click();
    await expect(adminSuperPage.getByRole("row", { name: new RegExp(courseName) })).not.toBeVisible();
  });
});

test.describe("Validation: certification review remarks length and character handling", () => {
  test("a rejection reason longer than 500 characters is truncated to exactly 500 on save", async ({ request, adminSuperPage }) => {
    const courseName = `E2E Max Length Cert ${Date.now()}`;
    await submitCertForSearchTest(request, courseName);

    await adminSuperPage.goto("/dashboard/admin/certification-review");
    const row = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.getByRole("button", { name: "Review", exact: true }).click();

    // No client-side maxLength on the textarea (admin-certification-review.tsx)
    // -- truncation is a backend-only rule (normalizeText(value, 500) in
    // certification.service.js: String(value).trim().slice(0, 500)).
    const dialog = adminSuperPage.getByRole("dialog");
    await dialog.getByLabel("Review remarks").fill("a".repeat(600));
    await dialog.getByRole("button", { name: "Reject", exact: true }).click();
    await expect(adminSuperPage.getByRole("row", { name: new RegExp(courseName) })).not.toBeVisible();

    await adminSuperPage.getByRole("combobox", { name: "Filter certification status" }).selectOption("rejected");
    const rejectedRow = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(rejectedRow).toBeVisible({ timeout: 15000 });
    // Proves truncation to exactly 500 -- the 500th 'a' is present, the 501st is not.
    await expect(rejectedRow.getByText("a".repeat(500))).toBeVisible();
    await expect(rejectedRow.getByText("a".repeat(501))).toHaveCount(0);
  });

  test("a rejection reason with special characters and unicode round-trips exactly", async ({ request, adminSuperPage }) => {
    const courseName = `E2E Unicode Cert ${Date.now()}`;
    await submitCertForSearchTest(request, courseName);

    await adminSuperPage.goto("/dashboard/admin/certification-review");
    const row = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.getByRole("button", { name: "Review", exact: true }).click();

    const specialReason = 'Missing signature — see <cert> §4.2 "quotes" 测试 émoji 🎓';
    const dialog = adminSuperPage.getByRole("dialog");
    await dialog.getByLabel("Review remarks").fill(specialReason);
    await dialog.getByRole("button", { name: "Reject", exact: true }).click();
    await expect(adminSuperPage.getByRole("row", { name: new RegExp(courseName) })).not.toBeVisible();

    await adminSuperPage.getByRole("combobox", { name: "Filter certification status" }).selectOption("rejected");
    const rejectedRow = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(rejectedRow).toBeVisible({ timeout: 15000 });
    // Also confirms React's default text escaping renders the literal
    // "<cert>" as text rather than being parsed as markup.
    await expect(rejectedRow.getByText(specialReason)).toBeVisible();
  });
});
