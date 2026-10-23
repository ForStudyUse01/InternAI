import {
  fetchActiveInternships,
  fetchInternApplications,
  fetchInternInterviews,
  fetchInternNotifications,
  fetchInternProfile,
  fetchSavedInternships
} from "@/lib/intern-portal";
import { fetchMyPortfolio } from "@/lib/portfolio-portal";

type PrefetchHandler = () => void;

const ROUTE_DATA_PREFETCH: Record<string, PrefetchHandler[]> = {
  "/dashboard/intern": [
    () => void fetchInternProfile(),
    () => void fetchInternApplications(),
    () => void fetchInternInterviews(),
    () => void fetchInternNotifications()
  ],
  "/dashboard/intern/profile": [() => void fetchInternProfile()],
  "/dashboard/intern/profile/edit": [() => void fetchInternProfile()],
  "/dashboard/intern/resume": [() => void fetchInternProfile()],
  "/dashboard/intern/resume/score": [() => void fetchInternProfile()],
  "/dashboard/intern/portfolio": [() => void fetchMyPortfolio()],
  "/dashboard/intern/skill-gap": [() => void fetchInternProfile()],
  "/dashboard/intern/internships/recommended": [() => void fetchInternProfile()],
  "/dashboard/intern/internships/search": [
    () => void fetchInternProfile(),
    () => void fetchActiveInternships(),
    () => void fetchInternApplications(),
    () => void fetchSavedInternships()
  ],
  "/dashboard/intern/internships/saved": [
    () => void fetchSavedInternships(),
    () => void fetchInternApplications()
  ],
  "/dashboard/intern/applications": [() => void fetchInternApplications()],
  "/dashboard/intern/interviews": [() => void fetchInternInterviews()],
  "/dashboard/intern/calendar": [() => void fetchInternInterviews()],
  "/dashboard/intern/track-progress": [() => void fetchInternApplications()],
  "/dashboard/intern/notifications": [() => void fetchInternNotifications()],
  "/dashboard/intern/feedback/hr": [() => void fetchInternApplications()],
  "/dashboard/intern/feedback/suggestions": [() => void fetchInternProfile()]
};

export function prefetchInternRouteData(href: string) {
  const handlers = ROUTE_DATA_PREFETCH[href];
  if (!handlers?.length) return;
  handlers.forEach((handler) => handler());
}
