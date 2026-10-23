import { test, expect } from "../fixtures/roles.fixture";
import { ADMIN_ROUTES, COMPANY_CEO_BASE, COMPANY_HR_BASE, COMPANY_LITERAL_ROUTES, COMPANY_VIEWS, INTERN_ROUTES, companyPath } from "../helpers/routes";

// Data-driven: one test() generated per route (not a loop inside a single
// test) so `retries:1` retries just the one failing route instead of
// re-running the whole file. Visits every route with the most-privileged
// fixture for its role so real content renders rather than a denial stub --
// permission-denial coverage belongs to permissions/*.spec.ts, not here.

test.describe("Smoke: intern routes", () => {
  for (const route of INTERN_ROUTES) {
    test(`intern: ${route.label}`, async ({ internPage }) => {
      await internPage.goto(route.path);
      await expect(internPage.locator("body")).not.toContainText(/something went wrong/i);
    });
  }
});

test.describe("Smoke: company routes (owner/executive tier, full access)", () => {
  for (const view of [...COMPANY_VIEWS, ...COMPANY_LITERAL_ROUTES]) {
    test(`company: ${view.label}`, async ({ companyOwnerPage }) => {
      await companyOwnerPage.goto(companyPath(COMPANY_CEO_BASE, view));
      await expect(companyOwnerPage.locator("body")).not.toContainText(/something went wrong/i);
    });
  }
});

test.describe("Smoke: company routes (default HR tier)", () => {
  // Same route sweep, but as HR -- a distinct real persona with its own
  // permission set (least-privilege by default), not just a re-check of the
  // owner/executive path. "team-recruiters" is expected to render an inline
  // access-denied state here (see permissions/company-module-gating.spec.ts
  // for the dedicated mechanism coverage) -- that's graceful, not a crash,
  // so it still passes the same "no crash" assertion as every other view.
  for (const view of [...COMPANY_VIEWS, ...COMPANY_LITERAL_ROUTES]) {
    test(`company HR: ${view.label}`, async ({ companyHrPage }) => {
      await companyHrPage.goto(companyPath(COMPANY_HR_BASE, view));
      await expect(companyHrPage.locator("body")).not.toContainText(/something went wrong/i);
    });
  }
});

test.describe("Smoke: admin routes (super_admin tier, full access)", () => {
  for (const route of ADMIN_ROUTES) {
    test(`admin: ${route.label}`, async ({ adminSuperPage }) => {
      await adminSuperPage.goto(route.path);
      await expect(adminSuperPage.locator("body")).not.toContainText(/something went wrong/i);
    });
  }
});
