"use client";

import { useMemo } from "react";
import { CalendarClock, Timer } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import type { Application } from "@/lib/intern-portal";
import {
  extractUpcomingInterviewRecords,
  extractUpcomingInterviews,
  formatInterviewDateTime,
  getCountdownParts,
  type ScheduledInterviewRecord
} from "@/lib/interview-workflow";
import { useTickingNow } from "@/lib/use-interview-countdown";
import { SectionPanel } from "@/components/dashboard/shared/section-panel";
import { Button } from "@/components/ui/button";
import { InterviewJoinButton } from "@/components/dashboard/interview/interview-join-button";
import { InterviewStatusChip } from "@/components/dashboard/interview/interview-status-chip";

type UpcomingInterviewsWidgetProps = {
  applications?: Application[];
  interviewRecords?: ScheduledInterviewRecord[];
};

export function UpcomingInterviewsWidget({ applications = [], interviewRecords }: UpcomingInterviewsWidgetProps) {
  const now = useTickingNow();
  const upcoming = useMemo(
    () =>
      interviewRecords
        ? extractUpcomingInterviewRecords(interviewRecords, 3)
        : extractUpcomingInterviews(applications, 3),
    [applications, interviewRecords]
  );

  return (
    <SectionPanel
      title="Upcoming Interviews"
      subtitle="Your next scheduled interviews with live countdown."
      titleIcon={CalendarClock}
      className="company-dashboard-hero-accent"
    >
      {upcoming.length === 0 ? (
        <div className="surface-subtle px-4 py-5 text-sm text-[var(--ds-text-secondary)]">
          No upcoming interviews yet. Shortlisted applications will appear here once scheduled.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          {upcoming.map((item, index) => {
            const countdown =
              now === null ? null : getCountdownParts(item.interviewDate, item.interviewTime, now);
            return (
              <article
                key={item.interviewId}
                className="interview-countdown-card flex h-full flex-col rounded-2xl border border-[var(--ds-primary)]/30 bg-gradient-to-br from-[var(--ds-primary)]/10 via-[var(--ds-card)] to-[var(--ds-accent)]/10 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-primary-text)]">
                      {index === 0 ? "Next Interview" : `Interview ${index + 1}`}
                    </p>
                    <h3 className="mt-1 truncate text-base font-semibold text-[var(--ds-text)]">
                      {item.role}
                    </h3>
                    <p className="truncate text-sm text-[var(--ds-text-secondary)]">{item.companyName}</p>
                  </div>
                  <InterviewStatusChip status={item.interviewStatus} />
                </div>

                <p className="mt-3 text-xs text-[var(--ds-muted)]">
                  {formatInterviewDateTime(item.interviewDate, item.interviewTime)}
                </p>

                {now !== null && countdown ? (
                  <div className="mt-4 rounded-xl border border-[var(--ds-primary)]/30 bg-[var(--ds-card)]/70 px-3 py-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-primary-text)]">
                      <AppIcon icon={Timer} size="xs" className="text-current" />
                      Interview in
                    </div>
                    <p className="mt-1 text-lg font-bold text-[var(--ds-text)]">
                      {countdown.days > 0 ? `${countdown.days} Days ` : ""}
                      {countdown.hours} Hours
                    </p>
                  </div>
                ) : null}

                <div className="mt-auto flex flex-col gap-2 pt-4">
                  <InterviewJoinButton interview={item} className="w-full" />
                  <Button type="button" size="sm" variant="secondary" href="/dashboard/intern/interviews" className="w-full">
                    View Details
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </SectionPanel>
  );
}
