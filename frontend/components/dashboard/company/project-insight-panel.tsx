"use client";

import type { ProjectExplanation } from "@/lib/ai-hiring";

type ProjectInsightPanelProps = {
  insights: ProjectExplanation[];
  confidenceWarning?: string | null;
};

export function ProjectInsightPanel({ insights, confidenceWarning }: ProjectInsightPanelProps) {
  return (
    <div className="space-y-3">
      {confidenceWarning ? (
        <div role="status" className="rounded-lg border border-[var(--ds-warning)]/40 bg-[var(--ds-warning-bg)] px-3.5 py-2.5 text-sm text-[var(--ds-warning)]">
          {confidenceWarning}
        </div>
      ) : null}

      {!insights.length ? (
        <div className="rounded-lg border border-dashed border-[var(--ds-border)] px-3.5 py-2.5 text-sm text-[var(--ds-muted)]">
          No verified project evidence available for explainable scoring yet.
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-primary-text)]">
            Why This Project Matters
          </p>
          {insights.map((insight, index) => (
            <div
              key={`${insight.whyItMatters}-${index}`}
              className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-card)] px-3.5 py-3"
            >
              <p className="line-clamp-1 text-sm font-medium text-[var(--ds-text)]">{insight.whyItMatters}</p>
              <ul className="mt-2 list-disc space-y-0.5 pl-4 text-sm text-[var(--ds-text-secondary)]">
                {insight.skillsDemonstrated.length > 0 ? (
                  <li className="line-clamp-1">
                    <span className="font-medium text-[var(--ds-text)]">Skills: </span>
                    {insight.skillsDemonstrated.join(", ")}
                  </li>
                ) : null}
                <li className="line-clamp-1">
                  <span className="font-medium text-[var(--ds-text)]">Complexity: </span>
                  {insight.complexityLevel}
                </li>
                {insight.notableFeatures.slice(0, 2).map((feature) => (
                  <li key={feature} className="line-clamp-1">
                    {feature}
                  </li>
                ))}
                <li className="line-clamp-1">{insight.scoreContribution}</li>
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
