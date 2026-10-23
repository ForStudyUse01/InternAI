"use client";

import type { CandidateEvaluation } from "@/lib/ai-hiring";
import { isRejectionLanguage, splitToSentences } from "@/lib/utils";

type HiringManagerInsightsPanelProps = {
  evaluation: CandidateEvaluation;
  className?: string;
};

export function HiringManagerInsightsPanel({ evaluation, className }: HiringManagerInsightsPanelProps) {
  const showRecommendationLevel = !isRejectionLanguage(evaluation.recommendationLevel);
  const reasoningPoints = splitToSentences(evaluation.reasoning).filter((sentence) => !isRejectionLanguage(sentence));

  return (
    <div className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-muted)]">
            Hiring Intelligence Breakdown
          </h3>
          <p className="mt-0.5 text-xs text-[var(--ds-muted)]">
            {evaluation.roleTemplateLabel} weight model · {evaluation.confidenceTier}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold leading-none text-[var(--ds-primary-text)]">
            {evaluation.overallScore}%
          </p>
          <p className="mt-1 text-xs text-[var(--ds-muted)]">
            Confidence {evaluation.confidenceScore}%
            {showRecommendationLevel ? ` · ${evaluation.recommendationLevel}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {evaluation.scoreBreakdown.map((item) => (
          <div
            key={item.factor}
            className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2.5"
          >
            <p className="line-clamp-1 text-[11px] font-medium uppercase tracking-wide text-[var(--ds-muted)]">
              {item.label}
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--ds-text)]">{item.rawScore}%</p>
            <p className="text-[11px] text-[var(--ds-muted)]">Weight {item.weight}%</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-[var(--ds-success)]/30 bg-[var(--ds-success-bg)] px-3.5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-success)]">
          Strengths
        </p>
        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-[var(--ds-text-secondary)]">
          {evaluation.strengths.map((item) => (
            <li key={item} className="line-clamp-1">
              {item}
            </li>
          ))}
        </ul>
      </div>

      {reasoningPoints.length > 0 ? (
        <div className="mt-3 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3.5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-muted)]">
            Top Contributors
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--ds-text)]">
            {evaluation.topContributors.join(" · ") || "Insufficient evidence"}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-[var(--ds-text-secondary)]">
            {reasoningPoints.map((sentence) => (
              <li key={sentence} className="line-clamp-2">
                {sentence}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
