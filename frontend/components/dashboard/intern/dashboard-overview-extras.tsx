"use client";

import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Bookmark,
  Briefcase,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileUp,
  Gauge,
  MapPin,
  Pencil,
  PieChart,
  Search,
  Target,
  Trophy,
  Wand2
} from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { AppIcon } from "@/components/icons/app-icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { cn } from "@/lib/utils";
import type { Application, InAppNotification, InternProfile, Recommendation, ResumeAnalysis } from "@/lib/intern-portal";
import type { ScheduledInterviewRecord } from "@/lib/interview-workflow";

const cardBase = "rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-[0_1px_2px_var(--ds-shadow)]";

const OFFER_STATUSES = new Set(["offered", "selected", "hired"]);

export type StatusGroup = "applied" | "interviewing" | "offered" | "rejected";

export const STATUS_GROUP_META: Record<StatusGroup, { label: string; barClass: string; dotClass: string; colorVar: string }> = {
  applied: { label: "Applied", barClass: "bg-[var(--ds-info)]", dotClass: "bg-[var(--ds-info)]", colorVar: "var(--ds-info)" },
  interviewing: {
    label: "Interviewing",
    barClass: "bg-[var(--ds-primary-text)] dark:bg-[var(--ds-primary)]",
    dotClass: "bg-[var(--ds-primary-text)] dark:bg-[var(--ds-primary)]",
    colorVar: "var(--ds-primary)"
  },
  offered: { label: "Offered", barClass: "bg-[var(--ds-success)]", dotClass: "bg-[var(--ds-success)]", colorVar: "var(--ds-success)" },
  rejected: { label: "Rejected/Withdrawn", barClass: "bg-[var(--ds-danger)]", dotClass: "bg-[var(--ds-danger)]", colorVar: "var(--ds-danger)" }
};

export function toStatusGroup(status?: string): StatusGroup {
  const value = String(status || "").toLowerCase();
  if (["offered", "selected", "hired"].includes(value)) return "offered";
  if (["rejected", "withdrawn"].includes(value)) return "rejected";
  if (
    ["shortlisted", "interview_scheduled", "interview_completed", "interview", "technical_round", "hr_round"].includes(
      value
    )
  ) {
    return "interviewing";
  }
  return "applied";
}

function HoverCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2, ease: "easeOut" }} className={cn(cardBase, "p-6", className)}>
      {children}
    </motion.div>
  );
}

/* ---------------------------- Recommendations ---------------------------- */

export function RecommendationsCard({
  recommendations,
  loading
}: {
  recommendations: Recommendation[];
  loading?: boolean;
}) {
  const top = recommendations.slice(0, 3);

  return (
    <ScrollReveal variant="fade-up" distance={12} once>
      <HoverCard>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AppIcon icon={Briefcase} size="sm" className="text-[var(--ds-accent)]" />
            <h3 className="text-sm font-semibold text-[var(--ds-text)]">Recommended Internships</h3>
          </div>
          <Button href="/dashboard/intern/internships/recommended" type="button" size="sm" variant="ghost">
            View all
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : top.length === 0 ? (
          <EmptyState
            title="No recommendations yet"
            hint="Upload a resume with skills so we can match you to internships."
            presetKey="internships"
            action={
              <Button href="/dashboard/intern/resume" type="button" size="sm">
                Upload Resume
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {top.map((item) => (
              <li
                key={item.internship._id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--ds-text)]">{item.internship.role}</p>
                  <p className="mt-0.5 truncate text-xs text-[var(--ds-text-secondary)]">
                    {item.internship.company?.companyName || "Company"}
                  </p>
                  {item.internship.location || item.internship.stipend ? (
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--ds-muted)]">
                      {item.internship.location ? (
                        <span className="flex items-center gap-1">
                          <AppIcon icon={MapPin} size="xs" />
                          {item.internship.location}
                        </span>
                      ) : null}
                      {item.internship.stipend ? <span>Stipend: {item.internship.stipend}</span> : null}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-[var(--ds-surface-raised)] px-2.5 py-1 text-xs font-semibold text-[var(--ds-accent)]">
                    {item.overallRecommendationScore}% match
                  </span>
                  <Button href="/dashboard/intern/internships/recommended" type="button" size="sm">
                    Apply
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </HoverCard>
    </ScrollReveal>
  );
}

/* ------------------------------- Statistics ------------------------------- */

export function StatisticsCards({
  profile,
  analysis,
  profileCompletion,
  applications,
  interviewCount,
  savedCount = 0,
  loading
}: {
  profile: InternProfile | null;
  analysis: ResumeAnalysis | null | undefined;
  profileCompletion: number;
  applications: Application[];
  interviewCount: number;
  savedCount?: number;
  loading?: boolean;
}) {
  const offers = applications.filter((app) => OFFER_STATUSES.has(String(app.status || "").toLowerCase())).length;
  const resumeScore = Math.round(analysis?.overallScore ?? profile?.resume?.score ?? 0);
  const atsScore = Math.round(analysis?.categoryScores?.ats ?? analysis?.compositeScores?.ats ?? 0);

  const stats = [
    { label: "Resume Score", value: `${resumeScore}/100`, icon: BarChart3 },
    { label: "ATS Score", value: `${atsScore}/100`, icon: Gauge },
    { label: "Profile Completion", value: `${profileCompletion}%`, icon: CheckCircle2 },
    { label: "Applications", value: applications.length, icon: ClipboardList },
    { label: "Interviews", value: interviewCount, icon: Calendar },
    { label: "Offers", value: offers, icon: Trophy },
    { label: "Saved Internships", value: savedCount, icon: Bookmark }
  ];

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat, idx) => (
        <ScrollReveal key={stat.label} variant="fade-up" distance={10} delayMs={idx * 40} once>
          <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }} className={cn(cardBase, "p-4")}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ds-surface-raised)] text-[var(--ds-accent)]">
                <AppIcon icon={stat.icon} size="sm" className="text-current" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--ds-muted)]">{stat.label}</p>
                <p className="text-xl font-bold tabular-nums text-[var(--ds-text)]">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        </ScrollReveal>
      ))}
    </div>
  );
}

/* ------------------------------ Quick Actions ------------------------------ */

export function QuickActions() {
  const actions = [
    { label: "Upload Resume", href: "/dashboard/intern/resume", icon: FileUp },
    { label: "Improve Profile", href: "/dashboard/intern/profile/edit", icon: Pencil },
    { label: "Apply Internships", href: "/dashboard/intern/internships/search", icon: Search },
    { label: "Practice Interview", href: "/dashboard/intern/learning/mock-interview", icon: Wand2 },
    { label: "Mock Test", href: "/dashboard/intern/learning/mock-aptitude", icon: Target }
  ];

  return (
    <ScrollReveal variant="fade-up" distance={12} once>
      <div className={cn(cardBase, "p-6")}>
        <h3 className="mb-4 text-sm font-semibold text-[var(--ds-text)]">Quick Actions</h3>
        <div className="flex flex-wrap gap-2.5">
          {actions.map((action, index) => (
            <Button
              key={action.href}
              href={action.href}
              type="button"
              size="sm"
              variant={index === 0 ? "primary" : "secondary"}
              className="gap-2"
            >
              <AppIcon icon={action.icon} size="xs" className="text-current" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}

/* ----------------------------- Activity Timeline ----------------------------- */

type TimelineEvent = {
  id: string;
  label: string;
  detail?: string;
  date: Date;
  icon: typeof Activity;
};

function buildTimelineEvents(
  applications: Application[],
  interviewRecords: ScheduledInterviewRecord[],
  notifications: InAppNotification[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  applications.forEach((app) => {
    if (!app.appliedAt) return;
    events.push({
      id: `app-${app._id}`,
      label: `Applied to ${app.internship?.role || "an internship"}`,
      detail: app.internship?.company?.companyName,
      date: new Date(app.appliedAt),
      icon: ClipboardList
    });
  });

  interviewRecords.forEach((interview) => {
    if (!interview.interviewDate) return;
    events.push({
      id: `interview-${interview.interviewId}`,
      label: `Interview scheduled: ${interview.role}`,
      detail: interview.companyName,
      date: new Date(interview.interviewDate),
      icon: Calendar
    });
  });

  notifications.forEach((note) => {
    if (!note.createdAt) return;
    events.push({
      id: `note-${note._id}`,
      label: note.title,
      detail: note.message,
      date: new Date(note.createdAt),
      icon: Activity
    });
  });

  return events
    .filter((event) => !Number.isNaN(event.date.getTime()))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8);
}

export function ActivityTimeline({
  applications,
  interviewRecords,
  notifications,
  loading
}: {
  applications: Application[];
  interviewRecords: ScheduledInterviewRecord[];
  notifications: InAppNotification[];
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const events = buildTimelineEvents(applications, interviewRecords, notifications);

  return (
    <ScrollReveal variant="fade-up" distance={12} once>
      <div className={cn(cardBase, "p-6")}>
        <h3 className="mb-4 text-sm font-semibold text-[var(--ds-text)]">Activity Timeline</h3>
        {events.length === 0 ? (
          <EmptyState
            title="No activity yet"
            hint="Upload a resume and apply to internships to build your activity history."
            presetKey="activity"
          />
        ) : (
          <ol className="space-y-4">
            {events.map((event, idx) => (
              <li key={event.id} className="relative flex gap-3 pl-1">
                <div className="flex flex-col items-center">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-raised)] text-[var(--ds-accent)]">
                    <AppIcon icon={event.icon} size="xs" className="text-current" />
                  </span>
                  {idx < events.length - 1 ? <span className="mt-1 h-full w-px flex-1 bg-[var(--ds-border)]" /> : null}
                </div>
                <div className="min-w-0 pb-2">
                  <p className="text-sm font-medium text-[var(--ds-text)]">{event.label}</p>
                  {event.detail ? <p className="text-xs text-[var(--ds-muted)]">{event.detail}</p> : null}
                  <p className="mt-0.5 text-[11px] text-[var(--ds-muted)]">{event.date.toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </ScrollReveal>
  );
}

/* -------------------------------- Charts -------------------------------- */

function ChartLegend({ groups }: { groups: StatusGroup[] }) {
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {groups.map((group) => (
        <span key={group} className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--ds-muted)]">
          <span className={cn("h-2 w-2 rounded-full", STATUS_GROUP_META[group].dotClass)} />
          {STATUS_GROUP_META[group].label}
        </span>
      ))}
    </div>
  );
}

function ApplicationsTimelineChart({ applications }: { applications: Application[] }) {
  const buckets = new Map<string, Record<StatusGroup, number>>();
  applications.forEach((app) => {
    if (!app.appliedAt) return;
    const d = new Date(app.appliedAt);
    if (Number.isNaN(d.getTime())) return;
    const key = d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    const group = toStatusGroup(app.status);
    const existing = buckets.get(key) || { applied: 0, interviewing: 0, offered: 0, rejected: 0 };
    existing[group] += 1;
    buckets.set(key, existing);
  });

  const entries = Array.from(buckets.entries()).slice(-6);
  const max = Math.max(
    1,
    ...entries.map(([, counts]) => counts.applied + counts.interviewing + counts.offered + counts.rejected)
  );

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No applications yet"
        hint="Your application activity over time will appear here."
        presetKey="applications"
      />
    );
  }

  const usedGroups = (["applied", "interviewing", "offered", "rejected"] as StatusGroup[]).filter((group) =>
    entries.some(([, counts]) => counts[group] > 0)
  );

  return (
    <div>
      <ChartLegend groups={usedGroups} />
      <div className="flex h-40 items-end gap-3 px-1">
        {entries.map(([label, counts]) => {
          const total = counts.applied + counts.interviewing + counts.offered + counts.rejected;
          return (
            <div key={label} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="flex h-32 w-full flex-col-reverse overflow-hidden rounded-lg bg-[var(--ds-surface-raised)]"
                title={`${label}: ${total} application${total === 1 ? "" : "s"}`}
              >
                {(["applied", "interviewing", "offered", "rejected"] as StatusGroup[]).map((group) =>
                  counts[group] > 0 ? (
                    <div
                      key={group}
                      className={cn(
                        "w-full transition-all duration-700 ease-out",
                        STATUS_GROUP_META[group].barClass
                      )}
                      style={{ height: `${Math.max(4, (counts[group] / max) * 100)}%` }}
                      title={`${STATUS_GROUP_META[group].label}: ${counts[group]}`}
                    />
                  ) : null
                )}
              </div>
              <span className="text-[11px] font-medium text-[var(--ds-muted)]">{label}</span>
              <span className="text-xs font-semibold tabular-nums text-[var(--ds-text)]">{total}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkillsDistributionChart({ analysis }: { analysis: ResumeAnalysis | null | undefined }) {
  const categorized = analysis?.skillIntelligence?.categorized || {};
  const entries = Object.entries(categorized)
    .map(([category, skills]) => [category, skills.length] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No skill data yet"
        hint="Upload a resume so we can categorize and chart your skills."
        icon={PieChart}
      />
    );
  }

  const max = Math.max(1, ...entries.map(([, count]) => count));

  return (
    <div className="space-y-3">
      {entries.map(([category, count]) => (
        <div key={category}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--ds-text-secondary)]">{category}</span>
            <span className="font-semibold tabular-nums text-[var(--ds-text)]">{count}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ds-surface-raised)]" title={`${category}: ${count} skill${count === 1 ? "" : "s"}`}>
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--ds-chart-3),var(--ds-accent))] transition-all duration-700 ease-out"
              style={{ width: `${Math.max(4, (count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardCharts({
  applications,
  analysis,
  loading
}: {
  applications: Application[];
  analysis: ResumeAnalysis | null | undefined;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ScrollReveal variant="fade-up" distance={12} once className="h-full">
        <div className={cn(cardBase, "flex h-full flex-col p-6")}>
          <h3 className="mb-4 text-sm font-semibold text-[var(--ds-text)]">Applications Timeline</h3>
          <ApplicationsTimelineChart applications={applications} />
        </div>
      </ScrollReveal>
      <ScrollReveal variant="fade-up" distance={12} delayMs={60} once className="h-full">
        <div className={cn(cardBase, "flex h-full flex-col p-6")}>
          <h3 className="mb-4 text-sm font-semibold text-[var(--ds-text)]">Skills Distribution</h3>
          <SkillsDistributionChart analysis={analysis} />
        </div>
      </ScrollReveal>
    </div>
  );
}
