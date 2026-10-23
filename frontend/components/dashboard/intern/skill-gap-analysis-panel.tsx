"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { AppIcon } from "@/components/icons/app-icon";
import { TARGET_ROLE_OPTIONS } from "@/lib/data/role-skill-profiles";
import { runSkillGapPipeline } from "@/lib/ai-platform/orchestrator";
import {
  type ProgressBarItem,
  type QuickWinEffort,
  type QuickWinImpact,
  type QuickWinItem,
  type RequirementCheck,
  type SkillPriority,
  type SkillVisualStatus
} from "@/lib/skill-gap-engine";
import type { InternProfile, InternshipListing, ResumeAnalysis } from "@/lib/intern-portal";
import { cn } from "@/lib/utils";

type Props = {
  profile: InternProfile | null;
  analysis?: ResumeAnalysis | null | undefined;
  targetRoleKey?: string;
  onTargetRoleChange?: (roleKey: string) => void;
  loadingRole?: boolean;
  showRoleSelector?: boolean;
  /** When provided, the panel compares the student against this real internship posting instead of a generic role preset. */
  internship?: InternshipListing | null;
};

const card =
  "rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-card)] shadow-[0_8px_32px_-12px_var(--ds-shadow)] backdrop-blur-sm transition-shadow duration-300";

const skillCard =
  "group rounded-xl border border-[var(--ds-border)] bg-[var(--ds-card)] p-5 shadow-[0_2px_12px_-4px_var(--ds-shadow)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--ds-border-strong)] hover:shadow-[0_8px_24px_-8px_var(--ds-shadow)]";

const STATUS_DOT: Record<SkillVisualStatus, string> = {
  strong: "bg-[var(--ds-success)]",
  partial: "bg-[var(--ds-warning)]",
  missing: "bg-[var(--ds-danger)]"
};

const STATUS_LABEL: Record<SkillVisualStatus, string> = {
  strong: "Present",
  partial: "Partial evidence",
  missing: "Missing"
};

const STATUS_BADGE: Record<SkillVisualStatus, string> = {
  strong: "border-[var(--ds-success)] bg-[var(--ds-success-bg)] text-[var(--ds-success)]",
  partial: "border-[var(--ds-warning)] bg-[var(--ds-warning-bg)] text-[var(--ds-warning)]",
  missing: "border-[var(--ds-danger)] bg-[var(--ds-danger-bg)] text-[var(--ds-danger)]"
};

const SELF_REPORTED_LABEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert"
};

const INSUFFICIENT_MSG = "Insufficient data for analysis";

const REQUIREMENT_STATUS_BADGE: Record<RequirementCheck["status"], string> = {
  match: "border-[var(--ds-success)] bg-[var(--ds-success-bg)] text-[var(--ds-success)]",
  mismatch: "border-[var(--ds-danger)] bg-[var(--ds-danger-bg)] text-[var(--ds-danger)]",
  not_stated: "border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text-secondary)]",
  unknown: "border-[var(--ds-warning)] bg-[var(--ds-warning-bg)] text-[var(--ds-warning)]"
};

const REQUIREMENT_STATUS_LABEL: Record<RequirementCheck["status"], string> = {
  match: "Matches",
  mismatch: "Mismatch",
  not_stated: "Not required",
  unknown: "Unknown"
};

function RequirementCheckCard({ title, check }: { title: string; check: RequirementCheck }) {
  return (
    <article className={skillCard}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-[var(--ds-text)]">{title}</h4>
        <span className={cn("shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", REQUIREMENT_STATUS_BADGE[check.status])}>
          {REQUIREMENT_STATUS_LABEL[check.status]}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-[var(--ds-text-secondary)]">{check.explanation}</p>
    </article>
  );
}

const PRIORITY_BADGE: Record<SkillPriority, string> = {
  High: "border-[var(--ds-danger)] bg-[var(--ds-danger-bg)] text-[var(--ds-danger)]",
  Medium: "border-[var(--ds-warning)] bg-[var(--ds-warning-bg)] text-[var(--ds-warning)]",
  Low: "border-[var(--ds-info)] bg-[var(--ds-info-bg)] text-[var(--ds-info)]"
};

function roleInsight(match: number, roleLabel: string): string {
  if (match >= 85) return `You are job-ready for ${roleLabel} roles.`;
  if (match >= 70) return `You are close to job-ready for ${roleLabel}.`;
  if (match >= 50) return `A few focused improvements will strengthen your ${roleLabel} fit.`;
  return `Build core skills to move closer to ${roleLabel} roles.`;
}

function MatchProgressRing({ percent, showRange, low, high }: { percent: number; showRange: boolean; low: number; high: number }) {
  const [animated, setAnimated] = useState(0);
  const display = showRange ? Math.round((low + high) / 2) : percent;
  const size = 148;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimated(display));
    return () => cancelAnimationFrame(t);
  }, [display]);

  const offset = circumference - (animated / 100) * circumference;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-[var(--ds-border)]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#matchGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="matchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ds-primary)" />
            <stop offset="50%" stopColor="var(--ds-success)" />
            <stop offset="100%" stopColor="var(--ds-accent)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="bg-gradient-to-br from-[var(--ds-primary)] via-[var(--ds-success)] to-[var(--ds-accent)] bg-clip-text text-3xl font-bold tabular-nums tracking-tight text-transparent">
          {showRange ? `${low}–${high}` : display}
          <span className="text-lg font-semibold text-[var(--ds-muted)]">%</span>
        </span>
        <span className="mt-0.5 text-xs font-medium uppercase tracking-wider text-[var(--ds-muted)]">
          Match
        </span>
      </div>
    </div>
  );
}

function SkillCard({ item }: { item: ProgressBarItem }) {
  const selfReportedLabel = item.selfReportedLevel ? SELF_REPORTED_LABEL[item.selfReportedLevel] : null;

  return (
    <article className={skillCard}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[item.status])} />
            <h4 className="truncate text-base font-semibold text-[var(--ds-text)]">
              {item.displayName}
            </h4>
          </div>
          <p className="mt-1 text-xs capitalize text-[var(--ds-text-secondary)]">{item.tier} skill</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
            STATUS_BADGE[item.status]
          )}
        >
          {STATUS_LABEL[item.status]}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-[var(--ds-text-secondary)]">{item.tooltip}</p>

      {selfReportedLabel && (
        <p className="mt-2 text-xs font-medium text-[var(--ds-text-secondary)]">
          You rated yourself: <span className="text-[var(--ds-text)]">{selfReportedLabel}</span>
        </p>
      )}
    </article>
  );
}

const IMPACT_BADGE: Record<QuickWinImpact, string> = {
  High: "border-[var(--ds-success)] bg-[var(--ds-success-bg)] text-[var(--ds-success)]",
  Medium: "border-[var(--ds-warning)] bg-[var(--ds-warning-bg)] text-[var(--ds-warning)]"
};

const EFFORT_BADGE: Record<QuickWinEffort, string> = {
  Low: "border-[var(--ds-info)] bg-[var(--ds-info-bg)] text-[var(--ds-info)]",
  Medium: "border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text-secondary)]"
};

function QuickWinCard({ item }: { item: QuickWinItem }) {
  return (
    <article
      className={cn(
        skillCard,
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <h4 className="text-base font-bold text-[var(--ds-text)]">{item.displayName}</h4>
        <dl className="grid gap-1.5 text-sm text-[var(--ds-text-secondary)]">
          <div className="flex gap-2">
            <dt className="shrink-0 text-[var(--ds-muted)]">Why:</dt>
            <dd className="min-w-0">{item.why}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-[var(--ds-muted)]">Action:</dt>
            <dd className="min-w-0 font-medium text-[var(--ds-text-secondary)]">{item.action}</dd>
          </div>
        </dl>
        <a
          href={item.courseSearchUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="text-link inline-block text-sm"
        >
          Find courses for {item.displayName}
        </a>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
            IMPACT_BADGE[item.impact]
          )}
        >
          {item.impact} impact
        </span>
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
            EFFORT_BADGE[item.effort]
          )}
        >
          {item.effort} effort
        </span>
      </div>
    </article>
  );
}

export function SkillGapAnalysisPanel({
  profile,
  analysis,
  targetRoleKey: targetRoleKeyProp,
  onTargetRoleChange,
  loadingRole,
  showRoleSelector = true,
  internship
}: Props) {
  const [localRole, setLocalRole] = useState(
    analysis?.skillIntelligence?.targetRoleKey || targetRoleKeyProp || "full_stack_developer"
  );
  const [showMoreBars, setShowMoreBars] = useState(false);
  const roleKey = targetRoleKeyProp || localRole;
  const target = internship || roleKey;

  const gap = useMemo(() => runSkillGapPipeline(profile, target, analysis), [profile, target, analysis]);

  const backendMatch = analysis?.skillIntelligence?.careerMatch?.matchPercent;
  // Backend ATS keyword-match % and this client engine's weighted skill-gap % measure
  // different things once scored against a real internship (whole-resume ATS quality
  // vs. deterministic 60/15/10/5/5/5 skill fit) — only blend them in generic-role mode.
  const blendBackend = !gap.scoredAgainstInternship && typeof backendMatch === "number" && gap.analysisConfidence >= 70;
  const exactMatch = blendBackend
    ? Math.round((gap.matchPercent + backendMatch) / 2)
    : gap.matchPercent;
  const rangeLow = blendBackend
    ? Math.max(0, Math.round((gap.matchPercentLow + backendMatch) / 2) - 2)
    : gap.matchPercentLow;
  const rangeHigh = blendBackend
    ? Math.min(100, Math.round((gap.matchPercentHigh + backendMatch) / 2) + 2)
    : gap.matchPercentHigh;

  // "Show more" reveals every skill in the dataset (not a second fixed cap) —
  // every skill that contributes to matchPercent's denominator must be
  // visible somewhere in the UI.
  const visibleBars = showMoreBars ? gap.progressBars : gap.progressBars.slice(0, 6);

  const quickWins = useMemo(() => {
    const shown = new Set(visibleBars.map((b) => b.skill));
    return gap.quickWins.filter((item) => !shown.has(item.skill)).slice(0, 5);
  }, [gap.quickWins, visibleBars]);

  if (!profile?.resumeUploaded) {
    return (
      <div className={cn(card, "px-8 py-16 text-center")}>
        <AppIcon icon={Upload} size="md" className="mx-auto text-[var(--ds-primary-text)]" />
        <p className="mt-6 text-base leading-relaxed text-[var(--ds-text-secondary)]">
          Upload your resume to see skill gap insights.
        </p>
        <Link href="/dashboard/intern/resume" className="text-link mt-4 inline-block text-base">
          Upload Resume
        </Link>
      </div>
    );
  }

  if (gap.insufficientData) {
    return (
      <div className={cn(card, "px-8 py-14 text-center")}>
        <AppIcon icon={AlertTriangle} size="md" className="mx-auto text-[var(--ds-warning)]" />
        <p className="mt-6 text-base font-semibold leading-snug text-[var(--ds-text)]">
          {INSUFFICIENT_MSG}
        </p>
        <p className="mt-2 text-base leading-relaxed text-[var(--ds-text-secondary)]">
          Add skills or projects, then re-upload.
        </p>
      </div>
    );
  }

  const insightMatch = gap.showMatchRange ? rangeLow : exactMatch;

  return (
    <div className="space-y-12 text-[15px] leading-relaxed">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-[var(--ds-text)]">
          Skill Gap Analysis
        </h2>
        {showRoleSelector && !internship && (
          <select
            id="sg-target-role"
            aria-label="Target role"
            className="ds-input ds-select h-10 max-w-xs text-base disabled:opacity-60"
            value={roleKey}
            disabled={loadingRole}
            onChange={(e) => {
              setLocalRole(e.target.value);
              onTargetRoleChange?.(e.target.value);
            }}
          >
            {TARGET_ROLE_OPTIONS.map((role) => (
              <option key={role.key} value={role.key}>
                {role.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {gap.lowConfidenceAnalysis && (
        <div className="rounded-xl border border-[var(--ds-warning)] bg-[var(--ds-warning-bg)] px-4 py-3 text-sm text-[var(--ds-warning)]">
          Low confidence — match shown as a range until resume detail improves.
        </div>
      )}

      {/* A. Hero Overview */}
      <ScrollReveal variant="soft-scale" distance={10}>
        <section
          className={cn(
            card,
            "relative overflow-hidden px-8 py-10 sm:px-10 sm:py-12"
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--ds-primary)]/10 via-transparent to-[var(--ds-success)]/10"
            aria-hidden
          />
          <div className="relative flex flex-col items-center gap-8 sm:flex-row sm:justify-between sm:gap-12">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm font-medium uppercase tracking-widest text-[var(--ds-muted)]">
                {gap.scoredAgainstInternship ? "Target Internship" : "Target Role"}
              </p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight text-[var(--ds-text)] sm:text-3xl">
                {gap.roleLabel}
              </h3>
              {gap.scoredAgainstInternship && internship?.company?.companyName && (
                <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">{internship.company.companyName}</p>
              )}
              <p className="mt-4 max-w-sm text-base leading-relaxed text-[var(--ds-text-secondary)]">
                {roleInsight(insightMatch, gap.roleLabel)}
              </p>
              <p className="mt-3 text-sm text-[var(--ds-text-secondary)]">
                Confidence {gap.analysisConfidence}%
              </p>
            </div>
            <MatchProgressRing
              percent={exactMatch}
              showRange={gap.showMatchRange}
              low={rangeLow}
              high={rangeHigh}
            />
          </div>
        </section>
      </ScrollReveal>

      {gap.scoredAgainstInternship ? (
        <>
          {/* B. Required + Preferred skills for this internship */}
          <ScrollReveal variant="fade-up" distance={12}>
            <section className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-[var(--ds-text)]">Required Skills</h3>
                <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">
                  {gap.requiredSkillAssessments.filter((a) => a.status === "present").length}/{gap.requiredSkillAssessments.length} present, evidence-based
                </p>
              </div>
              {gap.requiredSkillAssessments.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {gap.requiredSkillAssessments.map((a) => (
                    <SkillCard
                      key={a.normalized}
                      item={{
                        skill: a.normalized,
                        displayName: a.displayName,
                        userLevel: a.proficiency,
                        requiredLevel: 100,
                        status: a.status === "present" ? "strong" : a.status === "partial" ? "partial" : "missing",
                        tier: a.tier,
                        confidence: a.confidence,
                        verified: a.verified,
                        tooltip: a.explanation,
                        selfReportedLevel: a.selfReportedLevel
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className={cn(card, "px-6 py-8 text-center text-sm text-[var(--ds-text-secondary)]")}>
                  This internship doesn&apos;t list specific required skills.
                </div>
              )}
            </section>
          </ScrollReveal>

          {gap.preferredSkillAssessments.length > 0 && (
            <ScrollReveal variant="fade-up" distance={12}>
              <section className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-[var(--ds-text)]">Preferred Skills</h3>
                  <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">Not mandatory, but strengthen your application</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {gap.preferredSkillAssessments.map((a) => (
                    <SkillCard
                      key={a.normalized}
                      item={{
                        skill: a.normalized,
                        displayName: a.displayName,
                        userLevel: a.proficiency,
                        requiredLevel: 100,
                        status: a.status === "present" ? "strong" : a.status === "partial" ? "partial" : "missing",
                        tier: a.tier,
                        confidence: a.confidence,
                        verified: a.verified,
                        tooltip: a.explanation,
                        selfReportedLevel: a.selfReportedLevel
                      }}
                    />
                  ))}
                </div>
              </section>
            </ScrollReveal>
          )}

          {gap.additionalValuableSkills.length > 0 && (
            <ScrollReveal variant="fade-up" distance={12}>
              <section className="space-y-4">
                <h3 className="text-lg font-semibold tracking-tight text-[var(--ds-text)]">Additional Valuable Skills</h3>
                <p className="text-sm text-[var(--ds-text-secondary)]">Skills you have that go beyond this internship&apos;s stated requirements</p>
                <div className="flex flex-wrap gap-2">
                  {gap.additionalValuableSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-1 text-sm text-[var(--ds-text-secondary)]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            </ScrollReveal>
          )}

          {/* C. Education / Experience / Certification requirement checks */}
          <ScrollReveal variant="fade-up" distance={12}>
            <section className="space-y-5">
              <h3 className="text-lg font-semibold tracking-tight text-[var(--ds-text)]">Requirements Check</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {gap.educationCheck && <RequirementCheckCard title="Education" check={gap.educationCheck} />}
                {gap.experienceCheck && <RequirementCheckCard title="Experience" check={gap.experienceCheck} />}
                {gap.certificationCheck && (
                  <RequirementCheckCard
                    title="Certifications"
                    check={{
                      status: gap.certificationCheck.relevantCertifications.length > 0 ? "match" : "not_stated",
                      score: gap.certificationCheck.score,
                      explanation: gap.certificationCheck.explanation
                    }}
                  />
                )}
              </div>
            </section>
          </ScrollReveal>

          {/* D. Priority-ordered recommended skills */}
          <ScrollReveal variant="fade-up" distance={12}>
            <section className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-[var(--ds-text)]">Recommended Skills to Learn</h3>
                <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">Priority order — why each one matters for this internship</p>
              </div>

              {gap.recommendedSkills.length > 0 ? (
                <div className="space-y-3">
                  {gap.recommendedSkills.map((item) => (
                    <article key={item.skill} className={cn(skillCard, "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between")}>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-[var(--ds-text)]">{item.displayName}</h4>
                          <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", PRIORITY_BADGE[item.priority])}>
                            {item.priority} priority
                          </span>
                        </div>
                        <p className="text-sm text-[var(--ds-text-secondary)]">{item.reason}</p>
                        <a href={item.courseSearchUrl} target="_blank" rel="noreferrer noopener" className="text-link inline-block text-sm">
                          Find courses for {item.displayName}
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={cn(card, "px-6 py-10 text-center")}>
                  <p className="text-base text-[var(--ds-text-secondary)]">Strong alignment — no urgent skill gaps for this internship.</p>
                </div>
              )}
            </section>
          </ScrollReveal>
        </>
      ) : (
        <>
          {/* B. Skill Visualization — card grid */}
          <ScrollReveal variant="fade-up" distance={12}>
            <section className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-[var(--ds-text)]">
                  Your Skills
                </h3>
                <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">
                  Top priorities for this role
                </p>
              </div>

              {gap.progressBarsChartValid ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {visibleBars.map((item) => (
                      <SkillCard key={item.skill} item={item} />
                    ))}
                  </div>
                  {gap.progressBars.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setShowMoreBars((v) => !v)}
                      aria-expanded={showMoreBars}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium text-[var(--ds-text-secondary)] transition-colors hover:text-[var(--ds-text)]"
                    >
                      {showMoreBars ? (
                        <>
                          <AppIcon icon={ChevronUp} size="xs" /> Show fewer
                        </>
                      ) : (
                        <>
                          <AppIcon icon={ChevronDown} size="xs" /> Show more skills
                        </>
                      )}
                    </button>
                  )}
                </>
              ) : (
                <div className={cn(card, "px-6 py-12 text-center text-[var(--ds-text-secondary)]")}>
                  {INSUFFICIENT_MSG}
                </div>
              )}
            </section>
          </ScrollReveal>

          {/* C. Quick Wins */}
          <ScrollReveal variant="fade-up" distance={12}>
            <section className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-[var(--ds-text)]">
                  Quick Wins (Fastest Skill Improvements)
                </h3>
                <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">
                  High-impact improvements you can start today
                </p>
              </div>

              {quickWins.length > 0 ? (
                <div className="space-y-3">
                  {quickWins.map((item) => (
                    <QuickWinCard key={item.skill} item={item} />
                  ))}
                </div>
              ) : (
                <div className={cn(card, "px-6 py-10 text-center")}>
                  <p className="text-base text-[var(--ds-text-secondary)]">
                    Strong alignment — no urgent quick wins outside your skill cards.
                  </p>
                </div>
              )}
            </section>
          </ScrollReveal>
        </>
      )}
    </div>
  );
}
