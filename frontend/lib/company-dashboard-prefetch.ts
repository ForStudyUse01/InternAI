import {
  fetchCompanyApplications,
  fetchCompanyHrInsights,
  fetchCompanyInternships,
  fetchCompanyMatchedCandidates,
  fetchCompanyNotifications,
  fetchCompanyProfile
} from "@/lib/company-portal";

type PrefetchHandler = () => void;

const HIRING_ROUTES = new Set([
  "/dashboard/company",
  "/dashboard/company/hiring/active",
  "/dashboard/company/hiring/applicants",
  "/dashboard/company/hiring/shortlisted",
  "/dashboard/company/hiring/pipeline",
  "/dashboard/company/hiring/post",
  "/dashboard/company/reports/feedback",
  "/dashboard/company/reports/notes",
  "/dashboard/company/reports/export"
]);

const MATCHING_ROUTES = new Set([
  "/dashboard/company",
  "/dashboard/company/matching/ai"
]);

const ROUTE_DATA_PREFETCH: Record<string, PrefetchHandler[]> = {
  "/dashboard/company": [
    () => void fetchCompanyProfile(),
    () => void fetchCompanyInternships(),
    () => void fetchCompanyApplications(),
    () => void fetchCompanyMatchedCandidates()
  ],
  "/dashboard/company/profile": [() => void fetchCompanyProfile()],
  "/dashboard/company/profile/edit": [() => void fetchCompanyProfile()],
  "/dashboard/company/profile/verification": [() => void fetchCompanyProfile()],
  "/dashboard/company/hiring/post": [
    () => void fetchCompanyProfile(),
    () => void fetchCompanyInternships()
  ],
  "/dashboard/company/notifications": [() => void fetchCompanyNotifications()],
  "/dashboard/company/hiring/active": [
    () => void fetchCompanyProfile(),
    () => void fetchCompanyInternships(),
    () => void fetchCompanyApplications()
  ],
  "/dashboard/company/hiring/applicants": [
    () => void fetchCompanyProfile(),
    () => void fetchCompanyInternships(),
    () => void fetchCompanyApplications()
  ],
  "/dashboard/company/hiring/shortlisted": [
    () => void fetchCompanyProfile(),
    () => void fetchCompanyInternships(),
    () => void fetchCompanyApplications()
  ],
  "/dashboard/company/hiring/pipeline": [
    () => void fetchCompanyProfile(),
    () => void fetchCompanyInternships(),
    () => void fetchCompanyApplications()
  ],
  "/dashboard/company/matching/ai": [
    () => void fetchCompanyProfile(),
    () => void fetchCompanyInternships(),
    () => void fetchCompanyApplications(),
    () => void fetchCompanyMatchedCandidates()
  ],
  "/dashboard/company/matching/search": [() => void fetchCompanyProfile()],
  "/dashboard/company/matching/saved": [() => void fetchCompanyProfile()],
  "/dashboard/company/reports/feedback": [
    () => void fetchCompanyProfile(),
    () => void fetchCompanyApplications()
  ],
  "/dashboard/company/reports/notes": [
    () => void fetchCompanyProfile(),
    () => void fetchCompanyApplications()
  ],
  "/dashboard/company/reports/export": [
    () => void fetchCompanyProfile(),
    () => void fetchCompanyApplications()
  ],
  "/dashboard/company/team/recruiters": [
    () => void fetchCompanyProfile(),
    () => void fetchCompanyHrInsights()
  ],
  "/dashboard/company/analytics/company": [
    () => void fetchCompanyProfile(),
    () => void fetchCompanyHrInsights()
  ],
  "/dashboard/company/analytics/salary": [() => void fetchCompanyProfile()]
};

/** Warm shared hiring datasets when hovering any hiring sub-route. */
function warmSharedCompanyData(href: string) {
  if (HIRING_ROUTES.has(href)) {
    void fetchCompanyInternships();
    void fetchCompanyApplications();
  }
  if (MATCHING_ROUTES.has(href)) {
    void fetchCompanyMatchedCandidates();
  }
}

export function prefetchCompanyRouteData(href: string) {
  const handlers = ROUTE_DATA_PREFETCH[href];
  if (handlers?.length) {
    handlers.forEach((handler) => handler());
  } else {
    void fetchCompanyProfile();
  }
  warmSharedCompanyData(href);
}

export function prefetchCompanyDashboardData() {
  void fetchCompanyProfile();
  void fetchCompanyInternships();
  void fetchCompanyApplications();
}
