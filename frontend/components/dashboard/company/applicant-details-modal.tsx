"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/icons/app-icon";
import type { CompanyApplication } from "@/lib/company-portal";
import { extractAllFromApplication } from "@/lib/interview-workflow";
import { InterviewStatusChip } from "@/components/dashboard/interview/interview-status-chip";
import { InterviewJoinButton } from "@/components/dashboard/interview/interview-join-button";
import type { InterviewScheduleTarget } from "@/components/dashboard/company/interview-scheduling-panel";
import { ApplicantParsedResume } from "@/components/dashboard/company/applicant-parsed-resume";
import { ApplicantPortfolioCard } from "@/components/portfolio/applicant-portfolio-card";
import { FEATURE_FLAGS } from "@/constants/featureFlags";
import { useFocusTrap } from "@/lib/use-focus-trap";

function fmtDate(value?: string) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString();
}

function fmtAppliedDateTime(value?: string) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = dt.getDate();
  const m = months[dt.getMonth()];
  const y = dt.getFullYear();
  let h = dt.getHours();
  const min = dt.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${d} ${m} ${y}, ${h}:${min} ${ampm}`;
}

function normalizeStage(value: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "screening") return "reviewed";
  if (normalized === "interview") return "interview_scheduled";
  if (normalized === "offered") return "selected";
  return normalized;
}

export type ApplicantDetailsModalProps = {
  application: CompanyApplication;
  onClose: () => void;
  saving: boolean;
  inputClassName: string;
  statusDraft: string;
  onStatusDraftChange: (value: string) => void;
  onSaveStatus: () => void;
  onScheduleInterview: (target: InterviewScheduleTarget) => void;
  feedbackDraft: { feedback: string; rating: number; visibility: "internal" | "candidate" };
  onFeedbackDraftChange: (patch: Partial<{ feedback: string; rating: number; visibility: "internal" | "candidate" }>) => void;
  onSubmitFeedback: () => void;
};

export function ApplicantDetailsModal({
  application: a,
  onClose,
  saving,
  inputClassName: field,
  statusDraft,
  onStatusDraftChange,
  onSaveStatus,
  onScheduleInterview,
  feedbackDraft,
  onFeedbackDraftChange,
  onSubmitFeedback
}: ApplicantDetailsModalProps) {
  const currentStage = normalizeStage(a.status);
  const interviewRecords = extractAllFromApplication(a);
  const matchPct = a.relevanceScore ?? a.matchScore ?? 0;
  const resumeScore = a.intern?.resume?.score ?? 0;
  const dialogRef = useFocusTrap<HTMLDivElement>(true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const node =
    typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
            <button type="button" className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" aria-label="Close details" onClick={onClose} />
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="applicant-details-title"
              className="ds-card relative z-[101] mb-0 flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col overflow-hidden !p-0 shadow-2xl rounded-t-2xl sm:mb-0 sm:rounded-2xl"
            >
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--ds-border)] bg-gradient-to-r from-white/[0.03] via-transparent to-transparent px-5 py-4">
                <div>
                  <h2 id="applicant-details-title" className="ds-h3 !text-lg">
                    {a.intern?.fullName || "Candidate"}
                  </h2>
                  <p className="ds-caption mt-0.5">{a.internship?.role || "Internship"}</p>
                  <p className="ds-caption mt-2">
                    Applied: <span className="font-medium text-[var(--ds-text)]">{fmtAppliedDateTime(a.createdAt)}</span>
                  </p>
                </div>
                <button type="button" onClick={onClose} className="ds-icon-btn shrink-0" aria-label="Close">
                  <AppIcon icon={X} size="sm" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <div className="space-y-6">
                  <section className="ds-card">
                    <p className="ds-label">Applicant</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="surface-subtle rounded-lg px-3 py-2 text-xs text-[var(--ds-text)]">
                        <span className="font-semibold">Email</span>
                        <p className="mt-0.5">{a.intern?.email || "-"}</p>
                      </div>
                      <div className="surface-subtle rounded-lg px-3 py-2 text-xs text-[var(--ds-text)]">
                        <span className="font-semibold">Phone</span>
                        <p className="mt-0.5">{a.intern?.mobile || "-"}</p>
                      </div>
                      <div className="surface-subtle rounded-lg px-3 py-2 text-xs text-[var(--ds-text)]">
                        <span className="font-semibold">Availability</span>
                        <p className="mt-0.5">{a.availabilityStatus === "yes" ? "Available now" : a.availabilityStatus === "no" ? "Not immediate" : "-"}</p>
                      </div>
                      <div className="surface-subtle rounded-lg px-3 py-2 text-xs text-[var(--ds-text)]">
                        <span className="font-semibold">Available from</span>
                        <p className="mt-0.5">{fmtDate(a.joiningDate)}</p>
                      </div>
                      <div className="surface-subtle rounded-lg px-3 py-2 text-xs text-[var(--ds-text)]">
                        <span className="font-semibold">Stage</span>
                        <p className="mt-0.5 capitalize">{currentStage.replace(/_/g, " ")}</p>
                      </div>
                      <div className="surface-subtle rounded-lg px-3 py-2 text-xs text-[var(--ds-text)]">
                        <span className="font-semibold">Scores</span>
                        <p className="mt-0.5">
                          Match {matchPct}% · Resume {resumeScore}
                        </p>
                      </div>
                    </div>
                  </section>

                  {FEATURE_FLAGS.ENABLE_3D_PORTFOLIO ? (
                    <section className="ds-card">
                      <ApplicantPortfolioCard portfolio={a.intern?.portfolio} internName={a.intern?.fullName} />
                    </section>
                  ) : null}

                  <section className="space-y-3 ds-card">
                    <p className="ds-label">Hiring workflow</p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                      <select aria-label="Application stage" className={`${field} w-full min-w-0 sm:min-w-[220px] sm:flex-1`} value={statusDraft} onChange={(e) => onStatusDraftChange(e.target.value)}>
                        <option value="applied">Applied</option>
                        <option value="under_review">Under Review</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="interview_scheduled">Interview Scheduled</option>
                        <option value="technical_round">Technical Round</option>
                        <option value="hr_round">HR Round</option>
                        <option value="on_hold">On Hold</option>
                        <option value="selected">Selected</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <Button type="button" size="sm" className="w-full shrink-0 sm:w-auto" onClick={onSaveStatus} disabled={saving}>
                        Save status
                      </Button>
                    </div>
                  </section>

                  <section className="ds-card">
                    <p className="mb-3 ds-label">Parsed resume</p>
                    <ApplicantParsedResume intern={a.intern} />
                  </section>

                  <section className="space-y-3 ds-card">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="ds-label">Interview rounds</p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onScheduleInterview({ applicationId: a._id, candidateName: a.intern?.fullName || "Candidate" })}
                        disabled={saving}
                      >
                        <AppIcon icon={CalendarClock} size="xs" />
                        Manage Interviews
                      </Button>
                    </div>

                    {interviewRecords.length === 0 ? (
                      <p className="ds-caption">No interview rounds scheduled yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {interviewRecords.map((round) => (
                          <div key={round.interviewId} className="surface-subtle flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs">
                            <span className="flex flex-wrap items-center gap-2">
                              {round.interviewType} · {fmtDate(round.interviewDate)} {round.interviewTime || ""} · {round.mode || "-"}
                              <InterviewStatusChip status={round.interviewStatus} />
                            </span>
                            <InterviewJoinButton interview={round} />
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="space-y-3 ds-card">
                    <p className="ds-label">HR feedback</p>
                    <textarea
                      className="ds-textarea min-h-20"
                      placeholder="Share candidate feedback"
                      aria-label="Candidate feedback"
                      value={feedbackDraft.feedback}
                      onChange={(e) => onFeedbackDraftChange({ feedback: e.target.value })}
                    />
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input
                        type="number"
                        min={1}
                        max={5}
                        className={field}
                        aria-label="Rating (1-5)"
                        value={feedbackDraft.rating}
                        onChange={(e) => onFeedbackDraftChange({ rating: Number(e.target.value || 1) })}
                      />
                      <select
                        className={field}
                        aria-label="Feedback visibility"
                        value={feedbackDraft.visibility}
                        onChange={(e) => onFeedbackDraftChange({ visibility: e.target.value as "internal" | "candidate" })}
                      >
                        <option value="candidate">Visible to candidate</option>
                        <option value="internal">Internal only</option>
                      </select>
                      <Button type="button" size="sm" onClick={onSubmitFeedback} disabled={saving}>
                        Save feedback
                      </Button>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return node;
}
