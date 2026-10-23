import { test, expect } from "../fixtures/roles.fixture";
import { DashboardShellPage } from "../pages/shared/dashboard-shell.page";

// Sidebar navigation/active-state/collapse mechanics are shared code
// (dashboard-sidebar-nav.tsx, use-sidebar-collapsed.ts) across every
// dashboard shell -- exercised mainly through intern (richest config: a
// collapsible section, feature-flagged items, badges) with company/admin
// spot-checks for role-specific wiring, mirroring the sampling approach
// already used in theme.spec.ts and responsive.spec.ts. Desktop-rail tests
// rely on the Chromium project's default >=1024px viewport (no explicit
// test.use) -- same assumption dashboard-workflows.spec.ts already makes.
// Mobile-drawer tests explicitly force a 375x812 viewport, like
// responsive.spec.ts. Collapse-toggle and mobile-drawer tests that flip
// shared localStorage/session state revert it before the test ends.

test.describe("Sidebar: navigation", () => {
  test("every intern sidebar item (including inside the collapsible section) navigates to a working page", async ({
    internPage
  }) => {
    await internPage.goto("/dashboard/intern");
    await internPage.getByRole("button", { name: "My Profile" }).click();
    const nav = internPage.getByRole("navigation", { name: "Primary" });
    const hrefs = await nav.getByRole("link").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThan(15);

    for (const href of hrefs) {
      await internPage.goto(href!);
      expect(new URL(internPage.url()).pathname).toBe(href);
      await expect(internPage.locator("body")).not.toContainText(/something went wrong/i);
      await expect(internPage.getByText("Page Not Found")).not.toBeVisible();
    }
  });

  test("clicking sidebar items updates the URL, and browser back/forward work", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern");
    await internPage.getByRole("link", { name: "Placement Hub", exact: true }).click();
    await expect(internPage).toHaveURL(/\/dashboard\/intern\/placement-hub$/);
    await internPage.getByRole("link", { name: "Search Internships", exact: true }).click();
    await expect(internPage).toHaveURL(/\/dashboard\/intern\/internships\/search$/);

    await internPage.goBack();
    await expect(internPage).toHaveURL(/\/dashboard\/intern\/placement-hub$/);
    await internPage.goBack();
    await expect(internPage).toHaveURL(/\/dashboard\/intern$/);

    await internPage.goForward();
    await expect(internPage).toHaveURL(/\/dashboard\/intern\/placement-hub$/);
    await internPage.goForward();
    await expect(internPage).toHaveURL(/\/dashboard\/intern\/internships\/search$/);
  });

  test("refreshing the page preserves the current route and its active sidebar item", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern/internships/search");
    await internPage.reload();
    await expect(internPage).toHaveURL(/\/dashboard\/intern\/internships\/search$/);
    await expect(internPage.getByRole("link", { name: "Search Internships", exact: true })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  test("an invalid nested route renders the not-found page instead of crashing", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern/this-route-does-not-exist-e2e");
    await expect(internPage.getByRole("heading", { name: "Page Not Found" })).toBeVisible();
    await expect(internPage.locator("body")).not.toContainText(/something went wrong/i);
    await internPage.getByRole("link", { name: /go to my dashboard/i }).click();
    await expect(internPage).toHaveURL(/\/dashboard\/intern$/);
  });

  test("logging out redirects to login", async ({ internPage }) => {
    const shell = new DashboardShellPage(internPage);
    await internPage.goto("/dashboard/intern");
    await shell.logout();
    await expect(internPage).toHaveURL(/\/auth\/intern/);
  });

  // Deliberately the plain `page` fixture, not `internPage` -- that fixture's
  // loginAsRoleViaApi injects a session via addInitScript, which re-runs (and
  // re-authenticates) on every navigation, so it can't be used to simulate an
  // anonymous visitor. A protected-route check needs a page that was never
  // authenticated in the first place.
  test("an unauthenticated visitor hitting a protected dashboard route is redirected to login", async ({ page }) => {
    await page.goto("/dashboard/intern");
    await expect(page).toHaveURL(/\/auth\/intern/);
  });
});

test.describe("Sidebar: active state", () => {
  test("intern sidebar marks the current route with aria-current, and only one item at a time", async ({
    internPage
  }) => {
    await internPage.goto("/dashboard/intern/internships/search");
    await expect(internPage.getByRole("link", { name: "Search Internships", exact: true })).toHaveAttribute(
      "aria-current",
      "page"
    );
    await expect(internPage.getByRole("link", { name: "Dashboard Overview", exact: true })).not.toHaveAttribute(
      "aria-current",
      "page"
    );
    await expect(internPage.locator('[aria-current="page"]')).toHaveCount(1);
  });

  test("company sidebar marks the current route with aria-current", async ({ companyOwnerPage }) => {
    await companyOwnerPage.goto("/dashboard/companyCEO/hiring/pipeline");
    await expect(companyOwnerPage.getByRole("link", { name: "Hiring Pipeline", exact: true })).toHaveAttribute(
      "aria-current",
      "page"
    );
    await expect(companyOwnerPage.locator('[aria-current="page"]')).toHaveCount(1);
  });

  test("active state updates immediately after client-side navigation, without a reload", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern");
    await expect(internPage.getByRole("link", { name: "Dashboard Overview", exact: true })).toHaveAttribute(
      "aria-current",
      "page"
    );
    await internPage.getByRole("link", { name: "My Applications", exact: true }).click();
    await expect(internPage.getByRole("link", { name: "My Applications", exact: true })).toHaveAttribute(
      "aria-current",
      "page"
    );
    await expect(internPage.getByRole("link", { name: "Dashboard Overview", exact: true })).not.toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  test("parent collapsible section stays open and highlighted for a nested route, and survives refresh", async ({
    internPage
  }) => {
    await internPage.goto("/dashboard/intern/profile/edit");
    const sectionToggle = internPage.getByRole("button", { name: "My Profile" });
    await expect(sectionToggle).toHaveAttribute("aria-expanded", "true");
    await expect(internPage.getByRole("link", { name: "Edit Profile", exact: true })).toHaveAttribute(
      "aria-current",
      "page"
    );

    await internPage.reload();
    await expect(sectionToggle).toHaveAttribute("aria-expanded", "true");
    await expect(internPage.getByRole("link", { name: "Edit Profile", exact: true })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});

test.describe("Sidebar: collapse/expand (desktop rail)", () => {
  test("collapsed rail state persists across a page reload", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern");
    await internPage.getByRole("button", { name: /collapse sidebar/i }).click();
    await expect(internPage.getByRole("button", { name: /expand sidebar/i })).toBeVisible();

    await internPage.reload();
    await expect(internPage.getByRole("button", { name: /expand sidebar/i })).toBeVisible();

    // Revert -- leave the shared localStorage preference as found, matching
    // the existing convention in responsive.spec.ts for this same toggle.
    await internPage.getByRole("button", { name: /expand sidebar/i }).click();
    await expect(internPage.getByRole("button", { name: /collapse sidebar/i })).toBeVisible();
  });

  test("collapsed rail shows a hover tooltip with the item's full label", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern");
    await internPage.getByRole("button", { name: /collapse sidebar/i }).click();

    const link = internPage.getByRole("link", { name: "Placement Hub" });
    await expect(link).toBeVisible();
    await link.hover();
    await expect(internPage.getByRole("tooltip", { name: "Placement Hub" })).toBeVisible();

    await internPage.getByRole("button", { name: /expand sidebar/i }).click();
  });

  test("company collapse toggle shrinks the sidebar to an icon rail and back", async ({ companyOwnerPage }) => {
    await companyOwnerPage.goto("/dashboard/companyCEO");
    const toggle = companyOwnerPage.getByRole("button", { name: /collapse sidebar/i });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(companyOwnerPage.getByRole("button", { name: /expand sidebar/i })).toBeVisible();
    await expect(companyOwnerPage.getByRole("link", { name: "Dashboard Overview", exact: true })).toBeVisible();

    await companyOwnerPage.getByRole("button", { name: /expand sidebar/i }).click();
    await expect(toggle).toBeVisible();
  });
});

test.describe("Sidebar: layout and scroll behavior", () => {
  test("sidebar nav content scrolls independently of the fixed brand header on a short viewport", async ({
    internPage
  }) => {
    await internPage.setViewportSize({ width: 1280, height: 500 });
    await internPage.goto("/dashboard/intern");
    const nav = internPage.getByRole("navigation", { name: "Primary" });

    const before = await nav.evaluate((el) => el.scrollTop);
    await nav.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const after = await nav.evaluate((el) => el.scrollTop);
    expect(after).toBeGreaterThan(before);

    // The brand header above the scrollable nav must stay put, not scroll away.
    // Scoped to the aside -- "Intern Portal" also appears in the top header's
    // welcome label and the document title.
    await expect(internPage.locator("aside").getByText("Intern Portal", { exact: true })).toBeVisible();
  });
});

test.describe("Sidebar: mobile behavior", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("overlay click closes the mobile drawer", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern");
    await internPage.getByRole("button", { name: /open menu/i }).click();
    await expect(internPage.getByRole("link", { name: "Dashboard Overview", exact: true })).toBeVisible();

    // The drawer hides via a CSS transform (-translate-x-full), not
    // display:none, so the nav link itself stays Playwright-"visible" (it has
    // a non-empty box, just off-screen) -- the overlay button's removal from
    // the DOM is the reliable closed-state signal.
    //
    // The overlay is `fixed inset-0` (full viewport), but the drawer panel
    // (w-72 = 288px, higher z-index) visually sits on top of its left side --
    // on this 375px viewport the element's default center-click point (~188px)
    // is covered by the drawer, not the visible dimmed backdrop. Click at a
    // point in the actually-visible backdrop strip instead, same as a real
    // user tapping beside the open drawer would.
    await internPage.getByRole("button", { name: /close menu/i }).click({ position: { x: 350, y: 400 } });
    await expect(internPage.getByRole("button", { name: /close menu/i })).toBeHidden();
  });

  test("Escape key closes the mobile drawer", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern");
    await internPage.getByRole("button", { name: /open menu/i }).click();
    await expect(internPage.getByRole("button", { name: /close menu/i })).toBeVisible();

    await internPage.keyboard.press("Escape");
    await expect(internPage.getByRole("button", { name: /close menu/i })).toBeHidden();
  });

  test("body scrolling is locked while the mobile drawer is open, and released on close", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern");
    expect(await internPage.evaluate(() => document.body.style.overflow)).toBe("");

    await internPage.getByRole("button", { name: /open menu/i }).click();
    await expect.poll(() => internPage.evaluate(() => document.body.style.overflow)).toBe("hidden");

    // See the "overlay click closes the mobile drawer" test above for why
    // this needs an explicit off-drawer click position.
    await internPage.getByRole("button", { name: /close menu/i }).click({ position: { x: 350, y: 400 } });
    await expect.poll(() => internPage.evaluate(() => document.body.style.overflow)).toBe("");
  });

  test("opening the mobile drawer sets aria-expanded and traps focus inside it", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern");
    const openBtn = internPage.getByRole("button", { name: /open menu/i });
    await expect(openBtn).toHaveAttribute("aria-expanded", "false");

    await openBtn.click();
    await expect(openBtn).toHaveAttribute("aria-expanded", "true");
    await expect(internPage.getByRole("link", { name: "Dashboard Overview", exact: true })).toBeFocused();

    // Shift+Tab from the first focusable item must wrap inside the drawer,
    // not escape to hidden background content.
    await internPage.keyboard.press("Shift+Tab");
    const stillInDrawer = await internPage.evaluate(() => {
      const aside = document.querySelector("aside");
      return Boolean(aside && document.activeElement && aside.contains(document.activeElement));
    });
    expect(stillInDrawer).toBe(true);
  });

  test("navigating via a sidebar link on mobile closes the drawer", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern");
    await internPage.getByRole("button", { name: /open menu/i }).click();
    await internPage.getByRole("link", { name: "Placement Hub", exact: true }).click();
    await expect(internPage).toHaveURL(/\/dashboard\/intern\/placement-hub$/);
    await expect(internPage.getByRole("button", { name: /close menu/i })).toBeHidden();
  });

  test("company mobile drawer opens via the header menu button and closes on Escape", async ({ companyOwnerPage }) => {
    await companyOwnerPage.goto("/dashboard/companyCEO");
    await expect(companyOwnerPage.getByRole("button", { name: /collapse sidebar|expand sidebar/i })).toBeHidden();

    await companyOwnerPage.getByRole("button", { name: /open menu/i }).click();
    await expect(companyOwnerPage.getByRole("link", { name: "Dashboard Overview", exact: true })).toBeVisible();

    await companyOwnerPage.keyboard.press("Escape");
    await expect(companyOwnerPage.getByRole("button", { name: /close menu/i })).toBeHidden();
  });
});

test.describe("Sidebar: accessibility", () => {
  test("sidebar items are reachable and activatable via keyboard alone", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern");
    const link = internPage.getByRole("link", { name: "Placement Hub", exact: true });
    await link.focus();
    await expect(link).toBeFocused();
    await internPage.keyboard.press("Enter");
    await expect(internPage).toHaveURL(/\/dashboard\/intern\/placement-hub$/);
  });

  test("sidebar nav links show a visible focus ring when focused", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern");
    const link = internPage.getByRole("link", { name: "Placement Hub", exact: true });
    await link.focus();
    const boxShadow = await link.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(boxShadow).not.toBe("none");
  });

  test("collapsible section toggle is keyboard-operable and exposes aria-expanded", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern");
    const toggle = internPage.getByRole("button", { name: "My Profile" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await toggle.focus();
    await internPage.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(internPage.getByRole("link", { name: "Resume", exact: true })).toBeVisible();
  });

  test("primary sidebar nav exposes an accessible landmark label", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern");
    await expect(internPage.getByRole("navigation", { name: "Primary" })).toBeVisible();
  });
});

test.describe("Sidebar: theme compatibility", () => {
  test("sidebar renders correctly in dark mode, with the active link still visible and marked", async ({
    internPage
  }) => {
    await internPage.goto("/dashboard/intern/profile");
    await internPage.getByRole("button", { name: "Theme", exact: true }).click();
    await internPage.getByRole("button", { name: "Dark", exact: true }).click();

    await internPage.goto("/dashboard/intern");
    await expect(internPage.locator("html")).toHaveClass(/dark/);
    await expect(internPage.locator("body")).not.toContainText(/something went wrong/i);
    await expect(internPage.getByRole("link", { name: "Dashboard Overview", exact: true })).toBeVisible();
    await expect(internPage.getByRole("link", { name: "Dashboard Overview", exact: true })).toHaveAttribute(
      "aria-current",
      "page"
    );

    // Revert to light -- matches dashboard-workflows.spec.ts's existing
    // convention for the same shared appearance setting.
    await internPage.goto("/dashboard/intern/profile");
    await internPage.getByRole("button", { name: "Theme", exact: true }).click();
    await internPage.getByRole("button", { name: "Light", exact: true }).click();
  });

  test("active sidebar item has distinct, visible styling in both light and dark themes", async ({ internPage }) => {
    for (const label of ["Dark", "Light"] as const) {
      await internPage.goto("/dashboard/intern/profile");
      await internPage.getByRole("button", { name: "Theme", exact: true }).click();
      await internPage.getByRole("button", { name: label, exact: true }).click();

      await internPage.goto("/dashboard/intern");
      const active = internPage.getByRole("link", { name: "Dashboard Overview", exact: true });
      const inactive = internPage.getByRole("link", { name: "Placement Hub", exact: true });
      const [activeColor, inactiveColor] = await Promise.all([
        active.evaluate((el) => getComputedStyle(el).color),
        inactive.evaluate((el) => getComputedStyle(el).color)
      ]);
      expect(activeColor).not.toBe(inactiveColor);
    }
  });
});
