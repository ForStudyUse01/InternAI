"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Check, Copy, Download, CalendarPlus, MapPin, MessageCircleWarning, MessageSquare, StickyNote, Timer, UserRound, X } from "lucide-react";
import type { ScheduledInterviewRecord } from "@/lib/interview-workflow";
import {
  formatInterviewDateTime,
  resolveRoundDurationMinutes,
  resolveRoundInterviewers
} from "@/lib/interview-workflow";
import { useInterviewCountdown } from "@/lib/use-interview-countdown";
import { downloadInterviewIcs, openGoogleCalendarForInterview } from "@/lib/interview-calendar-export";
import { InterviewJoinButton } from "@/components/dashboard/interview/interview-join-button";
import { formatInterviewJoinHint, resolveInterviewJoinHref } from "@/lib/interview-join";
import { InterviewStatusChip } from "./interview-status-chip";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/icons/app-icon";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { requestInterviewReschedule } from "@/lib/intern-portal";

type InterviewDetailsModalProps = {
  open: boolean;
  interview: ScheduledInterviewRecord | null;
  audience?: "intern" | "company";
  chatHref?: string;
  onViewProfile?: (applicationId: string) => void;
  onClose: () => void;
};

export function InterviewDetailsModal({
  open,
  interview,
  audience = "intern",
  chatHref = "/dashboard/intern/chat",
  onViewProfile,
  onClose
}: InterviewDetailsModalProps) {
  const [copied, setCopied] = useState(false);
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleSending, setRescheduleSending] = useState(false);
  const [rescheduleSent, setRescheduleSent] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const countdown = useInterviewCountdown(interview?.interviewDate, interview?.interviewTime);
  const dialogRef = useFocusTrap<HTMLDivElement>(open && Boolean(interview));

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setShowRescheduleForm(false);
      setRescheduleReason("");
      setRescheduleSent(false);
      setRescheduleError(null);
    }
  }, [open]);

  if (!open || !interview) return null;

  const joinHint = formatInterviewJoinHint(interview);
  const joinHref = resolveInterviewJoinHref(interview);
  const durationMinutes = resolveRoundDurationMinutes(interview);
  const interviewers = resolveRoundInterviewers(interview);
  const notes = interview.notes || "";
  const isOpenRound = !["completed", "cancelled", "no_show"].includes(interview.interviewStatus);
  const alreadyRequested = Boolean(interview.rescheduleRequestedByCandidate);

  async function submitRescheduleRequest() {
    if (!interview) return;
    try {
      setRescheduleSending(true);
      setRescheduleError(null);
      await requestInterviewReschedule(interview.applicationId, interview.interviewId, rescheduleReason.trim());
      setRescheduleSent(true);
      setShowRescheduleForm(false);
    } catch (err) {
      setRescheduleError((err as Error).message || "Failed to send reschedule request.");
    } finally {
      setRescheduleSending(false);
    }
  }

  async function copyMeetingLink() {
    if (!joinHref) return;
    const absolute = /^https?:\/\//i.test(joinHref)
      ? joinHref
      : typeof window !== "undefined"
        ? `${window.location.origin}${joinHref}`
        : joinHref;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — ignore silently */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} aria-label="Close interview details" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="interview-details-title"
        className="relative z-10 w-full max-w-lg rounded-t-2xl border border-[var(--ds-border)] bg-[var(--ds-modal)] p-5 shadow-2xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="mb-2">
              <InterviewStatusChip status={interview.interviewStatus} />
            </div>
            <h2 id="interview-details-title" className="text-lg font-semibold text-[var(--ds-text)]">
              {interview.interviewType}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--ds-text-secondary)]">
              {interview.role} · {audience === "company" ? interview.candidateName : interview.companyName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--ds-muted)] hover:bg-[var(--ds-hover)]"
            aria-label="Close"
          >
            <AppIcon icon={X} size="sm" />
          </button>
        </div>

        <div className="space-y-3 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-4">
          <div className="flex items-start gap-3 text-sm text-[var(--ds-text-secondary)]">
            <AppIcon icon={CalendarClock} size="sm" className="mt-0.5 text-[var(--ds-accent)]" />
            <div>
              <p className="font-medium text-[var(--ds-text)]">Schedule</p>
              <p className="text-[var(--ds-text-secondary)]">
                {formatInterviewDateTime(interview.interviewDate, interview.interviewTime)}
              </p>
              <p className="mt-0.5 text-xs text-[var(--ds-muted)]">Duration: {durationMinutes} minutes</p>
              {joinHint ? <p className="mt-1 text-xs text-[var(--ds-accent)]">{joinHint}</p> : null}
            </div>
          </div>
          {isOpenRound && countdown ? (
            <div className="flex items-start gap-3 text-sm text-[var(--ds-text-secondary)]">
              <AppIcon icon={Timer} size="sm" className="mt-0.5 text-[var(--ds-accent)]" />
              <div>
                <p className="font-medium text-[var(--ds-text)]">Starts in</p>
                <p className="text-[var(--ds-text-secondary)]">{countdown.label}</p>
              </div>
            </div>
          ) : null}
          {interview.mode ? (
            <div className="flex items-start gap-3 text-sm text-[var(--ds-text-secondary)]">
              <AppIcon icon={MapPin} size="sm" className="mt-0.5 text-[var(--ds-accent)]" />
              <div>
                <p className="font-medium text-[var(--ds-text)]">Mode</p>
                <p className="capitalize text-[var(--ds-text-secondary)]">{interview.mode}</p>
              </div>
            </div>
          ) : null}
          {interview.mode === "offline" ? (
            <div className="flex items-start gap-3 text-sm text-[var(--ds-text-secondary)]">
              <AppIcon icon={MapPin} size="sm" className="mt-0.5 text-[var(--ds-accent)]" />
              <div>
                <p className="font-medium text-[var(--ds-text)]">Location</p>
                <p className="text-[var(--ds-text-secondary)]">{interview.location || "Location shared with candidate"}</p>
              </div>
            </div>
          ) : null}
          {interviewers.length > 0 ? (
            <div className="flex items-start gap-3 text-sm text-[var(--ds-text-secondary)]">
              <AppIcon icon={UserRound} size="sm" className="mt-0.5 text-[var(--ds-accent)]" />
              <div>
                <p className="font-medium text-[var(--ds-text)]">Interviewer{interviewers.length > 1 ? "s" : ""}</p>
                <p className="text-[var(--ds-text-secondary)]">{interviewers.map((entry) => entry.name).join(", ")}</p>
              </div>
            </div>
          ) : null}
          {notes ? (
            <div className="flex items-start gap-3 text-sm text-[var(--ds-text-secondary)]">
              <AppIcon icon={StickyNote} size="sm" className="mt-0.5 text-[var(--ds-accent)]" />
              <div>
                <p className="font-medium text-[var(--ds-text)]">Notes</p>
                <p className="whitespace-pre-wrap text-[var(--ds-text-secondary)]">{notes}</p>
              </div>
            </div>
          ) : null}
          {interview.cancelReason ? (
            <div className="flex items-start gap-3 text-sm text-[var(--ds-text-secondary)]">
              <AppIcon icon={MessageCircleWarning} size="sm" className="mt-0.5 text-[var(--ds-danger)]" />
              <div>
                <p className="font-medium text-[var(--ds-text)]">Reason</p>
                <p className="text-[var(--ds-text-secondary)]">{interview.cancelReason}</p>
              </div>
            </div>
          ) : null}
        </div>

        {audience === "intern" && isOpenRound ? (
          <div className="mt-4 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-4">
            {alreadyRequested || rescheduleSent ? (
              <p role="status" aria-live="polite" className="flex items-center gap-2 text-xs font-medium text-[var(--ds-warning)]">
                <AppIcon icon={MessageCircleWarning} size="xs" className="text-[var(--ds-warning)]" />
                Reschedule request sent — the team will follow up.
              </p>
            ) : showRescheduleForm ? (
              <div className="space-y-2">
                <label htmlFor="reschedule-reason" className="text-xs font-semibold text-[var(--ds-text-secondary)]">
                  Why do you need to reschedule? (optional)
                </label>
                <textarea
                  id="reschedule-reason"
                  rows={2}
                  value={rescheduleReason}
                  onChange={(event) => setRescheduleReason(event.target.value)}
                  className="w-full rounded-lg border border-[var(--ds-border)] bg-[var(--ds-input)] px-3 py-2 text-sm text-[var(--ds-text)] outline-none focus:border-[var(--ds-primary)] focus:ring-2 focus:ring-[var(--ds-focus-ring)]"
                  placeholder="e.g. conflicting commitment at that time"
                />
                {rescheduleError ? <p role="alert" className="text-xs text-[var(--ds-danger)]">{rescheduleError}</p> : null}
                <div className="flex gap-2">
                  <Button type="button" size="sm" disabled={rescheduleSending} onClick={submitRescheduleRequest}>
                    {rescheduleSending ? "Sending…" : "Send Request"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={rescheduleSending} onClick={() => setShowRescheduleForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" size="sm" variant="secondary" onClick={() => setShowRescheduleForm(true)}>
                <AppIcon icon={MessageCircleWarning} size="xs" />
                Request Reschedule
              </Button>
            )}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => openGoogleCalendarForInterview(interview, audience)}>
            <AppIcon icon={CalendarPlus} size="xs" />
            Google Calendar
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => downloadInterviewIcs(interview, audience)}>
            <AppIcon icon={Download} size="xs" />
            Download .ics
          </Button>
          {joinHref ? (
            <Button type="button" size="sm" variant="secondary" onClick={copyMeetingLink}>
              {copied ? <AppIcon icon={Check} size="xs" /> : <AppIcon icon={Copy} size="xs" />}
              <span aria-live="polite">{copied ? "Copied" : "Copy Link"}</span>
            </Button>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
          {audience === "intern" ? (
            <Button type="button" size="sm" variant="secondary" href={chatHref}>
              <AppIcon icon={MessageSquare} size="xs" />
              Message Recruiter
            </Button>
          ) : null}
          {audience === "company" && onViewProfile ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                onClose();
                onViewProfile(interview.applicationId);
              }}
            >
              <AppIcon icon={UserRound} size="xs" />
              View Profile
            </Button>
          ) : null}
          <InterviewJoinButton interview={interview} />
        </div>
      </div>
    </div>
  );
}
