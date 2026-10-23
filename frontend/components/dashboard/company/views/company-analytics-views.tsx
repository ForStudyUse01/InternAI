"use client";

import { Award, BarChart3, DollarSign, Layers, TrendingUp, Users } from "lucide-react";
import type { CompanyAnalytics, CompanyCurrentUser, CompanyHrInsights } from "@/lib/company-portal";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { CompanyDashboardPageIntro, companyDashboardStyles } from "@/components/dashboard/company/company-dashboard-layout";
import { Empty, InfoTile, formatCurrency } from "@/components/dashboard/company/company-dashboard-shared";

const conversionTone = (rate: number): BadgeTone => (rate >= 50 ? "success" : rate >= 25 ? "accent" : "neutral");

type CompanyAnalyticsOverviewViewProps = {
  analytics: CompanyAnalytics | null;
  hrInsights: CompanyHrInsights | null;
};

export function CompanyAnalyticsOverviewView({ analytics, hrInsights }: CompanyAnalyticsOverviewViewProps) {
  const hiringAnalytics = analytics?.hiringAnalytics;
  const departments = hiringAnalytics ? Object.entries(hiringAnalytics.departmentWiseHiring || {}).sort((a, b) => b[1] - a[1]) : [];
  const maxDeptCount = departments.reduce((max, [, count]) => Math.max(max, count), 0) || 1;

  return (
    <div className={companyDashboardStyles.pageStack}>
      <CompanyDashboardPageIntro title="Company Analytics" subtitle="Recruiter performance and hiring analytics." />
      {!analytics ? (
        <Empty text="Analytics not available." />
      ) : (
        <div className="space-y-4">
          {hiringAnalytics && (
            <div className="stat-grid">
              <InfoTile
                icon={Award}
                label="Total Hires"
                value={<span className="ds-stat-value text-[var(--ds-primary-text)]">{hiringAnalytics.totalHires}</span>}
                className="ring-1 ring-[var(--ds-primary)]/30 bg-[color-mix(in_srgb,var(--ds-primary)_5%,transparent)]"
              />
              <InfoTile icon={Users} label="Total Applications" value={<span className="ds-stat-value">{hiringAnalytics.totalApplications}</span>} />
              <InfoTile icon={Layers} label="Internships Posted" value={<span className="ds-stat-value">{hiringAnalytics.internshipPerformance}</span>} />
            </div>
          )}

          <Card title="Recruiter Performance" titleIcon={BarChart3}>
            {analytics.recruiterPerformance.length === 0 ? (
              <p className="ds-caption">No recruiter activity yet.</p>
            ) : (
              <div className="company-dashboard-list-stack">
                {analytics.recruiterPerformance.map((item) => {
                  const hrMatch = hrInsights?.hrUsers.find((hr) => hr.id === item.recruiterId);
                  const label = hrMatch ? hrMatch.name : `Recruiter ${item.recruiterId}`;
                  return (
                    <div key={item.recruiterId} className="company-dashboard-item-card !flex-row flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={label} size="sm" />
                        <div className="min-w-0">
                          <p className="ds-h3 truncate">{label}</p>
                          {hrMatch && <p className="ds-caption truncate">{hrMatch.email}</p>}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-right">
                        <span className="ds-caption">Handled {item.candidatesHandled} · Hired {item.hiredCandidates}</span>
                        <Badge tone={conversionTone(item.conversionRate)}>{item.conversionRate}% conversion</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {departments.length > 0 && (
            <Card title="Hiring by Department" titleIcon={Layers}>
              <div className="space-y-4">
                {departments.map(([department, count]) => {
                  const shareOfHires = hiringAnalytics?.totalHires ? Math.round((count / hiringAnalytics.totalHires) * 100) : 0;
                  return (
                    <div key={department}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium text-[var(--ds-text)]">{department}</span>
                        <span className="ds-caption tabular-nums">
                          {count} hire{count === 1 ? "" : "s"}
                          {hiringAnalytics?.totalHires ? ` · ${shareOfHires}%` : ""}
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--ds-surface-raised)]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,var(--ds-gradient-from),var(--ds-gradient-to))]"
                          style={{ width: `${Math.max(4, Math.round((count / maxDeptCount) * 100))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

type CompanySalaryAnalyticsViewProps = {
  analytics: CompanyAnalytics | null;
  canViewSalary: boolean;
  currentUser: CompanyCurrentUser | null;
};

export function CompanySalaryAnalyticsView({ analytics, canViewSalary, currentUser }: CompanySalaryAnalyticsViewProps) {
  const isExecutiveUser = ["owner", "ceo"].includes(currentUser?.companyAccountType || "");
  const stats = (values: number[]) => {
    const valid = values.filter((value) => typeof value === "number" && Number.isFinite(value));
    if (!valid.length) return null;
    const sorted = [...valid].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    const average = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: Math.round(median),
      average: Math.round(average),
      count: sorted.length
    };
  };
  const offeredStats = analytics?.salaryAnalytics ? stats(analytics.salaryAnalytics.offeredSalaryPerCandidate) : null;
  const stipendStats = analytics?.salaryAnalytics ? stats(analytics.salaryAnalytics.stipendAnalytics) : null;
  const centralTendencyLabel = isExecutiveUser ? "Average" : "Median";

  const renderDistribution = (label: string, distStats: ReturnType<typeof stats>, emptyHint: string) => {
    if (!distStats) {
      return <EmptyState title={`No ${label.toLowerCase()} yet`} description={emptyHint} icon={DollarSign} size="sm" />;
    }
    const central = isExecutiveUser ? distStats.average : distStats.median;
    const range = distStats.max - distStats.min;
    const markerPct = range > 0 ? ((central - distStats.min) / range) * 100 : 50;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <InfoTile label="Min" value={formatCurrency(distStats.min)} className="opacity-90" />
          <InfoTile
            label={centralTendencyLabel}
            value={<span className="text-[var(--ds-primary-text)]">{formatCurrency(central)}</span>}
            className="ring-1 ring-[var(--ds-primary)]/30 bg-[color-mix(in_srgb,var(--ds-primary)_5%,transparent)]"
          />
          <InfoTile label="Max" value={formatCurrency(distStats.max)} className="opacity-90" />
        </div>
        {range > 0 ? (
          <div
            className="relative h-2 w-full rounded-full bg-[linear-gradient(90deg,var(--ds-gradient-from),var(--ds-gradient-to))] opacity-40"
            role="img"
            aria-label={`${centralTendencyLabel} sits at ${formatCurrency(central)}, between a range of ${formatCurrency(distStats.min)} and ${formatCurrency(distStats.max)}`}
          >
            <span
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--ds-surface)] bg-[var(--ds-primary-text)] shadow-sm dark:bg-[var(--ds-primary)]"
              style={{ left: `${markerPct}%` }}
              aria-hidden
            />
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className={companyDashboardStyles.pageStack}>
      <CompanyDashboardPageIntro title="Salary Insights" subtitle="Company stipend and salary analytics." />
      {!canViewSalary ? (
        <EmptyState
          title="Restricted section"
          description="Salary insights are visible to CEO / Company Admin accounts only."
          icon={DollarSign}
        />
      ) : !analytics?.salaryAnalytics ? (
        <EmptyState title="Salary analytics not available" description="Data will appear once offers and stipends are recorded." icon={DollarSign} />
      ) : (
        <div className="space-y-4">
          <div className="stat-grid">
            <InfoTile
              icon={DollarSign}
              label="Average Package"
              value={<span className="ds-stat-value text-[var(--ds-primary-text)]">{formatCurrency(analytics.salaryAnalytics.averagePackage)}</span>}
              className="ring-1 ring-[var(--ds-primary)]/30 bg-[color-mix(in_srgb,var(--ds-primary)_5%,transparent)]"
            />
            <InfoTile
              icon={TrendingUp}
              label="Total Salary Expenditure"
              value={<span className="ds-stat-value">{formatCurrency(analytics.salaryAnalytics.totalSalaryExpenditure)}</span>}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card title="Offered Salary Distribution" titleIcon={DollarSign}>
              {renderDistribution("offer data", offeredStats, "Salary ranges will appear once candidates receive offers.")}
            </Card>
            <Card title="Stipend Distribution" titleIcon={DollarSign}>
              {renderDistribution("stipend data", stipendStats, "Stipend ranges will appear once internships list a stipend.")}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
