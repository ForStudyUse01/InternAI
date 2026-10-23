import { AdminDashboardPage } from "@/components/dashboard/admin/admin-dashboard-page";
import { notFound } from "next/navigation";
import type { AdminDashboardView } from "@/components/dashboard/admin/admin-dashboard-page";

const VIEW_MAP: Record<string, AdminDashboardView> = {
  users: "users",
  companies: "companies",
  verification: "verification",
  internships: "internships",
  reports: "reports",
  "activity-logs": "activity-logs",
  analytics: "analytics",
  notifications: "notifications",
  settings: "settings",
  "hiring-scoring": "hiring-scoring",
  "certification-review": "certification-review"
};

export default async function AdminDashboardViewRoute({
  params
}: {
  params: Promise<{ view?: string[] }>;
}) {
  const { view } = await params;
  const key = (view || []).join("/");
  const mappedView = VIEW_MAP[key];

  if (!mappedView) {
    notFound();
  }

  return <AdminDashboardPage view={mappedView} />;
}
