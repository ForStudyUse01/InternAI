import { test, expect } from "@playwright/test";

// Dedicated E2E fixture account (backend/scripts/seed-e2e-fixtures.js),
// companyAccountType "hr" — this dev database's real seed data doesn't match
// the hardcoded seedData.js presets, so tests use their own known-password account.
const HR_EMAIL = "e2e.company.hr@internai-test.local";
const HR_PASSWORD = "E2eCompanyHr@123";

// Company dashboard views live at slash-separated paths (e.g.
// /dashboard/company/hiring/pipeline), per the VIEW_MAP in
// app/dashboard/company/[...view]/page.tsx — unlike the admin dashboard,
// which uses single hyphenated segments. Any key not in that map calls
// notFound(), so getting this wrong silently 404s.
test.describe("Recruiter/HR end-to-end journey", () => {
  test("logs in, lands on dashboard, navigates core sections, and logs out", async ({ page }) => {
    await page.goto("/auth/company");
    await page.getByRole("button", { name: "Login", exact: true }).click();

    await page.getByLabel("Email", { exact: true }).fill(HR_EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(HR_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/\/dashboard\/company/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard\/company(HR|CEO)?/);

    // Candidate search
    await page.goto("/dashboard/companyHR/matching/search");
    await expect(page.locator("body")).not.toContainText(/something went wrong|404/i);

    // Applications / hiring pipeline
    await page.goto("/dashboard/companyHR/hiring/pipeline");
    await expect(page.locator("body")).not.toContainText(/something went wrong|404/i);

    // Interview scheduling
    await page.goto("/dashboard/companyHR/hiring/interviews");
    await expect(page.locator("body")).not.toContainText(/something went wrong|404/i);

    // Reports
    await page.goto("/dashboard/companyHR/reports/feedback");
    await expect(page.locator("body")).not.toContainText(/something went wrong|404/i);

    // Chat
    await page.goto("/dashboard/company/chat");
    await expect(page.locator("body")).not.toContainText(/something went wrong|404/i);

    // Logout
    await page.goto("/dashboard/companyHR");
    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL(/\/auth\/company/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/auth\/company/);
  });

  test("rejects an incorrect password with an inline error", async ({ page }) => {
    await page.goto("/auth/company");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page.getByLabel("Email", { exact: true }).fill(HR_EMAIL);
    await page.getByLabel("Password", { exact: true }).fill("WrongPassword!123");
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/auth\/company/);
    await expect(page.locator("body")).toContainText(/invalid credentials/i);
  });

  test("an HR account can navigate to the Team Management view without crashing (executive-only actions are gated inline)", async ({ page }) => {
    await page.goto("/auth/company");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page.getByLabel("Email", { exact: true }).fill(HR_EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(HR_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard\/company/, { timeout: 15000 });

    await page.goto("/dashboard/companyHR/team/recruiters");
    await expect(page.locator("body")).not.toContainText(/something went wrong|^404/i);
  });
});
