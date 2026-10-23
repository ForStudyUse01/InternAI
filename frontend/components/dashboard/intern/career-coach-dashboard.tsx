"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Building2,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileUp,
  GraduationCap,
  ListChecks,
  Minus,
  Rocket,
  Target,
  Trophy,
  TrendingDown,
  TrendingUp,
  Users
} from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { AppIcon } from "@/components/icons/app-icon";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { runSkillGapPipeline } from "@/lib/ai-platform/orchestrator";
import { getWeeklyProgress, type WeeklyProgressMetrics } from "@/lib/weekly-progress-tracker";
import type { Application, InternProfile, ResumeAnalysis } from "@/lib/intern-portal";
import type { Weakness } from "@/lib/intern-weakness-analysis";
import type { Readiness } from "@/components/dashboard/intern/dashboard-overview-cards";

const cardBase = "rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-[0_1px_2px_var(--ds-shadow)]";

/* ============================== 1. Career Readiness ============================== */

type ReadinessTier = "Beginner" | "Intermediate" | "Placement Ready" | "Excellent";

const READINESS_TIERS: Array<{ key: ReadinessTier; min: number; colorVar: string }> = [
  { key: "Beginner", min: 0, colorVar: "var(--ds-danger)" },
  { key: "Intermediate", min: 50, colorVar: "var(--ds-warning)" },
  { key: "Placement Ready", min: 75, colorVar: "var(--ds-info)" },
  { key: "Excellent", min: 90, colorVar: "var(--ds-success)" }
];

function getReadinessTier(score: number): { tier: ReadinessTier; colorVar: string } {
  let current = READINESS_TIERS[0];
  for (const tier of READINESS_TIERS) {
    if (score >= tier.min) current = tier;
  }
  return { tier: current.key, colorVar: current.colorVar };
}

export function CareerReadinessSection({
  readiness,
  analysis,
  profile,
  loading
}: {
  readiness: Readiness;
  analysis?: ResumeAnalysis | null;
  profile: InternProfile | null;
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-48 w-full rounded-2xl" />;

  const { tier, colorVar } = getReadinessTier(readiness.score);
  const resumeScore = Math.round(analysis?.overallScore ?? profile?.resume?.score ?? 0);
  const atsScore = Math.round(analysis?.categoryScores?.ats ?? analysis?.compositeScores?.ats ?? 0);
  const roleMatch = Math.round(
    analysis?.skillIntelligence?.careerMatch?.matchPercent ?? analysis?.skillIntelligence?.overview?.matchPercent ?? 0
  );

  return (
    <ScrollReveal variant="fade-up" distance={12} once>
      <div className={cn(cardBase, "p-6")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">Career Readiness</p>
            <h3 className="mt-1 text-2xl font-bold tracking-tight" style={{ color: colorVar }}>
              {tier}
            </h3>
          </div>
          <span className="shrink-0 text-3xl font-black tabular-nums text-[var(--ds-text)]">{readiness.score}</span>
        </div>

        <div className="relative mt-5 h-2.5 w-full overflow-hidden rounded-full bg-[var(--ds-surface-raised)]">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.max(2, Math.min(100, readiness.score))}%`, background: colorVar }}
          />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-raised)] px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--ds-muted)]">Resume Score</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-[var(--ds-text)]">{resumeScore}<span className="text-xs font-medium text-[var(--ds-muted)]">/100</span></p>
          </div>
          <div className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-raised)] px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--ds-muted)]">ATS Score</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-[var(--ds-text)]">{atsScore}<span className="text-xs font-medium text-[var(--ds-muted)]">/100</span></p>
          </div>
          <div className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-raised)] px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--ds-muted)]">Role Match</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-[var(--ds-text)]">{roleMatch}<span className="text-xs font-medium text-[var(--ds-muted)]">%</span></p>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}

/* ============================== 2. Today's Focus ============================== */

type FocusItem = { label: string; href: string };

function buildTodaysFocus(
  profile: InternProfile | null,
  analysis: ResumeAnalysis | null | undefined,
  topWeakness: Weakness | null,
  missingSkills: string[]
): FocusItem[] {
  const items: FocusItem[] = [];

  if (!profile?.resumeUploaded) {
    items.push({ label: "Upload your resume to unlock AI scoring", href: "/dashboard/intern/resume" });
  } else {
    const resumeScore = Math.round(analysis?.overallScore ?? profile.resume?.score ?? 0);
    if (resumeScore < 75) {
      const weakest = [...(analysis?.dimensionBreakdown || [])].sort((a, b) => a.score - b.score)[0];
      const label = weakest?.suggestions?.[0] || analysis?.improvements?.[0] || `Improve your ${weakest?.label || "resume"} section`;
      items.push({ label, href: "/dashboard/intern/resume/score" });
    }
  }

  if (missingSkills[0]) {
    items.push({ label: `Improve ${missingSkills[0]} proficiency`, href: "/dashboard/intern/skill-gap" });
  }

  const certCount = (profile?.certifications?.length ?? 0) + (profile?.certificationEntries?.length ?? 0);
  if (certCount === 0) {
    items.push({ label: "Add one certification to your profile", href: "/dashboard/intern/learning/certifications" });
  }

  if (topWeakness?.suggestion) {
    items.push({ label: topWeakness.suggestion, href: "/dashboard/intern/learning/mock-interview" });
  }

  items.push({ label: "Solve 2 DSA practice questions", href: "/dashboard/intern/learning/mock-technical" });
  items.push({ label: "Take a mock aptitude test", href: "/dashboard/intern/learning/mock-aptitude" });

  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.label) ? false : (seen.add(item.label), true))).slice(0, 3);
}

export function TodaysFocusSection({
  profile,
  analysis,
  topWeakness,
  missingSkills,
  loading
}: {
  profile: InternProfile | null;
  analysis?: ResumeAnalysis | null;
  topWeakness: Weakness | null;
  missingSkills: string[];
  loading?: boolean;
}) {
  const items = useMemo(
    () => buildTodaysFocus(profile, analysis, topWeakness, missingSkills),
    [profile, analysis, topWeakness, missingSkills]
  );

  if (loading) return <Skeleton className="h-48 w-full rounded-2xl" />;

  return (
    <ScrollReveal variant="fade-up" distance={12} delayMs={60} once>
      <div className={cn(cardBase, "p-6")}>
        <div className="mb-4 flex items-center gap-2">
          <AppIcon icon={Target} size="sm" className="text-[var(--ds-primary-text)]" />
          <h3 className="text-sm font-semibold text-[var(--ds-text)]">Today&apos;s Focus</h3>
        </div>
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={item.label}>
              <a
                href={item.href}
                className="flex items-center gap-3 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-raised)] px-4 py-3 text-sm transition-colors hover:border-[var(--ds-border-strong)] hover:bg-[var(--ds-hover)]"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ds-primary)]/10 text-xs font-bold text-[var(--ds-primary-text)]">
                  {idx + 1}
                </span>
                <span className="min-w-0 flex-1 font-medium text-[var(--ds-text)]">{item.label}</span>
                <AppIcon icon={ChevronRight} size="xs" className="shrink-0" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </ScrollReveal>
  );
}

/* ============================== 3. Weekly Progress ============================== */

const PROGRESS_TILES: Array<{ key: keyof WeeklyProgressMetrics; label: string; suffix?: string }> = [
  { key: "resumeScore", label: "Resume Score", suffix: "/100" },
  { key: "atsScore", label: "ATS Score", suffix: "/100" },
  { key: "applications", label: "Applications" },
  { key: "interviews", label: "Interviews" },
  { key: "profileCompletion", label: "Profile Completion", suffix: "%" }
];

function DeltaPill({ delta, isBaseline }: { delta: number; isBaseline: boolean }) {
  if (isBaseline) {
    return <span className="text-[11px] font-medium text-[var(--ds-muted)]">Tracking starts today</span>;
  }
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--ds-muted)]">
        <AppIcon icon={Minus} size="xs" />
        No change
      </span>
    );
  }
  const positive = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold",
        positive ? "text-[var(--ds-success)]" : "text-[var(--ds-danger)]"
      )}
    >
      <AppIcon icon={positive ? TrendingUp : TrendingDown} size="xs" className="text-current" />
      {positive ? "+" : ""}
      {delta} this week
    </span>
  );
}

export function WeeklyProgressSection({
  metrics,
  storageKey,
  loading
}: {
  metrics: WeeklyProgressMetrics;
  storageKey: string;
  loading?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<ReturnType<typeof getWeeklyProgress> | null>(null);

  useEffect(() => {
    setSnapshot(getWeeklyProgress(storageKey, metrics));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, metrics.resumeScore, metrics.atsScore, metrics.applications, metrics.interviews, metrics.profileCompletion]);

  if (loading || !snapshot) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <ScrollReveal variant="fade-up" distance={12} delayMs={100} once>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-[var(--ds-text)]">Weekly Progress</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {PROGRESS_TILES.map((tile, idx) => (
            <motion.div
              key={tile.key}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className={cn(cardBase, "p-4")}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--ds-muted)]">{tile.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-[var(--ds-text)]">
                {metrics[tile.key]}
                {tile.suffix ? <span className="text-xs font-medium text-[var(--ds-muted)]">{tile.suffix}</span> : null}
              </p>
              <div className="mt-1.5">
                <DeltaPill delta={snapshot.deltas[tile.key]} isBaseline={snapshot.isBaseline} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}

/* ============================== 4. Priority Roadmap ============================== */

const PRIORITY_STYLES: Record<string, string> = {
  High: "bg-[var(--ds-danger)]/10 text-[var(--ds-danger)]",
  Medium: "bg-[var(--ds-warning)]/10 text-[var(--ds-warning)]"
};

export function PriorityRoadmapSection({
  profile,
  analysis,
  loading
}: {
  profile: InternProfile | null;
  analysis?: ResumeAnalysis | null;
  loading?: boolean;
}) {
  const gap = useMemo(() => {
    const target = analysis?.skillIntelligence?.targetRoleKey || "full_stack_developer";
    return runSkillGapPipeline(profile, target, analysis);
  }, [profile, analysis]);

  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const top3 = gap.quickWins.slice(0, 3);

  return (
    <ScrollReveal variant="fade-up" distance={12} delayMs={140} once>
      <div className={cn(cardBase, "p-6")}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AppIcon icon={Award} size="sm" className="text-[var(--ds-accent)]" />
            <h3 className="text-sm font-semibold text-[var(--ds-text)]">Priority Roadmap</h3>
          </div>
          <Button href="/dashboard/intern/skill-gap" type="button" size="sm" variant="ghost">
            View full analysis
          </Button>
        </div>

        {top3.length === 0 ? (
          <EmptyState
            title="No priority gaps detected yet"
            hint="Upload a resume to see your top 3 role-matched skill priorities."
            icon={Target}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {top3.map((item) => (
              <div key={item.skill} className="flex h-full flex-col rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-raised)] p-4">
                <p className="text-sm font-semibold text-[var(--ds-text)]">{item.displayName}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--ds-text-secondary)]">{item.why}</p>
                <div className="mt-3">
                  <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", PRIORITY_STYLES[item.impact])}>
                    {item.impact} priority
                  </span>
                </div>
                <a href={item.courseSearchUrl} target="_blank" rel="noreferrer noopener" className="text-link mt-auto inline-block pt-3 text-xs">
                  {item.action}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrollReveal>
  );
}

/* ============================== 5. Placement Readiness Tiers ============================== */

const COMPANY_TIERS: Array<{ key: string; label: string; threshold: number; icon: typeof Rocket }> = [
  { key: "startups", label: "Startups", threshold: 40, icon: Rocket },
  { key: "midsize", label: "Mid-size Companies", threshold: 55, icon: Building2 },
  { key: "product", label: "Product Companies", threshold: 70, icon: Target },
  { key: "enterprise", label: "Enterprise", threshold: 85, icon: Trophy }
];

function tierConfidence(score: number, threshold: number): number {
  if (score >= threshold) {
    const overshoot = Math.min(30, score - threshold);
    return Math.min(100, Math.round(65 + (overshoot / 30) * 35));
  }
  const deficit = threshold - score;
  return Math.max(5, Math.round(65 - (deficit / threshold) * 65));
}

export function PlacementReadinessTiersSection({ readiness, loading }: { readiness: Readiness; loading?: boolean }) {
  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  return (
    <ScrollReveal variant="fade-up" distance={12} delayMs={180} once>
      <div className={cn(cardBase, "p-6")}>
        <div className="mb-4 flex items-center gap-2">
          <AppIcon icon={Trophy} size="sm" className="text-[var(--ds-success)]" />
          <h3 className="text-sm font-semibold text-[var(--ds-text)]">Ready For</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {COMPANY_TIERS.map((tier) => {
            const confidence = tierConfidence(readiness.score, tier.threshold);
            const ready = readiness.score >= tier.threshold;
            return (
              <div key={tier.key} className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-raised)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[var(--ds-text)]">
                    <AppIcon icon={tier.icon} size="sm" className="text-[var(--ds-accent)]" />
                    {tier.label}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      ready ? "bg-[var(--ds-success)]/10 text-[var(--ds-success)]" : "bg-[var(--ds-muted)]/10 text-[var(--ds-muted)]"
                    )}
                  >
                    {ready ? "Ready" : "Building"}
                  </span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--ds-surface)]">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700 ease-out", ready ? "bg-[var(--ds-success)]" : "bg-[var(--ds-muted)]")}
                    style={{ width: `${confidence}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] font-medium tabular-nums text-[var(--ds-muted)]">{confidence}% confidence</p>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollReveal>
  );
}

/* ============================== 7. Achievements ============================== */

const OFFER_STATUSES = new Set(["offered", "selected", "hired"]);

export function AchievementsSection({
  profile,
  applications,
  interviewCount,
  profileCompletion,
  loading
}: {
  profile: InternProfile | null;
  applications: Application[];
  interviewCount: number;
  profileCompletion: number;
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-40 w-full rounded-2xl" />;

  const certCount = (profile?.certifications?.length ?? 0) + (profile?.certificationEntries?.length ?? 0);
  const offers = applications.filter((app) => OFFER_STATUSES.has(String(app.status || "").toLowerCase())).length;

  const badges = [
    { key: "profile", label: "Completed Profile", done: profileCompletion >= 100, icon: CheckCircle2 },
    { key: "resume", label: "Resume Uploaded", done: Boolean(profile?.resumeUploaded), icon: FileUp },
    { key: "certifications", label: "Certified", done: certCount > 0, icon: GraduationCap, meta: certCount || undefined },
    { key: "applications", label: "Active Applicant", done: applications.length > 0, icon: ListChecks, meta: applications.length || undefined },
    { key: "interviews", label: "Interview Experience", done: interviewCount > 0, icon: Users, meta: interviewCount || undefined },
    { key: "offers", label: "Offer Received", done: offers > 0, icon: Trophy, meta: offers || undefined }
  ];

  return (
    <ScrollReveal variant="fade-up" distance={12} delayMs={220} once>
      <div className={cn(cardBase, "p-6")}>
        <h3 className="mb-4 text-sm font-semibold text-[var(--ds-text)]">Achievements</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {badges.map((badge) => (
            <div
              key={badge.key}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-4 text-center",
                badge.done
                  ? "border-[var(--ds-success)]/30 bg-[var(--ds-success)]/5"
                  : "border-[var(--ds-border)] bg-[var(--ds-surface-raised)] opacity-60"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  badge.done ? "bg-[var(--ds-success)]/15 text-[var(--ds-success)]" : "bg-[var(--ds-surface)] text-[var(--ds-muted)]"
                )}
              >
                <AppIcon icon={badge.done ? badge.icon : Circle} size="sm" className="text-current" />
              </span>
              <span className="text-xs font-medium leading-tight text-[var(--ds-text)]">{badge.label}</span>
              {badge.meta ? <span className="text-[11px] font-semibold tabular-nums text-[var(--ds-muted)]">{badge.meta}</span> : null}
            </div>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}
