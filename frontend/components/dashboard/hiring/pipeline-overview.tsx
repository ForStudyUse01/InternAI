"use client";

import { useMemo } from "react";
import { GitBranch } from "lucide-react";
import type { CompanyApplication } from "@/lib/company-portal";
import {
  CompanyDashboardEmptyState,
  CompanyDashboardMetricTile,
  CompanyDashboardPanelCard,
  CompanyDashboardSection,
  companyDashboardStyles
} from "@/components/dashboard/company/company-dashboard-layout";
import {
  EXTENDED_PIPELINE_STAGES,
  HIRING_FLOW_STAGES,
  HIRING_PIPELINE_STAGES,
  OVERVIEW_PIPELINE_STAGES,
  computeExtendedStageCounts,
  computeFlowStageCounts,
  computePipelineStageCounts,
  type HiringPipelineStageKey
} from "./hiring-utils";

type PipelineOverviewProps = {
  applications: CompanyApplication[];
  variant?: "standard" | "overview" | "extended" | "pipeline";
  onStageClick?: (stage: HiringPipelineStageKey) => void;
};

export function PipelineOverview({ applications, variant = "standard", onStageClick }: PipelineOverviewProps) {
  const counts = useMemo(() => computeFlowStageCounts(applications), [applications]);
  const extendedCounts = useMemo(() => computeExtendedStageCounts(applications), [applications]);
  const pipelineCounts = useMemo(() => computePipelineStageCounts(applications), [applications]);
  const stages =
    variant === "pipeline"
      ? HIRING_PIPELINE_STAGES
      : variant === "extended"
        ? EXTENDED_PIPELINE_STAGES
        : variant === "overview"
          ? OVERVIEW_PIPELINE_STAGES
          : HIRING_FLOW_STAGES;
  const stageCounts = variant === "pipeline" ? pipelineCounts : variant === "extended" ? extendedCounts : counts;
  const total = applications.length || 1;
  const sectionId =
    variant === "pipeline"
      ? "dashboard-hiring-pipeline"
      : variant === "overview"
        ? "dashboard-pipeline"
        : variant === "extended"
          ? "hiring-pipeline-extended"
          : "hiring-pipeline";

  return (
    <CompanyDashboardSection
      id={sectionId}
      icon={GitBranch}
      title="Hiring Pipeline"
      description={
        variant === "pipeline"
          ? "Applied → Reviewed → Shortlisted → Interview → Selected. Click a stage to view its candidates."
          : "Track conversion from applied to selected with live stage counts."
      }
    >
      {applications.length === 0 ? (
        <CompanyDashboardEmptyState title="Pipeline fills in once applications arrive." />
      ) : (
        <CompanyDashboardPanelCard>
          <div
            className="mb-5 flex h-2.5 overflow-hidden rounded-full bg-[var(--ds-border)]"
            role="img"
            aria-label={`Funnel: ${stages.map((stage) => `${stage.label} ${stageCounts[stage.key as keyof typeof stageCounts] || 0}`).join(", ")}`}
          >
            {stages.map((stage) => {
              const value = stageCounts[stage.key as keyof typeof stageCounts] || 0;
              const width = (value / total) * 100;
              if (width <= 0) return null;
              const colors: Record<string, string> = {
                applied: "bg-[var(--ds-muted)]",
                reviewed: "bg-[var(--ds-chart-1)]",
                shortlisted: "bg-[var(--ds-chart-2)]",
                interview: "bg-[var(--ds-chart-3)]",
                interview_scheduled: "bg-[var(--ds-chart-3)]",
                interviewed: "bg-[var(--ds-chart-4)]",
                selected: "bg-[var(--ds-success)]",
                rejected: "bg-[var(--ds-danger)]"
              };
              return (
                <div
                  key={stage.key}
                  className={`h-full transition-all duration-500 ${colors[stage.key] || "bg-[var(--ds-muted)]"}`}
                  style={{ width: `${width}%` }}
                  title={`${stage.label}: ${value}`}
                />
              );
            })}
          </div>

          <div
            className={
              variant === "extended" || variant === "pipeline"
                ? companyDashboardStyles.metricGridFive
                : variant === "overview"
                  ? companyDashboardStyles.metricGridFour
                  : companyDashboardStyles.metricGridFive
            }
          >
            {stages.map((stage, index) => {
              const value = stageCounts[stage.key as keyof typeof stageCounts] || 0;
              const previous =
                index === 0 ? total : stageCounts[stages[index - 1].key as keyof typeof stageCounts] || 0;
              const conversion = index === 0 ? 100 : previous > 0 ? Math.round((value / previous) * 100) : 0;
              const tile = (
                <CompanyDashboardMetricTile
                  label={stage.label}
                  value={value}
                  className="text-center"
                  hint={index === 0 ? "Top of funnel" : `${conversion}% conversion`}
                />
              );
              if (variant === "pipeline" && onStageClick) {
                return (
                  <button
                    key={stage.key}
                    type="button"
                    onClick={() => onStageClick(stage.key as HiringPipelineStageKey)}
                    className="rounded-2xl text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
                  >
                    {tile}
                  </button>
                );
              }
              return <div key={stage.key}>{tile}</div>;
            })}
          </div>
        </CompanyDashboardPanelCard>
      )}
    </CompanyDashboardSection>
  );
}
