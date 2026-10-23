import { INTERN_ROUTES, ADMIN_ROUTES, COMPANY_VIEWS, COMPANY_LITERAL_ROUTES, COMPANY_CEO_BASE, companyPath } from "./helpers/routes";

// `next dev` JIT-compiles each route on its first hit (documented in
// playwright.config.ts). Left alone, whichever test happens to be first to
// touch a given route pays that compile cost out of its own 90s budget --
// under workers:1, a long run can queue several cold compiles back-to-back
// early on. Priming every route once here, before any test executes, moves
// that one-time cost into a setup phase with no test-timeout budget instead
// of letting it land unpredictably on whichever spec runs first.
//
// Auth is irrelevant for warming: a client component still gets compiled and
// SSR'd server-side for an unauthenticated GET even though it'll redirect to
// login client-side afterward -- we only care that the server has compiled
// the route, not what the page renders.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const REQUEST_TIMEOUT_MS = 20_000;

async function warm(path: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    await fetch(`${BASE_URL}${path}`, { signal: controller.signal });
  } catch {
    // Best-effort warm-up -- a route that fails to prime here still gets a
    // real attempt (and a real 90s budget) when its actual test runs.
  } finally {
    clearTimeout(timer);
  }
}

export default async function globalSetup() {
  const paths = [
    ...INTERN_ROUTES.map((r) => r.path),
    ...ADMIN_ROUTES.map((r) => r.path),
    ...COMPANY_VIEWS.map((v) => companyPath(COMPANY_CEO_BASE, v)),
    ...COMPANY_LITERAL_ROUTES.map((r) => companyPath(COMPANY_CEO_BASE, r)),
    "/auth/intern",
    "/auth/company",
    "/auth/admin"
  ];

  const started = Date.now();
  for (const path of paths) {
    await warm(path);
  }
  // eslint-disable-next-line no-console
  console.log(`[global-setup] pre-warmed ${paths.length} routes in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}
