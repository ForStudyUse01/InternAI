"use client";

import { memo, useMemo } from "react";
import { BarChart3 } from "lucide-react";
import type { CompanyApplication } from "@/lib/company-portal";
import { hiringAIEngine } from "@/lib/ai-hiring";
import {
  CompanyDashboardEmptyState,
  CompanyDashboardPanelCard,
  CompanyDashboardSection
} from "./company-dashboard-layout";

type HiringFunnelAnalyticsPanelProps = {
  applications: CompanyApplication[];
  visibleStageKeys?: string[];
};

function HiringFunnelAnalyticsPanelInner({ applications, visibleStageKeys }: HiringFunnelAnalyticsPanelProps) {
  const analytics = useMemo(() => hiringAIEngine.computeFunnelAnalytics(applications), [applications]);
  const visibleStages = visibleStageKeys
    ? analytics.stages.filter((stage) => visibleStageKeys.includes(stage.key))
    : analytics.stages;
  const maxCount = Math.max(...visibleStages.map((stage) => stage.count), 1);

  const sectionActions = (
    <div className="company-dashboard-metric-tile min-w-[7.5rem] text-right">
      <p className="ds-label">Efficiency Score</p>
      <p className="ds-stat-value mt-1 text-[var(--ds-primary-text)]">{analytics.efficiencyScore}</p>
    </div>
  );

  return (
    <CompanyDashboardSection
      id="hiring-funnel-analytics"
      icon={BarChart3}
      title="Hiring Funnel Analytics"
      description="Stage conversion, drop-off, and hiring efficiency."
      actions={sectionActions}
    >
      {!analytics.sufficient ? (
        <CompanyDashboardEmptyState title="Funnel analytics appear once applications are received." icon={BarChart3} />
      ) : visibleStages.length === 0 ? (
        <CompanyDashboardEmptyState title="No matching candidates in this view yet." icon={BarChart3} />
      ) : (
        <CompanyDashboardPanelCard>
          <div className="space-y-4">
            {visibleStages.map((stage) => (
              <div key={stage.key}>
                <div className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3">
                  <span className="ds-caption font-medium">{stage.label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--ds-surface-raised)]">
                    <div
                      className="h-full rounded-full bg-[var(--ds-primary-text)] transition-all dark:bg-[var(--ds-primary)]"
                      style={{ width: `${Math.max(4, (stage.count / maxCount) * 100)}%` }}
                    />
                  </div>
                  <span className="text-right text-sm font-semibold tabular-nums">{stage.count}</span>
                </div>
                {stage.avgDaysInStage !== null || stage.conversionFromPrevious !== null || stage.dropOffFromPrevious !== null ? (
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 pl-[5.5rem] text-[11px] text-[var(--ds-muted)]">
                    {stage.avgDaysInStage !== null ? <span>Avg time: {stage.avgDaysInStage}d</span> : null}
                    {stage.conversionFromPrevious !== null ? (
                      <span className="text-[var(--ds-success)]">Conv. {stage.conversionFromPrevious}%</span>
                    ) : null}
                    {stage.dropOffFromPrevious !== null ? (
                      <span className="text-[var(--ds-danger)]">Drop-off {stage.dropOffFromPrevious}%</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </CompanyDashboardPanelCard>
      )}
    </CompanyDashboardSection>
  );
}

export const HiringFunnelAnalyticsPanel = memo(HiringFunnelAnalyticsPanelInner);
