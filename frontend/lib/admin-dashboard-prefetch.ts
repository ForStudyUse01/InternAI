import {
  fetchAdminActivityLogs,
  fetchAdminCompanies,
  fetchAdminHiringScoringTemplates,
  fetchAdminInternships,
  fetchAdminMetrics,
  fetchAdminReports,
  fetchAdminUsers
} from "@/lib/admin-portal";
import { fetchAdminCertifications } from "@/lib/certifications-portal";

type PrefetchHandler = () => void;

const ROUTE_DATA_PREFETCH: Record<string, PrefetchHandler[]> = {
  "/dashboard/admin": [
    () => void fetchAdminMetrics(),
    () => void fetchAdminUsers({ limit: 100 }),
    () => void fetchAdminCompanies({}),
    () => void fetchAdminInternships(),
    () => void fetchAdminReports(),
    () => void fetchAdminActivityLogs({ page: 1, limit: 20 })
  ],
  "/dashboard/admin/users": [() => void fetchAdminUsers({ page: 1, limit: 50 })],
  "/dashboard/admin/companies": [() => void fetchAdminCompanies({})],
  "/dashboard/admin/verification": [() => void fetchAdminCompanies({ status: "pending" })],
  "/dashboard/admin/internships": [() => void fetchAdminInternships()],
  "/dashboard/admin/certification-review": [() => void fetchAdminCertifications({ page: 1, limit: 20 })],
  "/dashboard/admin/reports": [() => void fetchAdminReports()],
  "/dashboard/admin/activity-logs": [() => void fetchAdminActivityLogs({ page: 1, limit: 30 })],
  "/dashboard/admin/analytics": [
    () => void fetchAdminMetrics(),
    () => void fetchAdminUsers({ limit: 100 }),
    () => void fetchAdminCompanies({}),
    () => void fetchAdminInternships()
  ],
  "/dashboard/admin/notifications": [
    () => void fetchAdminReports(),
    () => void fetchAdminActivityLogs({ page: 1, limit: 20 })
  ],
  "/dashboard/admin/hiring-scoring": [() => void fetchAdminHiringScoringTemplates()],
  "/dashboard/admin/settings": [() => void fetchAdminUsers({ limit: 10 })]
};

export function prefetchAdminRouteData(href: string) {
  const handlers = ROUTE_DATA_PREFETCH[href];
  if (!handlers?.length) return;
  handlers.forEach((handler) => handler());
}
