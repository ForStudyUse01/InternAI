"use client";

import type { CandidateEvaluation, MatchExplanation } from "@/lib/ai-hiring";
import { HiringManagerInsightsPanel } from "./hiring-manager-insights-panel";
import { ProjectInsightPanel } from "./project-insight-panel";

type AiMatchInsightPanelProps = {
  explanation: MatchExplanation;
  evaluation?: CandidateEvaluation;
};

export function AiMatchInsightPanel({ explanation, evaluation }: AiMatchInsightPanelProps) {
  if (!explanation.sufficient) {
    return (
      <div role="status" className="rounded-lg border border-[var(--ds-warning)]/40 bg-[var(--ds-warning-bg)] px-3.5 py-2.5 text-sm text-[var(--ds-warning)]">
        Insufficient data for AI analysis.
      </div>
    );
  }

  const ranking = explanation.rankingExplanation;

  // When a full evaluation is available, HiringManagerInsightsPanel already covers
  // score breakdown, strengths, top contributors, and reasoning — so this panel only
  // adds the facts it doesn't duplicate (project relevance + experience, condensed).
  const experienceMatchLine =
    explanation.experienceMatch && explanation.experienceMatch !== explanation.overallReasoning
      ? explanation.experienceMatch
      : null;

  // Skip the project-relevance bullet when it's just restating the confidence warning
  // banner that ProjectInsightPanel already renders below.
  const projectRelevanceLine =
    explanation.projectRelevance && explanation.projectRelevance !== explanation.projectConfidenceWarning
      ? explanation.projectRelevance
      : null;

  return (
    <div className="space-y-4 text-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-primary-text)]">
        Why This Candidate Was Ranked
      </h3>

      {evaluation ? <HiringManagerInsightsPanel evaluation={evaluation} /> : null}

      {!evaluation ? (
        <div className="space-y-3">
          {ranking?.scoreBreakdown?.length ? (
            <p className="text-[var(--ds-muted)]">
              Rank #{ranking.rankedPosition} · Overall {ranking.overallScore}/100 · Confidence {ranking.confidenceScore}
              /100
            </p>
          ) : null}

          <div className="rounded-lg border border-[var(--ds-success)]/30 bg-[var(--ds-success-bg)] px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-success)]">
              Strengths
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[var(--ds-text-secondary)]">
              {(ranking?.strengths || explanation.skillAlignment).map((item) => (
                <li key={item} className="line-clamp-1">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {ranking?.topContributors?.length ? (
            <p className="text-[var(--ds-text-secondary)]">
              <span className="font-medium text-[var(--ds-text)]">Top contributors: </span>
              {ranking.topContributors.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {projectRelevanceLine || experienceMatchLine ? (
        <div className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3.5 py-3">
          <ul className="list-disc space-y-1 pl-4 text-[var(--ds-text-secondary)]">
            {projectRelevanceLine ? (
              <li className="line-clamp-2">
                <span className="font-medium text-[var(--ds-text)]">Project relevance: </span>
                {projectRelevanceLine}
              </li>
            ) : null}
            {experienceMatchLine ? (
              <li className="line-clamp-2">
                <span className="font-medium text-[var(--ds-text)]">Experience match: </span>
                {experienceMatchLine}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <ProjectInsightPanel insights={explanation.projectInsights} confidenceWarning={explanation.projectConfidenceWarning} />
    </div>
  );
}
