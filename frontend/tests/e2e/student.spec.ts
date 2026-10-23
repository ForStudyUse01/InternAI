import { test, expect } from "@playwright/test";

// Dedicated E2E fixture account (backend/scripts/seed-e2e-fixtures.js) — this
// dev database's real seed data doesn't match the hardcoded seedData.js
// presets, so tests use their own known-password account instead.
const STUDENT_EMAIL = "e2e.intern@internai-test.local";
const STUDENT_PASSWORD = "E2eIntern@123";

test.describe("Student (intern) end-to-end journey", () => {
  test("logs in, lands on dashboard, navigates core sections, and logs out", async ({ page }) => {
    await page.goto("/auth/intern");
    await page.getByRole("button", { name: "Login", exact: true }).click();

    await page.getByLabel("Email", { exact: true }).fill(STUDENT_EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(STUDENT_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/\/dashboard\/intern/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard\/intern/);

    // Profile
    await page.goto("/dashboard/intern/profile");
    await expect(page.getByText("Overview", { exact: true }).first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);

    // Resume
    await page.goto("/dashboard/intern/resume");
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);

    // Applications
    await page.goto("/dashboard/intern/applications");
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);

    // Calendar
    await page.goto("/dashboard/intern/calendar");
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);

    // Interviews
    await page.goto("/dashboard/intern/interviews");
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);

    // Chat
    await page.goto("/dashboard/intern/chat");
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);

    // Logout
    await page.goto("/dashboard/intern");
    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL(/\/auth\/intern/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/auth\/intern/);
  });

  test("rejects an incorrect password with an inline error, without navigating away", async ({ page }) => {
    await page.goto("/auth/intern");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page.getByLabel("Email", { exact: true }).fill(STUDENT_EMAIL);
    await page.getByLabel("Password", { exact: true }).fill("WrongPassword!123");
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/auth\/intern/);
    await expect(page.locator("body")).toContainText(/invalid credentials/i);
  });

  test("an unauthenticated visit to a protected dashboard route redirects to login", async ({ page }) => {
    // Auth state lives in localStorage (Bearer-token SPA), not cookies —
    // visit once to get an origin to clear storage against, then reload clean.
    await page.goto("/auth/intern");
    await page.evaluate(() => window.localStorage.clear());
    await page.goto("/dashboard/intern/profile");
    await page.waitForURL(/\/auth\/intern|\/session-expired/, { timeout: 10000 });
  });
});
