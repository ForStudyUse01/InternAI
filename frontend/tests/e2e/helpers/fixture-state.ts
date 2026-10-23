import type { APIRequestContext } from "@playwright/test";

const BACKEND_URL = "http://localhost:5000";
const OWNER_EMAIL = "e2e.company.owner@internai-test.local";
const OWNER_PASSWORD = "E2eCompanyOwner@123";
const HR_EMAIL = "e2e.company.hr@internai-test.local";

type HrInsightsUser = { id: string; email: string; permissions: string[]; sidebarModules: string[] };

async function ownerAuthHeader(request: APIRequestContext) {
  const res = await request.post(`${BACKEND_URL}/api/auth/company/login`, {
    data: { email: OWNER_EMAIL, password: OWNER_PASSWORD }
  });
  if (!res.ok()) throw new Error(`Owner login failed for fixture-state setup: ${res.status()} ${await res.text()}`);
  const body = await res.json();
  const token = body.data.accessToken || body.data.token;
  return { Authorization: `Bearer ${token}` };
}

async function fetchHrUser(request: APIRequestContext, headers: Record<string, string>): Promise<HrInsightsUser> {
  const res = await request.get(`${BACKEND_URL}/api/company/hr/insights`, { headers });
  if (!res.ok()) throw new Error(`hr/insights fetch failed: ${res.status()} ${await res.text()}`);
  const body = await res.json();
  const hr = (body.data.hrUsers as HrInsightsUser[]).find((u) => u.email === HR_EMAIL);
  if (!hr) throw new Error(`E2E HR fixture ${HR_EMAIL} not found in hr/insights response`);
  return hr;
}

/**
 * Grants the shared e2e.company.hr fixture temporary permissions/
 * sidebarModules via the real API, runs `fn`, then always reverts to
 * whatever it had beforehand. This is one shared, real, mutable DB record --
 * other specs (and re-runs of this one) depend on it staying in its default
 * state between tests, since there's no per-test data isolation at
 * `workers:1`. Either field can be omitted to leave that side untouched
 * (defaults to its current value) -- e.g. pass only `sidebarModules` to test
 * module-gating without touching the permission-key set.
 */
export async function withTemporaryHrPermissions(
  request: APIRequestContext,
  temp: { permissions?: string[]; sidebarModules?: string[] },
  fn: (before: HrInsightsUser) => Promise<void>
) {
  const headers = await ownerAuthHeader(request);
  const before = await fetchHrUser(request, headers);

  const grant = await request.patch(`${BACKEND_URL}/api/company/hr/${before.id}/permissions`, {
    headers,
    data: { permissions: temp.permissions ?? before.permissions, sidebarModules: temp.sidebarModules ?? before.sidebarModules }
  });
  if (!grant.ok()) throw new Error(`Granting temporary HR permissions failed: ${grant.status()} ${await grant.text()}`);

  try {
    await fn(before);
  } finally {
    await request.patch(`${BACKEND_URL}/api/company/hr/${before.id}/permissions`, {
      headers,
      data: { permissions: before.permissions, sidebarModules: before.sidebarModules }
    });
  }
}
