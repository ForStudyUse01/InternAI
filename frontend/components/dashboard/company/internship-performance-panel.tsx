"use client";

import { memo, useMemo } from "react";
import { LineChart } from "lucide-react";
import type { CompanyApplication, CompanyInternship } from "@/lib/company-portal";
import { HorizontalBarChart } from "@/components/dashboard/charts/analytics-charts";
import {
  CompanyDashboardEmptyState,
  CompanyDashboardPanelCard,
  CompanyDashboardSection
} from "./company-dashboard-layout";

const MAX_ROLES_SHOWN = 6;

function buildRolePerformance(internships: CompanyInternship[], applications: CompanyApplication[]) {
  const countByInternshipId = new Map<string, number>();
  applications.forEach((application) => {
    const internshipId = application.internship?._id;
    if (!internshipId) return;
    countByInternshipId.set(internshipId, (countByInternshipId.get(internshipId) || 0) + 1);
  });

  return internships
    .map((internship) => ({
      label: internship.role || "Untitled role",
      value: countByInternshipId.get(internship._id) || 0,
      hint: internship.isActive ? undefined : "Closed"
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, MAX_ROLES_SHOWN);
}

function InternshipPerformancePanelInner({
  internships,
  applications
}: {
  internships: CompanyInternship[];
  applications: CompanyApplication[];
}) {
  const bars = useMemo(() => buildRolePerformance(internships, applications), [internships, applications]);
  const hasData = bars.some((bar) => bar.value > 0);

  return (
    <CompanyDashboardSection
      id="internship-performance"
      icon={LineChart}
      title="Internship Performance"
      description="Applicant volume by role, ranked highest first."
    >
      {internships.length === 0 ? (
        <CompanyDashboardEmptyState
          title="Post an internship to see role performance here."
          icon={LineChart}
        />
      ) : !hasData ? (
        <CompanyDashboardEmptyState
          title="No applicants yet for your posted roles."
          description="Performance data appears once candidates start applying."
          icon={LineChart}
        />
      ) : (
        <CompanyDashboardPanelCard>
          <HorizontalBarChart data={bars} />
        </CompanyDashboardPanelCard>
      )}
    </CompanyDashboardSection>
  );
}

export const InternshipPerformancePanel = memo(InternshipPerformancePanelInner);
