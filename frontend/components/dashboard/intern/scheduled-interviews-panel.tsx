"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CalendarDays, MessageSquare } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import type { Application } from "@/lib/intern-portal";
import {
  extractPastInterviews,
  extractScheduledInterviews,
  formatInterviewDateTime,
  type ScheduledInterviewRecord
} from "@/lib/interview-workflow";
import { formatInterviewJoinHint } from "@/lib/interview-join";
import { useInterviewCountdown } from "@/lib/use-interview-countdown";
import { SectionPanel } from "@/components/dashboard/shared/section-panel";
import { Button } from "@/components/ui/button";
import { InterviewStatusChip } from "@/components/dashboard/interview/interview-status-chip";
import { InterviewJoinButton } from "@/components/dashboard/interview/interview-join-button";
import { EmptyState } from "@/components/dashboard/shared/empty-state";

const InterviewDetailsModal = dynamic(
  () => import("@/components/dashboard/interview/interview-details-modal").then((m) => m.InterviewDetailsModal),
  { ssr: false }
);

function InterviewCountdownHint({ item }: { item: ScheduledInterviewRecord }) {
  const countdown = useInterviewCountdown(item.interviewDate, item.interviewTime);
  if (!countdown) return null;
  return <p className="text-xs font-medium text-[var(--ds-primary-text)]">Starts in {countdown.label}</p>;
}

type ScheduledInterviewsPanelProps = {
  applications?: Application[];
  interviewRecords?: ScheduledInterviewRecord[];
  pastInterviewRecords?: ScheduledInterviewRecord[];
  compact?: boolean;
};

export function ScheduledInterviewsPanel({
  applications = [],
  interviewRecords,
  pastInterviewRecords,
  compact = false
}: ScheduledInterviewsPanelProps) {
  const [selected, setSelected] = useState<ScheduledInterviewRecord | null>(null);
  const interviews = useMemo(
    () => interviewRecords ?? extractScheduledInterviews(applications),
    [applications, interviewRecords]
  );
  const pastInterviews = useMemo(
    () => pastInterviewRecords ?? extractPastInterviews(applications),
    [applications, pastInterviewRecords]
  );
  const visible = compact ? interviews.slice(0, 5) : interviews;

  return (
    <>
      <SectionPanel
        title="Scheduled Interviews"
        subtitle="Track every upcoming and active interview in one place."
        titleIcon={CalendarDays}
      >
        {compact ? (
          <div className="mb-3 flex justify-end">
            <Button type="button" size="sm" variant="secondary" href="/dashboard/intern/interviews">
              View all
            </Button>
          </div>
        ) : null}
        {visible.length === 0 ? (
          <EmptyState
            presetKey="interviews"
            title="No Interviews Scheduled"
            description="When a recruiter schedules your interview, it will appear here immediately."
            ctaLabel="Track Progress"
            ctaHref="/dashboard/intern/track-progress"
            size="sm"
          />
        ) : (
          <div className="grid gap-3">
            {visible.map((item) => {
              const joinHint = formatInterviewJoinHint(item);
              return (
                <article
                  key={item.interviewId}
                  className="flex h-full flex-col gap-4 rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-card)] p-4 shadow-sm transition hover:border-[var(--ds-primary)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-[var(--ds-text)]">{item.companyName}</h3>
                      <InterviewStatusChip status={item.interviewStatus} />
                    </div>
                    <p className="text-sm text-[var(--ds-text-secondary)]">
                      {item.role} · {item.interviewType}
                    </p>
                    <p className="text-xs text-[var(--ds-muted)]">
                      {formatInterviewDateTime(item.interviewDate, item.interviewTime)}
                    </p>
                    {joinHint ? <p className="text-xs text-[var(--ds-primary-text)]">{joinHint}</p> : null}
                    <InterviewCountdownHint item={item} />
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button type="button" size="sm" variant="secondary" onClick={() => setSelected(item)}>
                      View Details
                    </Button>
                    <Button type="button" size="sm" variant="ghost" href="/dashboard/intern/chat">
                      <AppIcon icon={MessageSquare} size="xs" className="text-current" />
                      Message Recruiter
                    </Button>
                    <InterviewJoinButton interview={item} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionPanel>

      {!compact && pastInterviews.length > 0 ? (
        <SectionPanel title="Interview History" subtitle="Completed and cancelled interviews from your applications.">
          <div className="grid gap-3">
            {pastInterviews.slice(0, 10).map((item) => (
              <article
                key={`past-${item.interviewId}`}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-card)] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-[var(--ds-text)]">{item.companyName}</h3>
                    <InterviewStatusChip status={item.interviewStatus} />
                  </div>
                  <p className="text-sm text-[var(--ds-text-secondary)]">
                    {item.role} · {item.interviewType}
                  </p>
                  <p className="text-xs text-[var(--ds-muted)]">
                    {formatInterviewDateTime(item.interviewDate, item.interviewTime)}
                  </p>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => setSelected(item)}>
                  View Details
                </Button>
              </article>
            ))}
          </div>
        </SectionPanel>
      ) : null}

      <InterviewDetailsModal open={Boolean(selected)} interview={selected} onClose={() => setSelected(null)} />
    </>
  );
}
