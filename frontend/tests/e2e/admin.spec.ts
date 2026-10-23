import { test, expect } from "@playwright/test";
import { waitForAuthFormHydration } from "./helpers/hydration";

const ADMIN_EMAIL = "admin@internai.com";
const ADMIN_PASSWORD = "Admin@123";

test.describe("Admin end-to-end journey", () => {
  test("logs in, lands on dashboard, navigates core sections, and logs out", async ({ page }) => {
    await page.goto("/auth/admin");
    await waitForAuthFormHydration(page);

    await page.getByLabel("Admin Email", { exact: true }).fill(ADMIN_EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/\/dashboard\/admin/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard\/admin/);

    // User management
    await page.goto("/dashboard/admin/users");
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);

    // Company management
    await page.goto("/dashboard/admin/companies");
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);

    // Reports
    await page.goto("/dashboard/admin/reports");
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);

    // Analytics
    await page.goto("/dashboard/admin/analytics");
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);

    // Logout
    await page.goto("/dashboard/admin");
    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL(/\/auth\/admin/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/auth\/admin/);
  });

  test("rejects an incorrect password with an inline error", async ({ page }) => {
    await page.goto("/auth/admin");
    await waitForAuthFormHydration(page);
    await page.getByLabel("Admin Email", { exact: true }).fill(ADMIN_EMAIL);
    await page.getByLabel("Password", { exact: true }).fill("WrongPassword!123");
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/auth\/admin/);
    await expect(page.locator("body")).toContainText(/invalid credentials/i);
  });

  test("a student credential is rejected on the admin login route (role isolation)", async ({ page }) => {
    await page.goto("/auth/admin");
    await waitForAuthFormHydration(page);
    await page.getByLabel("Admin Email", { exact: true }).fill("intern1@example.com");
    await page.getByLabel("Password", { exact: true }).fill("Intern@123");
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/auth\/admin/);
    await expect(page.locator("body")).toContainText(/invalid credentials/i);
  });
});
