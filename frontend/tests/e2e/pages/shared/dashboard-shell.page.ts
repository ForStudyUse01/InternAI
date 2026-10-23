import { expect, type Page } from "@playwright/test";

/**
 * Thin POM shared by all 3 dashboard shells: locators + single-action
 * methods only. Assertions beyond the denial-mechanism ones below stay in
 * spec files -- with zero data-testids in this app, the visible copy IS the
 * locator, so specs (not page-object methods) must stay the readable source
 * of truth for what's being verified.
 *
 * Three genuinely different denial mechanisms exist, confirmed directly in
 * source -- do not collapse these into one "expect denied" helper:
 *  - Company, module-gated view (company-dashboard-page.tsx): inline
 *    <AccessDenied title="Access Denied" .../>, URL unchanged.
 *  - Company, wrong executive-tier prefix (dashboard/company/layout.tsx):
 *    inline <AccessDenied title="Executive dashboard" .../>, URL unchanged.
 *  - Admin, permission-gated view (admin-dashboard-page.tsx): client-side
 *    router.replace("/dashboard/admin"), renders null meanwhile -- no
 *    inline text at all.
 */
export class DashboardShellPage {
  constructor(private page: Page) {}

  async logout() {
    await this.page.getByRole("button", { name: /logout/i }).click();
  }

  async expectNoCrash() {
    await expect(this.page.locator("body")).not.toContainText(/something went wrong/i);
  }

  async expectAccessDeniedInline() {
    await expect(this.page.getByText("Access Denied", { exact: true })).toBeVisible();
  }

  async expectExecutiveOnlyDenied() {
    await expect(this.page.getByText("Executive dashboard", { exact: true })).toBeVisible();
  }

  async expectAdminViewDenied() {
    await this.page.waitForURL(/\/dashboard\/admin$/);
  }
}
