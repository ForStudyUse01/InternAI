import type { Page, APIRequestContext } from "@playwright/test";

const BACKEND_URL = "http://localhost:5000";

type CachedSession = {
  role: "intern" | "company" | "admin";
  token: string;
  refreshToken?: string | null;
  adminRole?: string | null;
  permissions?: string[];
  email?: string;
  companyAccountType?: string | null;
  mintedAt: number;
};

// Access tokens expire after 15 minutes. A full-suite run takes ~25 minutes,
// so a token cached at run start goes stale mid-run: every test that then
// injects it starts with an expired token, and the app's silent-refresh
// redirect races the test's own goto()/reload()/evaluate() calls
// (net::ERR_ABORTED, "execution context was destroyed"). Re-minting before
// expiry keeps injected sessions always-fresh at the cost of a handful of
// extra logins per run -- well within the AUTH_RATE_LIMIT=300 E2E budget
// (see playwright.config.ts).
const SESSION_MAX_AGE_MS = 10 * 60 * 1000;

// The login endpoint is rate-limited (authLimiter — intentionally, not
// something this test suite should touch or work around by weakening it).
// A dashboard-workflow suite that re-logs-in via the real UI form for every
// single test would burn through that budget fast. Instead, authenticate
// once per role per test run (cached at module scope, alive for the whole
// worker process) and inject the resulting session directly into
// localStorage — exercising the real login flow is what student/company/
// admin.spec.ts are for, not this file.
const sessionCache = new Map<string, CachedSession>();

async function fetchSession(
  request: APIRequestContext,
  role: "intern" | "company" | "admin",
  email: string,
  password: string
): Promise<CachedSession> {
  const cacheKey = `${role}:${email}`;
  const cached = sessionCache.get(cacheKey);
  if (cached && Date.now() - cached.mintedAt < SESSION_MAX_AGE_MS) return cached;

  const res = await request.post(`${BACKEND_URL}/api/auth/${role}/login`, {
    data: { email, password }
  });
  if (!res.ok()) {
    throw new Error(`Login fixture request failed for ${email}: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  const session: CachedSession = {
    role,
    token: body.data.accessToken || body.data.token,
    refreshToken: body.data.refreshToken || null,
    adminRole: body.data.adminRole || null,
    permissions: body.data.permissions || [],
    email,
    companyAccountType: body.data.companyAccountType || null,
    mintedAt: Date.now()
  };
  sessionCache.set(cacheKey, session);
  return session;
}

export async function loginAsRoleViaApi(
  page: Page,
  role: "intern" | "company" | "admin",
  email: string,
  password: string
) {
  const session = await fetchSession(page.request, role, email, password);

  // Must run before any app script executes, so the very first render sees
  // an authenticated session — matches what lib/session.ts's setAuthSession
  // writes on a real login.
  await page.addInitScript((s) => {
    localStorage.setItem("internai.auth.role", s.role);
    localStorage.setItem("internai.auth.token", s.token);
    localStorage.setItem("internai.auth.logged_in", "true");
    if (s.refreshToken) localStorage.setItem("internai.auth.refresh_token", s.refreshToken);
    if (s.adminRole) localStorage.setItem("internai.auth.admin_role", s.adminRole);
    if (s.permissions && s.permissions.length) {
      localStorage.setItem("internai.auth.permissions", JSON.stringify(s.permissions));
    }
    if (s.email) localStorage.setItem("internai.auth.email", s.email);
    if (s.companyAccountType) localStorage.setItem("internai.auth.company_account_type", s.companyAccountType);
  }, session);
}
