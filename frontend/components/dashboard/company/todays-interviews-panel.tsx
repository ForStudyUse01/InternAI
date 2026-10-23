"use client";

import { useMemo } from "react";
import { CalendarClock, RotateCcw } from "lucide-react";
import type { CompanyApplication } from "@/lib/company-portal";
import {
  CompanyDashboardEmptyState,
  CompanyDashboardPanelCard,
  CompanyDashboardSection
} from "./company-dashboard-layout";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/icons/app-icon";
import { InterviewStatusChip } from "@/components/dashboard/interview/interview-status-chip";
import { InterviewJoinButton } from "@/components/dashboard/interview/interview-join-button";
import {
  extractAllFromApplication,
  formatInterviewTimeLabel,
  isSameCalendarDay,
  normalizeInterviewDateInput,
  parseInterviewDateTime,
  type ScheduledInterviewRecord
} from "@/lib/interview-workflow";
import type { InterviewScheduleTarget } from "./interview-scheduling-panel";
import { cn } from "@/lib/utils";

type TodaysInterviewsPanelProps = {
  applications: CompanyApplication[];
  onViewProfile: (applicationId: string) => void;
  onScheduleInterview: (target: InterviewScheduleTarget) => void;
  limit?: number;
};

function dateLabel(item: ScheduledInterviewRecord, now: Date) {
  const parsed = parseInterviewDateTime(item.interviewDate, item.interviewTime);
  if (!parsed) return "Date TBD";
  if (isSameCalendarDay(parsed, now)) return "Today";
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameCalendarDay(parsed, tomorrow)) return "Tomorrow";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function TodaysInterviewsPanel({ applications, onViewProfile, onScheduleInterview, limit = 6 }: TodaysInterviewsPanelProps) {
  const now = useMemo(() => new Date(), []);

  const upcoming = useMemo(() => {
    const scheduled = applications.flatMap((app) => extractAllFromApplication(app));
    const open = scheduled.filter((item) => !["completed", "cancelled", "no_show"].includes(item.interviewStatus));
    return open.sort((a, b) => {
      const da = parseInterviewDateTime(a.interviewDate, a.interviewTime)?.getTime() ?? Infinity;
      const db = parseInterviewDateTime(b.interviewDate, b.interviewTime)?.getTime() ?? Infinity;
      return da - db;
    });
  }, [applications]);

  const todayCount = useMemo(
    () =>
      upcoming.filter((item) => {
        const parsed = parseInterviewDateTime(item.interviewDate, item.interviewTime);
        return parsed ? isSameCalendarDay(parsed, now) : false;
      }).length,
    [upcoming, now]
  );

  const visible = upcoming.slice(0, limit);

  function handleReschedule(item: ScheduledInterviewRecord) {
    onScheduleInterview({
      applicationId: item.applicationId,
      candidateName: item.candidateName || item.role,
      roundId: item.interviewId,
      initialSlot: {
        roundType: item.interviewType,
        interviewDate: normalizeInterviewDateInput(item.interviewDate),
        interviewTime: item.interviewTime,
        mode: item.mode,
        meetingLink: item.mode === "offline" ? "" : item.meetingLink,
        location: item.mode === "offline" ? item.location : "",
        notes: item.notes
      }
    });
  }

  return (
    <CompanyDashboardSection
      id="dashboard-todays-interviews"
      icon={CalendarClock}
      title="Today's Interviews"
      description={
        todayCount > 0
          ? `${todayCount} interview${todayCount === 1 ? "" : "s"} today · ${upcoming.length} upcoming overall.`
          : "No interviews today — showing what's coming up next."
      }
    >
      {upcoming.length === 0 ? (
        <CompanyDashboardEmptyState
          title="No interviews scheduled"
          description="Once candidates move into the interview stage and a round is scheduled, it will appear here."
          icon={CalendarClock}
        />
      ) : (
        <CompanyDashboardPanelCard className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Today&apos;s scheduled interviews</caption>
              <thead>
                <tr className="border-b border-[var(--ds-border)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ds-muted)]">
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  const isToday = dateLabel(item, now) === "Today";
                  return (
                    <tr key={item.interviewId} className="border-b border-[var(--ds-border)] last:border-0">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onViewProfile(item.applicationId)}
                          className="text-left text-sm font-semibold text-[var(--ds-text)] hover:text-[var(--ds-accent)]"
                        >
                          {item.candidateName || "Candidate"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--ds-text-secondary)]">{item.role}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={cn("font-medium", isToday ? "text-[var(--ds-accent)]" : "text-[var(--ds-text)]")}>
                          {dateLabel(item, now)}
                        </span>
                        {item.interviewTime ? (
                          <span className="ml-1.5 text-[var(--ds-muted)]">{formatInterviewTimeLabel(item.interviewTime)}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <InterviewStatusChip status={item.interviewStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button type="button" size="sm" variant="ghost" onClick={() => handleReschedule(item)}>
                            <AppIcon icon={RotateCcw} size="xs" />
                            Reschedule
                          </Button>
                          <InterviewJoinButton interview={item} size="sm" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CompanyDashboardPanelCard>
      )}
    </CompanyDashboardSection>
  );
}
