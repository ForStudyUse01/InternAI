import { test, expect, FIXTURE_CREDENTIALS } from "../fixtures/roles.fixture";
import { APPEARANCES, PALETTES, readAppliedTheme, readComputedStyle } from "../helpers/theme";
import { waitForAuthFormHydration } from "../helpers/hydration";
import { DashboardShellPage } from "../pages/shared/dashboard-shell.page";

const BACKEND_URL = "http://localhost:5000";

// Theme mount points, verified against source: intern profile's "Theme"
// section button (components/icons/section-tab-button.tsx renders a plain
// <button>, not an ARIA tabs widget -- no role="tab" anywhere), company
// personal-profile page, admin settings page.
// applyToDocument() (theme-provider.tsx) is one shared code path for every
// page -- these 3 reachability checks plus the palette/appearance mechanism
// test below cover the mechanism; a small representative-page visual smoke
// pass (not all ~60 routes) covers the "doesn't break rendering" concern,
// since palette swapping is a CSS-variable change, not per-page logic.

test.describe("Theme mechanism: palettes", () => {
  for (const palette of PALETTES) {
    test(`selecting "${palette.label}" applies data-theme="${palette.id}"`, async ({ internPage }) => {
      await internPage.goto("/dashboard/intern/profile");
      await internPage.getByRole("button", { name: "Theme", exact: true }).click();
      const button = internPage.getByRole("button", { name: palette.label, exact: true });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      const applied = await readAppliedTheme(internPage);
      expect(applied.theme).toBe(palette.id);
      expect(applied.storedTheme).toBe(palette.id);
    });
  }
});

test.describe("Theme mechanism: appearance + persistence", () => {
  for (const appearance of APPEARANCES) {
    test(`switching to "${appearance}" applies and persists across reload`, async ({ internPage }) => {
      await internPage.goto("/dashboard/intern/profile");
      await internPage.getByRole("button", { name: "Theme", exact: true }).click();
      const label = appearance === "light" ? "Light" : "Dark";
      await internPage.getByRole("button", { name: label, exact: true }).click();
      const applied = await readAppliedTheme(internPage);
      expect(applied.appearance).toBe(appearance);
      expect(applied.isDarkClass).toBe(appearance === "dark");

      await internPage.reload();
      const afterReload = await readAppliedTheme(internPage);
      expect(afterReload.appearance).toBe(appearance);
      expect(afterReload.storedAppearance).toBe(appearance);
    });
  }
});

test.describe("Theme mount points are reachable", () => {
  test("intern profile Theme tab", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern/profile");
    await internPage.getByRole("button", { name: "Theme", exact: true }).click();
    await expect(internPage.getByRole("button", { name: "Ocean Blue", exact: true })).toBeVisible();
  });

  test("company personal-profile page", async ({ companyOwnerPage }) => {
    await companyOwnerPage.goto("/dashboard/companyCEO/profile/personal");
    await expect(companyOwnerPage.getByRole("button", { name: "Ocean Blue", exact: true })).toBeVisible();
  });

  test("admin settings page", async ({ adminSuperPage }) => {
    await adminSuperPage.goto("/dashboard/admin/settings");
    await expect(adminSuperPage.getByRole("button", { name: "Ocean Blue", exact: true })).toBeVisible();
  });
});

test.describe("Theme visual smoke: representative pages across all 20 combinations", () => {
  const REPRESENTATIVE_PAGES = [
    { name: "intern overview", path: "/dashboard/intern" },
    { name: "intern applications (table)", path: "/dashboard/intern/applications" },
    { name: "intern profile (form)", path: "/dashboard/intern/profile/edit" },
    { name: "intern analytics (chart)", path: "/dashboard/intern/track-progress" }
  ];

  for (const palette of PALETTES) {
    for (const appearance of APPEARANCES) {
      test(`${palette.label} / ${appearance}: key elements stay visible`, async ({ internPage }) => {
        await internPage.goto("/dashboard/intern/profile");
        await internPage.getByRole("button", { name: "Theme", exact: true }).click();
        await internPage.getByRole("button", { name: palette.label, exact: true }).click();
        await internPage.getByRole("button", { name: appearance === "light" ? "Light" : "Dark", exact: true }).click();

        for (const page of REPRESENTATIVE_PAGES) {
          await internPage.goto(page.path);
          await expect(internPage.locator("body")).not.toContainText(/something went wrong/i);
          await expect(internPage.locator("h1, h2").first()).toBeVisible();
        }
      });
    }
  }
});

test.describe("Theme persistence: a specific palette survives a reload, shown as selected", () => {
  test("a non-default palette selection is still the checked button after a fresh load", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern/profile");
    await internPage.getByRole("button", { name: "Theme", exact: true }).click();
    await internPage.getByRole("button", { name: "Royal Purple", exact: true }).click();
    await expect(internPage.getByRole("button", { name: "Royal Purple", exact: true })).toHaveAttribute("aria-pressed", "true");

    await internPage.reload();
    await internPage.getByRole("button", { name: "Theme", exact: true }).click();
    const applied = await readAppliedTheme(internPage);
    expect(applied.theme).toBe("royal");
    // Not just the CSS attribute -- the UI must also show the right card checked.
    await expect(internPage.getByRole("button", { name: "Royal Purple", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(internPage.getByRole("button", { name: "Ocean Blue", exact: true })).toHaveAttribute("aria-pressed", "false");
  });
});

test.describe("Theme persistence: server round-trip on a fresh session", () => {
  test("a saved preference is pulled from the server when local cache is absent but the session is still authenticated", async ({
    internPage
  }) => {
    // This is the code path theme-provider.tsx's mount effect exists for: a
    // logged-in user opening the app on a device/browser with no local theme
    // cache yet (equivalent to a fresh logout/login or a new device) should
    // get their theme back from the DB via GET /auth/me, not the hardcoded
    // default.
    await internPage.goto("/dashboard/intern/profile");
    await internPage.getByRole("button", { name: "Theme", exact: true }).click();

    const [themeRes] = await Promise.all([
      internPage.waitForResponse((r) => r.url().includes("/api/auth/theme") && r.request().method() === "PATCH"),
      internPage.getByRole("button", { name: "Midnight Black", exact: true }).click()
    ]);
    expect(themeRes.ok()).toBeTruthy();
    const [appearanceRes] = await Promise.all([
      internPage.waitForResponse((r) => r.url().includes("/api/auth/theme") && r.request().method() === "PATCH"),
      internPage.getByRole("button", { name: "Light", exact: true }).click()
    ]);
    expect(appearanceRes.ok()).toBeTruthy();

    // Simulate a fresh device/session: same account, still authenticated (the
    // auth token is untouched), but no local theme cache.
    await internPage.evaluate(() => {
      window.localStorage.removeItem("internai.theme");
      window.localStorage.removeItem("internai.appearance");
    });
    await internPage.reload();

    await expect.poll(async () => (await readAppliedTheme(internPage)).theme).toBe("midnight");
    const applied = await readAppliedTheme(internPage);
    expect(applied.appearance).toBe("light");
    expect(applied.storedTheme).toBe("midnight");
    expect(applied.storedAppearance).toBe("light");
  });
});

test.describe("Theme persistence: shared across browser tabs", () => {
  test("a theme set in one tab is already applied when a second tab in the same session loads", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern/profile");
    await internPage.getByRole("button", { name: "Theme", exact: true }).click();
    await internPage.getByRole("button", { name: "Sunset Orange", exact: true }).click();
    await internPage.getByRole("button", { name: "Light", exact: true }).click();
    await expect.poll(async () => (await readAppliedTheme(internPage)).storedTheme).toBe("sunset");

    const secondTab = await internPage.context().newPage();
    await secondTab.goto("/dashboard/intern");
    const secondApplied = await readAppliedTheme(secondTab);
    expect(secondApplied.theme).toBe("sunset");
    expect(secondApplied.appearance).toBe("light");
    await secondTab.close();
  });
});

test.describe("Theme mechanism: invalid stored values are handled gracefully", () => {
  // Earlier persistence tests in this file PATCH the intern fixture user's
  // SERVER-side theme (e.g. midnight/light, sunset/light). On the reload
  // below, theme-provider's mount effect restores that server value, which
  // would beat the hardcoded default these tests assert -- so pin the
  // server-side preference to the defaults first, making "fell back to the
  // default" and "recovered the server value" agree deterministically.
  async function pinServerThemeToDefaults(page: import("@playwright/test").Page) {
    const token = await page.evaluate(() => window.localStorage.getItem("internai.auth.token"));
    const res = await page.request.patch(`${BACKEND_URL}/api/auth/theme`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { theme: "ocean", appearance: "dark" }
    });
    expect(res.ok()).toBeTruthy();
  }

  test("a corrupted theme id in localStorage falls back to the default palette, not a crash", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern/profile");
    await pinServerThemeToDefaults(internPage);
    await internPage.evaluate(() => {
      window.localStorage.setItem("internai.theme", "totally-not-a-real-theme-id");
      window.localStorage.setItem("internai.appearance", "dark");
    });
    await internPage.reload();
    await expect(internPage.locator("body")).not.toContainText(/something went wrong/i);

    await internPage.getByRole("button", { name: "Theme", exact: true }).click();
    // React's in-memory state falls back to the default palette even though a
    // pre-hydration init script already wrote the raw (invalid) value to <html>.
    await expect(internPage.getByRole("button", { name: "Ocean Blue", exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  test("a corrupted appearance value in localStorage still resolves to a consistent dark-mode state", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern/profile");
    await pinServerThemeToDefaults(internPage);
    await internPage.evaluate(() => {
      window.localStorage.setItem("internai.theme", "ocean");
      window.localStorage.setItem("internai.appearance", "not-a-real-mode");
    });
    await internPage.reload();
    await expect(internPage.locator("body")).not.toContainText(/something went wrong/i);

    const applied = await readAppliedTheme(internPage);
    // DEFAULT_APPEARANCE is "dark" -- this must be reflected in the actual
    // <html> "dark" class, not just in React's in-memory state, since several
    // components style off Tailwind's `dark:` variant rather than the
    // CSS-variable tokens.
    expect(applied.appearance).toBe("dark");
    expect(applied.isDarkClass).toBe(true);
    await internPage.getByRole("button", { name: "Theme", exact: true }).click();
    await expect(internPage.getByRole("button", { name: "Dark", exact: true })).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("Theme mechanism: propagates into dialogs", () => {
  test("a confirm dialog's background token changes with the active theme", async ({ adminSuperPage }) => {
    async function openDeleteDialogAndReadBg() {
      await adminSuperPage.goto("/dashboard/admin/users");
      const deleteButton = adminSuperPage.getByRole("button", { name: "Soft Delete", exact: true }).first();
      await expect(deleteButton).toBeVisible({ timeout: 15000 });
      await deleteButton.click();
      const dialog = adminSuperPage.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const bg = await dialog.evaluate((el) => getComputedStyle(el).backgroundColor);
      // Escape cancels -- no user is actually soft-deleted.
      await adminSuperPage.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      return bg;
    }

    await adminSuperPage.goto("/dashboard/admin/settings");
    await adminSuperPage.getByRole("button", { name: "Ocean Blue", exact: true }).click();
    await adminSuperPage.getByRole("button", { name: "Dark", exact: true }).click();
    const oceanDarkBg = await openDeleteDialogAndReadBg();

    await adminSuperPage.goto("/dashboard/admin/settings");
    await adminSuperPage.getByRole("button", { name: "Midnight Black", exact: true }).click();
    const midnightDarkBg = await openDeleteDialogAndReadBg();

    expect(midnightDarkBg).not.toBe(oceanDarkBg);
  });
});

test.describe("Theme mechanism: keyboard operability", () => {
  test("palette and appearance controls are operable via keyboard alone", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern/profile");
    await internPage.getByRole("button", { name: "Theme", exact: true }).click();

    const royalButton = internPage.getByRole("button", { name: "Royal Purple", exact: true });
    await royalButton.focus();
    await internPage.keyboard.press("Enter");
    await expect(royalButton).toHaveAttribute("aria-pressed", "true");

    const lightButton = internPage.getByRole("button", { name: "Light", exact: true });
    await lightButton.focus();
    await internPage.keyboard.press("Space");
    await expect(lightButton).toHaveAttribute("aria-pressed", "true");

    const applied = await readAppliedTheme(internPage);
    expect(applied.theme).toBe("royal");
    expect(applied.appearance).toBe("light");
  });
});

test.describe("Theme API validation (server-side)", () => {
  async function getInternToken(page: import("@playwright/test").Page) {
    // loginAsRoleViaApi only registers an addInitScript -- it never
    // navigates. A brand-new page fixture is still on about:blank at this
    // point, which has an opaque origin and throws a SecurityError on any
    // localStorage access, so navigate to the app first.
    if (!page.url().startsWith("http")) {
      await page.goto("/dashboard/intern");
    }
    return page.evaluate(() => window.localStorage.getItem("internai.auth.token"));
  }

  test("rejects an unknown theme id with 400", async ({ request, internPage }) => {
    const token = await getInternToken(internPage);
    const res = await request.patch(`${BACKEND_URL}/api/auth/theme`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { theme: "not-a-real-theme" }
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/invalid theme id/i);
  });

  test("rejects an invalid appearance mode with 400", async ({ request, internPage }) => {
    const token = await getInternToken(internPage);
    const res = await request.patch(`${BACKEND_URL}/api/auth/theme`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { appearance: "twilight" }
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/invalid appearance mode/i);
  });

  // Validation checklist folded in here -- theme/appearance are the only two
  // real input fields this module has (everything else is a static display or
  // a discrete button choice). There's no free-text field to sanitize: the
  // fixed server-side whitelist (VALID_THEME_IDS) is itself the injection
  // defense, so every one of these payloads must be rejected outright, not
  // stored or reflected anywhere.
  const MALFORMED_THEME_PAYLOADS: Array<[string, string]> = [
    ["script tag", "<script>alert(1)</script>"],
    ["NoSQL operator injection", '{"$ne": null}'],
    ["SQL-style injection", "'; DROP TABLE users; --"],
    ["unicode/emoji", "🎨深色テーマ"],
    ["max-length garbage", "a".repeat(5000)],
    ["empty string", ""]
  ];
  for (const [label, payload] of MALFORMED_THEME_PAYLOADS) {
    test(`rejects malformed theme id -- ${label}`, async ({ request, internPage }) => {
      const token = await getInternToken(internPage);
      const res = await request.patch(`${BACKEND_URL}/api/auth/theme`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { theme: payload }
      });
      expect(res.status()).toBe(400);
    });
  }

  test("requires authentication -- rejected without a bearer token", async ({ request }) => {
    const res = await request.patch(`${BACKEND_URL}/api/auth/theme`, {
      data: { theme: "ocean" }
    });
    expect(res.status()).toBe(401);
  });

  test("a partial update (appearance only) leaves the previously saved theme untouched", async ({ request, internPage }) => {
    const token = await getInternToken(internPage);
    const setTheme = await request.patch(`${BACKEND_URL}/api/auth/theme`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { theme: "earth" }
    });
    expect(setTheme.ok()).toBeTruthy();

    const appearanceOnly = await request.patch(`${BACKEND_URL}/api/auth/theme`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { appearance: "light" }
    });
    expect(appearanceOnly.ok()).toBeTruthy();
    const body = await appearanceOnly.json();
    expect(body.data.themePreference).toBe("earth");
    expect(body.data.appearanceMode).toBe("light");
  });
});

// Admin-module-specific coverage below. The mechanism itself (palette
// application, persistence, server round-trip, validation) is already fully
// exercised above via the intern fixture -- applyToDocument() is the one
// shared code path for every role/page, per this file's own header comment.
// What's untested above is whether every ADMIN page actually renders
// correctly once that mechanism fires, since none of the mount-point/smoke
// tests above ever visit an admin route besides Settings itself.

// `heading` is the view's actual rendered <h1> text (VIEW_META[view].title
// in admin-dashboard-page.tsx) -- not always the same as the brief's own
// checklist label, e.g. "Company Verification" renders as "Verification
// Queue" and "Reports" renders as "Reported Companies".
const ADMIN_PAGES = [
  { name: "Dashboard", path: "/dashboard/admin", heading: "Platform Overview" },
  { name: "User Management", path: "/dashboard/admin/users", heading: "User Management" },
  { name: "Company Verification", path: "/dashboard/admin/verification", heading: "Verification Queue" },
  { name: "Reports", path: "/dashboard/admin/reports", heading: "Reported Companies" },
  { name: "Certification Review", path: "/dashboard/admin/certification-review", heading: "Certification Review" },
  { name: "Settings", path: "/dashboard/admin/settings", heading: "Settings" }
];

test.describe("Admin dashboard: every major page renders correctly in both themes", () => {
  for (const appearance of APPEARANCES) {
    test(`Dashboard, User Management, Company Verification, Reports, Certification Review, and Settings all render in ${appearance} mode`, async ({
      adminSuperPage
    }) => {
      await adminSuperPage.goto("/dashboard/admin/settings");
      await adminSuperPage.getByRole("button", { name: appearance === "light" ? "Light" : "Dark", exact: true }).click();
      await expect.poll(async () => (await readAppliedTheme(adminSuperPage)).appearance).toBe(appearance);

      for (const page of ADMIN_PAGES) {
        await adminSuperPage.goto(page.path);
        await expect(adminSuperPage.locator("body")).not.toContainText(/something went wrong/i);
        // Two <h1>s exist on every admin view: AdminShell's own welcome
        // banner ("Platform management center.") and the view's own title
        // (admin-dashboard-page.tsx's meta.title) -- a bare level-1 role
        // query is ambiguous, so scope to the page-title heading specifically.
        await expect(adminSuperPage.getByRole("heading", { level: 1, name: page.heading })).toBeVisible();
        const applied = await readAppliedTheme(adminSuperPage);
        expect(applied.appearance).toBe(appearance);
        expect(applied.isDarkClass).toBe(appearance === "dark");
      }
    });
  }
});

test.describe("Admin dashboard: tables, cards, and status badges repaint with appearance", () => {
  test("computed background color for a table and a card differ between light and dark", async ({ adminSuperPage }) => {
    async function readSnapshot() {
      await adminSuperPage.goto("/dashboard/admin/users");
      await expect(adminSuperPage.getByRole("table")).toBeVisible({ timeout: 15000 });
      // The surface color lives on the table's wrapper div (.ds-table-wrap),
      // not <tr>/<td> -- confirmed against platform-design-system.css: table
      // rows/cells are transparent by default and only gain a background on
      // :hover, so asserting on <tr> itself would compare transparent to
      // transparent regardless of theme.
      const tableBg = await readComputedStyle(adminSuperPage, ".ds-table-wrap", "background-color");

      await adminSuperPage.goto("/dashboard/admin/verification");
      await expect(adminSuperPage.locator("body")).not.toContainText(/something went wrong/i);
      const cardBg = await readComputedStyle(adminSuperPage, ".ds-card", "background-color");

      return { tableBg, cardBg };
    }

    await adminSuperPage.goto("/dashboard/admin/settings");
    await adminSuperPage.getByRole("button", { name: "Dark", exact: true }).click();
    const dark = await readSnapshot();

    await adminSuperPage.goto("/dashboard/admin/settings");
    await adminSuperPage.getByRole("button", { name: "Light", exact: true }).click();
    const light = await readSnapshot();

    expect(dark.tableBg).not.toBe(light.tableBg);
    expect(dark.cardBg).not.toBe(light.cardBg);
  });

  for (const appearance of APPEARANCES) {
    test(`status badges render with a visible, non-transparent color in ${appearance} mode`, async ({ adminSuperPage }) => {
      await adminSuperPage.goto("/dashboard/admin/settings");
      await adminSuperPage.getByRole("button", { name: appearance === "light" ? "Light" : "Dark", exact: true }).click();

      await adminSuperPage.goto("/dashboard/admin/users");
      await expect(adminSuperPage.getByRole("table")).toBeVisible({ timeout: 15000 });
      // "intern" is the largest role bucket in this dev DB (every student
      // signup) -- guaranteed present. The Role cell's only child is the
      // StatusBadge span, so its accessible name IS the badge's text.
      const roleCell = adminSuperPage.getByRole("cell", { name: "intern", exact: true }).first();
      await expect(roleCell).toBeVisible();
      const badge = roleCell.locator("span").first();
      const bg = await badge.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bg).not.toBe("rgba(0, 0, 0, 0)");
      expect(bg).not.toBe("transparent");
    });
  }
});

test.describe("Admin dashboard charts respect the active theme", () => {
  test("growth chart line color reflects the active palette, or the empty state renders cleanly", async ({ adminSuperPage }) => {
    async function readChartStroke(paletteLabel: string) {
      await adminSuperPage.goto("/dashboard/admin/settings");
      await adminSuperPage.getByRole("button", { name: paletteLabel, exact: true }).click();
      await adminSuperPage.getByRole("button", { name: "Dark", exact: true }).click();

      await adminSuperPage.goto("/dashboard/admin/analytics");
      await expect(adminSuperPage.locator("body")).not.toContainText(/something went wrong/i);
      const charts = adminSuperPage.getByRole("img", { name: /^Trend of/i });

      if ((await charts.count()) > 0) {
        return charts.first().locator("path").nth(1).evaluate((el) => getComputedStyle(el).stroke);
      }
      // No growth data lands in the current 6-month fixture window on some
      // runs -- AdminGrowthCharts falls back to an EmptyState instead of a
      // chart, which is the other valid rendering branch and must still not
      // crash the page.
      await expect(adminSuperPage.getByText("Not enough activity yet")).toBeVisible();
      return null;
    }

    const oceanStroke = await readChartStroke("Ocean Blue");
    const midnightStroke = await readChartStroke("Midnight Black");

    if (oceanStroke !== null && midnightStroke !== null) {
      expect(midnightStroke).not.toBe(oceanStroke);
    }
  });
});

test.describe("Theme persistence: navigating between admin pages keeps the theme active", () => {
  test("a non-default theme stays applied across Dashboard, Users, Reports, and Settings", async ({ adminSuperPage }) => {
    await adminSuperPage.goto("/dashboard/admin/settings");
    await adminSuperPage.getByRole("button", { name: "Rose Pink", exact: true }).click();
    await adminSuperPage.getByRole("button", { name: "Light", exact: true }).click();
    await expect.poll(async () => (await readAppliedTheme(adminSuperPage)).storedTheme).toBe("rose");

    for (const path of ["/dashboard/admin", "/dashboard/admin/users", "/dashboard/admin/reports", "/dashboard/admin/settings"]) {
      await adminSuperPage.goto(path);
      const applied = await readAppliedTheme(adminSuperPage);
      expect(applied.theme).toBe("rose");
      expect(applied.appearance).toBe("light");
    }
  });
});

test.describe("Theme persistence: login pulls the saved server theme when no local cache exists", () => {
  test("logging in through the real form applies the account's saved theme immediately, without a reload", async ({ page, request }) => {
    const creds = FIXTURE_CREDENTIALS.adminVerification;
    const loginRes = await request.post(`${BACKEND_URL}/api/auth/admin/login`, {
      data: { email: creds.email, password: creds.password }
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginBody = await loginRes.json();
    const token = loginBody.data.accessToken || loginBody.data.token;

    // Pin the account's SERVER-side preference to something distinctly
    // non-default, so "still the hardcoded default after login" and
    // "correctly pulled the saved preference" are unambiguous outcomes.
    const patchRes = await request.patch(`${BACKEND_URL}/api/auth/theme`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { theme: "crimson", appearance: "light" }
    });
    expect(patchRes.ok()).toBeTruthy();

    // A brand-new, unauthenticated page -- no localStorage theme cache, and
    // no injected session (loginAsRoleViaApi's addInitScript is deliberately
    // not used here) -- so this is a genuine first-ever login in this
    // browser context, the exact scenario the server round-trip exists for.
    await page.goto("/auth/admin");
    await waitForAuthFormHydration(page);
    await page.getByLabel("Admin Email", { exact: true }).fill(creds.email);
    await page.getByLabel("Password", { exact: true }).fill(creds.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard\/admin/, { timeout: 15000 });

    await expect.poll(async () => (await readAppliedTheme(page)).theme).toBe("crimson");
    const applied = await readAppliedTheme(page);
    expect(applied.appearance).toBe("light");
    expect(applied.storedTheme).toBe("crimson");
    expect(applied.storedAppearance).toBe("light");

    // Restore this fixture account to the suite-wide default so any other
    // spec that later authenticates as it isn't left on a surprise palette.
    await request.patch(`${BACKEND_URL}/api/auth/theme`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { theme: "ocean", appearance: "dark" }
    });
  });
});

test.describe("Theme persistence: logout does not reset the active theme", () => {
  test("the active theme survives logout and remains applied on the login page", async ({ adminSuperPage }) => {
    const shell = new DashboardShellPage(adminSuperPage);
    await adminSuperPage.goto("/dashboard/admin/settings");
    await adminSuperPage.getByRole("button", { name: "Golden Yellow", exact: true }).click();
    await adminSuperPage.getByRole("button", { name: "Light", exact: true }).click();
    await expect.poll(async () => (await readAppliedTheme(adminSuperPage)).storedTheme).toBe("golden");

    await shell.logout();
    await expect(adminSuperPage).toHaveURL(/\/auth\/admin/);

    const applied = await readAppliedTheme(adminSuperPage);
    expect(applied.theme).toBe("golden");
    expect(applied.appearance).toBe("light");
  });
});

test.describe("Theme initialization: no console errors or hydration warnings", () => {
  test("reloading with a saved non-default theme produces no console errors", async ({ internPage }) => {
    const errors: string[] = [];
    internPage.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    internPage.on("pageerror", (err) => errors.push(err.message));

    await internPage.goto("/dashboard/intern/profile");
    await internPage.getByRole("button", { name: "Theme", exact: true }).click();
    await internPage.getByRole("button", { name: "Earth Brown", exact: true }).click();
    await internPage.getByRole("button", { name: "Dark", exact: true }).click();
    await internPage.reload();
    await expect(internPage.getByRole("button", { name: "Theme", exact: true })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("switching theme and appearance repeatedly produces no console errors", async ({ internPage }) => {
    const errors: string[] = [];
    internPage.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    internPage.on("pageerror", (err) => errors.push(err.message));

    await internPage.goto("/dashboard/intern/profile");
    await internPage.getByRole("button", { name: "Theme", exact: true }).click();
    for (const palette of ["Olive Green", "Sunset Orange", "Royal Purple", "Ocean Blue"]) {
      await internPage.getByRole("button", { name: palette, exact: true }).click();
    }
    for (const label of ["Light", "Dark", "Light", "Dark"]) {
      await internPage.getByRole("button", { name: label, exact: true }).click();
    }

    expect(errors).toEqual([]);
  });
});

test.describe("Theme across responsive breakpoints: mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("admin Users page renders correctly in both themes at mobile width", async ({ adminSuperPage }) => {
    for (const appearance of APPEARANCES) {
      await adminSuperPage.goto("/dashboard/admin/settings");
      await adminSuperPage.getByRole("button", { name: appearance === "light" ? "Light" : "Dark", exact: true }).click();

      await adminSuperPage.goto("/dashboard/admin/users");
      await expect(adminSuperPage.locator("body")).not.toContainText(/something went wrong/i);
      await expect(adminSuperPage.getByRole("heading", { level: 1, name: "User Management" })).toBeVisible();
      const applied = await readAppliedTheme(adminSuperPage);
      expect(applied.appearance).toBe(appearance);
    }
  });
});

test.describe("Theme across responsive breakpoints: tablet", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("admin Users page renders correctly in both themes at tablet width", async ({ adminSuperPage }) => {
    for (const appearance of APPEARANCES) {
      await adminSuperPage.goto("/dashboard/admin/settings");
      await adminSuperPage.getByRole("button", { name: appearance === "light" ? "Light" : "Dark", exact: true }).click();

      await adminSuperPage.goto("/dashboard/admin/users");
      await expect(adminSuperPage.locator("body")).not.toContainText(/something went wrong/i);
      await expect(adminSuperPage.getByRole("heading", { level: 1, name: "User Management" })).toBeVisible();
      const applied = await readAppliedTheme(adminSuperPage);
      expect(applied.appearance).toBe(appearance);
    }
  });
});
