"use client";

import { useMemo } from "react";
import { AlertTriangle, ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import type { CompanyApplication, CompanyInternship, CompanyMatchedCandidate } from "@/lib/company-portal";
import type { BestCandidateRecommendation, HiringPrediction } from "@/lib/ai-hiring";
import { hiringAIEngine } from "@/lib/ai-hiring";
import {
  CompanyDashboardEmptyState,
  CompanyDashboardItemCard,
  CompanyDashboardSection,
  companyDashboardStyles
} from "./company-dashboard-layout";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";

type RoleHiringIntelligencePanelProps = {
  matches: CompanyMatchedCandidate[];
  applications: CompanyApplication[];
  internships: CompanyInternship[];
  onOpenProfile: (applicationId: string) => void;
  /** Optional: render skeleton loaders while the parent is still fetching source data. */
  loading?: boolean;
};

const MAX_VISIBLE_ROLES = 6;

type Priority = "High" | "Medium" | "Low";

const priorityTone: Record<Priority, string> = {
  High: "text-[var(--ds-danger)] bg-[var(--ds-danger-bg)] ring-1 ring-[var(--ds-danger)]/30",
  Medium: "text-[var(--ds-warning)] bg-[var(--ds-warning-bg)] ring-1 ring-[var(--ds-warning)]/30",
  Low: "text-[var(--ds-success)] bg-[var(--ds-success-bg)] ring-1 ring-[var(--ds-success)]/30"
};

/**
 * Pure presentation helper — derives a concise, scannable insight from the
 * existing AI outputs. Does NOT alter recommendation generation or scoring.
 */
function buildRecommendationInsight(prediction: HiringPrediction, recommended?: BestCandidateRecommendation) {
  const priority: Priority =
    prediction.difficultyLevel === "Hard" || prediction.hiringProbability < 50
      ? "High"
      : prediction.difficultyLevel === "Medium" || prediction.hiringProbability < 75
        ? "Medium"
        : "Low";

  if (!recommended) {
    return {
      priority,
      mainRecommendation: "Keep sourcing candidates",
      reason: "No candidate yet clears the match-quality bar for a confident recommendation.",
      suggestedAction: "Widen outreach or revisit role requirements.",
      improvementOpportunity: null as string | null
    };
  }

  const needsEvidence = Boolean(recommended.projectConfidenceWarning) || recommended.confidenceScore <= 80;

  return {
    priority,
    mainRecommendation: `Advance ${recommended.candidateName}`,
    reason: recommended.whyRecommended[0] || recommended.reasonForSelection,
    suggestedAction: needsEvidence ? "Verify project evidence, then interview." : "Fast-track to interview.",
    improvementOpportunity: recommended.projectConfidenceWarning
  };
}

export function RoleHiringIntelligencePanel({
  matches,
  applications,
  internships,
  onOpenProfile,
  loading = false
}: RoleHiringIntelligencePanelProps) {
  const input = useMemo(() => ({ matches, applications, internships }), [matches, applications, internships]);
  const predictions = useMemo(() => hiringAIEngine.computeAllHiringPredictions(input), [input]);
  const recommendations = useMemo(() => hiringAIEngine.recommendBestCandidatesByRole(input), [input]);
  const recommendationByJob = useMemo(
    () => new Map(recommendations.map((item) => [item.internshipId, item])),
    [recommendations]
  );

  const visiblePredictions = predictions.filter((item) => item.sufficient).slice(0, MAX_VISIBLE_ROLES);

  if (loading) {
    return (
      <CompanyDashboardSection
        id="role-hiring-intelligence"
        icon={TrendingUp}
        title="AI Recommendation Insights"
        description="Concise, prioritized hiring recommendations per role."
      >
        <div role="status" aria-live="polite" aria-label="Loading recommendations" className={companyDashboardStyles.cardGridTwo}>
          <div aria-hidden className="contents">
            {Array.from({ length: 4 }).map((_, index) => (
              <RecommendationCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </CompanyDashboardSection>
    );
  }

  if (visiblePredictions.length === 0) {
    return (
      <CompanyDashboardSection
        id="role-hiring-intelligence"
        icon={TrendingUp}
        title="AI Recommendation Insights"
        description="Concise, prioritized hiring recommendations per role."
      >
        <CompanyDashboardEmptyState
          title="No recommendations yet"
          description="Insights appear here once your roles start receiving applicants."
          icon={TrendingUp}
        />
      </CompanyDashboardSection>
    );
  }

  return (
    <CompanyDashboardSection
      id="role-hiring-intelligence"
      icon={TrendingUp}
      title="AI Recommendation Insights"
      description="Concise, prioritized hiring recommendations per role."
    >
      <div className={companyDashboardStyles.cardGridTwo}>
        {visiblePredictions.map((prediction) => (
          <RecommendationCard
            key={prediction.jobId}
            prediction={prediction}
            recommended={recommendationByJob.get(prediction.jobId)}
            onOpenProfile={onOpenProfile}
          />
        ))}
      </div>
    </CompanyDashboardSection>
  );
}

type RecommendationCardProps = {
  prediction: HiringPrediction;
  recommended?: BestCandidateRecommendation;
  onOpenProfile: (applicationId: string) => void;
};

type ConfidenceLevel = "High" | "Medium" | "Low";

const confidenceTone: Record<ConfidenceLevel, { dot: string; badge: string }> = {
  High: { dot: "bg-[var(--ds-success)]", badge: "bg-[var(--ds-success-bg)] text-[var(--ds-success)] ring-1 ring-[var(--ds-success)]/30" },
  Medium: { dot: "bg-[var(--ds-warning)]", badge: "bg-[var(--ds-warning-bg)] text-[var(--ds-warning)] ring-1 ring-[var(--ds-warning)]/30" },
  Low: { dot: "bg-[var(--ds-danger)]", badge: "bg-[var(--ds-danger-bg)] text-[var(--ds-danger)] ring-1 ring-[var(--ds-danger)]/30" }
};

function confidenceLevel(recommended: BestCandidateRecommendation): ConfidenceLevel {
  if (recommended.confidenceScore >= 80) return "High";
  if (recommended.confidenceScore >= 55) return "Medium";
  return "Low";
}

/** Pulls the skill list out of clauses like "Required skill overlap: JavaScript, React". Presentation only. */
function extractSkills(clause?: string): string[] {
  if (!clause || !clause.includes(":")) return [];
  return clause
    .slice(clause.indexOf(":") + 1)
    .split(/[,;]/)
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 5);
}

/** One compact, scannable insight row: colored dot, short title, one-line content. */
function InsightRow({
  dot,
  title,
  children
}: {
  dot: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5 border-t border-[var(--ds-border)] py-2 first:border-t-0 first:pt-0 last:pb-0">
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dot)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-text)]">{title}</p>
        <div className="ds-caption mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function SkillDots({ skills }: { skills: string[] }) {
  return (
    <span className="text-[var(--ds-muted)]">
      {skills.map((skill, index) => (
        <span key={skill}>
          {index > 0 ? <span aria-hidden> · </span> : null}
          <span className="font-medium text-[var(--ds-text)]">{skill}</span>
        </span>
      ))}
    </span>
  );
}

function RecommendationCard({ prediction, recommended, onOpenProfile }: RecommendationCardProps) {
  const insight = buildRecommendationInsight(prediction, recommended);

  const strengths = recommended?.evaluation?.strengths ?? [];
  const weaknesses = recommended?.evaluation?.weaknesses ?? [];
  const strengthSkills = extractSkills(strengths.find((item) => item.includes(":")));
  const missingSkills = extractSkills(weaknesses.find((item) => /missing/i.test(item)));
  const confidence = recommended ? confidenceLevel(recommended) : null;

  return (
    <CompanyDashboardItemCard className="gap-3">
      {/* Header: role + priority */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="ds-h3 truncate">{prediction.role}</h3>
          <p className="ds-caption mt-0.5">
            Est. {prediction.timeToHireEstimate} · {prediction.difficultyLevel} to fill
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            priorityTone[insight.priority]
          )}
        >
          {insight.priority} priority
        </span>
      </div>

      {/* Recommended candidate strip */}
      <div className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-glass)] px-3.5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <AppIcon icon={Sparkles} size="xs" className="text-[var(--ds-primary-text)]" />
            <p className="ds-body truncate font-medium">{insight.mainRecommendation}</p>
          </div>
          {recommended && confidence ? (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                confidenceTone[confidence].badge
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", confidenceTone[confidence].dot)} aria-hidden />
              {confidence} confidence
            </span>
          ) : null}
        </div>

        {recommended ? (
          <div className="mt-2">
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ds-border)]"
              role="progressbar"
              aria-valuenow={recommended.matchScore}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Match score for ${recommended.candidateName}: ${recommended.matchScore}%`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--ds-gradient-from)] to-[var(--ds-gradient-to)]"
                style={{ width: `${Math.min(100, Math.max(0, recommended.matchScore))}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs font-semibold text-[var(--ds-text)]">
              {recommended.matchScore}% match <span className="font-normal text-[var(--ds-muted)]">· {recommended.recommendationLevel}</span>
            </p>
          </div>
        ) : null}
      </div>

      {/* Compact insight rows */}
      <div>
        {strengthSkills.length > 0 ? (
          <InsightRow dot="bg-[var(--ds-success)]" title="Key strengths">
            <SkillDots skills={strengthSkills} />
          </InsightRow>
        ) : (
          <InsightRow dot="bg-[var(--ds-success)]" title="Why recommended">
            <span className="line-clamp-2">{insight.reason}</span>
          </InsightRow>
        )}

        {missingSkills.length > 0 ? (
          <InsightRow dot="bg-[var(--ds-warning)]" title="Missing skills">
            <SkillDots skills={missingSkills} />
          </InsightRow>
        ) : null}

        <InsightRow dot="bg-[var(--ds-accent)]" title="Next step">
          {insight.suggestedAction}
        </InsightRow>

        {insight.improvementOpportunity ? (
          <InsightRow dot="bg-[var(--ds-warning)]" title="Verify first">
            <span className="line-clamp-2 text-[var(--ds-warning)]">
              <AppIcon icon={AlertTriangle} size="xs" className="mr-1 align-[-1px]" />
              {insight.improvementOpportunity}
            </span>
          </InsightRow>
        ) : null}
      </div>

      {/* Footer pinned to bottom for equal-height alignment */}
      {recommended?.applicationId ? (
        <div className="mt-auto pt-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => onOpenProfile(recommended.applicationId!)}
          >
            View candidate
            <AppIcon icon={ArrowRight} size="xs" />
          </Button>
        </div>
      ) : null}
    </CompanyDashboardItemCard>
  );
}

function RecommendationCardSkeleton() {
  return (
    <CompanyDashboardItemCard className="gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-[var(--ds-surface-raised)]" />
          <div className="h-3 w-40 animate-pulse rounded bg-[var(--ds-surface)]" />
        </div>
        <div className="h-5 w-20 animate-pulse rounded-full bg-[var(--ds-surface-raised)]" />
      </div>
      <div className="h-16 w-full animate-pulse rounded-lg bg-[var(--ds-surface)]" />
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-[var(--ds-surface)]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--ds-surface)]" />
      </div>
    </CompanyDashboardItemCard>
  );
}
