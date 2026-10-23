"use client";

import { AptitudeAttemptChart } from "@/components/dashboard/intern/aptitude-attempt-chart";
import { APTITUDE_SECTIONS } from "@/lib/data/aptitude-tests";
import { AptitudeProgressCharts } from "@/components/dashboard/intern/aptitude-progress-charts";
import { buildProgressData, getAttemptHistory, getAptitudeHistory } from "@/lib/aptitude-progress";
import { formatDuration, type AptitudeTestResult } from "@/lib/aptitude-test-engine";
import { cn } from "@/lib/utils";

const READINESS_STYLES: Record<AptitudeTestResult["readinessLabel"], string> = {
  "Not Ready": "text-[var(--ds-danger)] bg-[var(--ds-danger-bg)]",
  "Needs Improvement": "text-[var(--ds-warning)] bg-[var(--ds-warning-bg)]",
  "Interview Ready (Moderate)": "text-[var(--ds-success)] bg-[var(--ds-success-bg)]",
  "Highly Interview Ready": "text-[var(--ds-primary-text)] bg-[var(--ds-info-bg)]"
};

const RISK_STYLES = {
  Low: "text-[var(--ds-success)] bg-[var(--ds-success-bg)]",
  Medium: "text-[var(--ds-warning)] bg-[var(--ds-warning-bg)]",
  High: "text-[var(--ds-danger)] bg-[var(--ds-danger-bg)]"
};

const FLAG_LABELS: Record<string, string> = {
  tab_switching: "Tab switches detected",
  focus_loss: "Window focus changes",
  inactivity: "Extended inactivity",
  copy_attempt: "Copy action in test area",
  fullscreen_exit: "Fullscreen was exited before submit"
};

type Props = {
  result: AptitudeTestResult;
  onBack: () => void;
  onRetake: () => void;
  canRetake?: boolean;
};

export function AptitudeResultView({ result, onBack, onRetake, canRetake = true }: Props) {
  const progressData = buildProgressData(getAptitudeHistory());
  const attemptHistory = getAttemptHistory(result.testId);
  const report = result.cheatingReport;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-[var(--ds-text)]">{result.testTitle} — Results</h3>
          <p className="mt-1 text-sm text-[var(--ds-muted)]">
            Attempt {result.attemptNumber ?? attemptHistory.length} · score · readiness · behavior summary
          </p>
          {result.autoSubmitted ? (
            <p className="mt-1 text-xs text-[var(--ds-warning)]">
              Auto-submitted when the session ended
              {report?.flags.includes("fullscreen_exit") ? " (fullscreen exit)" : ""}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--ds-muted)] hover:bg-[var(--ds-surface-hover)]"
          >
            All Sets
          </button>
          <button
            type="button"
            onClick={onRetake}
            disabled={!canRetake}
            className="rounded-lg bg-[var(--ds-text)] px-3 py-2 text-sm font-semibold text-[var(--ds-bg)] disabled:opacity-50"
          >
            {canRetake ? "Retake" : "No attempts left"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Score" value={`${result.totalScore}/${result.maxScore}`} />
        <StatCard label="Accuracy" value={`${result.accuracy}%`} />
        <StatCard label="Time Efficiency" value={`${result.timeEfficiency}%`} />
        <StatCard
          label="Time Used"
          value={formatDuration(result.timeSpentSeconds)}
          sub={`of ${formatDuration(result.timeAllowedSeconds)}`}
        />
      </div>

      <div className="rounded-xl border border-[var(--ds-border)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--ds-text)]">Interview Readiness Score</p>
            <p className="text-xs text-[var(--ds-muted)]">
              Performance 40% · Sections 20% · Difficulty 15% · Time 15% · Trend 10%
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums text-[var(--ds-text)]">{result.readinessScore}/100</p>
            <span
              className={cn(
                "mt-1 inline-block rounded px-2 py-0.5 text-[11px] font-semibold",
                READINESS_STYLES[result.readinessLabel]
              )}
            >
              {result.readinessLabel}
            </span>
          </div>
        </div>
      </div>

      {report ? (
        <Panel title="Session Behavior Summary">
          <p className="mb-3 text-xs text-[var(--ds-muted)]">
            Neutral activity log from your proctored session — not a judgment of intent.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Tab switches" value={String(report.behaviorLog.tabSwitchCount)} />
            <StatCard
              label="Time outside tab"
              value={formatDuration(report.behaviorLog.focusLossDurationSeconds)}
            />
            <div className="rounded-xl border border-[var(--ds-border)] px-4 py-3">
              <p className="text-xs text-[var(--ds-muted)]">Activity level</p>
              <p className="mt-1 text-lg font-semibold text-[var(--ds-text)]">
                {report.cheatingRiskLevel}
              </p>
              <span
                className={cn(
                  "mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-medium",
                  RISK_STYLES[report.cheatingRiskLevel]
                )}
              >
                Score {report.cheatingScore}/100
              </span>
            </div>
          </div>
          {report.flags.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-[var(--ds-text-secondary)]">
              {report.flags.map((flag) => (
                <li key={flag}>• {FLAG_LABELS[flag] ?? flag}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--ds-muted)]">No notable activity flags recorded.</p>
          )}
        </Panel>
      ) : null}

      {attemptHistory.length > 0 ? (
        <Panel title="Attempt Performance Trend">
          <AptitudeAttemptChart attempts={attemptHistory} maxScore={result.maxScore} />
        </Panel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Weak Areas">
          {result.weakAreas.length === 0 ? (
            <p className="text-sm text-[var(--ds-muted)]">No weak sections detected.</p>
          ) : (
            <ul className="space-y-2">
              {result.weakAreas.map((area) => (
                <li
                  key={area.section}
                  className="rounded-lg border border-[var(--ds-danger)] bg-[var(--ds-danger-bg)] px-3 py-2"
                >
                  <p className="text-sm font-medium text-[var(--ds-text)]">
                    {area.label} → Weak ({area.accuracy}% accuracy)
                  </p>
                  <p className="text-xs text-[var(--ds-muted)]">{area.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Strong Areas">
          {result.strongAreas.length === 0 ? (
            <p className="text-sm text-[var(--ds-muted)]">Build consistency to unlock strong sections.</p>
          ) : (
            <ul className="space-y-2">
              {result.strongAreas.map((area) => (
                <li
                  key={area.section}
                  className="rounded-lg border border-[var(--ds-success)] bg-[var(--ds-success-bg)] px-3 py-2"
                >
                  <p className="text-sm font-medium text-[var(--ds-text)]">
                    {area.label} → Strong ({area.accuracy}% accuracy)
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Section Breakdown">
        <div className="grid gap-2 sm:grid-cols-2">
          {APTITUDE_SECTIONS.map((section) => {
            const stat = result.sectionScores[section.key];
            return (
              <div key={section.key} className="rounded-lg border border-[var(--ds-border)] px-3 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[var(--ds-text)]">{section.shortLabel}</span>
                  <span className="tabular-nums text-[var(--ds-text-secondary)]">
                    {stat.score}/{stat.max}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--ds-muted)]">
                  {stat.accuracy}% acc · {formatDuration(stat.timeSpentSeconds)} used
                </p>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Personalized Insight">
        <p className="rounded-lg bg-[var(--ds-info-bg)] px-3 py-2 text-sm text-[var(--ds-info)]">
          <span className="font-semibold">Suggestion: </span>
          {result.personalizedInsight.suggestion}
        </p>
      </Panel>

      {progressData.length > 1 ? (
        <Panel title="Progress Over Time">
          <AptitudeProgressCharts data={progressData} />
        </Panel>
      ) : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--ds-border)] p-4">
      <h4 className="mb-3 text-sm font-semibold text-[var(--ds-text)]">{title}</h4>
      {children}
    </section>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--ds-border)] px-4 py-3">
      <p className="text-xs text-[var(--ds-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--ds-text)]">{value}</p>
      {sub ? <p className="text-[11px] text-[var(--ds-muted)]">{sub}</p> : null}
    </div>
  );
}
