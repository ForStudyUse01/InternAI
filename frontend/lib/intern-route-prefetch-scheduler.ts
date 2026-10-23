import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { prefetchAdminRouteData } from "@/lib/admin-dashboard-prefetch";
import { prefetchCompanyRouteData } from "@/lib/company-dashboard-prefetch";
import { prefetchInternRouteData } from "@/lib/intern-dashboard-prefetch";
import { INTERN_DASHBOARD_ROUTES } from "@/lib/intern-dashboard-routes";

const prefetchedRoutes = new Set<string>();
const prefetchedData = new Set<string>();
const routeQueue: string[] = [];
let activePrefetches = 0;

const MAX_CONCURRENT_ROUTES = 2;
const ROUTE_GAP_MS = 200;
const IMMEDIATE_ROUTE_GAP_MS = 0;
const HOVER_DEBOUNCE_MS = 80;

/** High-traffic intern routes warmed first; never prefetch all routes at once in dev. */
export const PRIORITY_ROUTES = [
  "/dashboard/intern",
  "/dashboard/intern/applications",
  "/dashboard/intern/interviews",
  "/dashboard/intern/calendar",
  "/dashboard/intern/internships/search",
  "/dashboard/intern/notifications",
  "/dashboard/intern/profile",
  "/dashboard/intern/resume"
] as const;

const PRIORITY_ROUTE_SET = new Set<string>(PRIORITY_ROUTES);

let hoverTimer: ReturnType<typeof setTimeout> | undefined;
let drainTimer: ReturnType<typeof setTimeout> | undefined;
let initialScheduled = false;

function isDev() {
  return process.env.NODE_ENV === "development";
}

function prefetchRouteData(href: string) {
  if (prefetchedData.has(href)) return;
  prefetchedData.add(href);
  if (href.startsWith("/dashboard/intern")) {
    prefetchInternRouteData(href);
  } else if (href.startsWith("/dashboard/company")) {
    prefetchCompanyRouteData(href);
  } else if (href.startsWith("/dashboard/admin")) {
    prefetchAdminRouteData(href);
  }
}

function drainRouteQueue(router: AppRouterInstance, gapMs = ROUTE_GAP_MS) {
  if (activePrefetches >= MAX_CONCURRENT_ROUTES || routeQueue.length === 0) return;

  const href = routeQueue.shift();
  if (!href || prefetchedRoutes.has(href)) {
    drainRouteQueue(router, gapMs);
    return;
  }

  prefetchedRoutes.add(href);
  activePrefetches += 1;

  try {
    router.prefetch(href);
    prefetchRouteData(href);
  } catch {
    prefetchedRoutes.delete(href);
  } finally {
    activePrefetches -= 1;
    if (routeQueue.length > 0) {
      drainTimer = setTimeout(() => drainRouteQueue(router, gapMs), gapMs);
    }
  }
}

function enqueueRoute(router: AppRouterInstance, href: string, immediate = false) {
  if (prefetchedRoutes.has(href)) {
    prefetchRouteData(href);
    return;
  }

  const existingIndex = routeQueue.indexOf(href);
  if (existingIndex >= 0) {
    if (immediate && existingIndex > 0) {
      routeQueue.splice(existingIndex, 1);
      routeQueue.unshift(href);
    }
  } else if (immediate) {
    routeQueue.unshift(href);
  } else {
    routeQueue.push(href);
  }

  drainRouteQueue(router, immediate ? IMMEDIATE_ROUTE_GAP_MS : ROUTE_GAP_MS);
}

/** Warm a single route — debounced for hover, immediate for click-adjacent use. */
export function warmInternRoute(router: AppRouterInstance, href: string, immediate = false) {
  if (prefetchedRoutes.has(href)) {
    prefetchRouteData(href);
    return;
  }

  if (immediate) {
    enqueueRoute(router, href, true);
    return;
  }

  if (hoverTimer) clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => enqueueRoute(router, href, false), HOVER_DEBOUNCE_MS);
}

/** Alias for intern + company dashboard sidebar warming. */
export const warmDashboardRoute = warmInternRoute;

/** Schedule staggered prefetch after mount — avoids dev-server compile storms. */
export function scheduleInitialInternPrefetch(router: AppRouterInstance) {
  if (initialScheduled || typeof window === "undefined") return;
  initialScheduled = true;

  const schedule = () => {
    PRIORITY_ROUTES.forEach((href, index) => {
      window.setTimeout(() => enqueueRoute(router, href), index * ROUTE_GAP_MS);
    });

    if (isDev()) return;

    const remaining = INTERN_DASHBOARD_ROUTES.filter((href) => !PRIORITY_ROUTE_SET.has(href));
    remaining.forEach((href, index) => {
      window.setTimeout(
        () => enqueueRoute(router, href),
        (PRIORITY_ROUTES.length + index) * ROUTE_GAP_MS
      );
    });
  };

  if (typeof window === "undefined") return;

  const win = window as Window & { requestIdleCallback?: typeof requestIdleCallback };
  if (win.requestIdleCallback) {
    win.requestIdleCallback(schedule, { timeout: 3000 });
  } else {
    win.setTimeout(schedule, 1500);
  }
}

export function resetInternPrefetchSchedulerForTests() {
  prefetchedRoutes.clear();
  prefetchedData.clear();
  routeQueue.length = 0;
  activePrefetches = 0;
  initialScheduled = false;
  if (hoverTimer) clearTimeout(hoverTimer);
  if (drainTimer) clearTimeout(drainTimer);
}
