"use client";

import { memo, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Circle, Rocket } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { AppIcon } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";
import type { InternProfile, ResumeAnalysis } from "@/lib/intern-portal";
import type { Readiness } from "@/components/dashboard/intern/dashboard-overview-cards";

const cardBase =
  "rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-card)] shadow-[0_1px_2px_var(--ds-shadow)]";

type Milestone = {
  key: string;
  label: string;
  done: boolean;
};

function buildMilestones(
  profile: InternProfile | null,
  analysis: ResumeAnalysis | null | undefined,
  readiness: Readiness
): Milestone[] {
  const atsScore = Math.round(analysis?.categoryScores?.ats ?? analysis?.compositeScores?.ats ?? 0);

  return [
    { key: "resume", label: "Resume Completed", done: Boolean(profile?.resumeUploaded) },
    { key: "portfolio", label: "Portfolio Ready", done: Boolean(profile?.portfolioUrl) },
    { key: "ats", label: "ATS Optimized", done: atsScore >= 70 },
    { key: "skills", label: "Skills Added", done: (profile?.skills?.length ?? 0) > 0 },
    { key: "projects", label: "Projects Added", done: (profile?.projects?.length ?? 0) > 0 },
    { key: "interview", label: "Interview Ready", done: readiness.score >= 50 },
    { key: "placement", label: "Placement Ready", done: readiness.tone === "green" }
  ];
}

function MilestoneChip({ milestone, index }: { milestone: Milestone; index: number }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: reducedMotion ? 0 : index * 0.04 }}
      whileHover={{ y: -2 }}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border px-3.5 py-3",
        milestone.done
          ? "border-[var(--ds-success)]/30 bg-[var(--ds-success-bg)]"
          : "border-[var(--ds-border)] bg-[var(--ds-surface-raised)]"
      )}
    >
      <AppIcon
        icon={milestone.done ? CheckCircle2 : Circle}
        size="sm"
        className={cn("shrink-0", milestone.done ? "text-[var(--ds-success)]" : "text-[var(--ds-muted)]")}
      />
      <span
        className={cn(
          "text-sm font-medium",
          milestone.done ? "text-[var(--ds-success)]" : "text-[var(--ds-muted)]"
        )}
      >
        {milestone.label}
        <span className="sr-only">{milestone.done ? " (completed)" : " (not completed)"}</span>
      </span>
    </motion.div>
  );
}

function CareerProgressHubInner({
  profile,
  analysis,
  readiness
}: {
  profile: InternProfile | null;
  analysis: ResumeAnalysis | null | undefined;
  readiness: Readiness;
}) {
  const milestones = useMemo(() => buildMilestones(profile, analysis, readiness), [profile, analysis, readiness]);
  const completedCount = milestones.filter((m) => m.done).length;
  const percent = Math.round((completedCount / milestones.length) * 100);

  return (
    <ScrollReveal variant="fade-up" distance={12} once>
      <div className={cn(cardBase, "p-6")}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AppIcon icon={Rocket} size="sm" className="text-[var(--ds-primary-text)]" />
            <h3 className="text-sm font-semibold text-[var(--ds-text)]">Career Progress</h3>
          </div>
          <span className="text-xs font-semibold tabular-nums text-[var(--ds-muted)]">
            {completedCount}/{milestones.length} milestones &middot; {percent}%
          </span>
        </div>

        <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-[var(--ds-surface-raised)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--ds-primary)] to-[var(--ds-success)] transition-all duration-700 ease-out"
            style={{ width: `${Math.max(2, percent)}%` }}
          />
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {milestones.map((milestone, index) => (
            <MilestoneChip key={milestone.key} milestone={milestone} index={index} />
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}

export const CareerProgressHub = memo(CareerProgressHubInner);
