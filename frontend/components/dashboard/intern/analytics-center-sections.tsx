"use client";

import { memo, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Award,
  BarChart3,
  Bookmark,
  Braces,
  Calendar,
  CalendarClock,
  ClipboardList,
  GaugeCircle,
  GraduationCap,
  LineChart as LineChartIcon,
  ListTree,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { AppIcon } from "@/components/icons/app-icon";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import {
  ActivityHeatmap,
  HorizontalBarChart,
  ProgressRing,
  StackedStatusBar,
  TrendAreaChart
} from "@/components/dashboard/charts/analytics-charts";
import { cn } from "@/lib/utils";
import type { Application, ResumeAnalysis } from "@/lib/intern-portal";
import type { ScheduledInterviewRecord } from "@/lib/interview-workflow";
import type { CertificationStats } from "@/lib/certifications-portal";
import type { ProgressHistoryPoint } from "@/lib/weekly-progress-tracker";
import { buildProgressData, type AptitudeHistoryRecord } from "@/lib/aptitude-progress";
import {
  buildActivityHeatmapCells,
  buildApplicationStatusSegments,
  buildApplicationTimeline,
  buildAptitudeAccuracyTrend,
  buildAtsTrend,
  buildCertificationProgressSegments,
  buildInterviewStatusSegments,
  buildInterviewTimeline,
  buildPlacementReadinessTrend,
  buildResumeScoreTrend,
  buildSkillGrowthData
} from "@/lib/analytics-center-data";

const cardBase = "rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-[0_1px_2px_var(--ds-shadow)]";

function ChartCard({
  title,
  icon,
  iconColorVar = "var(--ds-accent)",
  children,
  delayMs = 0
}: {
  title: string;
  icon: LucideIcon;
  iconColorVar?: string;
  children: React.ReactNode;
  delayMs?: number;
}) {
  return (
    <ScrollReveal variant="fade-up" distance={12} delayMs={delayMs}>
      <div className={cn(cardBase, "p-6")}>
        <div className="mb-4 flex items-center gap-2">
          <AppIcon icon={icon} size="sm" style={{ color: iconColorVar }} className="text-current" />
          <h3 className="text-sm font-semibold text-[var(--ds-text)]">{title}</h3>
        </div>
        {children}
      </div>
    </ScrollReveal>
  );
}

/* ============================== Score Trends ============================== */

export function TrendChartsGrid({
  progressHistory,
  aptitudeRecords
}: {
  progressHistory: ProgressHistoryPoint[];
  aptitudeRecords: AptitudeHistoryRecord[];
}) {
  const resumeTrend = useMemo(() => buildResumeScoreTrend(progressHistory), [progressHistory]);
  const atsTrend = useMemo(() => buildAtsTrend(progressHistory), [progressHistory]);
  const readinessTrend = useMemo(() => buildPlacementReadinessTrend(progressHistory), [progressHistory]);
  const aptitudeTrend = useMemo(() => buildAptitudeAccuracyTrend(aptitudeRecords), [aptitudeRecords]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Resume Score Trend" icon={LineChartIcon}>
        {resumeTrend.length < 2 ? (
          <EmptyState title="Trend building" hint="Visit the dashboard daily to build a resume score trend line." size="sm" />
        ) : (
          <TrendAreaChart data={resumeTrend} valueLabel="resume score" />
        )}
      </ChartCard>
      <ChartCard title="ATS Trend" icon={GaugeCircle} delayMs={60}>
        {atsTrend.length < 2 ? (
          <EmptyState title="Trend building" hint="Visit the dashboard daily to build an ATS score trend line." size="sm" />
        ) : (
          <TrendAreaChart data={atsTrend} valueLabel="ATS score" />
        )}
      </ChartCard>
      <ChartCard title="Placement Readiness Trend" icon={TrendingUp} delayMs={120}>
        {readinessTrend.length < 2 ? (
          <EmptyState title="Trend building" hint="Visit the dashboard daily to build a placement readiness trend line." size="sm" />
        ) : (
          <TrendAreaChart data={readinessTrend} valueLabel="readiness score" />
        )}
      </ChartCard>
      <ChartCard title="Aptitude Accuracy" icon={Braces} delayMs={180}>
        {aptitudeTrend.length === 0 ? (
          <EmptyState title="No aptitude attempts yet" hint="Take a mock aptitude test to start tracking accuracy." size="sm" />
        ) : (
          <TrendAreaChart data={aptitudeTrend} valueLabel="% accuracy" />
        )}
      </ChartCard>
    </div>
  );
}

/* ============================== Skill Growth + Certification Progress ============================== */

export function SkillAndCertificationRow({
  analysis,
  certStats
}: {
  analysis: ResumeAnalysis | null | undefined;
  certStats: CertificationStats | null;
}) {
  const skillData = useMemo(() => buildSkillGrowthData(analysis), [analysis]);
  const certSegments = useMemo(() => buildCertificationProgressSegments(certStats), [certStats]);
  const verifiedPercent = certStats && certStats.total > 0 ? Math.round((certStats.verified / certStats.total) * 100) : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Skill Growth" icon={BarChart3}>
        {skillData.length === 0 ? (
          <EmptyState title="No skill data yet" hint="Upload a resume so we can categorize and chart your skills." size="sm" />
        ) : (
          <HorizontalBarChart data={skillData} />
        )}
      </ChartCard>
      <ChartCard title="Certification Progress" icon={GraduationCap} delayMs={60}>
        {!certStats || certStats.total === 0 ? (
          <EmptyState title="No certificates yet" hint="Add a certification to track verification progress." size="sm" />
        ) : (
          <div className="flex items-center gap-6">
            <ProgressRing value={verifiedPercent} sublabel="verified" colorVar="var(--ds-success)" />
            <StackedStatusBar segments={certSegments} className="flex-1" />
          </div>
        )}
      </ChartCard>
    </div>
  );
}

/* ============================== Status Breakdowns ============================== */

export function StatusBreakdownRow({
  applications,
  interviewRecords
}: {
  applications: Application[];
  interviewRecords: ScheduledInterviewRecord[];
}) {
  const appSegments = useMemo(() => buildApplicationStatusSegments(applications), [applications]);
  const interviewSegments = useMemo(() => buildInterviewStatusSegments(interviewRecords), [interviewRecords]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Applications by Status" icon={ClipboardList}>
        {applications.length === 0 ? (
          <EmptyState title="No applications yet" hint="Your status distribution will appear here once you apply." presetKey="applications" size="sm" />
        ) : (
          <StackedStatusBar segments={appSegments} />
        )}
      </ChartCard>
      <ChartCard title="Interviews by Status" icon={CalendarClock} delayMs={60}>
        {interviewRecords.length === 0 ? (
          <EmptyState title="No interviews yet" hint="Your interview status distribution will appear here once scheduled." presetKey="interviews" size="sm" />
        ) : (
          <StackedStatusBar segments={interviewSegments} />
        )}
      </ChartCard>
    </div>
  );
}

/* ============================== Timelines ============================== */

function TimelineList({ entries }: { entries: ReturnType<typeof buildApplicationTimeline> }) {
  if (entries.length === 0) {
    return <EmptyState title="No activity yet" hint="Events will appear here once available." size="sm" />;
  }
  return (
    <ol className="max-h-80 space-y-4 overflow-y-auto pr-1">
      {entries.slice(0, 10).map((entry, idx) => (
        <li key={entry.id} className="relative flex gap-3 pl-1">
          <div className="flex flex-col items-center">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: entry.tone }} />
            {idx < Math.min(entries.length, 10) - 1 ? <span className="mt-1 h-full w-px flex-1 bg-[var(--ds-border)]" /> : null}
          </div>
          <div className="min-w-0 pb-2">
            <p className="text-sm font-medium text-[var(--ds-text)]">{entry.label}</p>
            {entry.detail ? <p className="text-xs text-[var(--ds-muted)]">{entry.detail}</p> : null}
            <p className="mt-0.5 text-[11px] text-[var(--ds-muted)]">{entry.date.toLocaleDateString()}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function TimelinesRow({
  applications,
  interviewRecords
}: {
  applications: Application[];
  interviewRecords: ScheduledInterviewRecord[];
}) {
  const applicationTimeline = useMemo(() => buildApplicationTimeline(applications), [applications]);
  const interviewTimeline = useMemo(() => buildInterviewTimeline(interviewRecords), [interviewRecords]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Application Timeline" icon={ListTree}>
        <TimelineList entries={applicationTimeline} />
      </ChartCard>
      <ChartCard title="Interview Timeline" icon={Calendar} delayMs={60}>
        <TimelineList entries={interviewTimeline} />
      </ChartCard>
    </div>
  );
}

/* ============================== Activity Heatmaps ============================== */

export function ActivityHeatmapsRow({
  applications,
  interviewRecords
}: {
  applications: Application[];
  interviewRecords: ScheduledInterviewRecord[];
}) {
  const cells = useMemo(() => buildActivityHeatmapCells(applications, interviewRecords), [applications, interviewRecords]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Weekly Activity" icon={Activity}>
        {cells.length === 0 ? (
          <EmptyState title="No activity yet" hint="Applications and interviews will populate this heatmap." size="sm" />
        ) : (
          <ActivityHeatmap data={cells} weeks={12} />
        )}
      </ChartCard>
      <ChartCard title="Monthly Activity" icon={Bookmark} delayMs={60}>
        {cells.length === 0 ? (
          <EmptyState title="No activity yet" hint="Applications and interviews will populate this heatmap." size="sm" />
        ) : (
          <ActivityHeatmap data={cells} weeks={52} />
        )}
      </ChartCard>
    </div>
  );
}

/* ============================== Mock Test History + Technical Accuracy ============================== */

export function MockTestHistorySection({ aptitudeRecords }: { aptitudeRecords: AptitudeHistoryRecord[] }) {
  const points = useMemo(() => buildProgressData(aptitudeRecords), [aptitudeRecords]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Mock Test History" icon={Award}>
        {points.length === 0 ? (
          <EmptyState title="No mock tests taken yet" hint="Aptitude test attempts and scores will be tracked here." size="sm" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--ds-border)] text-[11px] uppercase tracking-wide text-[var(--ds-muted)]">
                  <th className="py-2 pr-3 font-semibold">Test</th>
                  <th className="py-2 pr-3 font-semibold">Score</th>
                  <th className="py-2 pr-3 font-semibold">Accuracy</th>
                  <th className="py-2 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {points.map((point) => (
                  <tr key={point.test} className="border-b border-[var(--ds-border)]/60 last:border-0">
                    <td className="py-2 pr-3 font-medium text-[var(--ds-text)]">Test {point.test}</td>
                    <td className="py-2 pr-3 tabular-nums text-[var(--ds-text)]">
                      {point.score}/{point.maxScore}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-[var(--ds-text)]">{Math.round(point.accuracy)}%</td>
                    <td className="py-2 text-[var(--ds-muted)]">{new Date(point.completedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
      <ChartCard title="Technical Accuracy" icon={ShieldCheck} delayMs={60}>
        <EmptyState title="Mock Technical Test coming soon" hint="Technical assessment accuracy will appear here once the module is live." size="sm" />
      </ChartCard>
    </div>
  );
}
