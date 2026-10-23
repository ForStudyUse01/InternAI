import { test, expect } from "@playwright/test";

// Client-side validation lives in validateCompanySignup (role-auth-form.tsx).
// The signup form is the default tab on /auth/company, so no tab click is
// needed. Only the last test (duplicate email) reaches the real backend --
// everything else is blocked client-side before any request is sent, so this
// file barely touches the shared authLimiter budget.
test.describe("Company signup form validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/company");
    // These are controlled inputs: anything typed before React hydrates is
    // discarded when hydration resets them to their initial (empty) state.
    // Filling several fields in a row is exactly the case that loses the
    // first ones, so wait for the mount-time demo-credentials fetch to settle
    // -- it only fires from a client effect, so it proves hydration ran.
    await page.waitForLoadState("networkidle");
  });

  test("submitting an empty form shows every required-field error and does not navigate away", async ({ page }) => {
    await page.getByRole("button", { name: "Create Company Account" }).click();

    await expect(page.getByText("Company name is required")).toBeVisible();
    await expect(page.getByText("Enter a valid company email")).toBeVisible();
    await expect(page.getByText("Enter a valid GSTIN")).toBeVisible();
    await expect(page.getByText("Contact person is required")).toBeVisible();
    await expect(page.getByText("Enter a valid 10-digit mobile number")).toBeVisible();
    await expect(page.getByText("Password must be at least 8 characters")).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/company/);
  });

  test("an invalid email format is rejected inline", async ({ page }) => {
    await page.getByLabel("Official Email").fill("not-an-email");
    await page.getByRole("button", { name: "Create Company Account" }).click();
    await expect(page.getByText("Enter a valid company email")).toBeVisible();
  });

  test("an invalid GSTIN format is rejected inline", async ({ page }) => {
    await page.getByLabel("GSTIN").fill("NOTAGSTIN");
    await page.getByRole("button", { name: "Create Company Account" }).click();
    await expect(page.getByText("Enter a valid GSTIN")).toBeVisible();
  });

  test("a phone number that isn't a valid 10-digit Indian mobile number is rejected inline", async ({ page }) => {
    await page.getByLabel("Phone").fill("12345");
    await page.getByRole("button", { name: "Create Company Account" }).click();
    await expect(page.getByText("Enter a valid 10-digit mobile number")).toBeVisible();
  });

  test("a password shorter than 8 characters is rejected inline", async ({ page }) => {
    await page.getByLabel("Password", { exact: true }).fill("short1");
    await page.getByRole("button", { name: "Create Company Account" }).click();
    await expect(page.getByText("Password must be at least 8 characters")).toBeVisible();
  });

  test("a mismatched confirm-password is rejected inline", async ({ page }) => {
    await page.getByLabel("Password", { exact: true }).fill("ValidPass123");
    await page.getByLabel("Confirm Password").fill("DifferentPass123");
    await page.getByRole("button", { name: "Create Company Account" }).click();
    await expect(page.getByText("Passwords do not match")).toBeVisible();
  });

  test("signing up with an already-registered company email surfaces a server-side duplicate error", async ({ page }) => {
    await page.getByLabel("Company Name").fill("Duplicate Test Co");
    await page.getByLabel("Official Email").fill("e2e.company.owner@internai-test.local");
    await page.getByLabel("GSTIN").fill("22AAAAA0000A1Z5");
    await page.getByLabel("Contact Person").fill("Test Contact");
    await page.getByLabel("Phone").fill("9876543210");
    await page.getByLabel("Password", { exact: true }).fill("ValidPass123");
    await page.getByLabel("Confirm Password").fill("ValidPass123");
    await page.getByRole("button", { name: "Create Company Account" }).click();
    await expect(page.getByText(/already registered/i)).toBeVisible();
    // Still on the signup form -- a failed signup must not establish a session.
    await expect(page).toHaveURL(/\/auth\/company/);
  });
});
