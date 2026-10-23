"use client";

import { useMemo } from "react";
import { Percent } from "lucide-react";
import type { CompanyApplication } from "@/lib/company-portal";
import {
  CompanyDashboardMetricTile,
  CompanyDashboardPanelCard,
  CompanyDashboardSection,
  companyDashboardStyles
} from "./company-dashboard-layout";
import { computeAcceptanceRate, computeInterviewRate, countOffersPending } from "@/components/dashboard/hiring/hiring-utils";

type HiringInsightsSummaryProps = {
  applications: CompanyApplication[];
  shortlistedCount: number;
};

export function HiringInsightsSummary({ applications, shortlistedCount }: HiringInsightsSummaryProps) {
  const metrics = useMemo(() => {
    const offered = applications.filter((application) => String(application.status || "").toLowerCase() === "offered").length;
    const selected = applications.filter((application) => String(application.status || "").toLowerCase() === "selected").length;
    return {
      applications: applications.length,
      shortlisted: shortlistedCount,
      offers: offered + selected,
      offersPending: countOffersPending(applications),
      acceptanceRate: computeAcceptanceRate(applications),
      interviewRate: computeInterviewRate(applications)
    };
  }, [applications, shortlistedCount]);

  return (
    <CompanyDashboardSection
      id="dashboard-hiring-insights"
      icon={Percent}
      title="Hiring Insights"
      description="Top-line conversion metrics across your pipeline."
    >
      <CompanyDashboardPanelCard>
        <div className={companyDashboardStyles.metricGridFive}>
          <CompanyDashboardMetricTile label="Applications" value={metrics.applications} />
          <CompanyDashboardMetricTile
            label="Shortlisted"
            value={<span className="text-[var(--ds-primary-text)]">{metrics.shortlisted}</span>}
            className="ring-1 ring-[var(--ds-primary)]/30 bg-[color-mix(in_srgb,var(--ds-primary)_5%,transparent)]"
          />
          <CompanyDashboardMetricTile
            label="Offers"
            value={metrics.offers}
            hint={metrics.offersPending > 0 ? `${metrics.offersPending} pending` : undefined}
          />
          <CompanyDashboardMetricTile label="Acceptance Rate" value={`${metrics.acceptanceRate}%`} />
          <CompanyDashboardMetricTile label="Interview Rate" value={`${metrics.interviewRate}%`} />
        </div>
      </CompanyDashboardPanelCard>
    </CompanyDashboardSection>
  );
}
