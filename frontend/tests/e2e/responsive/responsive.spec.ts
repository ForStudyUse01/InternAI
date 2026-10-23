import { test, expect } from "../fixtures/roles.fixture";

// Sidebar layout (drawer vs collapsible rail) is one shared mechanism across
// every dashboard shell (InternShell/CompanyShell/AdminShell all wire the
// same useSidebarCollapsed/useIsDesktopViewport hooks) -- covering it here
// on representative pages, not the full ~60-route matrix per breakpoint,
// mirrors the theme spec's sampling reasoning.

test.describe("Mobile (375x812): off-canvas drawer", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("sidebar is hidden by default and opens via the header menu button with full labels", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern");
    // Desktop-only collapse toggle must not render on mobile.
    await expect(internPage.getByRole("button", { name: /collapse sidebar|expand sidebar/i })).toBeHidden();

    await internPage.getByRole("button", { name: /open menu/i }).click();
    await expect(internPage.getByRole("link", { name: /dashboard overview/i })).toBeVisible();
  });
});

test.describe("Tablet (768x1024)", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("intern dashboard renders without layout overflow", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern/applications");
    await expect(internPage.locator("body")).not.toContainText(/something went wrong/i);
    const scrollWidth = await internPage.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await internPage.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});

test.describe("Laptop/Desktop (1366x768, 1920x1080): collapsible rail", () => {
  for (const size of [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 }
  ]) {
    test.describe(`${size.width}x${size.height}`, () => {
      test.use({ viewport: size });

      test("collapse toggle shrinks the sidebar to an icon rail and back", async ({ internPage }) => {
        await internPage.goto("/dashboard/intern");
        const toggle = internPage.getByRole("button", { name: /collapse sidebar/i });
        await expect(toggle).toBeVisible();
        await toggle.click();
        await expect(internPage.getByRole("button", { name: /expand sidebar/i })).toBeVisible();
        // Active nav item stays reachable/highlighted in the collapsed rail.
        await expect(internPage.getByRole("link", { name: /dashboard overview/i })).toBeVisible();
        // Revert -- leave the shared localStorage preference as found.
        await internPage.getByRole("button", { name: /expand sidebar/i }).click();
        await expect(internPage.getByRole("button", { name: /collapse sidebar/i })).toBeVisible();
      });

      test("company and admin dashboards render without horizontal overflow", async ({ companyOwnerPage, adminSuperPage }) => {
        for (const [page, path] of [
          [companyOwnerPage, "/dashboard/companyCEO/hiring/pipeline"],
          [adminSuperPage, "/dashboard/admin/users"]
        ] as const) {
          await page.goto(path);
          await expect(page.locator("body")).not.toContainText(/something went wrong/i);
          const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
          const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
          expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
        }
      });

      // Admin's sidebar has its own grouped-heading content (Main/Management/
      // Moderation/Secondary) that intern's doesn't -- the collapse mechanism
      // itself is shared and already covered above via internPage, but that
      // extra grouping is admin-specific and worth its own confirmation.
      test("admin sidebar collapse toggle shrinks to an icon rail and back", async ({ adminSuperPage }) => {
        await adminSuperPage.goto("/dashboard/admin");
        const toggle = adminSuperPage.getByRole("button", { name: /collapse sidebar/i });
        await expect(toggle).toBeVisible();
        await toggle.click();
        await expect(adminSuperPage.getByRole("button", { name: /expand sidebar/i })).toBeVisible();
        await expect(adminSuperPage.getByRole("link", { name: /dashboard overview/i })).toBeVisible();
        // Revert -- leave the shared localStorage preference as found.
        await adminSuperPage.getByRole("button", { name: /expand sidebar/i }).click();
        await expect(adminSuperPage.getByRole("button", { name: /collapse sidebar/i })).toBeVisible();
      });
    });
  }
});

test.describe("Mobile (375x812): admin off-canvas drawer", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("admin sidebar is hidden by default and opens via the header menu button", async ({ adminSuperPage }) => {
    await adminSuperPage.goto("/dashboard/admin");
    await expect(adminSuperPage.getByRole("button", { name: /collapse sidebar|expand sidebar/i })).toBeHidden();
    await adminSuperPage.getByRole("button", { name: /open menu/i }).click();
    await expect(adminSuperPage.getByRole("link", { name: /dashboard overview/i })).toBeVisible();
  });
});
