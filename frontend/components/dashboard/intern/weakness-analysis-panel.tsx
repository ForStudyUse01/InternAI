"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCcw, ShieldCheck, Target, TrendingUp } from "lucide-react";
import { SectionPanel } from "@/components/dashboard/shared/section-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppIcon } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";
import type { InternProfile } from "@/lib/intern-portal";
import {
  analyzeInternshipWeaknesses,
  type Weakness,
  type WeaknessInternshipOption,
  type WeaknessPriority
} from "@/lib/intern-weakness-analysis";

type Props = {
  profile: InternProfile | null;
  options: WeaknessInternshipOption[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

const PRIORITY_BADGE: Record<WeaknessPriority, string> = {
  High: "border-[var(--ds-danger)]/30 bg-[var(--ds-danger-bg)] text-[var(--ds-danger)]",
  Medium: "border-[var(--ds-warning)]/30 bg-[var(--ds-warning-bg)] text-[var(--ds-warning)]",
  Low: "border-[var(--ds-info)]/30 bg-[var(--ds-info-bg)] text-[var(--ds-info)]"
};

const PRIORITY_BAR: Record<WeaknessPriority, string> = {
  High: "bg-[var(--ds-danger)]",
  Medium: "bg-[var(--ds-warning)]",
  Low: "bg-[var(--ds-info)]"
};

const PRIORITY_DOT: Record<WeaknessPriority, string> = {
  High: "bg-[var(--ds-danger)]",
  Medium: "bg-[var(--ds-warning)]",
  Low: "bg-[var(--ds-info)]"
};

function readinessTone(score: number): string {
  if (score >= 75) return "from-[var(--ds-success)] to-[var(--ds-success)]";
  if (score >= 50) return "from-[var(--ds-warning)] to-[var(--ds-warning)]";
  return "from-[var(--ds-danger)] to-[var(--ds-danger)]";
}

function MetricTile({
  icon,
  label,
  value,
  hint
}: {
  icon: typeof Target;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="surface-subtle flex items-start gap-3 px-4 py-3">
      <AppIcon icon={icon} className="mt-0.5 text-[var(--ds-primary-text)]" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">{label}</p>
        <p className="mt-1 text-base font-semibold text-[var(--ds-text)]">{value}</p>
        {hint ? <p className="mt-0.5 text-[11px] text-[var(--ds-muted)]">{hint}</p> : null}
      </div>
    </div>
  );
}

function WeaknessCard({ weakness }: { weakness: Weakness }) {
  return (
    <article className="group flex flex-col rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-card)] p-5 shadow-[0_2px_12px_-4px_var(--ds-shadow)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--ds-border-strong)] hover:shadow-[0_8px_24px_-8px_var(--ds-shadow)]">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--ds-surface-raised)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-text-secondary)]">
          <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[weakness.priority])} />
          {weakness.category}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
            PRIORITY_BADGE[weakness.priority]
          )}
        >
          {weakness.priority}
        </span>
      </div>

      <h4 className="mt-3 flex items-start gap-1.5 text-base font-semibold leading-snug text-[var(--ds-text)]">
        <span aria-hidden className="mt-0.5 shrink-0 text-[var(--ds-danger)]">
          ✕
        </span>
        <span className="min-w-0">{weakness.title}</span>
      </h4>

      <p className="mt-2 text-sm leading-relaxed text-[var(--ds-text-secondary)]">{weakness.explanation}</p>

      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-muted)]">Why it matters</dt>
          <dd className="mt-0.5 text-[var(--ds-text-secondary)]">{weakness.whyItMatters}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-success)]">Suggestion</dt>
          <dd className="mt-0.5 font-medium text-[var(--ds-text)]">{weakness.suggestion}</dd>
        </div>
      </dl>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-medium text-[var(--ds-muted)]">
          <span>Severity</span>
          <span className="tabular-nums">{weakness.severity}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--ds-surface-raised)]">
          <div
            className={cn("h-full rounded-full transition-all duration-700 ease-out", PRIORITY_BAR[weakness.priority])}
            style={{ width: `${weakness.severity}%` }}
          />
        </div>
      </div>
    </article>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-52 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function WeaknessAnalysisPanel({ profile, options, loading = false, error = null, onRetry }: Props) {
  const [selectedId, setSelectedId] = useState<string>("");

  // Keep the selection valid as options load/change; default to the first role.
  useEffect(() => {
    if (options.length === 0) {
      if (selectedId) setSelectedId("");
      return;
    }
    if (!options.some((o) => o.id === selectedId)) {
      setSelectedId(options[0].id);
    }
  }, [options, selectedId]);

  const selectedOption = useMemo(
    () => options.find((o) => o.id === selectedId) || null,
    [options, selectedId]
  );

  // Pure derivation keyed on the selected internship — recomputes instantly on
  // change, so results are always specific to the chosen role (never stale).
  const analysis = useMemo(
    () => analyzeInternshipWeaknesses(profile, selectedOption),
    [profile, selectedOption]
  );

  const selector =
    options.length > 0 && !error ? (
      <select
        aria-label="Select internship position"
        className="ds-input ds-select h-10 max-w-[16rem] text-sm"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.role} · {option.company}
            {option.source === "applied" ? " (Applied)" : ""}
          </option>
        ))}
      </select>
    ) : undefined;

  return (
    <SectionPanel
      id="dashboard-weakness-analysis"
      title="Weakness Analysis"
      subtitle="Personalised, internship-specific gaps and how to close them."
      titleIcon={Target}
    >
      <div className="space-y-5">
        {selector ? <div className="flex flex-wrap items-center justify-end gap-2">{selector}</div> : null}

        {loading ? (
          <PanelSkeleton />
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-[var(--ds-danger)]/30 bg-[var(--ds-danger-bg)] px-6 py-10 text-center">
            <AppIcon icon={AlertTriangle} size="md" className="mx-auto text-[var(--ds-danger)]" />
            <p className="mt-4 text-base font-semibold text-[var(--ds-text)]">
              Couldn&apos;t load weakness analysis
            </p>
            <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">{error}</p>
            {onRetry ? (
              <Button type="button" size="sm" variant="secondary" className="mt-4 gap-2" onClick={onRetry}>
                <AppIcon icon={RefreshCcw} size="xs" className="text-current" />
                Retry
              </Button>
            ) : null}
          </div>
        ) : options.length === 0 || !analysis ? (
          <div className="rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface-raised)] px-6 py-12 text-center">
            <AppIcon icon={Target} size="md" className="mx-auto text-[var(--ds-primary-text)]" />
            <p className="mt-4 text-base font-semibold text-[var(--ds-text)]">No internship selected yet</p>
            <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">
              Apply to internships or explore recommendations to see role-specific weaknesses.
            </p>
            <Button href="/dashboard/intern/internships/search" type="button" size="sm" variant="secondary" className="mt-4">
              Browse Internships
            </Button>
          </div>
        ) : (
          <>
            {/* Summary strip */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricTile
                icon={Target}
                label="Skill Match"
                value={`${analysis.matchPercent}%`}
                hint={`${analysis.role}`}
              />
              <MetricTile
                icon={AlertTriangle}
                label="Missing Skills"
                value={String(analysis.missingSkillCount)}
                hint="Required + preferred"
              />
              <MetricTile
                icon={ShieldCheck}
                label="Weaknesses"
                value={String(analysis.weaknesses.length)}
                hint={`${analysis.byPriority.High} high · ${analysis.byPriority.Medium} med · ${analysis.byPriority.Low} low`}
              />
              <MetricTile
                icon={TrendingUp}
                label="Improvement Room"
                value={`${analysis.improvementPotential}%`}
                hint={`Readiness ${analysis.readinessScore}%`}
              />
            </div>

            {/* Readiness progress bar */}
            <div className="rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-card)] px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-[var(--ds-text)]">Readiness for this role</span>
                <span className="font-semibold tabular-nums text-[var(--ds-text)]">
                  {analysis.readinessScore}%
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--ds-surface-raised)]">
                <div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
                    readinessTone(analysis.readinessScore)
                  )}
                  style={{ width: `${analysis.readinessScore}%` }}
                />
              </div>
            </div>

            {/* Weakness cards */}
            {analysis.weaknesses.length === 0 ? (
              <div className="rounded-2xl border border-[var(--ds-success)] bg-[var(--ds-success-bg)] px-6 py-12 text-center">
                <AppIcon icon={ShieldCheck} size="md" className="mx-auto text-[var(--ds-success)]" />
                <p className="mt-4 text-base font-semibold text-[var(--ds-text)]">
                  You&apos;re strongly aligned with this role
                </p>
                <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">
                  No significant weaknesses detected. Keep your profile and projects up to date.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {analysis.weaknesses.map((weakness) => (
                  <WeaknessCard key={weakness.id} weakness={weakness} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </SectionPanel>
  );
}
