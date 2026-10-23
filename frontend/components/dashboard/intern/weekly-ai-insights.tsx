"use client";

import { memo, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Brain, ChevronDown, Lightbulb, Sparkles, Target, TrendingUp } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { AppIcon } from "@/components/icons/app-icon";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { cn } from "@/lib/utils";
import type { Application, ResumeAnalysis } from "@/lib/intern-portal";
import type { Weakness } from "@/lib/intern-weakness-analysis";

const cardBase =
  "rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-card)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

type InsightCard = {
  key: string;
  icon: typeof Lightbulb;
  tone: "primary" | "violet" | "emerald" | "sky";
  label: string;
  text: string;
};

const TONE_STYLES: Record<InsightCard["tone"], string> = {
  primary: "bg-[var(--ds-info-bg)] text-[var(--ds-primary-text)]",
  violet: "bg-[var(--ds-accent)]/10 text-[var(--ds-accent)]",
  emerald: "bg-[var(--ds-success-bg)] text-[var(--ds-success)]",
  sky: "bg-[var(--ds-info-bg)] text-[var(--ds-info)]"
};

function buildInsightCards(
  analysis: ResumeAnalysis | null | undefined,
  applications: Application[],
  topWeakness: Weakness | null
): InsightCard[] {
  const cards: InsightCard[] = [];

  const resumeTip = analysis?.criticalIssues?.[0] || analysis?.improvements?.[0];
  if (resumeTip) {
    cards.push({ key: "resume-tip", icon: Lightbulb, tone: "primary", label: "Resume Tip", text: resumeTip });
  }

  const skillGap = analysis?.skillIntelligence?.skillGaps?.[0];
  if (skillGap) {
    cards.push({
      key: "skill-rec",
      icon: Target,
      tone: "sky",
      label: "Skill Recommendation",
      text: `Learn ${skillGap} next to close your top skill gap.`
    });
  }

  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const weeklyApps = applications.filter((app) => {
    if (!app.appliedAt) return false;
    const applied = new Date(app.appliedAt).getTime();
    return !Number.isNaN(applied) && now - applied <= weekMs;
  }).length;
  if (weeklyApps > 0) {
    cards.push({
      key: "progress",
      icon: TrendingUp,
      tone: "emerald",
      label: "Progress",
      text: `You submitted ${weeklyApps} new application${weeklyApps > 1 ? "s" : ""} this week.`
    });
  }

  if (topWeakness?.suggestion) {
    cards.push({ key: "interview-tip", icon: Brain, tone: "violet", label: "Interview Tip", text: topWeakness.suggestion });
  }

  return cards;
}

function InsightTile({ card, index }: { card: InsightCard; index: number }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: reducedMotion ? 0 : index * 0.05 }}
      whileHover={{ y: -3 }}
      className={cn(cardBase, "p-4")}
    >
      <div className="flex items-start gap-3">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", TONE_STYLES[card.tone])}>
          <AppIcon icon={card.icon} size="sm" className="text-current" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-muted)]">{card.label}</p>
          <p className="mt-1 text-sm leading-snug text-[var(--ds-text)]">{card.text}</p>
        </div>
      </div>
    </motion.div>
  );
}

function WeeklyAiInsightsInner({
  analysis,
  applications,
  topWeakness
}: {
  analysis: ResumeAnalysis | null | undefined;
  applications: Application[];
  topWeakness: Weakness | null;
}) {
  const [open, setOpen] = useState(false);
  const cards = useMemo(
    () => buildInsightCards(analysis, applications, topWeakness),
    [analysis, applications, topWeakness]
  );

  if (cards.length === 0) {
    return (
      <ScrollReveal variant="fade-up" distance={12} once>
        <div className={cn(cardBase, "p-6")}>
          <div className="mb-4 flex items-center gap-2">
            <AppIcon icon={Sparkles} size="sm" className="text-[var(--ds-primary-text)]" />
            <h3 className="text-sm font-semibold text-[var(--ds-text)]">Weekly AI Insights</h3>
          </div>
          <EmptyState title="No insights yet" hint="Upload a resume and apply to internships to unlock weekly AI insights." icon={Sparkles} />
        </div>
      </ScrollReveal>
    );
  }

  const [lead, ...rest] = cards;

  return (
    <ScrollReveal variant="fade-up" distance={12} once>
      <div className={cn(cardBase, "p-6")}>
        <div className="mb-4 flex items-center gap-2">
          <AppIcon icon={Sparkles} size="sm" className="text-[var(--ds-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--ds-text)]">Weekly AI Insights</h3>
        </div>

        <InsightTile card={lead} index={0} />

        {rest.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              aria-expanded={open}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ds-primary-text)] transition-opacity hover:opacity-80"
            >
              {open ? "Show less" : `See Full Analysis (${rest.length})`}
              <AppIcon
                icon={ChevronDown}
                size="xs"
                className={cn("text-current transition-transform", open && "rotate-180")}
              />
            </button>

            {open ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {rest.map((card, index) => (
                  <InsightTile key={card.key} card={card} index={index} />
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </ScrollReveal>
  );
}

export const WeeklyAiInsights = memo(WeeklyAiInsightsInner);
