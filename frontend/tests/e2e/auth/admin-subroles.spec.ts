import { test, expect } from "@playwright/test";
import { FIXTURE_CREDENTIALS } from "../fixtures/roles.fixture";
import { waitForAuthFormHydration } from "../helpers/hydration";

// Real-UI-form login, kept minimal (shared rate-limiter budget -- see
// company-ceo.spec.ts comment). Admin login form is email+password only, no
// account-type selector (app/auth/admin/page.tsx / admin-auth-form.tsx).
const SUB_ROLES = [
  { label: "verification_admin", creds: FIXTURE_CREDENTIALS.adminVerification },
  { label: "moderation_admin", creds: FIXTURE_CREDENTIALS.adminModeration },
  { label: "support_admin", creds: FIXTURE_CREDENTIALS.adminSupport }
];

test.describe("Admin sub-role end-to-end login", () => {
  for (const { label, creds } of SUB_ROLES) {
    test(`${label} logs in and lands on the admin dashboard`, async ({ page }) => {
      await page.goto("/auth/admin");
      await waitForAuthFormHydration(page);
      await page.getByLabel("Admin Email", { exact: true }).fill(creds.email);
      await page.getByLabel("Password", { exact: true }).fill(creds.password);
      await page.locator('button[type="submit"]').click();

      await page.waitForURL(/\/dashboard\/admin/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/dashboard\/admin/);
    });
  }
});
