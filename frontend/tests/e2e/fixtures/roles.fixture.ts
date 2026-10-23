import { test as base, type Page } from "@playwright/test";
import { loginAsRoleViaApi } from "../helpers/session";

export const FIXTURE_CREDENTIALS = {
  intern: { email: "e2e.intern@internai-test.local", password: "E2eIntern@123" },
  companyOwner: { email: "e2e.company.owner@internai-test.local", password: "E2eCompanyOwner@123" },
  companyHr: { email: "e2e.company.hr@internai-test.local", password: "E2eCompanyHr@123" },
  companyCeo: { email: "e2e.company.ceo@internai-test.local", password: "E2eCompanyCeo@123" },
  adminSuper: { email: "admin@internai.com", password: "Admin@123" },
  adminVerification: { email: "e2e.admin.verification@internai-test.local", password: "E2eAdminVerification@123" },
  adminModeration: { email: "e2e.admin.moderation@internai-test.local", password: "E2eAdminModeration@123" },
  adminSupport: { email: "e2e.admin.support@internai-test.local", password: "E2eAdminSupport@123" }
} as const;

type RoleFixtures = {
  internPage: Page;
  companyOwnerPage: Page;
  companyHrPage: Page;
  companyCeoPage: Page;
  adminSuperPage: Page;
  adminVerificationPage: Page;
  adminModerationPage: Page;
  adminSupportPage: Page;
};

// Each fixture is lazy -- Playwright only sets up the ones a test actually
// destructures, so a spec using just `internPage` never spends login-rate-
// limiter budget authenticating as every other role too.
export const test = base.extend<RoleFixtures>({
  internPage: async ({ page }, use) => {
    await loginAsRoleViaApi(page, "intern", FIXTURE_CREDENTIALS.intern.email, FIXTURE_CREDENTIALS.intern.password);
    await use(page);
  },
  companyOwnerPage: async ({ page }, use) => {
    await loginAsRoleViaApi(page, "company", FIXTURE_CREDENTIALS.companyOwner.email, FIXTURE_CREDENTIALS.companyOwner.password);
    await use(page);
  },
  companyHrPage: async ({ page }, use) => {
    await loginAsRoleViaApi(page, "company", FIXTURE_CREDENTIALS.companyHr.email, FIXTURE_CREDENTIALS.companyHr.password);
    await use(page);
  },
  companyCeoPage: async ({ page }, use) => {
    await loginAsRoleViaApi(page, "company", FIXTURE_CREDENTIALS.companyCeo.email, FIXTURE_CREDENTIALS.companyCeo.password);
    await use(page);
  },
  adminSuperPage: async ({ page }, use) => {
    await loginAsRoleViaApi(page, "admin", FIXTURE_CREDENTIALS.adminSuper.email, FIXTURE_CREDENTIALS.adminSuper.password);
    await use(page);
  },
  adminVerificationPage: async ({ page }, use) => {
    await loginAsRoleViaApi(page, "admin", FIXTURE_CREDENTIALS.adminVerification.email, FIXTURE_CREDENTIALS.adminVerification.password);
    await use(page);
  },
  adminModerationPage: async ({ page }, use) => {
    await loginAsRoleViaApi(page, "admin", FIXTURE_CREDENTIALS.adminModeration.email, FIXTURE_CREDENTIALS.adminModeration.password);
    await use(page);
  },
  adminSupportPage: async ({ page }, use) => {
    await loginAsRoleViaApi(page, "admin", FIXTURE_CREDENTIALS.adminSupport.email, FIXTURE_CREDENTIALS.adminSupport.password);
    await use(page);
  }
});

export { expect } from "@playwright/test";
