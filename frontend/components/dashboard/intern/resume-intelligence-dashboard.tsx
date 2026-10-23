"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  TrendingUp
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { SkillGapAnalysisPanel } from "@/components/dashboard/intern/skill-gap-analysis-panel";
import { AppIcon } from "@/components/icons/app-icon";
import type { InternProfile, InternshipListing, ResumeAnalysis } from "@/lib/intern-portal";
import { cn } from "@/lib/utils";

type Props = {
  profile: InternProfile | null;
  analysis: ResumeAnalysis | null | undefined;
  onTargetRoleChange?: (roleKey: string) => void;
  loadingRole?: boolean;
  internship?: InternshipListing | null;
};

const cardBase =
  "rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-card)] shadow-[0_1px_2px_var(--ds-shadow)] transition-all duration-300";

const cardHover =
  "hover:-translate-y-0.5 hover:border-[var(--ds-border-strong)] hover:shadow-[0_18px_40px_-20px_var(--ds-shadow)]";

function scoreBand(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Good";
  if (score >= 40) return "Developing";
  return "Needs work";
}

function ScoreRing({ value, size = 168, stroke = 12 }: { value: number; size?: number; stroke?: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id="score-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ds-gradient-from)" />
            <stop offset="100%" stopColor="var(--ds-gradient-to)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-[var(--ds-border)]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="url(#score-ring-gradient)"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black tracking-tight text-[var(--ds-text)] tabular-nums">{clamped}</span>
        <span className="text-xs font-medium text-[var(--ds-muted)]">/ 100</span>
      </div>
    </div>
  );
}

function InsightPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] px-4 py-3">
      <span className="text-lg font-bold tabular-nums text-[var(--ds-text)]">{Math.round(value)}</span>
      <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--ds-text-secondary)]">{label}</span>
    </div>
  );
}

function MetricBar({ label, score }: { label: string; score: number }) {
  const width = Math.max(2, Math.min(100, Math.round(score)));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-[var(--ds-text-secondary)]">{label}</span>
        <span className="font-semibold tabular-nums text-[var(--ds-text)]">{Math.round(score)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ds-surface)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--ds-gradient-from)] to-[var(--ds-gradient-to)]"
          style={{ width: `${width}%`, transition: "width 800ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </div>
    </div>
  );
}

function InsightCard({
  title,
  icon,
  items,
  accent
}: {
  title: string;
  icon: LucideIcon;
  items: string[];
  accent: "emerald" | "sky" | "rose";
}) {
  if (!items.length) return null;
  const accents = {
    emerald: "text-[var(--ds-success)]",
    sky: "text-[var(--ds-info)]",
    rose: "text-[var(--ds-danger)]"
  };
  const dot = {
    emerald: "bg-[var(--ds-success)]",
    sky: "bg-[var(--ds-info)]",
    rose: "bg-[var(--ds-danger)]"
  };
  return (
    <div className={cn(cardBase, cardHover, "p-6")}>
      <div className="mb-4 flex items-center gap-2">
        <AppIcon icon={icon} size="sm" className={accents[accent]} />
        <h3 className="text-sm font-semibold text-[var(--ds-text)]">{title}</h3>
      </div>
      <ul className="space-y-2.5">
        {items.slice(0, 5).map((item, idx) => (
          <li key={`${title}-${idx}`} className="flex gap-2.5 text-sm leading-relaxed text-[var(--ds-text-secondary)]">
            <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", dot[accent])} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ResumeIntelligenceDashboard({ profile, analysis, onTargetRoleChange, loadingRole, internship }: Props) {
  const [targetRole, setTargetRole] = useState(
    analysis?.skillIntelligence?.targetRoleKey || "full_stack_developer"
  );

  const composite = analysis?.compositeScores;
  const overall = composite?.overall ?? analysis?.overallScore ?? profile?.resume?.score ?? 0;

  const breakdown = useMemo(
    () =>
      [
        { label: "ATS Compatibility", score: composite?.ats ?? analysis?.categoryScores?.ats ?? 0 },
        { label: "Technical Strength", score: composite?.technicalStrength ?? 0 },
        { label: "Project Strength", score: composite?.projectStrength ?? 0 },
        { label: "Skill Strength", score: composite?.skillStrength ?? 0 },
        { label: "Recruiter Readiness", score: composite?.recruiterReadiness ?? 0 },
        { label: "Profile Completeness", score: composite?.profileCompleteness ?? 0 }
      ].filter((row) => row.score > 0),
    [composite, analysis?.categoryScores?.ats]
  );

  if (!profile?.resumeUploaded) {
    return (
      <div className={cn(cardBase, "px-6 py-12 text-center")}>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)]">
          <AppIcon icon={Sparkles} size="md" className="text-[var(--ds-primary-text)]" />
        </span>
        <p className="mt-4 text-sm text-[var(--ds-text-secondary)]">
          Upload your resume to unlock AI-powered resume intelligence and skill gap analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight text-[var(--ds-text)]">Resume Intelligence</h2>
        <p className="mt-0.5 text-sm text-[var(--ds-text-secondary)]">
          ATS-weighted analysis · {analysis?.intelligenceVersion === "v2" ? "Structured engine active" : "Refresh score for V2"}
        </p>
      </div>

      {/* Resume Score — centered hero */}
      <ScrollReveal variant="soft-scale" distance={12}>
        <div className={cn(cardBase, "px-6 py-10 sm:px-10")}>
          <div className="flex flex-col items-center text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ds-muted)]">
              Your Resume Score
            </p>
            <div className="mt-6">
              <ScoreRing value={overall} />
            </div>
            <p className="mt-5 text-sm font-medium text-[var(--ds-text-secondary)]">
              {scoreBand(overall)} — overall resume strength for your target role
            </p>

            <div className="mt-8 grid w-full max-w-md grid-cols-3 gap-3">
              <InsightPill label="ATS" value={composite?.ats ?? analysis?.categoryScores?.ats ?? 0} />
              <InsightPill label="Technical" value={composite?.technicalStrength ?? 0} />
              <InsightPill label="Recruiter" value={composite?.recruiterReadiness ?? 0} />
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Score breakdown + insights */}
      {(breakdown.length > 0 || (analysis?.strengths?.length ?? 0) > 0) && (
        <ScrollReveal variant="fade-up" distance={14}>
          <div className="grid gap-5 lg:grid-cols-2">
            {breakdown.length > 0 && (
              <div className={cn(cardBase, cardHover, "p-6")}>
                <div className="mb-5 flex items-center gap-2">
                  <AppIcon icon={TrendingUp} size="sm" className="text-[var(--ds-primary-text)]" />
                  <h3 className="text-sm font-semibold text-[var(--ds-text)]">Score Breakdown</h3>
                </div>
                <div className="space-y-4">
                  {breakdown.map((row) => (
                    <MetricBar key={row.label} label={row.label} score={row.score} />
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-5">
              <InsightCard title="Strengths" icon={CheckCircle2} items={analysis?.strengths || []} accent="emerald" />
              <InsightCard title="Recommendations" icon={Lightbulb} items={analysis?.improvements || []} accent="sky" />
              <InsightCard title="Critical Issues" icon={AlertTriangle} items={analysis?.criticalIssues || []} accent="rose" />
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* Explainable score trace — every deduction/bonus is a direct result of a dimension's weight * score, never an invented number */}
      {analysis?.scoreExplanation && (analysis.scoreExplanation.deductions.length > 0 || analysis.scoreExplanation.bonuses.length > 0) && (
        <ScrollReveal variant="fade-up" distance={14}>
          <div className={cn(cardBase, cardHover, "p-6")}>
            <h3 className="mb-4 text-sm font-semibold text-[var(--ds-text)]">Why this score?</h3>
            <ul className="space-y-2.5">
              {analysis.scoreExplanation.bonuses.map((b, idx) => (
                <li key={`bonus-${idx}`} className="flex gap-2.5 text-sm leading-relaxed text-[var(--ds-success)]">
                  <span className="mt-0.5 shrink-0 font-mono font-semibold tabular-nums">+{b.points}</span>
                  <span>
                    <span className="font-medium">{b.dimension}:</span> {b.reason}
                  </span>
                </li>
              ))}
              {analysis.scoreExplanation.deductions.map((d, idx) => (
                <li key={`deduction-${idx}`} className="flex gap-2.5 text-sm leading-relaxed text-[var(--ds-danger)]">
                  <span className="mt-0.5 shrink-0 font-mono font-semibold tabular-nums">{d.points}</span>
                  <span>
                    <span className="font-medium">{d.dimension}:</span> {d.reason}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </ScrollReveal>
      )}

      {/* Skill Gap Analysis */}
      <ScrollReveal variant="fade-up" distance={14}>
        <SkillGapAnalysisPanel
          profile={profile}
          analysis={analysis}
          targetRoleKey={targetRole}
          loadingRole={loadingRole}
          showRoleSelector={false}
          internship={internship}
          onTargetRoleChange={(roleKey) => {
            setTargetRole(roleKey);
            onTargetRoleChange?.(roleKey);
          }}
        />
      </ScrollReveal>

      {analysis?.quality && !analysis.quality.isReliable && (() => {
        const raw = analysis.confidence ?? analysis.quality?.confidence;
        const confidencePct =
          typeof raw === "number" && Number.isFinite(raw)
            ? Math.round(raw * (raw <= 1 ? 100 : 1))
            : typeof analysis.aiValidation?.confidenceScore === "number"
              ? Math.round(analysis.aiValidation.confidenceScore)
              : null;
        if (confidencePct == null) return null;
        return (
        <div className="rounded-2xl border border-[var(--ds-warning)] bg-[var(--ds-warning-bg)] px-5 py-4 text-xs text-[var(--ds-warning)]">
          <p className="font-semibold">Analysis confidence: {confidencePct}%</p>
          <p className="mt-1">Improve extraction quality: {(analysis.quality.issues || []).join(" ")}</p>
        </div>
        );
      })()}
    </div>
  );
}
