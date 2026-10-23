"use client";

import { Clock, Lock, Play } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { APTITUDE_TEST_META } from "@/lib/data/aptitude-test-meta";
import {
  getAttemptCount,
  getBestScoreForTest,
  getRemainingAttempts,
  MAX_ATTEMPTS_PER_TEST
} from "@/lib/aptitude-progress";
import { cn } from "@/lib/utils";

type Props = {
  activeTestId: number | null;
  inExam: boolean;
  onStart: (testId: number) => void;
  canStart: (testId: number) => boolean;
  className?: string;
};

function SetCard({
  setId,
  title,
  durationMinutes,
  questionCount,
  active,
  attemptsUsed,
  locked,
  onAction
}: {
  setId: number;
  title: string;
  durationMinutes: number;
  questionCount: number;
  active: boolean;
  attemptsUsed: number;
  locked: boolean;
  onAction: () => void;
}) {
  const best = getBestScoreForTest(setId);

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 transition-colors",
        active
          ? "border-[var(--ds-primary)]/50 bg-[var(--ds-info-bg)]"
          : locked
            ? "border-[var(--ds-border)] bg-[var(--ds-surface)] opacity-75"
            : "border-[var(--ds-border)] bg-[var(--ds-card)]"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--ds-text)]">{title}</p>
        {best != null ? (
          <span className="text-[10px] tabular-nums text-[var(--ds-muted)]">Best {best}</span>
        ) : null}
      </div>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--ds-muted)]">
        <AppIcon icon={Clock} size="xs" />
        {durationMinutes} min · {questionCount} Q · Fullscreen
      </p>
      <p className="mt-1 text-[10px] text-[var(--ds-muted)]">
        {attemptsUsed}/{MAX_ATTEMPTS_PER_TEST} attempts used
      </p>
      <button
        type="button"
        onClick={onAction}
        disabled={locked}
        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--ds-primary)] px-2 py-1.5 text-xs font-semibold text-[var(--ds-on-primary)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {locked ? (
          <>
            <AppIcon icon={Lock} size="xs" />
            Locked
          </>
        ) : (
          <>
            <AppIcon icon={Play} size="xs" />
            {active ? "In progress" : "Start"}
          </>
        )}
      </button>
    </div>
  );
}

export function AptitudeTestNav({ activeTestId, inExam, onStart, canStart, className }: Props) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="mb-3 hidden text-[11px] font-semibold uppercase tracking-wider text-[var(--ds-muted)] lg:block">
        Test Sets
      </p>
      {APTITUDE_TEST_META.map((set) => {
        const active = activeTestId === set.id && inExam;
        const attemptsUsed = getAttemptCount(set.id);
        const locked = !canStart(set.id);

        const handleClick = () => {
          if (locked || inExam) return;
          onStart(set.id);
        };

        return (
          <SetCard
            key={set.id}
            setId={set.id}
            title={set.title}
            durationMinutes={set.durationMinutes}
            questionCount={set.questionCount}
            active={active}
            attemptsUsed={attemptsUsed}
            locked={locked}
            onAction={handleClick}
          />
        );
      })}
    </div>
  );
}

export function AptitudeTestNavDropdown({ activeTestId, inExam, onStart, canStart }: Props) {
  const value = activeTestId ?? "";

  return (
    <select
      className="ds-input ds-select w-full text-sm lg:hidden"
      value={value}
      disabled={inExam}
      onChange={(e) => {
        const id = Number(e.target.value);
        if (!id || !canStart(id) || inExam) return;
        onStart(id);
      }}
      aria-label="Select aptitude test set"
    >
      <option value="" disabled>
        Select a test set
      </option>
      {APTITUDE_TEST_META.map((set) => {
        const remaining = getRemainingAttempts(set.id);
        const locked = !canStart(set.id);
        return (
          <option key={set.id} value={set.id} disabled={locked}>
            {set.title} · {set.durationMinutes} min · {locked ? "Locked" : `${remaining} left`}
          </option>
        );
      })}
    </select>
  );
}
