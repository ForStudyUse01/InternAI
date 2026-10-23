import { test, expect } from "@playwright/test";
import { FIXTURE_CREDENTIALS } from "../fixtures/roles.fixture";

// Real-UI-form login, kept to a single success test -- this path spends the
// shared, IP-scoped authLimiter budget (30 req/15min across ALL login/
// signup/refresh traffic), so bulk coverage lives in fixtures/roles.fixture
// (API-token injection) instead. The company login tab also has an "HR"/
// "CEO" *demo-preset* selector (COMPANY_LOGIN_PRESETS in role-auth-form.tsx)
// that autofills its own unrelated demo credentials when clicked -- do not
// click it; fill Email/Password directly with the E2E CEO fixture instead,
// same as the existing student.spec.ts pattern.
test.describe("Company CEO end-to-end login", () => {
  test("logs in and lands on the CEO dashboard", async ({ page }) => {
    await page.goto("/auth/company");
    await page.getByRole("button", { name: "Login", exact: true }).click();

    await page.getByLabel("Email", { exact: true }).fill(FIXTURE_CREDENTIALS.companyCeo.email);
    await page.getByLabel("Password", { exact: true }).fill(FIXTURE_CREDENTIALS.companyCeo.password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/\/dashboard\/companyCEO/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard\/companyCEO/);
  });
});
