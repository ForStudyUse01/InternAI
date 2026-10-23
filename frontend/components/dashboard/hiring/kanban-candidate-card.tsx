"use client";

import { memo } from "react";
import { Calendar, GripVertical, MessageSquare, ScrollText, UserRound, UserX } from "lucide-react";
import type { CompanyApplication } from "@/lib/company-portal";
import type { RankedCandidate } from "@/lib/ai-hiring";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { AppIcon } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";
import { CandidateCompareToggle } from "@/components/dashboard/company/candidate-compare-toggle";
import { INTERVIEW_STATUS_TONE, type HiringPipelineStageKey } from "@/components/dashboard/hiring/hiring-utils";
import { initialsFirstLast as initialsFor, gradientForName as gradientFor } from "@/components/dashboard/shared/avatar-initials";

type PriorityLevel = { label: string; tone: BadgeTone } | null;

/** Presentation-only banding of the existing AI evaluation score — no new scoring logic. */
export function priorityFromEvaluation(ranked?: RankedCandidate): PriorityLevel {
  if (!ranked) return null;
  const score = ranked.evaluation.overallScore;
  if (score >= 80) return { label: "High Priority", tone: "success" };
  if (score >= 60) return { label: "Medium", tone: "info" };
  return { label: "Low", tone: "neutral" };
}

function latestInterviewStatus(application: CompanyApplication) {
  const rounds = application.interviewRounds || [];
  if (rounds.length === 0) return null;
  const latest = [...rounds].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.interviewDate || 0).getTime();
    const bTime = new Date(b.updatedAt || b.interviewDate || 0).getTime();
    return bTime - aTime;
  })[0];
  return latest?.status || "scheduled";
}


type KanbanCandidateCardProps = {
  application: CompanyApplication;
  ranked?: RankedCandidate;
  selected: boolean;
  saving?: boolean;
  draggable?: boolean;
  stages: readonly { key: HiringPipelineStageKey; label: string }[];
  currentStage: HiringPipelineStageKey;
  onToggleSelect: (applicationId: string) => void;
  onDragStart: (event: React.DragEvent, applicationId: string) => void;
  onOpenProfile: (applicationId: string) => void;
  onViewResume: (applicationId: string) => void;
  onMessage: (applicationId: string) => void;
  onScheduleInterview: (applicationId: string, candidateName: string) => void;
  onShortlist: (applicationId: string) => void;
  onReject: (applicationId: string) => void;
  onMoveToStage: (applicationId: string, stage: HiringPipelineStageKey) => void;
};

function KanbanCandidateCardImpl({
  application,
  ranked,
  selected,
  saving = false,
  draggable = true,
  stages,
  currentStage,
  onToggleSelect,
  onDragStart,
  onOpenProfile,
  onViewResume,
  onMessage,
  onScheduleInterview,
  onShortlist,
  onReject,
  onMoveToStage
}: KanbanCandidateCardProps) {
  const name = application.intern?.fullName || "Candidate";
  const role = application.internship?.role || "Role";
  const atsScore = application.intern?.resume?.analysis?.categoryScores?.ats;
  const resumeScore = application.intern?.resume?.score;
  const aiMatch = ranked?.evaluation.overallScore;
  const experience = (application.intern?.experience || [])[0];
  const skills = (application.intern?.skills || []).slice(0, 3);
  const appliedDate = application.createdAt ? new Date(application.createdAt).toLocaleDateString() : null;
  const interviewStatus = latestInterviewStatus(application);
  const priority = priorityFromEvaluation(ranked);
  const gradient = gradientFor(name);

  return (
    <article
      draggable={draggable && !saving}
      onDragStart={(event) => onDragStart(event, application._id)}
      aria-label={`${name}, ${role}`}
      className={cn(
        "company-dashboard-item-card group !p-3 transition",
        draggable && !saving && "cursor-grab active:cursor-grabbing",
        selected && "ring-2 ring-[var(--ds-accent)]",
        saving && "opacity-60"
      )}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={selected}
          disabled={saving}
          onChange={() => onToggleSelect(application._id)}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Select ${name} for bulk actions`}
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[var(--ds-accent)]"
        />
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
          onClick={() => onOpenProfile(application._id)}
        >
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-[var(--ds-on-primary)]",
              gradient
            )}
          >
            {initialsFor(name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-[var(--ds-text)]">{name}</span>
            <span className="block truncate text-xs text-[var(--ds-muted)]">{role}</span>
          </span>
        </button>
        <AppIcon
          icon={GripVertical}
          size="xs"
          className="mt-1 shrink-0 text-[var(--ds-muted)] opacity-0 transition group-hover:opacity-70"
        />
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center">
        <ScoreMini label="ATS" value={typeof atsScore === "number" ? atsScore : null} />
        <ScoreMini label="Resume" value={typeof resumeScore === "number" && resumeScore > 0 ? resumeScore : null} />
        <ScoreMini label="AI" value={typeof aiMatch === "number" ? aiMatch : null} accent />
      </div>

      {skills.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {skills.map((skill) => (
            <span key={`${application._id}-${skill}`} className="rounded bg-[var(--ds-surface-hover)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ds-muted)]">
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      {experience ? <p className="mt-1.5 truncate text-[11px] text-[var(--ds-muted)]">{experience}</p> : null}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {priority ? (
          <Badge tone={priority.tone} className="!px-1.5 !py-0.5 !text-[10px]">
            {priority.label}
          </Badge>
        ) : null}
        {interviewStatus ? (
          <Badge tone={INTERVIEW_STATUS_TONE[interviewStatus] || "neutral"} className="capitalize !px-1.5 !py-0.5 !text-[10px]">
            {interviewStatus.replace(/_/g, " ")}
          </Badge>
        ) : null}
        {appliedDate ? <span className="text-[10px] text-[var(--ds-muted)]">{appliedDate}</span> : null}
      </div>

      <div className="mt-2.5 flex items-center gap-0.5 border-t border-[var(--ds-border)] pt-2">
        <CardIconAction icon={ScrollText} label={`View ${name}'s resume`} disabled={saving} onClick={() => onViewResume(application._id)} />
        <CardIconAction icon={UserRound} label={`Open ${name}'s profile`} disabled={saving} onClick={() => onOpenProfile(application._id)} />
        <CardIconAction icon={MessageSquare} label={`Message ${name}`} disabled={saving} onClick={() => onMessage(application._id)} />
        <CardIconAction
          icon={Calendar}
          label={`Schedule interview with ${name}`}
          disabled={saving}
          onClick={() => onScheduleInterview(application._id, name)}
        />
        <CardIconAction icon={UserX} label={`Reject ${name}`} danger disabled={saving} onClick={() => onReject(application._id)} />
        <div className="ml-auto flex items-center gap-1">
          <CandidateCompareToggle applicationId={application._id} />
          <select
            aria-label={`Move ${name} to stage`}
            value={currentStage}
            disabled={saving}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => onMoveToStage(application._id, event.target.value as HiringPipelineStageKey)}
            className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-surface)] px-1.5 py-1 text-[11px] font-semibold text-[var(--ds-text)] transition hover:border-[var(--ds-border-strong)] disabled:opacity-50"
          >
            {stages.map((stage) => (
              <option key={stage.key} value={stage.key}>
                {stage.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={saving}
            onClick={() => onShortlist(application._id)}
            className="rounded-md border border-[var(--ds-border)] px-2 py-1 text-[11px] font-semibold text-[var(--ds-text)] transition hover:border-[var(--ds-border-strong)] hover:bg-[var(--ds-surface-raised)] disabled:opacity-50"
          >
            Shortlist
          </button>
        </div>
      </div>
    </article>
  );
}

/**
 * Custom comparator skips the callback props: the parent (HiringPipelineKanban)
 * recreates them each render, but they're behaviorally interchangeable closures.
 * Comparing only the data props lets cards skip re-rendering during drag-over,
 * where board-wide state changes on every dragover/dragleave event.
 */
export const KanbanCandidateCard = memo(KanbanCandidateCardImpl, (prev, next) => {
  return (
    prev.application === next.application &&
    prev.ranked === next.ranked &&
    prev.selected === next.selected &&
    prev.saving === next.saving &&
    prev.draggable === next.draggable &&
    prev.currentStage === next.currentStage &&
    prev.stages === next.stages
  );
});

function ScoreMini({ label, value, accent = false }: { label: string; value: number | null; accent?: boolean }) {
  return (
    <div className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-surface)] px-1 py-1">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--ds-muted)]">{label}</p>
      <p className={cn("text-xs font-bold tabular-nums", accent ? "text-[var(--ds-accent)]" : "text-[var(--ds-text)]")}>
        {typeof value === "number" ? `${Math.round(value)}%` : "—"}
      </p>
    </div>
  );
}

function CardIconAction({
  icon,
  label,
  onClick,
  disabled = false,
  danger = false
}: {
  icon: typeof Calendar;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md transition hover:bg-[var(--ds-surface-raised)] disabled:opacity-50",
        danger ? "text-[var(--ds-danger)]" : "text-[var(--ds-muted)] hover:text-[var(--ds-text)]"
      )}
    >
      <AppIcon icon={icon} size="xs" className="text-current" />
    </button>
  );
}
