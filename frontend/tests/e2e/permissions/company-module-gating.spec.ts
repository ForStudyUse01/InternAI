import { test, expect } from "../fixtures/roles.fixture";
import { COMPANY_CEO_BASE, COMPANY_HR_BASE } from "../helpers/routes";
import { withTemporaryHrPermissions } from "../helpers/fixture-state";
import { DashboardShellPage } from "../pages/shared/dashboard-shell.page";

test.describe("Company module gating: default state", () => {
  test("HR is denied Recruiter Management by default (least privilege)", async ({ companyHrPage }) => {
    await companyHrPage.goto(`${COMPANY_HR_BASE}/team/recruiters`);
    await new DashboardShellPage(companyHrPage).expectAccessDeniedInline();
  });

  test("HR sees a restricted empty-state on Post Internship, not the real form", async ({ companyHrPage }) => {
    await companyHrPage.goto(`${COMPANY_HR_BASE}/hiring/post`);
    // Separate hardcoded rule (not VIEW_MODULE_MAP), confirmed in
    // company-hiring-post-view.tsx: renders a scoped empty-state, not the
    // AccessDenied component, so it needs its own assertion.
    await expect(companyHrPage.getByText(/restricted to CEO\/Company Admin/i)).toBeVisible();
  });

  test("owner/executive bypasses module gating entirely", async ({ companyOwnerPage }) => {
    await companyOwnerPage.goto(`${COMPANY_CEO_BASE}/team/recruiters`);
    await new DashboardShellPage(companyOwnerPage).expectNoCrash();
  });

  // CEO shares the executive tier with Owner (both get ROLE_PERMISSIONS.company
  // in full, per User.js's pre-save hook) -- confirms that holds for a real CEO
  // account too, not just Owner.
  test("CEO/executive bypasses module gating entirely", async ({ companyCeoPage }) => {
    await companyCeoPage.goto(`${COMPANY_CEO_BASE}/team/recruiters`);
    await new DashboardShellPage(companyCeoPage).expectNoCrash();
  });
});

test.describe("Company module gating: executive-tier prefix boundary (dashboard/company/layout.tsx)", () => {
  test("HR visiting the CEO-prefixed dashboard is blocked inline", async ({ companyHrPage }) => {
    await companyHrPage.goto(`${COMPANY_CEO_BASE}/hiring/active`);
    await new DashboardShellPage(companyHrPage).expectExecutiveOnlyDenied();
  });

  test("an executive account visiting the HR-prefixed dashboard is silently redirected to its CEO equivalent", async ({
    companyOwnerPage
  }) => {
    await companyOwnerPage.goto(`${COMPANY_HR_BASE}/hiring/active`);
    await companyOwnerPage.waitForURL(new RegExp(`${COMPANY_CEO_BASE}/hiring/active$`));
  });
});

test.describe("Company module gating: server-enforced mechanism", () => {
  test("granting HR an executive-only module (team_members/hr_management) is silently stripped server-side", async ({
    request,
    companyHrPage
  }) => {
    await withTemporaryHrPermissions(
      request,
      { sidebarModules: ["dashboard", "internships", "applications", "team_members", "hr_management"] },
      async (before) => {
        // normalizeSidebarModules() (sidebar-modules.js) filters executiveOnly
        // keys even on a direct, explicit API grant -- confirm that boundary
        // holds rather than assuming it from the grant call succeeding.
        expect(before.sidebarModules).not.toContain("team_members");
        expect(before.sidebarModules).not.toContain("hr_management");
        await companyHrPage.goto(`${COMPANY_HR_BASE}/team/recruiters`);
        await new DashboardShellPage(companyHrPage).expectAccessDeniedInline();
      }
    );
  });

  test("revoking a module from HR denies that view, restoring it re-allows", async ({ request, companyHrPage }) => {
    const HR_DEFAULT_MODULES = [
      "dashboard",
      "internships",
      "applications",
      "candidate_search",
      "saved_candidates",
      "interview_scheduling",
      "interview_calendar",
      "messages",
      "analytics",
      "ai_insights",
      "hiring_reports",
      "company_profile",
      "verification_status"
    ];
    await withTemporaryHrPermissions(
      request,
      { sidebarModules: HR_DEFAULT_MODULES.filter((m) => m !== "candidate_search") },
      async () => {
        await companyHrPage.goto(`${COMPANY_HR_BASE}/matching/search`);
        await new DashboardShellPage(companyHrPage).expectAccessDeniedInline();
      }
    );

    // Outside the wrapper: permissions have been reverted to the default set,
    // which includes candidate_search again.
    await companyHrPage.goto(`${COMPANY_HR_BASE}/matching/search`);
    await new DashboardShellPage(companyHrPage).expectNoCrash();
  });
});
