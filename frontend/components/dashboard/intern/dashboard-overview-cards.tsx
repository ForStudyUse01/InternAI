"use client";

import { motion } from "framer-motion";
import { BarChart3, Target, TrendingUp } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { AppIcon } from "@/components/icons/app-icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { cn } from "@/lib/utils";
import type { InternProfile, ResumeAnalysis } from "@/lib/intern-portal";

const cardBase =
  "rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-card)] shadow-[0_1px_2px_var(--ds-shadow)]";

export type ReadinessTone = "green" | "amber" | "red";

export type Readiness = {
  score: number;
  tone: ReadinessTone;
  label: string;
};

const READINESS_STYLES: Record<ReadinessTone, string> = {
  green:
    "border-[var(--ds-success)]/30 bg-[var(--ds-success-bg)] text-[var(--ds-success)]",
  amber:
    "border-[var(--ds-warning)]/30 bg-[var(--ds-warning-bg)] text-[var(--ds-warning)]",
  red: "border-[var(--ds-danger)]/30 bg-[var(--ds-danger-bg)] text-[var(--ds-danger)]"
};

const READINESS_DOT: Record<ReadinessTone, string> = {
  green: "bg-[var(--ds-success)]",
  amber: "bg-[var(--ds-warning)]",
  red: "bg-[var(--ds-danger)]"
};

const READINESS_BAR: Record<ReadinessTone, string> = {
  green: "from-[var(--ds-success)] to-[var(--ds-success)]",
  amber: "from-[var(--ds-warning)] to-[var(--ds-warning)]",
  red: "from-[var(--ds-danger)] to-[var(--ds-danger)]"
};

/** Reuses the backend-computed recruiterReadiness composite score (already ATS/skill/project-weighted) as the single source of truth for readiness across Hero + Placement Readiness card. */
export function getPlacementReadiness(analysis: ResumeAnalysis | null | undefined, fallbackScore = 0): Readiness {
  const score = Math.round(analysis?.compositeScores?.recruiterReadiness ?? analysis?.overallScore ?? fallbackScore);
  if (score >= 75) return { score, tone: "green", label: "Placement Ready" };
  if (score >= 50) return { score, tone: "amber", label: "Almost Ready" };
  return { score, tone: "red", label: "Needs Improvement" };
}

export function ReadinessBadge({ readiness, className }: { readiness: Readiness; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
        READINESS_STYLES[readiness.tone],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", READINESS_DOT[readiness.tone])} aria-hidden />
      {readiness.label}
    </span>
  );
}

function HoverCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(cardBase, "p-6", className)}
    >
      {children}
    </motion.div>
  );
}

function InitialsAvatar({ name }: { name: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "IN";

  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--ds-primary)] to-[var(--ds-accent)] text-lg font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)] shadow-sm">
      {initials}
    </span>
  );
}

export function DashboardHero({
  profile,
  analysis,
  profileCompletion,
  readiness,
  loading
}: {
  profile: InternProfile | null;
  analysis?: ResumeAnalysis | null;
  profileCompletion: number;
  readiness: Readiness;
  loading?: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-36 w-full rounded-2xl" />;
  }

  const fullName = profile?.fullName || "Intern";
  const firstName = fullName.split(" ")[0];
  const careerTarget = analysis?.skillIntelligence?.targetRole;

  return (
    <ScrollReveal variant="soft-scale" distance={10} once>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="rounded-2xl border border-[var(--ds-primary)]/30 bg-gradient-to-br from-[var(--ds-primary)]/10 via-[var(--ds-card)] to-[var(--ds-accent)]/10 p-6 shadow-[0_1px_2px_var(--ds-shadow),0_10px_28px_-14px_var(--ds-shadow)]"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <InitialsAvatar name={fullName} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-primary-text)]">
                Welcome back
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--ds-text)]">{firstName}</h2>
              {careerTarget ? (
                <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">
                  Targeting <span className="font-semibold text-[var(--ds-primary-text)]">{careerTarget}</span> roles
                </p>
              ) : (
                <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">
                  Here&apos;s your placement readiness snapshot for today.
                </p>
              )}
            </div>
          </div>
          <ReadinessBadge readiness={readiness} className="shrink-0 self-start sm:self-center" />
        </div>

        <div className="mt-5 max-w-sm">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--ds-muted)]">
            <span>Profile Completion</span>
            <span className="font-semibold tabular-nums text-[var(--ds-text)]">{profileCompletion}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--ds-surface-raised)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--ds-primary)] to-[var(--ds-accent)] transition-all duration-700 ease-out"
              style={{ width: `${profileCompletion}%` }}
            />
          </div>
        </div>
      </motion.div>
    </ScrollReveal>
  );
}

function resumeHealthBand(score: number): { label: string; className: string } {
  if (score >= 85) return { label: "Excellent", className: "text-[var(--ds-success)]" };
  if (score >= 70) return { label: "Strong", className: "text-[var(--ds-success)]" };
  if (score >= 55) return { label: "Good", className: "text-[var(--ds-warning)]" };
  if (score >= 40) return { label: "Developing", className: "text-[var(--ds-warning)]" };
  return { label: "Needs Work", className: "text-[var(--ds-danger)]" };
}

export function AtsReadinessCard({
  profile,
  analysis,
  loading
}: {
  profile: InternProfile | null;
  analysis: ResumeAnalysis | null | undefined;
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  if (!profile?.resumeUploaded) {
    return (
      <EmptyState
        presetKey="resume"
        title="No Resume Yet"
        description="Upload your resume to unlock score, ATS analysis, and AI-powered insights."
        action={
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <Button href="/dashboard/intern/resume" size="sm" variant="primary">
              Upload Resume
            </Button>
            <Button href="/dashboard/intern/resume/score" size="sm" variant="secondary">
              Improve ATS Score
            </Button>
            <Button href="/dashboard/intern/internships/search" size="sm" variant="ghost">
              Discover Internships
            </Button>
          </div>
        }
      />
    );
  }

  const resumeScore = Math.round(analysis?.overallScore ?? profile.resume?.score ?? 0);
  const atsScore = Math.round(analysis?.categoryScores?.ats ?? analysis?.compositeScores?.ats ?? 0);
  const health = resumeHealthBand(Math.round((resumeScore + atsScore) / 2));

  return (
    <ScrollReveal variant="fade-up" distance={12} once className="h-full">
      <HoverCard className="flex h-full flex-col">
        <div className="mb-4 flex items-center gap-2">
          <AppIcon icon={BarChart3} size="sm" className="text-[var(--ds-primary-text)]" />
          <h3 className="text-sm font-semibold text-[var(--ds-text)]">ATS Readiness</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-raised)] px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--ds-muted)]">Resume Score</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-[var(--ds-text)]">{resumeScore}<span className="text-xs font-medium text-[var(--ds-muted)]">/100</span></p>
          </div>
          <div className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-raised)] px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--ds-muted)]">ATS Score</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-[var(--ds-text)]">{atsScore}<span className="text-xs font-medium text-[var(--ds-muted)]">/100</span></p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-raised)] px-3 py-2.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--ds-muted)]">Overall Resume Health</span>
          <span className={cn("text-sm font-bold", health.className)}>{health.label}</span>
        </div>
        <div className="mt-auto pt-4">
          <Button href="/dashboard/intern/resume/score" type="button" size="sm" variant="secondary" className="w-full gap-1.5">
            Improve Resume
            <span aria-hidden>&rarr;</span>
          </Button>
        </div>
      </HoverCard>
    </ScrollReveal>
  );
}

export function SkillGapCard({
  analysis,
  loading
}: {
  analysis: ResumeAnalysis | null | undefined;
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const skillIntel = analysis?.skillIntelligence;
  const missing = (skillIntel?.skillGaps || []).slice(0, 5);
  const matchPercent = skillIntel?.careerMatch?.matchPercent ?? skillIntel?.overview?.matchPercent ?? 0;

  return (
    <ScrollReveal variant="fade-up" distance={12} delayMs={120} once className="h-full">
      <HoverCard className="flex h-full flex-col">
        <div className="mb-4 flex items-center gap-2">
          <AppIcon icon={Target} size="sm" className="text-[var(--ds-info)]" />
          <h3 className="text-sm font-semibold text-[var(--ds-text)]">Skill Gap</h3>
        </div>

        {missing.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--ds-border)] px-4 py-8 text-center">
            <p className="text-sm text-[var(--ds-text-secondary)]">
              No major skill gaps detected yet. Upload a resume to see role-matched skill gaps.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs font-medium text-[var(--ds-muted)]">
                <span>Role Match</span>
                <span className="font-semibold tabular-nums text-[var(--ds-text)]">{Math.round(matchPercent)}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--ds-surface-raised)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--ds-info)] to-[var(--ds-info)] transition-all duration-700 ease-out"
                  style={{ width: `${Math.max(2, Math.round(matchPercent))}%` }}
                />
              </div>
            </div>
            <ul className="space-y-2">
              {missing.map((skill, idx) => {
                const priority = idx < 2 ? "High" : idx < 4 ? "Medium" : "Low";
                const dot = priority === "High" ? "bg-[var(--ds-danger)]" : priority === "Medium" ? "bg-[var(--ds-warning)]" : "bg-[var(--ds-info)]";
                return (
                  <li key={skill} className="flex items-center justify-between gap-2 rounded-lg bg-[var(--ds-surface-raised)] px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 text-[var(--ds-text-secondary)]">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} />
                      {skill}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-muted)]">
                      {priority}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <div className="mt-auto pt-4">
          <Button href="/dashboard/intern/skill-gap" type="button" size="sm" variant="secondary" className="w-full">
            View Skill Gap Analysis
          </Button>
        </div>
      </HoverCard>
    </ScrollReveal>
  );
}

function buildReadinessReasons(analysis: ResumeAnalysis | null | undefined): string[] {
  if (!analysis) return [];
  const reasons: string[] = [];

  const overall = analysis.overallScore ?? 0;
  reasons.push(overall >= 70 ? "Resume Score is good" : "Resume Score needs improvement");

  const ats = analysis.categoryScores?.ats ?? analysis.compositeScores?.ats ?? 0;
  if (ats < 70) {
    const atsIssue = (analysis.criticalIssues || []).find((issue) => /ats|keyword/i.test(issue));
    reasons.push(atsIssue || "ATS keywords could be stronger");
  }

  const projectsDimension = analysis.dimensionBreakdown?.find((d) => d.key === "projects");
  if (projectsDimension && projectsDimension.score < 70 && projectsDimension.suggestions?.[0]) {
    reasons.push(projectsDimension.suggestions[0]);
  }

  const topGap = analysis.skillIntelligence?.skillGaps?.[0];
  if (topGap) reasons.push(`Improve ${topGap} proficiency`);

  return reasons.slice(0, 4);
}

export function PlacementReadinessCard({
  readiness,
  analysis,
  loading
}: {
  readiness: Readiness;
  analysis?: ResumeAnalysis | null;
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const reasons = buildReadinessReasons(analysis);

  return (
    <ScrollReveal variant="fade-up" distance={12} delayMs={180} once className="h-full">
      <HoverCard className="flex h-full flex-col items-center text-center">
        <div className="mb-4 flex items-center gap-2 self-start">
          <AppIcon icon={TrendingUp} size="sm" className="text-[var(--ds-success)]" />
          <h3 className="text-sm font-semibold text-[var(--ds-text)]">Placement Readiness</h3>
        </div>

        <div className="relative flex h-28 w-28 items-center justify-center">
          <svg width={112} height={112} className="-rotate-90" aria-hidden>
            <circle cx={56} cy={56} r={48} fill="none" strokeWidth={10} className="stroke-[var(--ds-surface-raised)]" />
            <circle
              cx={56}
              cy={56}
              r={48}
              fill="none"
              strokeWidth={10}
              strokeLinecap="round"
              className={cn(
                readiness.tone === "green" ? "stroke-[var(--ds-success)]" : readiness.tone === "amber" ? "stroke-[var(--ds-warning)]" : "stroke-[var(--ds-danger)]"
              )}
              strokeDasharray={2 * Math.PI * 48}
              strokeDashoffset={2 * Math.PI * 48 - (Math.min(100, Math.max(0, readiness.score)) / 100) * (2 * Math.PI * 48)}
              style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
            />
          </svg>
          <span className="absolute text-2xl font-black tabular-nums text-[var(--ds-text)]">{readiness.score}</span>
        </div>

        <ReadinessBadge readiness={readiness} className="mt-4" />

        {reasons.length > 0 ? (
          <ul className="mt-4 w-full space-y-1.5 text-left">
            {reasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-[var(--ds-text-secondary)]">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--ds-muted)]" />
                {reason}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-[var(--ds-muted)]">
            Based on resume quality, ATS fit, project strength, and skill alignment.
          </p>
        )}
      </HoverCard>
    </ScrollReveal>
  );
}
