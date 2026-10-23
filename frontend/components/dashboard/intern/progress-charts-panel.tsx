"use client";

import { memo, useMemo } from "react";
import { CalendarCheck2, Milestone } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { AppIcon } from "@/components/icons/app-icon";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { HorizontalBarChart, type BarDatum } from "@/components/dashboard/charts/analytics-charts";
import { cn } from "@/lib/utils";
import type { Application } from "@/lib/intern-portal";
import type { ScheduledInterviewRecord } from "@/lib/interview-workflow";

const cardBase = "rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-[0_1px_2px_var(--ds-shadow)]";

const INTERVIEW_STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  upcoming: "Upcoming",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled"
};

const PLACEMENT_STAGES: Array<{ key: string; label: string }> = [
  { key: "applied", label: "Applied" },
  { key: "under_review", label: "Under Review" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview_scheduled", label: "Interview" },
  { key: "technical_round", label: "Technical" },
  { key: "hr_round", label: "HR Round" },
  { key: "selected", label: "Selected" }
];

function normalizePlacementStage(status: string): string {
  const value = String(status || "").toLowerCase();
  if (value === "screening" || value === "reviewed") return "under_review";
  if (value === "interview" || value === "interview_completed") return "interview_scheduled";
  if (value === "offered") return "selected";
  return value;
}

function buildInterviewProgressData(interviewRecords: ScheduledInterviewRecord[]): BarDatum[] {
  const counts = new Map<string, number>();
  interviewRecords.forEach((record) => {
    const key = record.interviewStatus;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return Object.keys(INTERVIEW_STATUS_LABELS)
    .filter((key) => counts.has(key))
    .map((key) => ({ label: INTERVIEW_STATUS_LABELS[key], value: counts.get(key) || 0 }));
}

function buildPlacementProgressData(applications: Application[]): BarDatum[] {
  const counts = new Map<string, number>();
  applications.forEach((app) => {
    const stage = normalizePlacementStage(app.status);
    if (stage === "rejected" || stage === "withdrawn") return;
    if (!PLACEMENT_STAGES.some((s) => s.key === stage)) return;
    counts.set(stage, (counts.get(stage) || 0) + 1);
  });

  return PLACEMENT_STAGES.filter((stage) => counts.has(stage.key)).map((stage) => ({
    label: stage.label,
    value: counts.get(stage.key) || 0
  }));
}

function ProgressChartsPanelInner({
  applications,
  interviewRecords
}: {
  applications: Application[];
  interviewRecords: ScheduledInterviewRecord[];
}) {
  const interviewData = useMemo(() => buildInterviewProgressData(interviewRecords), [interviewRecords]);
  const placementData = useMemo(() => buildPlacementProgressData(applications), [applications]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ScrollReveal variant="fade-up" distance={12} once className="h-full">
        <div className={cn(cardBase, "flex h-full flex-col p-6")}>
          <div className="mb-4 flex items-center gap-2">
            <AppIcon icon={CalendarCheck2} size="sm" className="text-[var(--ds-accent)]" />
            <h3 className="text-sm font-semibold text-[var(--ds-text)]">Interview Progress</h3>
          </div>
          {interviewData.length === 0 ? (
            <EmptyState title="No interviews yet" hint="Scheduled interview stages will appear here." presetKey="interviews" />
          ) : (
            <HorizontalBarChart data={interviewData} />
          )}
        </div>
      </ScrollReveal>

      <ScrollReveal variant="fade-up" distance={12} delayMs={60} once className="h-full">
        <div className={cn(cardBase, "flex h-full flex-col p-6")}>
          <div className="mb-4 flex items-center gap-2">
            <AppIcon icon={Milestone} size="sm" className="text-[var(--ds-success)]" />
            <h3 className="text-sm font-semibold text-[var(--ds-text)]">Placement Progress</h3>
          </div>
          {placementData.length === 0 ? (
            <EmptyState title="No pipeline activity yet" hint="Your application stage progress will appear here." presetKey="applications" />
          ) : (
            <HorizontalBarChart data={placementData} />
          )}
        </div>
      </ScrollReveal>
    </div>
  );
}

export const ProgressChartsPanel = memo(ProgressChartsPanelInner);
