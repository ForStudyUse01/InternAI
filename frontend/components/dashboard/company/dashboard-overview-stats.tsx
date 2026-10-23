"use client";

import { Briefcase, CalendarClock } from "lucide-react";
import { SummaryStatCard } from "@/components/dashboard/shared/summary-stat-card";
import { CompanyDashboardSection } from "./company-dashboard-layout";

type DashboardOverviewStatsProps = {
  activeJobs: number;
  interviews: number;
};

/** Applicants/Shortlisted/Offers now live in HiringInsightsSummary (Section 6) — kept here to
 * avoid showing the same three counts twice on the workspace overview. */
export function DashboardOverviewStats({ activeJobs, interviews }: DashboardOverviewStatsProps) {
  return (
    <CompanyDashboardSection
      id="dashboard-overview"
      title="Roles & Interview Load"
      description="Live internship postings and interview-stage volume."
      className="company-dashboard-hero-accent"
    >
      <div className="stat-grid">
        <SummaryStatCard title="Active Jobs" value={activeJobs} hint="Live internship postings." icon={Briefcase} tone="blue" />
        <SummaryStatCard
          title="Interviews Scheduled"
          value={interviews}
          hint="Candidates in interview stages."
          icon={CalendarClock}
          tone="amber"
        />
      </div>
    </CompanyDashboardSection>
  );
}
