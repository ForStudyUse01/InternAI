import { test } from "../fixtures/roles.fixture";
import { ADMIN_ROUTES } from "../helpers/routes";
import { DashboardShellPage } from "../pages/shared/dashboard-shell.page";

// Truth table derived directly from backend/src/shared/constants/roles.js
// ROLE_PERMISSIONS vs frontend/constants/admin-permissions.ts
// canAccessAdminView() -- verified against both files, not assumed.
// verification_admin: admin:company:verify, admin:company:suspend,
//   admin:certification:review, admin:activity:view
// moderation_admin: admin:report:review, admin:user:view,
//   admin:user:update, admin:activity:view
// support_admin: admin:user:view, admin:user:update, admin:activity:view
const ADMIN_MATRIX: Record<string, { verification: boolean; moderation: boolean; support: boolean }> = {
  overview: { verification: true, moderation: true, support: true },
  users: { verification: false, moderation: true, support: true },
  companies: { verification: true, moderation: false, support: false },
  verification: { verification: true, moderation: false, support: false },
  internships: { verification: true, moderation: true, support: true },
  reports: { verification: false, moderation: true, support: false },
  "activity-logs": { verification: true, moderation: true, support: true },
  analytics: { verification: true, moderation: true, support: true },
  notifications: { verification: true, moderation: true, support: true },
  settings: { verification: true, moderation: true, support: true },
  "hiring-scoring": { verification: false, moderation: false, support: false },
  "certification-review": { verification: true, moderation: false, support: false }
};

test.describe("Admin permission matrix: super_admin has full access", () => {
  for (const route of ADMIN_ROUTES) {
    test(`super_admin: ${route.label} -> allow`, async ({ adminSuperPage }) => {
      await adminSuperPage.goto(route.path);
      await new DashboardShellPage(adminSuperPage).expectNoCrash();
    });
  }
});

test.describe("Admin permission matrix: verification_admin", () => {
  for (const route of ADMIN_ROUTES) {
    const allowed = ADMIN_MATRIX[route.label].verification;
    test(`verification_admin: ${route.label} -> ${allowed ? "allow" : "deny"}`, async ({ adminVerificationPage }) => {
      await adminVerificationPage.goto(route.path);
      const shell = new DashboardShellPage(adminVerificationPage);
      if (allowed) {
        await shell.expectNoCrash();
      } else {
        await shell.expectAdminViewDenied();
      }
    });
  }
});

test.describe("Admin permission matrix: moderation_admin", () => {
  for (const route of ADMIN_ROUTES) {
    const allowed = ADMIN_MATRIX[route.label].moderation;
    test(`moderation_admin: ${route.label} -> ${allowed ? "allow" : "deny"}`, async ({ adminModerationPage }) => {
      await adminModerationPage.goto(route.path);
      const shell = new DashboardShellPage(adminModerationPage);
      if (allowed) {
        await shell.expectNoCrash();
      } else {
        await shell.expectAdminViewDenied();
      }
    });
  }
});

test.describe("Admin permission matrix: support_admin", () => {
  for (const route of ADMIN_ROUTES) {
    const allowed = ADMIN_MATRIX[route.label].support;
    test(`support_admin: ${route.label} -> ${allowed ? "allow" : "deny"}`, async ({ adminSupportPage }) => {
      await adminSupportPage.goto(route.path);
      const shell = new DashboardShellPage(adminSupportPage);
      if (allowed) {
        await shell.expectNoCrash();
      } else {
        await shell.expectAdminViewDenied();
      }
    });
  }
});
