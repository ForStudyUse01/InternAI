import { expect, type Page } from "@playwright/test";

// The auth forms are controlled React components: a programmatic fill() that
// lands before hydration sets the DOM value but never reaches React state,
// and React's first client render then resets the input to its empty state.
// The submit click usually lands *after* hydration, so the form validates an
// empty state and blocks -- the classic goto-then-fill race on a production
// build. (The company/intern specs dodge this by clicking the Login *tab*
// first, which only succeeds post-hydration; the admin form has no tab.)
//
// This barrier uses the form's own "Show Password" toggle the same way: the
// label flip is pure client state, so a dropped pre-hydration click simply
// retries until the flip is observed, then restores the toggle. After it
// resolves, fills are guaranteed to reach React state.
export async function waitForAuthFormHydration(page: Page) {
  // The form lives under a Suspense boundary (useSearchParams), so goto()'s
  // "load" can resolve while the boundary is still streaming -- wait for the
  // form to exist at all before probing whether it is interactive.
  await page.getByRole("button", { name: "Show Password" }).waitFor({ state: "visible", timeout: 30000 });
  await expect(async () => {
    await page.getByRole("button", { name: "Show Password" }).click({ timeout: 2000 });
    await expect(page.getByRole("button", { name: "Hide Password" })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
  await page.getByRole("button", { name: "Hide Password" }).click();
  await expect(page.getByRole("button", { name: "Show Password" })).toBeVisible();
}
