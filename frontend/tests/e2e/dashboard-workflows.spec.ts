import { test, expect } from "@playwright/test";
import { loginAsRoleViaApi } from "./helpers/session";

const STUDENT_EMAIL = "e2e.intern@internai-test.local";
const STUDENT_PASSWORD = "E2eIntern@123";
const HR_EMAIL = "e2e.company.hr@internai-test.local";
const HR_PASSWORD = "E2eCompanyHr@123";
const ADMIN_EMAIL = "admin@internai.com";
const ADMIN_PASSWORD = "Admin@123";
const ADMIN_VERIFICATION_EMAIL = "e2e.admin.verification@internai-test.local";
const ADMIN_VERIFICATION_PASSWORD = "E2eAdminVerification@123";
const ADMIN_MODERATION_EMAIL = "e2e.admin.moderation@internai-test.local";
const ADMIN_MODERATION_PASSWORD = "E2eAdminModeration@123";
const ADMIN_SUPPORT_EMAIL = "e2e.admin.support@internai-test.local";
const ADMIN_SUPPORT_PASSWORD = "E2eAdminSupport@123";
const COMPANY_OWNER_EMAIL = "e2e.company.owner@internai-test.local";
const COMPANY_OWNER_PASSWORD = "E2eCompanyOwner@123";
const BACKEND_URL = "http://localhost:5000";

test.describe("Student dashboard workflows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoleViaApi(page, "intern", STUDENT_EMAIL, STUDENT_PASSWORD);
  });

  test("resume score view loads without crashing", async ({ page }) => {
    await page.goto("/dashboard/intern/resume/score");
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);
  });

  test("skill gap analysis view loads without crashing", async ({ page }) => {
    await page.goto("/dashboard/intern/skill-gap");
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);
  });

  test("notifications view loads (empty state or list) without crashing", async ({ page }) => {
    await page.goto("/dashboard/intern/notifications");
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);
  });

  test("internship search + apply workflow: search page renders results controls", async ({ page }) => {
    await page.goto("/dashboard/intern/internships/search");
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);
  });

  test("saved internships tracking view loads", async ({ page }) => {
    await page.goto("/dashboard/intern/internships/saved");
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);
  });
});

test.describe("Company (HR) dashboard workflows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoleViaApi(page, "company", HR_EMAIL, HR_PASSWORD);
  });

  test("candidate search view accepts a filter query without crashing", async ({ page }) => {
    await page.goto("/dashboard/companyHR/matching/search");
    const searchBox = page.locator('input[type="search"], input[placeholder*="earch" i]').first();
    if (await searchBox.count()) {
      await searchBox.fill("react");
    }
    await expect(page.locator("body")).not.toContainText(/something went wrong|404/i);
  });

  test("hiring pipeline (kanban) view loads without crashing", async ({ page }) => {
    await page.goto("/dashboard/companyHR/hiring/pipeline");
    await expect(page.locator("body")).not.toContainText(/something went wrong|404/i);
  });

  test("active internship postings view loads without crashing", async ({ page }) => {
    await page.goto("/dashboard/companyHR/hiring/active");
    await expect(page.locator("body")).not.toContainText(/something went wrong|404/i);
  });

  test("company analytics view loads without crashing", async ({ page }) => {
    await page.goto("/dashboard/companyHR/analytics/company");
    await expect(page.locator("body")).not.toContainText(/something went wrong|404/i);
  });

  test("HR account is denied the recruiter-management module by default (least privilege)", async ({ page }) => {
    await page.goto("/dashboard/companyHR/team/recruiters");
    await expect(page.locator("body")).not.toContainText(/something went wrong|^404/i);
    await expect(page.locator("body")).toContainText(/module not enabled|access denied/i);
  });

  test("interview scheduling view loads without crashing", async ({ page }) => {
    await page.goto("/dashboard/companyHR/hiring/interviews");
    await expect(page.locator("body")).not.toContainText(/something went wrong|404/i);
  });
});

test.describe("Admin dashboard workflows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoleViaApi(page, "admin", ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test("admin overview dashboard loads with platform metrics", async ({ page }) => {
    await page.goto("/dashboard/admin");
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);
  });

  test("user management table view loads without crashing", async ({ page }) => {
    await page.goto("/dashboard/admin/users");
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);
  });

  test("company management view loads without crashing", async ({ page }) => {
    await page.goto("/dashboard/admin/companies");
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);
  });

  test("reports (reported companies) view loads without crashing", async ({ page }) => {
    await page.goto("/dashboard/admin/reports");
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);
  });

  test("platform analytics view loads without crashing", async ({ page }) => {
    await page.goto("/dashboard/admin/analytics");
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);
  });

  test("certification review queue loads without crashing", async ({ page }) => {
    await page.goto("/dashboard/admin/certification-review");
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);
  });

  // --- Statistics -----------------------------------------------------

  test("overview stat cards show correct values from the metrics, companies, and reports APIs", async ({ page }) => {
    // "Pending Verifications" and "Reports" are NOT part of the metrics
    // payload -- they're computed client-side from the companies/reports
    // lists (admin-dashboard-page.tsx stats useMemo) -- all 3 endpoints
    // must be mocked together for every card to be deterministic.
    await page.route("**/api/admin/metrics", (route) =>
      route.fulfill({
        json: {
          metrics: {
            totalStudents: 42,
            totalCompanies: 15,
            activeInternships: 8,
            totalHires: 9,
            reportsOverview: 99, // unused by the UI -- confirms it's ignored, not a stray match
            pendingCompanyApprovals: 99, // unused by the UI -- see above
            activeInterviews: 6
          }
        }
      })
    );
    await page.route("**/api/admin/companies*", (route) =>
      route.fulfill({
        json: {
          companies: [
            { _id: "c1", companyName: "Pending Co A", companyEmail: "a@x.com", verificationStatus: "pending" },
            { _id: "c2", companyName: "Pending Co B", companyEmail: "b@x.com", verificationStatus: "pending" },
            { _id: "c3", companyName: "Pending Co C", companyEmail: "c@x.com", verificationStatus: "pending" },
            { _id: "c4", companyName: "Verified Co", companyEmail: "d@x.com", verificationStatus: "verified" }
          ]
        }
      })
    );
    await page.route("**/api/admin/reports*", (route) =>
      route.fulfill({
        json: {
          reports: [
            { _id: "r1", reason: "spam", status: "open" },
            { _id: "r2", reason: "abuse", status: "open" },
            { _id: "r3", reason: "resolved one", status: "resolved" }
          ]
        }
      })
    );

    await page.goto("/dashboard/admin");
    // Scoped to SummaryStatCard's own value class (confirmed via DOM:
    // <p class="ds-stat-value">N</p>) -- users/internships aren't mocked in
    // this test, so their real (unmocked) growth-chart sr-only data tables
    // can contain coincidentally-matching numbers; a bare text match would
    // false-positive/negative against those unrelated <td> cells.
    const statValues = page.locator("main p.ds-stat-value");
    await expect(statValues.filter({ hasText: /^42$/ })).toBeVisible(); // Total Students
    await expect(statValues.filter({ hasText: /^15$/ })).toBeVisible(); // Total Companies
    await expect(statValues.filter({ hasText: /^8$/ })).toBeVisible(); // Active Internships
    await expect(statValues.filter({ hasText: /^9$/ })).toBeVisible(); // Offers (totalHires)
    await expect(statValues.filter({ hasText: /^6$/ })).toBeVisible(); // Interviews (activeInterviews)
    await expect(statValues.filter({ hasText: /^3$/ })).toBeVisible(); // Pending Verifications (from companies list, not metrics)
    await expect(statValues.filter({ hasText: /^2$/ })).toBeVisible(); // Reports (open reports, from reports list)
    // Confirms the unused metrics fields (99) are genuinely ignored.
    await expect(statValues.filter({ hasText: /^99$/ })).toHaveCount(0);
  });

  test("overview stat cards render zero values without crashing when the platform has no data yet", async ({ page }) => {
    await page.route("**/api/admin/metrics", (route) =>
      route.fulfill({
        json: {
          metrics: {
            totalStudents: 0,
            totalCompanies: 0,
            activeInternships: 0,
            totalHires: 0,
            reportsOverview: 0,
            pendingCompanyApprovals: 0,
            activeInterviews: 0
          }
        }
      })
    );
    await page.route("**/api/admin/companies*", (route) => route.fulfill({ json: { companies: [] } }));
    await page.route("**/api/admin/reports*", (route) => route.fulfill({ json: { reports: [] } }));
    // Also empty users/internships -- otherwise those 2 requests hit the
    // real backend's non-zero dev data, which would (a) make the growth
    // charts render real numeric gridline text and (b) pollute the "0"
    // count assertion below with unrelated matches.
    await page.route("**/api/admin/users*", (route) => route.fulfill({ json: { users: [], page: 1, limit: 100, total: 0 } }));
    await page.route("**/api/admin/internships*", (route) => route.fulfill({ json: { internships: [] } }));

    await page.goto("/dashboard/admin");
    await expect(page.locator("body")).not.toContainText(/something went wrong|NaN|undefined/i);
    // 7 of the 8 cards are driven by these mocks and should all read "0"
    // (Total Applications is hardcoded "--", not data-driven). Scoped to
    // SummaryStatCard's own value class -- see the comment in the previous
    // test on why a bare text match risks colliding with unrelated numbers.
    await expect(page.locator("main p.ds-stat-value").filter({ hasText: /^0$/ })).toHaveCount(7);
  });

  // --- Charts -----------------------------------------------------------

  test("growth charts render deterministically with fresh data and expose an accessible data table", async ({ page }) => {
    const now = new Date().toISOString();
    await page.route("**/api/admin/users*", (route) =>
      route.fulfill({ json: { users: [{ _id: "u1", email: "fresh.intern@example.com", role: "intern", createdAt: now }], page: 1, limit: 100, total: 1 } })
    );
    await page.route("**/api/admin/companies*", (route) =>
      route.fulfill({ json: { companies: [{ _id: "c1", companyName: "Fresh Co", companyEmail: "fresh@x.com", verificationStatus: "pending", createdAt: now }] } })
    );
    await page.route("**/api/admin/internships*", (route) =>
      route.fulfill({ json: { internships: [{ _id: "i1", role: "Fresh Internship", isActive: true, createdAt: now }] } })
    );

    await page.goto("/dashboard/admin");
    for (const title of ["Student Growth", "Company Registrations", "Internship Growth"]) {
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
    }
    // Each TrendAreaChart renders both a visual role="img" summary and a
    // sr-only <table> fallback (analytics-charts.tsx) -- both must exist,
    // not just the heading.
    await expect(page.getByRole("img", { name: /trend of new students over time/i })).toBeVisible();
    const studentTable = page.locator("table", { hasText: "new students by period" });
    await expect(studentTable.getByRole("columnheader", { name: "Period" })).toBeVisible();
    await expect(studentTable.getByRole("columnheader", { name: "Value" })).toBeVisible();
  });

  test("growth charts show an empty state instead of blank/broken charts when there is no recent activity", async ({ page }) => {
    // A chart only renders if it has at least one non-zero point in the
    // trailing 6 months (admin-growth-charts.tsx visibleSlots filter) --
    // this is the real, currently-untested edge case that governs whether
    // the chart-headings test above is data-dependent or not.
    await page.route("**/api/admin/users*", (route) => route.fulfill({ json: { users: [], page: 1, limit: 100, total: 0 } }));
    await page.route("**/api/admin/companies*", (route) => route.fulfill({ json: { companies: [] } }));
    await page.route("**/api/admin/internships*", (route) => route.fulfill({ json: { internships: [] } }));

    await page.goto("/dashboard/admin");
    await expect(page.getByText("Not enough activity yet")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Student Growth" })).toBeHidden();
    await expect(page.getByRole("heading", { name: "Company Registrations" })).toBeHidden();
    await expect(page.getByRole("heading", { name: "Internship Growth" })).toBeHidden();
  });

  // --- Recent activity ----------------------------------------------------

  test("recent activity renders real log entries with actor and timestamp", async ({ page }) => {
    await page.route("**/api/admin/activity-logs*", (route) =>
      route.fulfill({
        json: {
          logs: [
            { _id: "l1", action: "company_verified", actorRole: "admin", actorUser: { email: "admin@internai.com" }, entityType: "company", createdAt: new Date().toISOString() }
          ],
          page: 1,
          limit: 20,
          total: 1
        }
      })
    );
    await page.goto("/dashboard/admin");
    const panel = page.locator("li", { hasText: "company verified" });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("admin@internai.com");
  });

  test("recent activity shows an empty state when there are no logs yet", async ({ page }) => {
    await page.route("**/api/admin/activity-logs*", (route) => route.fulfill({ json: { logs: [], page: 1, limit: 20, total: 0 } }));
    await page.goto("/dashboard/admin");
    await expect(page.getByText("No activity recorded yet")).toBeVisible();
  });

  // --- Pending verification widget -----------------------------------------

  test("Pending Verification widget shows an empty state once every company is reviewed", async ({ page }) => {
    await page.route("**/api/admin/companies*", (route) =>
      route.fulfill({ json: { companies: [{ _id: "c1", companyName: "All Good Co", companyEmail: "a@x.com", verificationStatus: "verified" }] } })
    );
    await page.goto("/dashboard/admin");
    await expect(page.getByText("No pending companies")).toBeVisible();
  });

  test("Pending Verification widget's Review link navigates to the Verification Queue", async ({ page }) => {
    await page.route("**/api/admin/companies*", (route) =>
      route.fulfill({ json: { companies: [{ _id: "c1", companyName: "Needs Review Co", companyEmail: "a@x.com", verificationStatus: "pending" }] } })
    );
    await page.goto("/dashboard/admin");
    await expect(page.getByText("Needs Review Co")).toBeVisible();
    // exact:true -- the sidebar's "Certification Review" nav link otherwise
    // substring-matches "Review" too.
    await page.getByRole("link", { name: "Review", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/admin\/verification/);
  });

  // --- Loading / error states ------------------------------------------

  test("overview shows an accessible loading state while platform metrics are in flight", async ({ page }) => {
    // Delay the metrics response so the loading branch stays visible long
    // enough to assert against, instead of racing a fast local response.
    await page.route("**/api/admin/metrics", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });
    await page.goto("/dashboard/admin");
    await expect(page.getByRole("status", { name: "Loading platform statistics" })).toBeVisible();
    // Refresh must not allow a second concurrent load while one is in flight.
    await expect(page.getByRole("button", { name: "Refresh" })).toBeDisabled();
    await expect(page.getByRole("status", { name: "Loading platform statistics" })).toBeHidden({ timeout: 15000 });
    await expect(page.getByText("Total Students")).toBeVisible();
    await expect(page.getByRole("button", { name: "Refresh" })).toBeEnabled();
  });

  test("overview shows a retryable error state when platform metrics fail to load, and Retry recovers", async ({ page }) => {
    // Fail EVERY request until the test flips the flag, not just the first
    // one: more than one component can hit the same endpoint on mount, and
    // whichever fires second would otherwise consume the success response
    // and auto-recover the page before the error state is ever asserted
    // (order-dependent -- exactly what a fast production build exposes).
    let failRequests = true;
    await page.route("**/api/admin/metrics", (route) => {
      if (failRequests) {
        return route.fulfill({ status: 500, json: { message: "Internal error" } });
      }
      return route.fulfill({ json: { metrics: { totalStudents: 1, totalCompanies: 1, activeInternships: 1, totalHires: 0, reportsOverview: 0, pendingCompanyApprovals: 0, activeInterviews: 0 } } });
    });
    await page.goto("/dashboard/admin");
    const retryButton = page.getByRole("button", { name: /retry|try again/i });
    await expect(retryButton).toBeVisible();

    failRequests = false;
    await retryButton.click();
    await expect(retryButton).toBeHidden();
    await expect(page.getByText("Total Students")).toBeVisible();
  });

  test("Download Platform Statistics PDF reports success", async ({ page }) => {
    await page.goto("/dashboard/admin");
    await page.getByRole("button", { name: "Download Platform Statistics PDF" }).click();
    await expect(page.getByText("Report generated")).toBeVisible({ timeout: 15000 });
  });

  // --- Keyboard / responsive / theme ------------------------------------

  test("Refresh button is reachable and activatable by keyboard", async ({ page }) => {
    await page.goto("/dashboard/admin");
    // Delay the reload's response -- otherwise the real local API round-trip
    // completes faster than the loading state can be observed, and Enter's
    // effect would be indistinguishable from a no-op.
    let refreshTriggered = false;
    await page.route("**/api/admin/metrics", async (route) => {
      refreshTriggered = true;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });

    // Wait for the real (unmocked) initial load to finish -- Refresh is
    // disabled while loading, and disabled elements can't receive focus, so
    // calling .focus() before this settles is a race (only used to pass
    // reliably because the initial fetch happened to be fast).
    await expect(page.getByRole("button", { name: "Refresh" })).toBeEnabled();
    await page.getByRole("button", { name: "Refresh" }).focus();
    await expect(page.getByRole("button", { name: "Refresh" })).toBeFocused();
    await page.keyboard.press("Enter");
    // Triggers the same loadData(true) path -- loading skeleton reappears
    // and clears, proving Enter actually activated the button, not just
    // received focus.
    await expect(page.getByRole("status", { name: "Loading platform statistics" })).toBeVisible();
    await expect(page.getByRole("status", { name: "Loading platform statistics" })).toBeHidden({ timeout: 15000 });
    expect(refreshTriggered).toBe(true);
  });

  test("overview renders without horizontal overflow on tablet and mobile", async ({ page }) => {
    for (const viewport of [{ width: 768, height: 1024 }, { width: 375, height: 812 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/dashboard/admin");
      await expect(page.locator("body")).not.toContainText(/something went wrong/i);
      await expect(page.getByRole("heading", { name: "Platform Overview" })).toBeVisible();
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    }
  });

  test("overview renders correctly in both light and dark appearance", async ({ page }) => {
    await page.goto("/dashboard/admin/settings");
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await page.goto("/dashboard/admin");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);
    await expect(page.getByRole("heading", { name: "Platform Overview" })).toBeVisible();

    await page.goto("/dashboard/admin/settings");
    await page.getByRole("button", { name: "Light", exact: true }).click();
    await page.goto("/dashboard/admin");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);
    await expect(page.getByRole("heading", { name: "Platform Overview" })).toBeVisible();
  });

  test("activity logs search narrows results without crashing", async ({ page }) => {
    await page.goto("/dashboard/admin/activity-logs");
    await page.getByPlaceholder(/search activity logs/i).fill("zzzznonexistentzzzz9999");
    await page.waitForTimeout(500);
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);
    await expect(page.getByText(/no logs match your search/i)).toBeVisible();
  });

  test("sidebar marks the current route with aria-current", async ({ page }) => {
    await page.goto("/dashboard/admin/users");
    await expect(page.getByRole("link", { name: "Users", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "Dashboard Overview", exact: true })).not.toHaveAttribute("aria-current", "page");
  });
});

test.describe("Admin Company Verification module", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoleViaApi(page, "admin", ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  // --- View pending companies ---------------------------------------------

  test("verification queue renders every pending company detail field accurately", async ({ page }) => {
    await page.route("**/api/admin/companies*", (route) =>
      route.fulfill({
        json: {
          companies: [
            {
              _id: "mock-c1",
              companyName: "Mocked Robotics Inc",
              companyEmail: "hr@mockedrobotics.example",
              gst: "27ZZZZZ9999Z1Z1",
              contactName: "Priya Sharma",
              phone: "9812345678",
              verificationStatus: "pending",
              description: "Builds warehouse robots.",
              createdAt: "2026-01-15T00:00:00.000Z"
            }
          ]
        }
      })
    );
    await page.goto("/dashboard/admin/verification");
    await expect(page.getByRole("heading", { name: "Mocked Robotics Inc" })).toBeVisible();
    await expect(page.getByText("hr@mockedrobotics.example")).toBeVisible();
    await expect(page.getByText("GSTIN: 27ZZZZZ9999Z1Z1")).toBeVisible();
    await expect(page.getByText("Contact: Priya Sharma")).toBeVisible();
    await expect(page.getByText("Phone: 9812345678")).toBeVisible();
    await expect(page.getByText("Builds warehouse robots.")).toBeVisible();
    await expect(page.getByText("Registered: Jan 15, 2026")).toBeVisible();
  });

  test("empty state copy differs between the Companies view and the Verification Queue", async ({ page }) => {
    await page.route("**/api/admin/companies*", (route) => route.fulfill({ json: { companies: [] } }));

    await page.goto("/dashboard/admin/verification");
    await expect(page.getByText("No pending companies")).toBeVisible();
    await expect(page.getByText("All companies have been reviewed.")).toBeVisible();

    await page.goto("/dashboard/admin/companies");
    await expect(page.getByText("No companies registered")).toBeVisible();
  });

  test("verification queue shows an accessible loading state while companies are in flight", async ({ page }) => {
    await page.route("**/api/admin/companies*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({ json: { companies: [] } });
    });
    await page.goto("/dashboard/admin/verification");
    await expect(page.getByRole("status", { name: "Loading", exact: true })).toBeVisible();
    await expect(page.getByRole("status", { name: "Loading", exact: true })).toBeHidden({ timeout: 15000 });
  });

  test("verification queue shows a retryable error state when companies fail to load, and Retry recovers", async ({ page }) => {
    // Fail every request until the flag flips -- see the metrics retry test
    // above for why "fail only the first request" is order-fragile.
    let failRequests = true;
    await page.route("**/api/admin/companies*", (route) => {
      if (failRequests) {
        return route.fulfill({ status: 500, json: { message: "Internal error" } });
      }
      return route.fulfill({
        json: { companies: [{ _id: "c1", companyName: "Recovered Co", companyEmail: "r@x.com", verificationStatus: "pending" }] }
      });
    });
    await page.goto("/dashboard/admin/verification");
    const retryButton = page.getByRole("button", { name: /retry|try again/i });
    await expect(retryButton).toBeVisible();
    failRequests = false;
    await retryButton.click();
    await expect(retryButton).toBeHidden();
    await expect(page.getByText("Recovered Co")).toBeVisible();
  });

  // --- Approve (Verify) ----------------------------------------------------

  test("Verify sends the correct payload and immediately removes the company from the pending queue", async ({ page }) => {
    let verifyRequestBody: unknown = null;
    // Keyed off whether the verification PATCH has happened, not a request
    // call-count: other components (e.g. the overview's pending-verification
    // badge) can hit the same companies endpoint first, which made
    // "call 1 = pending, call 2+ = empty" hand the queue an empty list
    // before the test ever saw "Verify Me Co".
    let verified = false;
    await page.route("**/api/admin/companies*", (route) => {
      return route.fulfill({
        json: {
          companies: verified
            ? []
            : [{ _id: "mock-v1", companyName: "Verify Me Co", companyEmail: "v@x.com", verificationStatus: "pending" }]
        }
      });
    });
    await page.route("**/api/admin/companies/*/verification", (route) => {
      verifyRequestBody = route.request().postDataJSON();
      verified = true;
      return route.fulfill({
        json: {
          company: { _id: "mock-v1", companyName: "Verify Me Co", companyEmail: "v@x.com", verificationStatus: "verified" },
          message: "Company verification updated"
        }
      });
    });

    await page.goto("/dashboard/admin/verification");
    await expect(page.getByText("Verify Me Co")).toBeVisible();
    await page.getByRole("button", { name: "Verify", exact: true }).click();
    await expect(page.getByText("Verify Me Co")).toBeHidden();
    expect(verifyRequestBody).toEqual({ status: "verified", rejectionReason: "", verifiedBadge: true });
  });

  test("Verify is not offered for a company that is already verified (duplicate-approval prevention)", async ({ page }) => {
    await page.route("**/api/admin/companies*", (route) =>
      route.fulfill({
        json: { companies: [{ _id: "c1", companyName: "Already Verified Co", companyEmail: "a@x.com", verificationStatus: "verified" }] }
      })
    );
    await page.goto("/dashboard/admin/companies");
    await expect(page.getByText("Already Verified Co")).toBeVisible();
    await expect(page.getByRole("button", { name: "Verify", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Unverify", exact: true })).toBeVisible();
  });

  test("a failed Verify request surfaces an error and leaves the company pending", async ({ page }) => {
    await page.route("**/api/admin/companies*", (route) =>
      route.fulfill({ json: { companies: [{ _id: "c1", companyName: "Flaky Co", companyEmail: "f@x.com", verificationStatus: "pending" }] } })
    );
    await page.route("**/api/admin/companies/*/verification", (route) =>
      route.fulfill({ status: 500, json: { message: "Verification service unavailable" } })
    );

    await page.goto("/dashboard/admin/verification");
    await page.getByRole("button", { name: "Verify", exact: true }).click();
    // Scoped to <main> -- an unscoped getByRole("alert") also matches
    // Next.js's own role="alert" route-announcer div (#__next-route-
    // announcer__, always present in the DOM, outside <main>).
    await expect(page.locator("main").getByRole("alert")).toBeVisible();
    // Untouched -- still pending, Verify still offered, not stuck "Saving...".
    await expect(page.getByRole("button", { name: "Verify", exact: true })).toBeVisible();
    await expect(page.getByText("Flaky Co")).toBeVisible();
  });

  // --- Reject ----------------------------------------------------------------

  test("Reject sends the correct payload with the typed reason, and the company leaves the pending queue", async ({ page }) => {
    let rejectRequestBody: unknown = null;
    // State-keyed, not call-count-keyed -- see the Verify payload test above.
    let rejected = false;
    await page.route("**/api/admin/companies*", (route) => {
      return route.fulfill({
        json: {
          companies: rejected
            ? []
            : [{ _id: "mock-r1", companyName: "Reject Me Co", companyEmail: "r@x.com", verificationStatus: "pending" }]
        }
      });
    });
    await page.route("**/api/admin/companies/*/verification", (route) => {
      rejectRequestBody = route.request().postDataJSON();
      rejected = true;
      return route.fulfill({
        json: {
          company: {
            _id: "mock-r1",
            companyName: "Reject Me Co",
            companyEmail: "r@x.com",
            verificationStatus: "rejected",
            rejectionReason: "Incomplete documentation"
          },
          message: "Company verification updated"
        }
      });
    });

    await page.goto("/dashboard/admin/verification");
    await page.getByRole("button", { name: "Reject", exact: true }).click();
    await page.getByLabel("Rejection reason").fill("Incomplete documentation");
    await page.getByRole("button", { name: "Confirm Rejection", exact: true }).click();
    await expect(page.getByText("Reject Me Co")).toBeHidden();
    expect(rejectRequestBody).toEqual({ status: "rejected", rejectionReason: "Incomplete documentation", verifiedBadge: false });
  });

  // Confirmed against admin-companies-view.tsx: the Confirm Rejection button
  // has no non-empty check, and the backend accepts rejectionReason: "" --
  // unlike certification review, a reason is not enforced here. This is
  // existing, intentional-looking behaviour (verified by reading both code
  // paths), so the test documents the real contract rather than asserting
  // a validation error that doesn't exist for this module.
  test("Reject can be submitted with an empty reason -- unlike certification review, a reason is not enforced here", async ({ page }) => {
    let rejectRequestBody: unknown = null;
    await page.route("**/api/admin/companies*", (route) =>
      route.fulfill({ json: { companies: [{ _id: "mock-r2", companyName: "No Reason Co", companyEmail: "n@x.com", verificationStatus: "pending" }] } })
    );
    await page.route("**/api/admin/companies/*/verification", (route) => {
      rejectRequestBody = route.request().postDataJSON();
      return route.fulfill({
        json: {
          company: { _id: "mock-r2", companyName: "No Reason Co", companyEmail: "n@x.com", verificationStatus: "rejected", rejectionReason: "" },
          message: "ok"
        }
      });
    });
    await page.goto("/dashboard/admin/verification");
    await page.getByRole("button", { name: "Reject", exact: true }).click();
    await page.getByRole("button", { name: "Confirm Rejection", exact: true }).click();
    await expect(page.getByLabel("Rejection reason")).toBeHidden({ timeout: 10000 });
    expect(rejectRequestBody).toEqual({ status: "rejected", rejectionReason: "", verifiedBadge: false });
  });

  test("a failed Reject request surfaces an error and keeps the typed reason in place", async ({ page }) => {
    await page.route("**/api/admin/companies*", (route) =>
      route.fulfill({
        json: { companies: [{ _id: "c1", companyName: "Flaky Reject Co", companyEmail: "f@x.com", verificationStatus: "pending" }] }
      })
    );
    await page.route("**/api/admin/companies/*/verification", (route) =>
      route.fulfill({ status: 500, json: { message: "Rejection failed" } })
    );

    await page.goto("/dashboard/admin/verification");
    await page.getByRole("button", { name: "Reject", exact: true }).click();
    await page.getByLabel("Rejection reason").fill("Missing GST certificate");
    await page.getByRole("button", { name: "Confirm Rejection", exact: true }).click();
    // Scoped to <main> -- see the comment in the Verify-failure test above.
    await expect(page.locator("main").getByRole("alert")).toBeVisible();
    // The admin's typed reason is not silently lost on failure.
    await expect(page.getByLabel("Rejection reason")).toHaveValue("Missing GST certificate");
    await expect(page.getByText("Flaky Reject Co")).toBeVisible();
  });

  // --- Search ----------------------------------------------------------------

  test("a no-result search shows the correct empty state, and Clear Search restores the full list", async ({ page }) => {
    await page.route("**/api/admin/companies*", (route) => {
      const url = new URL(route.request().url());
      const q = (url.searchParams.get("q") || "").toLowerCase();
      const match = q === "" || "cloudnest mock co".includes(q);
      return route.fulfill({
        json: {
          companies: match
            ? [{ _id: "c1", companyName: "CloudNest Mock Co", companyEmail: "c@x.com", verificationStatus: "pending" }]
            : []
        }
      });
    });
    await page.goto("/dashboard/admin/verification");
    await expect(page.getByText("CloudNest Mock Co")).toBeVisible();

    await page.getByPlaceholder("Search companies...").fill("zzzznonexistentzzzz9999");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByText("No companies match your search")).toBeVisible();
    await expect(page.getByText("Try a different company name.")).toBeVisible();

    await page.getByRole("button", { name: "Clear Search", exact: true }).click();
    await expect(page.getByText("CloudNest Mock Co")).toBeVisible();
  });

  // --- Filters (view-based status filter) -------------------------------------

  // There is no separate status-filter dropdown for companies (unlike Users'
  // role filter) -- the "filter" this module offers is which view you're on:
  // /companies shows every status, /verification client-side-filters to
  // pending only (admin-dashboard-page.tsx pendingCompanies useMemo). This
  // proves that client-side filter holds even if the backend ever returned
  // non-pending rows on the verification endpoint.
  test("the Companies view shows every status, while the Verification Queue shows only pending", async ({ page }) => {
    const all = [
      { _id: "p1", companyName: "Pending Mock Co", companyEmail: "p@x.com", verificationStatus: "pending" },
      { _id: "v1", companyName: "Verified Mock Co", companyEmail: "v@x.com", verificationStatus: "verified" },
      { _id: "r1", companyName: "Rejected Mock Co", companyEmail: "r@x.com", verificationStatus: "rejected" },
      { _id: "s1", companyName: "Suspended Mock Co", companyEmail: "s@x.com", verificationStatus: "suspended" }
    ];
    await page.route("**/api/admin/companies*", (route) => route.fulfill({ json: { companies: all } }));

    await page.goto("/dashboard/admin/companies");
    for (const c of all) {
      await expect(page.getByText(c.companyName)).toBeVisible();
    }

    await page.goto("/dashboard/admin/verification");
    await expect(page.getByText("Pending Mock Co")).toBeVisible();
    for (const name of ["Verified Mock Co", "Rejected Mock Co", "Suspended Mock Co"]) {
      await expect(page.getByText(name)).toBeHidden();
    }
  });

  // --- Pagination --------------------------------------------------------------

  test.describe("pagination", () => {
    function makeCompanies(n: number) {
      return Array.from({ length: n }, (_, i) => ({
        _id: `pg-${i + 1}`,
        companyName: `Pagination Co ${String(i + 1).padStart(2, "0")}`,
        companyEmail: `pg${i + 1}@x.com`,
        verificationStatus: "verified"
      }));
    }

    test("pages through more than one page of companies with correct record counts", async ({ page }) => {
      await page.route("**/api/admin/companies*", (route) => route.fulfill({ json: { companies: makeCompanies(25) } }));
      await page.goto("/dashboard/admin/companies");
      const nav = page.getByRole("navigation", { name: "Pagination" });

      await expect(page.getByText("Page 1 of 3 · 25 companies")).toBeVisible();
      await expect(page.getByText("Pagination Co 01")).toBeVisible();
      await expect(page.getByText("Pagination Co 10")).toBeVisible();
      await expect(page.getByText("Pagination Co 11")).toBeHidden();

      await nav.getByRole("button", { name: "Next page" }).click();
      await expect(page.getByText("Page 2 of 3 · 25 companies")).toBeVisible();
      await expect(page.getByText("Pagination Co 11")).toBeVisible();
      await expect(page.getByText("Pagination Co 20")).toBeVisible();
      await expect(page.getByText("Pagination Co 01")).toBeHidden();

      await nav.getByRole("button", { name: "3", exact: true }).click();
      await expect(page.getByText("Page 3 of 3 · 25 companies")).toBeVisible();
      await expect(page.getByText("Pagination Co 21")).toBeVisible();
      await expect(page.getByText("Pagination Co 25")).toBeVisible();
      await expect(nav.getByRole("button", { name: "Next page" })).toBeDisabled();

      await nav.getByRole("button", { name: "Previous page" }).click();
      await expect(page.getByText("Page 2 of 3 · 25 companies")).toBeVisible();

      await nav.getByRole("button", { name: "1", exact: true }).click();
      await expect(page.getByText("Page 1 of 3 · 25 companies")).toBeVisible();
      await expect(nav.getByRole("button", { name: "Previous page" })).toBeDisabled();
    });

    test("searching resets pagination back to page 1", async ({ page }) => {
      await page.route("**/api/admin/companies*", (route) => route.fulfill({ json: { companies: makeCompanies(25) } }));
      await page.goto("/dashboard/admin/companies");
      await page.getByRole("navigation", { name: "Pagination" }).getByRole("button", { name: "3", exact: true }).click();
      await expect(page.getByText("Page 3 of 3 · 25 companies")).toBeVisible();

      await page.getByPlaceholder("Search companies...").fill("Pagination Co 0");
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await expect(page.getByText("Page 1 of 3 · 25 companies")).toBeVisible();
    });
  });

  // --- Status updates / persistence --------------------------------------------

  test("a status change made in the verification queue is still reflected after a full page reload", async ({ page }) => {
    let verified = false;
    await page.route("**/api/admin/companies*", (route) => {
      const status = verified ? "verified" : "pending";
      return route.fulfill({ json: { companies: [{ _id: "c1", companyName: "Persisted Co", companyEmail: "p@x.com", verificationStatus: status }] } });
    });
    await page.route("**/api/admin/companies/*/verification", (route) => {
      verified = true;
      return route.fulfill({
        json: { company: { _id: "c1", companyName: "Persisted Co", companyEmail: "p@x.com", verificationStatus: "verified" }, message: "ok" }
      });
    });

    await page.goto("/dashboard/admin/companies");
    await page.getByRole("button", { name: "Verify", exact: true }).click();
    await expect(page.getByRole("button", { name: "Unverify", exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "Unverify", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Verify", exact: true })).toHaveCount(0);
  });

  // --- Accessibility -------------------------------------------------------------

  test("Suspend confirmation dialog moves focus in and returns it to the trigger button on cancel", async ({ page }) => {
    await page.route("**/api/admin/companies*", (route) =>
      route.fulfill({ json: { companies: [{ _id: "c1", companyName: "Focus Check Co", companyEmail: "f@x.com", verificationStatus: "pending" }] } })
    );
    await page.goto("/dashboard/admin/verification");
    const suspendButton = page.getByRole("button", { name: "Suspend", exact: true });
    await suspendButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(":focus")).toHaveCount(1);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(suspendButton).toBeFocused();
  });

  test("verification queue's primary actions are reachable and operable by keyboard", async ({ page }) => {
    await page.route("**/api/admin/companies*", (route) =>
      route.fulfill({ json: { companies: [{ _id: "c1", companyName: "Keyboard Co", companyEmail: "k@x.com", verificationStatus: "pending" }] } })
    );
    await page.goto("/dashboard/admin/verification");

    await page.getByPlaceholder("Search companies...").focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Search", exact: true })).toBeFocused();

    const rejectButton = page.getByRole("button", { name: "Reject", exact: true });
    await rejectButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Rejection reason")).toBeVisible();
    await rejectButton.press("Enter");
    await expect(page.getByLabel("Rejection reason")).toBeHidden();
  });

  // --- Theme / responsive ---------------------------------------------------------

  test("verification queue renders correctly in light and dark appearance", async ({ page }) => {
    await page.route("**/api/admin/companies*", (route) =>
      route.fulfill({ json: { companies: [{ _id: "c1", companyName: "Theme Check Co", companyEmail: "t@x.com", verificationStatus: "pending" }] } })
    );
    await page.goto("/dashboard/admin/settings");
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await page.goto("/dashboard/admin/verification");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByText("Theme Check Co")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);

    await page.goto("/dashboard/admin/settings");
    await page.getByRole("button", { name: "Light", exact: true }).click();
    await page.goto("/dashboard/admin/verification");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.getByText("Theme Check Co")).toBeVisible();
  });

  test("verification queue renders without horizontal overflow on tablet and mobile", async ({ page }) => {
    await page.route("**/api/admin/companies*", (route) =>
      route.fulfill({
        json: { companies: [{ _id: "c1", companyName: "Responsive Check Co", companyEmail: "r@x.com", verificationStatus: "pending" }] }
      })
    );
    for (const viewport of [{ width: 768, height: 1024 }, { width: 375, height: 812 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/dashboard/admin/verification");
      await expect(page.locator("body")).not.toContainText(/something went wrong/i);
      await expect(page.getByText("Responsive Check Co")).toBeVisible();
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    }
  });
});

// Mock-driven structural coverage for the Certification Review table (real
// backend round trips -- approve/reject payloads, duplicate-review
// prevention, search scope, unicode/length handling -- live in
// workflows/admin.workflows.spec.ts, ui/forms-tables-search.spec.ts, and
// ui/modals-and-dialogs.spec.ts, which self-seed via POST /api/intern/
// certifications). Unlike company verification, this list endpoint is real
// server-side pagination (page/limit/total/totalPages all backend-computed,
// certification.service.js listCertificationsForAdmin), so the mocks here
// echo the request's page/limit/status/q params back like a real backend
// would, rather than returning one static payload regardless of query.
test.describe("Admin Certification Review module", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoleViaApi(page, "admin", ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  // --- View certification submissions -------------------------------------

  test("certification queue renders every submission detail field accurately", async ({ page }) => {
    await page.route("**/api/admin/certifications*", (route) =>
      route.fulfill({
        json: {
          certifications: [
            {
              _id: "mock-cert1",
              courseName: "Mocked Cloud Architecture",
              skillCategory: "Cloud",
              provider: "Mocked Academy",
              completionDate: "2026-01-10T00:00:00.000Z",
              expiryDate: "2028-01-10T00:00:00.000Z",
              uploadTimestamp: "2026-01-15T00:00:00.000Z",
              verificationStatus: "pending_verification",
              internName: "Asha Verma",
              userEmail: "asha@example.com"
            }
          ],
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      })
    );
    await page.goto("/dashboard/admin/certification-review");
    const row = page.getByRole("row", { name: /Mocked Cloud Architecture/ });
    await expect(row).toBeVisible();
    await expect(row.getByText("Asha Verma")).toBeVisible();
    await expect(row.getByText("asha@example.com")).toBeVisible();
    // exact:true -- non-exact "Cloud" also substring-matches the course name
    // cell's own text, "Mocked Cloud Architecture".
    await expect(row.getByText("Cloud", { exact: true })).toBeVisible();
    await expect(row.getByText("Mocked Academy")).toBeVisible();
    await expect(row.getByText("Jan 10, 2026")).toBeVisible();
    await expect(row.getByText("Jan 10, 2028")).toBeVisible();
    await expect(row.getByText("Jan 15, 2026")).toBeVisible();
    await expect(row.getByText("Pending Verification")).toBeVisible();
  });

  test("a certification without an expiry date shows an em dash in the Expires column", async ({ page }) => {
    await page.route("**/api/admin/certifications*", (route) =>
      route.fulfill({
        json: {
          certifications: [
            {
              _id: "mock-cert2",
              courseName: "No Expiry Cert",
              skillCategory: "Web",
              provider: "Academy",
              completionDate: "2026-01-10T00:00:00.000Z",
              expiryDate: null,
              uploadTimestamp: "2026-01-15T00:00:00.000Z",
              verificationStatus: "pending_verification",
              internName: "Test Intern",
              userEmail: "t@example.com"
            }
          ],
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      })
    );
    await page.goto("/dashboard/admin/certification-review");
    const row = page.getByRole("row", { name: /No Expiry Cert/ });
    await expect(row).toBeVisible();
    await expect(row.getByText("—")).toBeVisible();
  });

  // The mock intentionally ignores the status query param, returning all 3
  // statuses regardless of what the frontend requests -- this isolates what
  // this test actually checks (badge label + reason/notes rendering) from
  // filtering mechanics, which is covered separately below.
  test("status badges render the correct label and reason/notes text for each status", async ({ page }) => {
    await page.route("**/api/admin/certifications*", (route) =>
      route.fulfill({
        json: {
          certifications: [
            { _id: "p1", courseName: "Pending Cert", skillCategory: "Web", provider: "Prov", completionDate: "2026-01-01T00:00:00.000Z", verificationStatus: "pending_verification", internName: "A", userEmail: "a@x.com" },
            { _id: "v1", courseName: "Verified Cert", skillCategory: "Web", provider: "Prov", completionDate: "2026-01-01T00:00:00.000Z", verificationStatus: "verified", reviewNotes: "Looks great", internName: "B", userEmail: "b@x.com" },
            { _id: "r1", courseName: "Rejected Cert", skillCategory: "Web", provider: "Prov", completionDate: "2026-01-01T00:00:00.000Z", verificationStatus: "rejected", rejectionReason: "Blurry scan", internName: "C", userEmail: "c@x.com" }
          ],
          page: 1,
          limit: 10,
          total: 3,
          totalPages: 1
        }
      })
    );
    await page.goto("/dashboard/admin/certification-review");
    // Scoped to the table -- the status filter <select>'s own <option>
    // elements carry this exact same text ("Pending Verification"/"Verified"/
    // "Rejected"), which an unscoped getByText also resolves against.
    const table = page.getByRole("table");
    await expect(table.getByText("Pending Verification", { exact: true })).toBeVisible();
    await expect(table.getByText("Verified", { exact: true })).toBeVisible();
    await expect(table.getByText("Rejected", { exact: true })).toBeVisible();
    await expect(page.getByText("Looks great")).toBeVisible();
    await expect(page.getByText("Blurry scan")).toBeVisible();
    // Reason/notes text only ever shows for the status it belongs to.
    await expect(page.getByRole("row", { name: /Pending Cert/ }).getByText(/Looks great|Blurry scan/)).toHaveCount(0);
  });

  test("certification queue shows an accessible loading state while submissions are in flight", async ({ page }) => {
    await page.route("**/api/admin/certifications*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({ json: { certifications: [], page: 1, limit: 10, total: 0, totalPages: 1 } });
    });
    await page.goto("/dashboard/admin/certification-review");
    await expect(page.getByRole("status", { name: "Loading table", exact: true })).toBeVisible();
    await expect(page.getByRole("status", { name: "Loading table", exact: true })).toBeHidden({ timeout: 15000 });
  });

  test("empty state copy differs between an empty queue and a search with no matches", async ({ page }) => {
    await page.route("**/api/admin/certifications*", (route) =>
      route.fulfill({ json: { certifications: [], page: 1, limit: 10, total: 0, totalPages: 1 } })
    );
    await page.goto("/dashboard/admin/certification-review");
    await expect(page.getByText("No certifications in this queue")).toBeVisible();
    await expect(page.getByText("New submissions will appear here for review.")).toBeVisible();

    await page.getByPlaceholder(/search by course, provider, or category/i).fill("zzzznonexistentzzzz9999");
    await expect(page.getByText("No certifications match your search")).toBeVisible();
    await expect(page.getByText("Try a different search term.")).toBeVisible();
  });

  test("certification queue shows a retryable error state when the list fails to load, and Refresh recovers", async ({ page }) => {
    let failFirst = true;
    await page.route("**/api/admin/certifications*", (route) => {
      if (failFirst) {
        failFirst = false;
        return route.fulfill({ status: 500, json: { message: "Internal error" } });
      }
      return route.fulfill({
        json: {
          certifications: [
            { _id: "c1", courseName: "Recovered Cert", skillCategory: "Web", provider: "Prov", completionDate: "2026-01-01T00:00:00.000Z", verificationStatus: "pending_verification", internName: "A", userEmail: "a@x.com" }
          ],
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      });
    });
    await page.goto("/dashboard/admin/certification-review");
    // Unlike the Company Verification queue's ErrorState, this module uses
    // the plain Alert component (components/ui/alert.tsx -- message only,
    // no built-in retry button), so recovery goes through the page's own
    // persistent Refresh button. Scoped to <main> to avoid colliding with
    // Next.js's own role="alert" route-announcer div.
    await expect(page.locator("main").getByRole("alert")).toBeVisible();
    // .last() -- every admin view has two "Refresh" buttons: the shell's own
    // global page-header one (admin-dashboard-page.tsx, calls its own
    // loadData(true), unrelated to this component's data) and
    // AdminCertificationReview's own local one, which is the one that
    // actually re-runs this component's load(). The local one renders after
    // the shell header in the DOM, so .last() is it.
    await page.getByRole("button", { name: "Refresh", exact: true }).last().click();
    await expect(page.locator("main").getByRole("alert")).toBeHidden();
    await expect(page.getByText("Recovered Cert")).toBeVisible();
  });

  // --- Approve / Reject payload contracts ---------------------------------

  test("Approve sends only reviewNotes (no rejectionReason key), and immediately removes the row from the pending queue", async ({ page }) => {
    let reviewRequestBody: unknown = null;
    let callCount = 0;
    await page.route("**/api/admin/certifications*", (route) => {
      callCount += 1;
      const stillPending = callCount === 1;
      return route.fulfill({
        json: {
          certifications: stillPending
            ? [{ _id: "mock-a1", courseName: "Approve Me Cert", skillCategory: "Web", provider: "Prov", completionDate: "2026-01-01T00:00:00.000Z", verificationStatus: "pending_verification", internName: "A", userEmail: "a@x.com" }]
            : [],
          page: 1,
          limit: 10,
          total: stillPending ? 1 : 0,
          totalPages: 1
        }
      });
    });
    await page.route("**/api/admin/certifications/*/review", (route) => {
      reviewRequestBody = route.request().postDataJSON();
      return route.fulfill({ json: { message: "ok", certification: { _id: "mock-a1", verificationStatus: "verified" } } });
    });

    await page.goto("/dashboard/admin/certification-review");
    await page.getByRole("row", { name: /Approve Me Cert/ }).getByRole("button", { name: "Review", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Review remarks").fill("Looks good.");
    await dialog.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Approve Me Cert")).toBeHidden();
    expect(reviewRequestBody).toEqual({ status: "verified", reviewNotes: "Looks good." });
  });

  test("Reject sends only rejectionReason (no reviewNotes key), and immediately removes the row from the pending queue", async ({ page }) => {
    let reviewRequestBody: unknown = null;
    let callCount = 0;
    await page.route("**/api/admin/certifications*", (route) => {
      callCount += 1;
      const stillPending = callCount === 1;
      return route.fulfill({
        json: {
          certifications: stillPending
            ? [{ _id: "mock-r1", courseName: "Reject Me Cert", skillCategory: "Web", provider: "Prov", completionDate: "2026-01-01T00:00:00.000Z", verificationStatus: "pending_verification", internName: "A", userEmail: "a@x.com" }]
            : [],
          page: 1,
          limit: 10,
          total: stillPending ? 1 : 0,
          totalPages: 1
        }
      });
    });
    await page.route("**/api/admin/certifications/*/review", (route) => {
      reviewRequestBody = route.request().postDataJSON();
      return route.fulfill({ json: { message: "ok", certification: { _id: "mock-r1", verificationStatus: "rejected" } } });
    });

    await page.goto("/dashboard/admin/certification-review");
    await page.getByRole("row", { name: /Reject Me Cert/ }).getByRole("button", { name: "Review", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Review remarks").fill("Blurry scan.");
    await dialog.getByRole("button", { name: "Reject", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Reject Me Cert")).toBeHidden();
    expect(reviewRequestBody).toEqual({ status: "rejected", rejectionReason: "Blurry scan." });
  });

  test("a failed review request surfaces an error on the page and leaves the dialog open with the typed remarks intact", async ({ page }) => {
    await page.route("**/api/admin/certifications*", (route) =>
      route.fulfill({
        json: {
          certifications: [
            { _id: "c1", courseName: "Flaky Cert", skillCategory: "Web", provider: "Prov", completionDate: "2026-01-01T00:00:00.000Z", verificationStatus: "pending_verification", internName: "A", userEmail: "a@x.com" }
          ],
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      })
    );
    await page.route("**/api/admin/certifications/*/review", (route) =>
      route.fulfill({ status: 500, json: { message: "Review service unavailable" } })
    );
    await page.goto("/dashboard/admin/certification-review");
    await page.getByRole("row", { name: /Flaky Cert/ }).getByRole("button", { name: "Review", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Review remarks").fill("Looks fine.");
    await dialog.getByRole("button", { name: "Approve", exact: true }).click();
    // submitReview only clears reviewTarget (closes the dialog) on success --
    // the error Alert renders on the page underneath the modal overlay, not
    // inside the dialog itself (admin-certification-review.tsx).
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Review remarks")).toHaveValue("Looks fine.");
    await expect(page.getByText("Review service unavailable")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("row", { name: /Flaky Cert/ })).toBeVisible();
  });

  // --- Pagination ----------------------------------------------------------

  test.describe("pagination", () => {
    function makeCertifications(n: number) {
      return Array.from({ length: n }, (_, i) => ({
        _id: `pg-${i + 1}`,
        courseName: `Pagination Cert ${String(i + 1).padStart(2, "0")}`,
        skillCategory: "Web",
        provider: "Pagination Provider",
        completionDate: "2026-01-01T00:00:00.000Z",
        verificationStatus: "pending_verification",
        internName: "Pager Intern",
        userEmail: "pager@x.com"
      }));
    }

    test("pages through more than one page of certifications, driven by real server pagination params", async ({ page }) => {
      const all = makeCertifications(25);
      await page.route("**/api/admin/certifications*", (route) => {
        const url = new URL(route.request().url());
        const reqPage = Number(url.searchParams.get("page") || "1");
        const limit = Number(url.searchParams.get("limit") || "10");
        const start = (reqPage - 1) * limit;
        return route.fulfill({
          json: {
            certifications: all.slice(start, start + limit),
            page: reqPage,
            limit,
            total: all.length,
            totalPages: Math.ceil(all.length / limit)
          }
        });
      });
      await page.goto("/dashboard/admin/certification-review");
      const nav = page.getByRole("navigation", { name: "Pagination" });

      await expect(page.getByText("Page 1 of 3 · 10 of 25 certifications")).toBeVisible();
      await expect(page.getByText("Pagination Cert 01")).toBeVisible();
      await expect(page.getByText("Pagination Cert 10")).toBeVisible();
      await expect(page.getByText("Pagination Cert 11")).toBeHidden();

      await nav.getByRole("button", { name: "Next page" }).click();
      await expect(page.getByText("Page 2 of 3 · 10 of 25 certifications")).toBeVisible();
      await expect(page.getByText("Pagination Cert 11")).toBeVisible();
      await expect(page.getByText("Pagination Cert 20")).toBeVisible();
      await expect(page.getByText("Pagination Cert 01")).toBeHidden();

      await nav.getByRole("button", { name: "3", exact: true }).click();
      await expect(page.getByText("Page 3 of 3 · 5 of 25 certifications")).toBeVisible();
      await expect(page.getByText("Pagination Cert 21")).toBeVisible();
      await expect(page.getByText("Pagination Cert 25")).toBeVisible();
      await expect(nav.getByRole("button", { name: "Next page" })).toBeDisabled();

      await nav.getByRole("button", { name: "Previous page" }).click();
      await expect(page.getByText("Page 2 of 3 · 10 of 25 certifications")).toBeVisible();

      await nav.getByRole("button", { name: "1", exact: true }).click();
      await expect(page.getByText("Page 1 of 3 · 10 of 25 certifications")).toBeVisible();
      await expect(nav.getByRole("button", { name: "Previous page" })).toBeDisabled();
    });

    test("searching resets pagination back to page 1", async ({ page }) => {
      const all = makeCertifications(25);
      await page.route("**/api/admin/certifications*", (route) => {
        const url = new URL(route.request().url());
        const reqPage = Number(url.searchParams.get("page") || "1");
        const limit = Number(url.searchParams.get("limit") || "10");
        const q = (url.searchParams.get("q") || "").toLowerCase();
        const filtered = q ? all.filter((c) => c.courseName.toLowerCase().includes(q)) : all;
        const start = (reqPage - 1) * limit;
        return route.fulfill({
          json: {
            certifications: filtered.slice(start, start + limit),
            page: reqPage,
            limit,
            total: filtered.length,
            totalPages: Math.max(1, Math.ceil(filtered.length / limit))
          }
        });
      });
      await page.goto("/dashboard/admin/certification-review");
      await page.getByRole("navigation", { name: "Pagination" }).getByRole("button", { name: "3", exact: true }).click();
      await expect(page.getByText(/Page 3 of 3/)).toBeVisible();

      await page.getByPlaceholder(/search by course, provider, or category/i).fill("Pagination Cert 0");
      await expect(page.getByText(/Page 1 of/)).toBeVisible();
    });

    test("changing the status filter also resets pagination back to page 1", async ({ page }) => {
      const all = makeCertifications(25);
      await page.route("**/api/admin/certifications*", (route) => {
        const url = new URL(route.request().url());
        const reqPage = Number(url.searchParams.get("page") || "1");
        const limit = Number(url.searchParams.get("limit") || "10");
        const start = (reqPage - 1) * limit;
        return route.fulfill({
          json: {
            certifications: all.slice(start, start + limit),
            page: reqPage,
            limit,
            total: all.length,
            totalPages: Math.ceil(all.length / limit)
          }
        });
      });
      await page.goto("/dashboard/admin/certification-review");
      await page.getByRole("navigation", { name: "Pagination" }).getByRole("button", { name: "2", exact: true }).click();
      await expect(page.getByText(/Page 2 of 3/)).toBeVisible();

      await page.getByRole("combobox", { name: "Filter certification status" }).selectOption("verified");
      await expect(page.getByText(/Page 1 of 3/)).toBeVisible();
    });
  });

  // --- Filters ---------------------------------------------------------------

  test("search and status filter combine correctly -- both query params are sent together", async ({ page }) => {
    let capturedQuery: URLSearchParams | null = null;
    await page.route("**/api/admin/certifications*", (route) => {
      capturedQuery = new URL(route.request().url()).searchParams;
      return route.fulfill({ json: { certifications: [], page: 1, limit: 10, total: 0, totalPages: 1 } });
    });
    await page.goto("/dashboard/admin/certification-review");
    await page.getByRole("combobox", { name: "Filter certification status" }).selectOption("rejected");
    await page.getByPlaceholder(/search by course, provider, or category/i).fill("cloud");
    await expect.poll(() => capturedQuery?.get("status")).toBe("rejected");
    await expect.poll(() => capturedQuery?.get("q")).toBe("cloud");
  });

  test("clearing search and resetting the status filter restores the default pending queue", async ({ page }) => {
    await page.route("**/api/admin/certifications*", (route) => {
      const url = new URL(route.request().url());
      const status = url.searchParams.get("status") || "";
      const q = url.searchParams.get("q") || "";
      const matches = status === "pending_verification" && q === "";
      return route.fulfill({
        json: {
          certifications: matches
            ? [{ _id: "c1", courseName: "Default Queue Cert", skillCategory: "Web", provider: "Prov", completionDate: "2026-01-01T00:00:00.000Z", verificationStatus: "pending_verification", internName: "A", userEmail: "a@x.com" }]
            : [],
          page: 1,
          limit: 10,
          total: matches ? 1 : 0,
          totalPages: 1
        }
      });
    });
    await page.goto("/dashboard/admin/certification-review");
    await expect(page.getByText("Default Queue Cert")).toBeVisible();

    await page.getByPlaceholder(/search by course, provider, or category/i).fill("nonsense query");
    await page.getByRole("combobox", { name: "Filter certification status" }).selectOption("verified");
    await expect(page.getByText("No certifications")).toBeVisible();

    await page.getByRole("button", { name: "Clear search", exact: true }).click();
    await page.getByRole("combobox", { name: "Filter certification status" }).selectOption("pending_verification");
    await expect(page.getByText("Default Queue Cert")).toBeVisible();
  });

  // --- Accessibility / theme / responsive -------------------------------------

  test("certification queue's primary controls are reachable and operable by keyboard", async ({ page }) => {
    await page.route("**/api/admin/certifications*", (route) =>
      route.fulfill({
        json: {
          certifications: [
            { _id: "c1", courseName: "Keyboard Cert", skillCategory: "Web", provider: "Prov", completionDate: "2026-01-01T00:00:00.000Z", verificationStatus: "pending_verification", internName: "A", userEmail: "a@x.com" }
          ],
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      })
    );
    await page.goto("/dashboard/admin/certification-review");

    await page.getByPlaceholder(/search by course, provider, or category/i).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("combobox", { name: "Filter certification status" })).toBeFocused();
    await page.keyboard.press("Tab");
    // .last() -- see the comment in the "Refresh recovers" error-state test
    // above: every admin view also has the shell's own global Refresh
    // button, earlier in the DOM. Tab naturally lands on this component's
    // own local one next (same toolbar row as the fields just tabbed
    // through); .last() just makes the assertion locator unambiguous.
    await expect(page.getByRole("button", { name: "Refresh", exact: true }).last()).toBeFocused();

    const reviewButton = page.getByRole("row", { name: /Keyboard Cert/ }).getByRole("button", { name: "Review", exact: true });
    await reviewButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("certification queue renders correctly in light and dark appearance", async ({ page }) => {
    await page.route("**/api/admin/certifications*", (route) =>
      route.fulfill({
        json: {
          certifications: [
            { _id: "c1", courseName: "Theme Check Cert", skillCategory: "Web", provider: "Prov", completionDate: "2026-01-01T00:00:00.000Z", verificationStatus: "pending_verification", internName: "A", userEmail: "a@x.com" }
          ],
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      })
    );
    await page.goto("/dashboard/admin/settings");
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await page.goto("/dashboard/admin/certification-review");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByText("Theme Check Cert")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);

    await page.goto("/dashboard/admin/settings");
    await page.getByRole("button", { name: "Light", exact: true }).click();
    await page.goto("/dashboard/admin/certification-review");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.getByText("Theme Check Cert")).toBeVisible();
  });

  test("certification queue renders without horizontal overflow on tablet and mobile", async ({ page }) => {
    await page.route("**/api/admin/certifications*", (route) =>
      route.fulfill({
        json: {
          certifications: [
            { _id: "c1", courseName: "Responsive Check Cert", skillCategory: "Web", provider: "Prov", completionDate: "2026-01-01T00:00:00.000Z", verificationStatus: "pending_verification", internName: "A", userEmail: "a@x.com" }
          ],
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      })
    );
    for (const viewport of [{ width: 768, height: 1024 }, { width: 375, height: 812 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/dashboard/admin/certification-review");
      await expect(page.locator("body")).not.toContainText(/something went wrong/i);
      await expect(page.getByText("Responsive Check Cert")).toBeVisible();
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    }
  });
});

// "System Settings" here is the real, existing Admin Settings view -- account
// info, MFA/session policy notices, dev-seed credentials. It is a static,
// read-only display sourced entirely from the already-loaded session (no
// fetch of its own), not an editable/persisted config feature -- there is no
// such feature in the codebase (no backend route, no DB model). Save/cancel/
// reset/concurrent-update/loading/error-state checklist items are therefore
// not applicable and are intentionally not tested here; per-role reachability
// (the "unauthorized access protection" checklist item) is already covered
// by admin-permission-matrix.spec.ts (settings -> allow for all 4 roles).
test.describe("Admin Settings module", () => {
  test("static account info reflects the logged-in super admin correctly", async ({ page }) => {
    await loginAsRoleViaApi(page, "admin", ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/dashboard/admin/settings");
    await expect(page.getByText(`Email: ${ADMIN_EMAIL}`, { exact: true })).toBeVisible();
    await expect(page.getByText("Role: super admin", { exact: true })).toBeVisible();
    await expect(page.getByText(/^\d+ permissions assigned$/)).toBeVisible();
  });

  test("a restricted admin sub-role shows its own email/role and a smaller permission count than super admin", async ({ page }) => {
    await loginAsRoleViaApi(page, "admin", ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/dashboard/admin/settings");
    const superAdminCountText = await page.getByText(/^\d+ permissions assigned$/).textContent();
    const superAdminCount = Number(superAdminCountText?.match(/\d+/)?.[0]);
    expect(superAdminCount).toBeGreaterThan(0);

    // Second login on the same page: addInitScript calls accumulate and run
    // in registration order on every subsequent navigation, so the most
    // recently added one always wins for the next goto -- this correctly
    // simulates switching the authenticated account mid-test.
    await loginAsRoleViaApi(page, "admin", ADMIN_VERIFICATION_EMAIL, ADMIN_VERIFICATION_PASSWORD);
    await page.goto("/dashboard/admin/settings");
    await expect(page.getByText(`Email: ${ADMIN_VERIFICATION_EMAIL}`, { exact: true })).toBeVisible();
    await expect(page.getByText("Role: verification admin", { exact: true })).toBeVisible();
    const subAdminCountText = await page.getByText(/^\d+ permissions assigned$/).textContent();
    const subAdminCount = Number(subAdminCountText?.match(/\d+/)?.[0]);
    expect(subAdminCount).toBeGreaterThan(0);
    expect(subAdminCount).toBeLessThan(superAdminCount);
  });

  test("static MFA policy, session security, and dev-seed notices render correctly", async ({ page }) => {
    await loginAsRoleViaApi(page, "admin", ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/dashboard/admin/settings");
    await expect(page.getByText("Admin MFA Policy", { exact: true })).toBeVisible();
    await expect(page.getByText(/mandatory OTP verification/i)).toBeVisible();
    await expect(page.getByText("Session Security", { exact: true })).toBeVisible();
    await expect(page.getByText(/access tokens auto-refresh/i)).toBeVisible();
    await expect(page.getByText("Default Admin Credentials (dev seed)", { exact: true })).toBeVisible();
  });

  test("Settings view renders correctly in light and dark appearance", async ({ page }) => {
    await loginAsRoleViaApi(page, "admin", ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/dashboard/admin/settings");
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByText("Administrative Settings", { exact: true })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);

    await page.getByRole("button", { name: "Light", exact: true }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.getByText("Administrative Settings", { exact: true })).toBeVisible();
  });

  test("Settings view renders without horizontal overflow on tablet and mobile", async ({ page }) => {
    await loginAsRoleViaApi(page, "admin", ADMIN_EMAIL, ADMIN_PASSWORD);
    for (const viewport of [{ width: 768, height: 1024 }, { width: 375, height: 812 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/dashboard/admin/settings");
      await expect(page.getByText("Administrative Settings", { exact: true })).toBeVisible();
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    }
  });
});

// User Management: role is "intern"/"company"/"admin" in this codebase --
// there is no separate literal "Student"/"Recruiter" role, so those
// checklist terms map onto "intern"/"company" rows here. Search is
// email-only by design (buildUserFilter on the backend); Users have no name
// field of their own (names live on the per-role InternProfile/
// CompanyProfile documents), so "search by name" is not applicable. Sorting
// and date filters are not implemented (fixed createdAt-desc order, no date
// range param) and are out of scope per the checklist's own "if
// available"/"if supported" hedge on those items. Per-role reachability of
// the "users" view is already covered by admin-permission-matrix.spec.ts.
test.describe("Admin User Management module", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoleViaApi(page, "admin", ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test("Users view shows an accessible loading state while the list is in flight", async ({ page }) => {
    await page.route("**/api/admin/users*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });
    await page.goto("/dashboard/admin/users");
    await expect(page.getByRole("status", { name: "Loading table" })).toBeVisible();
    await expect(page.getByRole("status", { name: "Loading table" })).toBeHidden({ timeout: 15000 });
    await expect(page.getByRole("columnheader", { name: "Email" })).toBeVisible();
  });

  test("a nonsense search shows an empty state, and Clear Filters restores the full list", async ({ page }) => {
    await page.goto("/dashboard/admin/users");
    await page.getByPlaceholder(/search by email/i).fill("zzzznonexistentuserzzzz9999");
    await expect(page.getByText("No users found")).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear Filters" })).toBeVisible();

    await page.getByRole("button", { name: "Clear Filters" }).click();
    await expect(page.getByPlaceholder(/search by email/i)).toHaveValue("");
    await expect(page.getByText("No users found")).toBeHidden();
    await expect(page.getByRole("columnheader", { name: "Email" })).toBeVisible();
  });

  test("shows a retryable error state when the list fails to load, and Retry recovers", async ({ page }) => {
    // Fail every request until the flag flips -- see the metrics retry test
    // above for why "fail only the first request" is order-fragile.
    let failRequests = true;
    await page.route("**/api/admin/users*", (route) => {
      if (failRequests) {
        return route.fulfill({ status: 500, json: { message: "Internal error" } });
      }
      return route.continue();
    });
    await page.goto("/dashboard/admin/users");
    const retryButton = page.getByRole("button", { name: /retry|try again/i });
    await expect(retryButton).toBeVisible();

    failRequests = false;
    await retryButton.click();
    await expect(retryButton).toBeHidden();
    await expect(page.getByRole("columnheader", { name: "Email" })).toBeVisible();
  });

  test("status filter narrows the table to only active users", async ({ page }) => {
    await page.goto("/dashboard/admin/users");
    await page.getByRole("combobox", { name: "Filter by status" }).selectOption("true");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);
    await expect(page.getByRole("cell", { name: "Inactive", exact: true })).toHaveCount(0);
    expect(await page.getByRole("row").count()).toBeGreaterThan(1);
  });

  test("role and status filters combine to an empty result, and Clear Filters resets every control", async ({ page }) => {
    await page.goto("/dashboard/admin/users");
    await page.getByPlaceholder(/search by email/i).fill("zzzznonexistentuserzzzz9999");
    await page.getByRole("combobox", { name: "Filter by role" }).selectOption("admin");
    await page.getByRole("combobox", { name: "Filter by status" }).selectOption("true");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.getByText("No users found")).toBeVisible();

    await page.getByRole("button", { name: "Clear Filters" }).click();
    await expect(page.getByPlaceholder(/search by email/i)).toHaveValue("");
    await expect(page.getByRole("combobox", { name: "Filter by role" })).toHaveValue("");
    await expect(page.getByRole("combobox", { name: "Filter by status" })).toHaveValue("");
    // Role filter genuinely reset -- a non-admin row is reachable again.
    await expect(page.getByRole("cell", { name: "intern", exact: true }).first()).toBeVisible();
  });

  test("search matches partially and case-insensitively by email, and re-filters when the query changes", async ({ page }) => {
    await page.goto("/dashboard/admin/users");
    const search = page.getByPlaceholder(/search by email/i);

    await search.fill("E2E.ADMIN.VERIFICATION");
    await expect(page.getByRole("cell", { name: ADMIN_VERIFICATION_EMAIL, exact: true })).toBeVisible();

    await search.fill("e2e.intern");
    await expect(page.getByRole("cell", { name: STUDENT_EMAIL, exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: ADMIN_VERIFICATION_EMAIL, exact: true })).toBeHidden();
  });

  test("View opens a details modal with role-specific information for admin, intern, and company rows", async ({ page }) => {
    await page.goto("/dashboard/admin/users");
    const search = page.getByPlaceholder(/search by email/i);

    await search.fill(ADMIN_VERIFICATION_EMAIL);
    await page.getByRole("row", { name: new RegExp(ADMIN_VERIFICATION_EMAIL.replace(/\./g, "\\.")) }).getByRole("button", { name: "View" }).click();
    let dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Admin privileges", { exact: true })).toBeVisible();
    await expect(dialog.getByText("verification admin")).toBeVisible();
    // The concrete permission grants render too, not just the role label.
    await expect(dialog.getByText(/admin:company:verify/)).toBeVisible();
    await expect(dialog.getByText(/admin:certification:review/)).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();

    await search.fill(STUDENT_EMAIL);
    await page.getByRole("row", { name: new RegExp(STUDENT_EMAIL.replace(/\./g, "\\.")) }).getByRole("button", { name: "View" }).click();
    dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Name legitimately renders twice -- once in the modal title, once next
    // to the avatar -- both are the same correct value, so .first() is fine.
    await expect(dialog.getByText("E2E Test Intern").first()).toBeVisible();
    await expect(dialog.getByText("9999900001")).toBeVisible();
    await expect(dialog.getByText("Academic", { exact: true })).toBeVisible();
    await expect(dialog.getByText("No academic details on file.")).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();

    await search.fill(COMPANY_OWNER_EMAIL);
    await page.getByRole("row", { name: new RegExp(COMPANY_OWNER_EMAIL.replace(/\./g, "\\.")) }).getByRole("button", { name: "View" }).click();
    dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Same title + body duplication as the intern case above.
    await expect(dialog.getByText("E2E Test Company", { exact: true }).first()).toBeVisible();
    await expect(dialog.getByText("verified", { exact: true })).toBeVisible();
    // Company association: the linked CompanyProfile's own email, not just the name.
    await expect(dialog.getByText("Company", { exact: true })).toBeVisible();
    await expect(dialog.getByText(COMPANY_OWNER_EMAIL).nth(1)).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
  });

  test("details modal falls back to initials (no photo) and closes on Escape", async ({ page }) => {
    await page.goto("/dashboard/admin/users");
    await page.getByPlaceholder(/search by email/i).fill(STUDENT_EMAIL);
    await page.getByRole("row", { name: new RegExp(STUDENT_EMAIL.replace(/\./g, "\\.")) }).getByRole("button", { name: "View" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // No photoUrl on this fixture -- Avatar renders the initials span, not an <img>.
    await expect(dialog.getByRole("img")).toHaveCount(0);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("details modal shows a not-found error state for a user that no longer exists, with Retry", async ({ page }) => {
    await page.goto("/dashboard/admin/users");
    await page.getByPlaceholder(/search by email/i).fill(ADMIN_VERIFICATION_EMAIL);
    const viewButton = page.getByRole("row", { name: new RegExp(ADMIN_VERIFICATION_EMAIL.replace(/\./g, "\\.")) }).getByRole("button", { name: "View" });
    await expect(viewButton).toBeVisible();

    await page.route("**/api/admin/users/*", (route) => route.fulfill({ status: 404, json: { message: "User not found" } }));
    await viewButton.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("User not found")).toBeVisible();
    const retryButton = dialog.getByRole("button", { name: /retry|try again/i });
    await expect(retryButton).toBeVisible();

    await page.unroute("**/api/admin/users/*");
    await retryButton.click();
    await expect(dialog.getByText("Admin privileges", { exact: true })).toBeVisible();
  });

  test("bulk-select activates and deactivates a user at once, then reverts", async ({ page }) => {
    await page.goto("/dashboard/admin/users");
    await page.getByPlaceholder(/search by email/i).fill("studentmail.example");
    const row = page.getByRole("row", { name: /studentmail\.example/ }).first();
    test.skip((await row.count()) === 0, "No non-fixture seeded student found to safely target.");

    await row.getByRole("checkbox").check();
    await expect(page.getByText("1 user selected")).toBeVisible();
    await page.getByRole("button", { name: "Deactivate", exact: true }).first().click();
    await expect(page.getByText("Users deactivated")).toBeVisible();
    await expect(row.getByRole("cell", { name: "Inactive", exact: true })).toBeVisible();

    // Revert -- leave the seeded account active as found.
    await row.getByRole("checkbox").check();
    await expect(page.getByText("1 user selected")).toBeVisible();
    await page.getByRole("button", { name: "Activate", exact: true }).first().click();
    await expect(page.getByText("Users activated")).toBeVisible();
    await expect(row.getByRole("cell", { name: "Active", exact: true })).toBeVisible();
  });

  test("User Management renders correctly in light and dark appearance", async ({ page }) => {
    await page.goto("/dashboard/admin/settings");
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await page.goto("/dashboard/admin/users");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);
    await page.getByPlaceholder(/search by email/i).fill(ADMIN_VERIFICATION_EMAIL);
    await page.getByRole("row", { name: new RegExp(ADMIN_VERIFICATION_EMAIL.replace(/\./g, "\\.")) }).getByRole("button", { name: "View" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.goto("/dashboard/admin/settings");
    await page.getByRole("button", { name: "Light", exact: true }).click();
    await page.goto("/dashboard/admin/users");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);
  });

  test("User Management renders without horizontal overflow on tablet and mobile", async ({ page }) => {
    for (const viewport of [{ width: 768, height: 1024 }, { width: 375, height: 812 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/dashboard/admin/users");
      await expect(page.getByRole("columnheader", { name: "Email" })).toBeVisible();
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    }
  });

  test("View button is reachable and activatable by keyboard", async ({ page }) => {
    await page.goto("/dashboard/admin/users");
    await page.getByPlaceholder(/search by email/i).fill(ADMIN_VERIFICATION_EMAIL);
    const viewButton = page.getByRole("row", { name: new RegExp(ADMIN_VERIFICATION_EMAIL.replace(/\./g, "\\.")) }).getByRole("button", { name: "View" });
    await viewButton.focus();
    await expect(viewButton).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("a search containing regex metacharacters shows the empty state, not an error", async ({ page }) => {
    // Regression: buildUserFilter used to pass the raw query into $regex, so
    // "(" reached MongoDB as an invalid regex and the whole list request
    // 500'd (error banner + Retry) instead of returning zero matches.
    await page.goto("/dashboard/admin/users");
    await page.getByPlaceholder(/search by email/i).fill("(unclosed[bracket");
    await expect(page.getByText("No users found")).toBeVisible();
    await expect(page.getByRole("button", { name: /retry|try again/i })).toHaveCount(0);
  });

  test("searching a full email is an exact match, and the inline Clear button restores the list", async ({ page }) => {
    await page.goto("/dashboard/admin/users");
    await page.getByPlaceholder(/search by email/i).fill(STUDENT_EMAIL);
    await expect(page.getByRole("cell", { name: STUDENT_EMAIL, exact: true })).toBeVisible();
    // Header row + the single match.
    await expect(page.getByRole("row")).toHaveCount(2);

    // SearchInput's own X control (aria-label "Clear search"), distinct from
    // the empty-state's Clear Filters button.
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(page.getByPlaceholder(/search by email/i)).toHaveValue("");
    await expect(page.getByRole("row").nth(2)).toBeVisible();
  });

  test("recruiter listing: role=company filter combined with search returns only the fixture company accounts", async ({ page }) => {
    await page.goto("/dashboard/admin/users");
    await page.getByRole("combobox", { name: "Filter by role" }).selectOption("company");
    await page.getByPlaceholder(/search by email/i).fill("e2e.company");
    await expect(page.getByRole("cell", { name: COMPANY_OWNER_EMAIL, exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "e2e.company.hr@internai-test.local", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "e2e.company.ceo@internai-test.local", exact: true })).toBeVisible();
    // Filter really constrained the role -- nothing leaked through.
    await expect(page.getByRole("cell", { name: "intern", exact: true })).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "admin", exact: true })).toHaveCount(0);
  });

  test("searching from page 2 resets pagination to page 1 and finds the match", async ({ page }) => {
    await page.goto("/dashboard/admin/users");
    const nextButton = page.getByRole("button", { name: "Next page" });
    test.skip((await nextButton.count()) === 0 || !(await nextButton.isEnabled()), "Not enough users in this dev DB for a second page.");

    await nextButton.click();
    await expect(page.getByText(/^Page 2 ·/)).toBeVisible();

    await page.getByPlaceholder(/search by email/i).fill(STUDENT_EMAIL);
    await expect(page.getByRole("cell", { name: STUDENT_EMAIL, exact: true })).toBeVisible();
    await expect(page.getByText(/^Page 1 ·/)).toBeVisible();
  });

  test("status filter narrows to inactive users only (or the empty state when none exist)", async ({ page }) => {
    await page.goto("/dashboard/admin/users");
    await page.getByRole("combobox", { name: "Filter by status" }).selectOption("false");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);
    // Whether the dev DB currently has inactive users or not, no Active row
    // may leak through the isActive=false filter.
    await expect(page.getByRole("cell", { name: "Active", exact: true })).toHaveCount(0);
  });

  test("a failed status-update PATCH surfaces the error banner and leaves the row unchanged", async ({ page }) => {
    await page.goto("/dashboard/admin/users");
    await page.getByPlaceholder(/search by email/i).fill(STUDENT_EMAIL);
    const row = page.getByRole("row", { name: new RegExp(STUDENT_EMAIL.replace(/\./g, "\\.")) });
    // Wait for the DEBOUNCED search fetch to fully land (header + exactly one
    // match) before acting. The fixture row is often already visible in the
    // unfiltered page-1 list, so asserting only row visibility can pass while
    // the debounced loadData is still in flight -- that late fetch resets
    // error state and would wipe the banner this test is about to assert.
    await expect(page.getByRole("row")).toHaveCount(2);
    await expect(row.getByRole("button", { name: "Deactivate", exact: true })).toBeVisible();

    await page.route("**/api/admin/users/*", (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      return route.fulfill({ status: 500, json: { message: "Injected update failure" } });
    });
    await row.getByRole("button", { name: "Deactivate", exact: true }).click();
    await expect(page.getByRole("button", { name: /retry|try again/i })).toBeVisible();
    // No success toast, and the fixture is still active.
    await expect(page.getByText("User deactivated")).toHaveCount(0);
    await expect(row.getByRole("button", { name: "Deactivate", exact: true })).toBeVisible();

    // Retry (with the failure gone) clears the banner and reloads the list.
    await page.unroute("**/api/admin/users/*");
    await page.getByRole("button", { name: /retry|try again/i }).click();
    await expect(page.getByRole("button", { name: /retry|try again/i })).toHaveCount(0);
    await expect(page.getByRole("cell", { name: STUDENT_EMAIL, exact: true })).toBeVisible();
  });

  test("users table exposes an accessible structure: named columns and labelled row checkboxes", async ({ page }) => {
    await page.goto("/dashboard/admin/users");
    for (const column of ["Email", "Role", "Admin Role", "Status", "Joined", "Actions"]) {
      await expect(page.getByRole("columnheader", { name: column, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("checkbox", { name: "Select all users on this page" })).toBeVisible();
    await page.getByPlaceholder(/search by email/i).fill(STUDENT_EMAIL);
    await expect(page.getByRole("checkbox", { name: `Select ${STUDENT_EMAIL}` })).toBeVisible();
  });
});

test.describe("Admin User Management module -- Support Admin action-level coverage", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoleViaApi(page, "admin", ADMIN_SUPPORT_EMAIL, ADMIN_SUPPORT_PASSWORD);
  });

  // Support Admin owns admin:user:update (ROLE_PERMISSIONS, roles.js) -- every
  // Deactivate/Activate test elsewhere in this file runs as Super Admin only,
  // which never proves Support Admin's own grant works. Same non-fixture
  // target (studentmail.example) and round-trip-then-revert convention as the
  // Super Admin version above, so the shared dev DB is left as found.
  test("Support Admin deactivates and reactivates a non-fixture user, and it survives a reload", async ({ page }) => {
    await page.goto("/dashboard/admin/users");
    const search = page.getByPlaceholder(/search by email/i);
    await search.fill("studentmail.example");
    const row = page.getByRole("row", { name: /studentmail\.example/ }).first();
    test.skip((await row.count()) === 0, "No non-fixture seeded student found to safely toggle.");

    await row.getByRole("button", { name: "Deactivate", exact: true }).click();
    await expect(row.getByRole("button", { name: "Activate", exact: true })).toBeVisible();
    await expect(page.getByText("User deactivated")).toBeVisible();

    // Reload -- the flip must be a real DB write, not just client-side state.
    await page.reload();
    await search.fill("studentmail.example");
    await expect(page.getByRole("row", { name: /studentmail\.example/ }).first().getByRole("button", { name: "Activate", exact: true })).toBeVisible();

    // Revert -- leave the seeded account active as found.
    await page.getByRole("row", { name: /studentmail\.example/ }).first().getByRole("button", { name: "Activate", exact: true }).click();
    await expect(page.getByRole("row", { name: /studentmail\.example/ }).first().getByRole("button", { name: "Deactivate", exact: true })).toBeVisible();
    await expect(page.getByText("User activated")).toBeVisible();
  });
});

test.describe("Admin Reports (moderation queue) module", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoleViaApi(page, "admin", ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  // --- Listing --------------------------------------------------------

  test("a report card renders reason, type, reporter, filed date, and evidence links", async ({ page }) => {
    await page.route("**/api/admin/reports*", (route) =>
      route.fulfill({
        json: {
          reports: [
            {
              _id: "mock-r1",
              reason: "Fake internship posting",
              status: "open",
              reportType: "fake_internship",
              details: "Posting asked for an upfront deposit.",
              evidenceUrls: ["https://example.com/evidence1.png"],
              reportedBy: { email: "reporter@example.com" },
              company: { companyName: "Mocked Shady Co", companyEmail: "hr@shady.example" },
              createdAt: "2026-01-15T00:00:00.000Z"
            }
          ]
        }
      })
    );
    await page.goto("/dashboard/admin/reports");
    await expect(page.getByRole("heading", { name: "Mocked Shady Co" })).toBeVisible();
    await expect(page.getByText("Fake internship posting")).toBeVisible();
    await expect(page.getByText("Type: fake internship")).toBeVisible();
    await expect(page.getByText("Posting asked for an upfront deposit.")).toBeVisible();
    await expect(page.getByText("Reported by: reporter@example.com")).toBeVisible();
    await expect(page.getByText("Filed: Jan 15, 2026")).toBeVisible();
    await expect(page.getByRole("link", { name: "Evidence 1" })).toHaveAttribute("href", "https://example.com/evidence1.png");
  });

  test("a resolved report shows its resolution note", async ({ page }) => {
    await page.route("**/api/admin/reports*", (route) =>
      route.fulfill({
        json: {
          reports: [
            {
              _id: "mock-r2",
              reason: "Abusive HR behavior",
              status: "resolved",
              resolutionNote: "Company issued a written apology and retrained HR staff.",
              company: { companyName: "Resolved Co" },
              createdAt: "2026-01-10T00:00:00.000Z"
            }
          ]
        }
      })
    );
    await page.goto("/dashboard/admin/reports");
    await expect(page.getByText("Resolution: Company issued a written apology and retrained HR staff.")).toBeVisible();
  });

  test("reports view shows an accessible loading state while reports are in flight", async ({ page }) => {
    await page.route("**/api/admin/reports*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({ json: { reports: [] } });
    });
    await page.goto("/dashboard/admin/reports");
    await expect(page.getByRole("status", { name: "Loading", exact: true })).toBeVisible();
    await expect(page.getByRole("status", { name: "Loading", exact: true })).toBeHidden({ timeout: 15000 });
  });

  test("reports view shows an explicit empty state when the moderation queue is clear", async ({ page }) => {
    await page.route("**/api/admin/reports*", (route) => route.fulfill({ json: { reports: [] } }));
    await page.goto("/dashboard/admin/reports");
    await expect(page.getByText("No Reports to Review")).toBeVisible();
    await expect(page.getByText("Company and user reports submitted for moderation will appear in this queue.")).toBeVisible();
  });

  test("reports view shows a retryable error state when reports fail to load, and Retry recovers", async ({ page }) => {
    // Fail EVERY request until the flag flips -- see the overview metrics
    // retry test for why "fail only the first request" is order-fragile.
    let failRequests = true;
    await page.route("**/api/admin/reports*", (route) => {
      if (failRequests) {
        return route.fulfill({ status: 500, json: { message: "Internal error" } });
      }
      return route.fulfill({ json: { reports: [] } });
    });
    await page.goto("/dashboard/admin/reports");
    const retryButton = page.getByRole("button", { name: /retry|try again/i });
    await expect(retryButton).toBeVisible();

    failRequests = false;
    await retryButton.click();
    await expect(retryButton).toBeHidden();
    await expect(page.getByText("No Reports to Review")).toBeVisible();
  });

  test("reports pagination shows 10 per page, and page 2 reveals the 11th report", async ({ page }) => {
    const reports = Array.from({ length: 12 }, (_, i) => ({
      _id: `mock-r${i + 1}`,
      reason: `Report number ${i + 1}`,
      status: "open",
      company: { companyName: `Company ${i + 1}` },
      createdAt: new Date(2026, 0, 12 - i).toISOString()
    }));
    await page.route("**/api/admin/reports*", (route) => route.fulfill({ json: { reports } }));
    await page.goto("/dashboard/admin/reports");
    await expect(page.getByText("Page 1 of 2 · 12 reports")).toBeVisible();
    await expect(page.getByText("Report number 1", { exact: true })).toBeVisible();
    await expect(page.getByText("Report number 11", { exact: true })).toBeHidden();

    await page.getByRole("navigation", { name: "Pagination" }).getByRole("button", { name: "2", exact: true }).click();
    await expect(page.getByText("Report number 11", { exact: true })).toBeVisible();
    await expect(page.getByText("Report number 1", { exact: true })).toBeHidden();
  });

  test("refreshing the reports view re-fetches and reflects updated data", async ({ page }) => {
    let updated = false;
    await page.route("**/api/admin/reports*", (route) =>
      route.fulfill({
        json: {
          reports: [
            {
              _id: "mock-r-refresh",
              reason: updated ? "Updated reason after refresh" : "Original reason",
              status: "open",
              company: { companyName: "Refresh Co" },
              createdAt: "2026-01-01T00:00:00.000Z"
            }
          ]
        }
      })
    );
    await page.goto("/dashboard/admin/reports");
    await expect(page.getByText("Original reason")).toBeVisible();

    updated = true;
    await page.getByRole("button", { name: "Refresh" }).click();
    await expect(page.getByText("Updated reason after refresh")).toBeVisible();
  });

  // --- Status updates ---------------------------------------------------

  test("Escalate is keyboard-reachable and activatable, updates the badge, and shows a success toast", async ({ page }) => {
    // Stateful mock: the UI never reads the PATCH response body directly --
    // it always re-fetches the list (fetchAdminReports(true)) -- so the GET
    // handler must reflect the mutation or the badge assertion below hangs.
    let currentStatus = "open";
    await page.route("**/api/admin/reports*", (route) =>
      route.fulfill({
        json: {
          reports: [
            { _id: "mock-kb-1", reason: "Keyboard nav test report", status: currentStatus, company: { companyName: "Keyboard Test Co" }, createdAt: "2026-01-01T00:00:00.000Z" }
          ]
        }
      })
    );
    await page.route("**/api/admin/reports/mock-kb-1/resolve", (route) => {
      currentStatus = "escalated";
      return route.fulfill({ json: { report: { _id: "mock-kb-1" } } });
    });
    await page.goto("/dashboard/admin/reports");
    const escalateButton = page.getByRole("button", { name: "Escalate", exact: true });
    await escalateButton.focus();
    await expect(escalateButton).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Report updated")).toBeVisible();
    await expect(page.getByText("escalated", { exact: true })).toBeVisible();
  });

  test("the In Review button is disabled while its request is in flight (duplicate-action prevention)", async ({ page }) => {
    let currentStatus = "open";
    await page.route("**/api/admin/reports*", (route) =>
      route.fulfill({
        json: {
          reports: [
            { _id: "mock-busy-1", reason: "Busy state report", status: currentStatus, company: { companyName: "Busy Co" }, createdAt: "2026-01-01T00:00:00.000Z" }
          ]
        }
      })
    );
    await page.route("**/api/admin/reports/mock-busy-1/resolve", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      currentStatus = "in_review";
      await route.fulfill({ json: { report: { _id: "mock-busy-1" } } });
    });
    await page.goto("/dashboard/admin/reports");
    await expect(page.getByText("Busy state report")).toBeVisible();

    const reviewButton = page.getByRole("button", { name: "In Review", exact: true });
    await reviewButton.click();
    await expect(reviewButton).toBeDisabled();
    await expect(page.getByText("in review", { exact: true })).toBeVisible({ timeout: 15000 });
  });

  test("a failed status-update PATCH surfaces the error banner and leaves the report unchanged", async ({ page }) => {
    await page.route("**/api/admin/reports*", (route) =>
      route.fulfill({
        json: {
          reports: [
            { _id: "mock-fail-1", reason: "Failure path report", status: "open", company: { companyName: "Failure Co" }, createdAt: "2026-01-01T00:00:00.000Z" }
          ]
        }
      })
    );
    await page.route("**/api/admin/reports/mock-fail-1/resolve", (route) =>
      route.fulfill({ status: 500, json: { message: "Internal error" } })
    );
    await page.goto("/dashboard/admin/reports");
    await expect(page.getByText("Failure path report")).toBeVisible();

    await page.getByRole("button", { name: "Escalate", exact: true }).click();
    await expect(page.getByRole("button", { name: /retry|try again/i })).toBeVisible();
    await expect(page.getByText("Report updated")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Escalate", exact: true })).toBeVisible();
  });

  // Real backend round trip: drives the seeded fixture report through the
  // full in_review -> escalated -> resolved chain, confirms each transition
  // is an actual DB write (survives reload), then restores it to "open" so
  // every other test in this block (and the next run of this same test)
  // finds the moderation queue in its expected starting state.
  test("In Review, Escalate, and Resolve transitions persist to the database and survive a reload", async ({ page }) => {
    const FIXTURE_REASON = "E2E fixture abuse report for automated moderation-queue coverage.";
    await page.goto("/dashboard/admin/reports");
    // Wait for the initial fetch to actually resolve before deciding whether
    // to skip -- an immediate .count() can misfire as "not found" while the
    // loading skeleton is still showing (same pitfall documented on the
    // CloudNest reject/suspend tests in admin.workflows.spec.ts).
    await expect(page.getByRole("status", { name: "Loading", exact: true })).toBeHidden({ timeout: 15000 });
    const card = page.locator(".ds-card").filter({ hasText: FIXTURE_REASON });
    test.skip((await card.count()) === 0, "E2E fixture report not visible -- run seed-e2e-fixtures.js.");

    try {
      await card.getByRole("button", { name: "In Review", exact: true }).click();
      await expect(page.getByText("Report updated")).toBeVisible();
      await expect(card.getByText("in review", { exact: true })).toBeVisible();

      await card.getByRole("button", { name: "Escalate", exact: true }).click();
      await expect(card.getByText("escalated", { exact: true })).toBeVisible();

      await card.getByRole("button", { name: "Resolve", exact: true }).click();
      await expect(page.getByText("Report resolved")).toBeVisible();
      await expect(card.getByText("resolved", { exact: true })).toBeVisible();
      await expect(card.getByText("Resolution: Resolved by admin")).toBeVisible();

      await page.reload();
      const reloadedCard = page.locator(".ds-card").filter({ hasText: FIXTURE_REASON });
      await expect(reloadedCard.getByText("resolved", { exact: true })).toBeVisible();
    } finally {
      const token = await page.evaluate(() => window.localStorage.getItem("internai.auth.token"));
      const listRes = await page.request.get(`${BACKEND_URL}/api/admin/reports`, { headers: { Authorization: `Bearer ${token}` } });
      const listBody = await listRes.json().catch(() => ({}));
      const reports = listBody.data?.reports || listBody.reports || [];
      const fixture = reports.find((r: { reason?: string }) => r.reason === FIXTURE_REASON);
      if (fixture && fixture.status !== "open") {
        await page.request.patch(`${BACKEND_URL}/api/admin/reports/${fixture._id}/resolve`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { status: "open", resolutionNote: "" }
        });
      }
    }
  });

  // --- Export -----------------------------------------------------------

  test("Download Platform Statistics PDF shows a loading label while generating", async ({ page }) => {
    await page.route("**/api/admin/reports/platform-statistics", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });
    await page.goto("/dashboard/admin");
    await page.getByRole("button", { name: "Download Platform Statistics PDF" }).click();
    await expect(page.getByRole("button", { name: "Generating..." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Generating..." })).toBeDisabled();
    await expect(page.getByText("Report generated")).toBeVisible({ timeout: 15000 });
  });

  test("a failed Platform Statistics PDF download shows an error toast and re-enables the button", async ({ page }) => {
    await page.route("**/api/admin/reports/platform-statistics", (route) =>
      route.fulfill({ status: 500, body: "Internal error" })
    );
    await page.goto("/dashboard/admin");
    await page.getByRole("button", { name: "Download Platform Statistics PDF" }).click();
    await expect(page.getByText("Report failed")).toBeVisible();
    await expect(page.getByRole("button", { name: "Download Platform Statistics PDF" })).toBeEnabled();
  });

  test("the downloaded Platform Statistics PDF filename comes from the X-Report-Number response header", async ({ page }) => {
    await page.route("**/api/admin/reports/platform-statistics", (route) =>
      route.fulfill({
        status: 200,
        headers: {
          "X-Report-Number": "PSR-TEST-0001",
          "Content-Type": "application/pdf",
          // Mirrors the app.js CORS config -- without this, the mocked
          // response behaves like the pre-fix backend (header sent but
          // invisible to response.headers.get across origins).
          "Access-Control-Expose-Headers": "X-Report-Number"
        },
        body: Buffer.from("%PDF-1.4\n%%EOF")
      })
    );
    await page.goto("/dashboard/admin");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download Platform Statistics PDF" }).click()
    ]);
    expect(download.suggestedFilename()).toBe("PSR-TEST-0001.pdf");
  });

  test("the per-company Verification PDF button downloads a real report", async ({ page }) => {
    await page.goto("/dashboard/admin/companies");
    await page.getByPlaceholder(/search companies/i).fill("E2E Test Company");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const button = page.getByRole("button", { name: "Verification PDF" }).first();
    await expect(button).toBeVisible({ timeout: 15000 });
    const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    await expect(page.getByText("Report generated")).toBeVisible();
  });

  // --- Theme / responsive -------------------------------------------------

  test("reports view renders correctly in both light and dark appearance", async ({ page }) => {
    await page.route("**/api/admin/reports*", (route) =>
      route.fulfill({
        json: { reports: [{ _id: "mock-theme-1", reason: "Theme check report", status: "open", company: { companyName: "Theme Co" }, createdAt: "2026-01-01T00:00:00.000Z" }] }
      })
    );
    await page.goto("/dashboard/admin/settings");
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await page.goto("/dashboard/admin/reports");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("heading", { name: "Theme Co" })).toBeVisible();

    await page.goto("/dashboard/admin/settings");
    await page.getByRole("button", { name: "Light", exact: true }).click();
    await page.goto("/dashboard/admin/reports");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.getByRole("heading", { name: "Theme Co" })).toBeVisible();
  });

  test("reports view renders without horizontal overflow on tablet and mobile", async ({ page }) => {
    await page.route("**/api/admin/reports*", (route) =>
      route.fulfill({
        json: { reports: [{ _id: "mock-resp-1", reason: "Responsive check report", status: "open", company: { companyName: "Responsive Co" }, createdAt: "2026-01-01T00:00:00.000Z" }] }
      })
    );
    for (const viewport of [{ width: 768, height: 1024 }, { width: 375, height: 812 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/dashboard/admin/reports");
      await expect(page.getByRole("heading", { name: "Responsive Co" })).toBeVisible();
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    }
  });
});

test.describe("Admin Reports (moderation queue) module -- Moderation Admin action-level coverage", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoleViaApi(page, "admin", ADMIN_MODERATION_EMAIL, ADMIN_MODERATION_PASSWORD);
  });

  // Moderation Admin owns admin:report:review (ROLE_PERMISSIONS, roles.js) --
  // the full In Review -> Escalate -> Resolve round trip earlier in this file
  // is Super Admin only, which never proves Moderation Admin's own grant
  // works. Same seeded fixture report and restore-to-"open" safety net, one
  // transition (Escalate) is enough to prove the real action + outcome.
  test("Moderation Admin escalates a report and it persists to the database", async ({ page }) => {
    const FIXTURE_REASON = "E2E fixture abuse report for automated moderation-queue coverage.";
    await page.goto("/dashboard/admin/reports");
    await expect(page.getByRole("status", { name: "Loading", exact: true })).toBeHidden({ timeout: 15000 });
    const card = page.locator(".ds-card").filter({ hasText: FIXTURE_REASON });
    test.skip((await card.count()) === 0, "E2E fixture report not visible -- run seed-e2e-fixtures.js.");

    try {
      await card.getByRole("button", { name: "Escalate", exact: true }).click();
      await expect(page.getByText("Report updated")).toBeVisible();
      await expect(card.getByText("escalated", { exact: true })).toBeVisible();

      await page.reload();
      const reloadedCard = page.locator(".ds-card").filter({ hasText: FIXTURE_REASON });
      await expect(reloadedCard.getByText("escalated", { exact: true })).toBeVisible();
    } finally {
      const token = await page.evaluate(() => window.localStorage.getItem("internai.auth.token"));
      const listRes = await page.request.get(`${BACKEND_URL}/api/admin/reports`, { headers: { Authorization: `Bearer ${token}` } });
      const listBody = await listRes.json().catch(() => ({}));
      const reports = listBody.data?.reports || listBody.reports || [];
      const fixture = reports.find((r: { reason?: string }) => r.reason === FIXTURE_REASON);
      if (fixture && fixture.status !== "open") {
        await page.request.patch(`${BACKEND_URL}/api/admin/reports/${fixture._id}/resolve`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { status: "open", resolutionNote: "" }
        });
      }
    }
  });
});
