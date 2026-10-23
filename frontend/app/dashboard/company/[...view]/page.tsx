import { CompanyDashboardPage } from "@/components/dashboard/company/company-dashboard-page";
import { notFound } from "next/navigation";
import type { CompanyDashboardView } from "@/components/dashboard/company/company-dashboard-page";

const VIEW_MAP: Record<string, CompanyDashboardView> = {
  profile: "profile",
  "profile/edit": "profile-edit",
  "profile/verification": "verification",
  "profile/personal": "personal-profile",
  "profile/personal/edit": "personal-profile-edit",
  "hiring/post": "hiring-post",
  "hiring/active": "hiring-active",
  "hiring/applicants": "hiring-applicants",
  "hiring/shortlisted": "hiring-shortlisted",
  "hiring/pipeline": "hiring-pipeline",
  "hiring/interviews": "hiring-interviews",
  "hiring/calendar": "hiring-calendar",
  "matching/ai": "matching-ai",
  "matching/search": "matching-search",
  "matching/saved": "matching-saved",
  "reports/feedback": "reports-feedback",
  "reports/notes": "reports-notes",
  "reports/export": "reports-export",
  "team/recruiters": "team-recruiters",
  "analytics/company": "analytics-company",
  "analytics/salary": "analytics-salary"
};

export default async function CompanyDashboardViewRoute({
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

  return <CompanyDashboardPage view={mappedView} />;
}
