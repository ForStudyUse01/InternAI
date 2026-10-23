/**
 * Pure data-reshaping helpers for the Student Analytics Center. Every function here
 * only reformats data the dashboard already fetches/computes elsewhere (profile,
 * applications, interviews, certifications, aptitude history, progress-history
 * snapshots) into the shapes the chart primitives expect. No scoring, no AI calls,
 * no new persistence -- that all lives in its existing owner module.
 */

import type { Application, ResumeAnalysis } from "@/lib/intern-portal";
import type { ScheduledInterviewRecord } from "@/lib/interview-workflow";
import type { CertificationStats } from "@/lib/certifications-portal";
import type { ProgressHistoryPoint } from "@/lib/weekly-progress-tracker";
import type { AptitudeHistoryRecord } from "@/lib/aptitude-progress";
import type { TrendPoint, BarDatum, StatusSegment, HeatmapCell } from "@/components/dashboard/charts/analytics-charts";
import { toLocalDateKey } from "@/components/dashboard/charts/analytics-charts";
import { STATUS_GROUP_META, toStatusGroup } from "@/components/dashboard/intern/dashboard-overview-extras";

function shortDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function buildResumeScoreTrend(history: ProgressHistoryPoint[]): TrendPoint[] {
  return history.map((point) => ({ label: shortDate(point.date), value: point.resumeScore }));
}

export function buildAtsTrend(history: ProgressHistoryPoint[]): TrendPoint[] {
  return history.map((point) => ({ label: shortDate(point.date), value: point.atsScore }));
}

export function buildPlacementReadinessTrend(history: ProgressHistoryPoint[]): TrendPoint[] {
  return history
    .filter((point) => typeof point.readiness === "number")
    .map((point) => ({ label: shortDate(point.date), value: Math.round(point.readiness ?? 0) }));
}

export function buildSkillGrowthData(analysis: ResumeAnalysis | null | undefined): BarDatum[] {
  const categorized = analysis?.skillIntelligence?.categorized || {};
  return Object.entries(categorized)
    .map(([category, skills]) => ({ label: category, value: skills.length }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export type TimelineEntry = { id: string; label: string; detail?: string; date: Date; tone: string };

export function buildApplicationTimeline(applications: Application[]): TimelineEntry[] {
  return applications
    .filter((app) => app.appliedAt)
    .map((app) => ({
      id: app._id,
      label: app.internship?.role || "Internship",
      detail: app.internship?.company?.companyName,
      date: new Date(app.appliedAt as string),
      tone: STATUS_GROUP_META[toStatusGroup(app.status)].colorVar
    }))
    .filter((entry) => !Number.isNaN(entry.date.getTime()))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

const INTERVIEW_STATUS_TONE: Record<string, string> = {
  scheduled: "var(--ds-info)",
  upcoming: "var(--ds-info)",
  in_progress: "var(--ds-primary)",
  completed: "var(--ds-success)",
  cancelled: "var(--ds-danger)",
  no_show: "var(--ds-warning)"
};

export function buildInterviewTimeline(interviewRecords: ScheduledInterviewRecord[]): TimelineEntry[] {
  return interviewRecords
    .filter((interview) => interview.interviewDate)
    .map((interview) => ({
      id: interview.interviewId,
      label: interview.role,
      detail: interview.companyName,
      date: new Date(interview.interviewDate),
      tone: INTERVIEW_STATUS_TONE[interview.interviewStatus] || "var(--ds-muted)"
    }))
    .filter((entry) => !Number.isNaN(entry.date.getTime()))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function buildCertificationProgressSegments(stats: CertificationStats | null): StatusSegment[] {
  if (!stats) return [];
  return [
    { key: "verified", label: "Verified", value: stats.verified, colorVar: "var(--ds-success)" },
    { key: "pending", label: "Pending", value: stats.pending, colorVar: "var(--ds-warning)" },
    { key: "rejected", label: "Rejected", value: stats.rejected, colorVar: "var(--ds-danger)" }
  ];
}

export function buildAptitudeAccuracyTrend(records: AptitudeHistoryRecord[]): TrendPoint[] {
  return [...records]
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
    .map((record, idx) => ({ label: `Attempt ${idx + 1}`, value: Math.round(record.accuracy) }));
}

export function buildApplicationStatusSegments(applications: Application[]): StatusSegment[] {
  const counts: Record<string, number> = { applied: 0, interviewing: 0, offered: 0, rejected: 0 };
  applications.forEach((app) => {
    counts[toStatusGroup(app.status)] += 1;
  });
  return (Object.keys(counts) as Array<keyof typeof counts>).map((key) => ({
    key,
    label: STATUS_GROUP_META[key as keyof typeof STATUS_GROUP_META].label,
    value: counts[key],
    colorVar: STATUS_GROUP_META[key as keyof typeof STATUS_GROUP_META].colorVar
  }));
}

const INTERVIEW_STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  upcoming: "Upcoming",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show"
};

export function buildInterviewStatusSegments(interviewRecords: ScheduledInterviewRecord[]): StatusSegment[] {
  const counts = new Map<string, number>();
  interviewRecords.forEach((record) => counts.set(record.interviewStatus, (counts.get(record.interviewStatus) || 0) + 1));
  return Object.keys(INTERVIEW_STATUS_LABELS)
    .filter((key) => counts.has(key))
    .map((key) => ({
      key,
      label: INTERVIEW_STATUS_LABELS[key],
      value: counts.get(key) || 0,
      colorVar: INTERVIEW_STATUS_TONE[key] || "var(--ds-muted)"
    }));
}

export function buildActivityHeatmapCells(
  applications: Application[],
  interviewRecords: ScheduledInterviewRecord[]
): HeatmapCell[] {
  const counts = new Map<string, number>();
  const bump = (iso?: string) => {
    if (!iso) return;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return;
    const key = toLocalDateKey(d);
    counts.set(key, (counts.get(key) || 0) + 1);
  };
  applications.forEach((app) => bump(app.appliedAt));
  interviewRecords.forEach((interview) => bump(interview.interviewDate));
  return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
}
