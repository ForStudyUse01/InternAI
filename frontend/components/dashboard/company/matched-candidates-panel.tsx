"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Brain, Briefcase, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import type { CompanyApplication, CompanyInternship, CompanyMatchedCandidate } from "@/lib/company-portal";
import { hiringAIEngine, type RankedCandidate } from "@/lib/ai-hiring";
import {
  CompanyDashboardEmptyState,
  CompanyDashboardItemCard,
  CompanyDashboardSection
} from "./company-dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppIcon } from "@/components/icons/app-icon";
import { isRejectionLanguage } from "@/lib/utils";
import { HrCandidateMatchCard } from "./hr-candidate-match-card";
import { CandidateCompareToggle } from "./candidate-compare-toggle";

const AiMatchInsightModal = dynamic(() => import("./ai-match-insight-modal").then((m) => m.AiMatchInsightModal), {
  ssr: false
});
const ResumePreviewModal = dynamic(() => import("./resume-preview-modal").then((m) => m.ResumePreviewModal), {
  ssr: false
});

const DEFAULT_TOP_LIMIT = 10;

type MatchedCandidatesPanelProps = {
  matches: CompanyMatchedCandidate[];
  applications: CompanyApplication[];
  internships: CompanyInternship[];
  defaultLimit?: number;
  showViewAllLink?: boolean;
  saving?: boolean;
  isHrScoped?: boolean;
  hideTitle?: boolean;
  onOpenProfile: (applicationId: string) => void;
  onMessage: (match: CompanyMatchedCandidate, applicationId: string) => void;
  onShortlist: (applicationId: string) => void;
  onViewResume: (applicationId: string) => void;
  onScheduleInterview: (applicationId: string, candidateName: string) => void;
};

export function MatchedCandidatesPanel({
  matches,
  applications,
  internships,
  defaultLimit = DEFAULT_TOP_LIMIT,
  showViewAllLink = false,
  saving = false,
  isHrScoped = false,
  hideTitle = false,
  onOpenProfile,
  onMessage,
  onShortlist,
  onViewResume,
  onScheduleInterview
}: MatchedCandidatesPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [openInsightKey, setOpenInsightKey] = useState<string | null>(null);
  const [resumePreview, setResumePreview] = useState<{
    applicationId: string;
    candidateName: string;
    atsScore?: number | null;
    resumeScore?: number | null;
    matchScore?: number | null;
  } | null>(null);

  const input = useMemo(() => ({ matches, applications, internships }), [matches, applications, internships]);
  const rankedCandidates = useMemo(() => hiringAIEngine.rankAllCandidates(input), [input]);
  const recommendedByRole = useMemo(() => hiringAIEngine.buildRecommendedByRoleMap(input), [input]);

  const visibleCandidates = useMemo(() => {
    if (expanded || defaultLimit <= 0) return rankedCandidates;
    return rankedCandidates.slice(0, defaultLimit);
  }, [rankedCandidates, expanded, defaultLimit]);

  // defaultLimit <= 0 means "show all" (see visibleCandidates above) -- the
  // expand/collapse toggle is meaningless in that mode and would otherwise
  // render a nonsensical "Show Top 0" label.
  const canExpand = defaultLimit > 0 && rankedCandidates.length > defaultLimit;

  const sectionActions = (
    <>
      {canExpand ? (
        <Button type="button" size="sm" variant="ghost" onClick={() => setExpanded((value) => !value)}>
          {expanded ? (
            <>
              <AppIcon icon={ChevronUp} size="sm" />
              Show Top {defaultLimit}
            </>
          ) : (
            <>
              <AppIcon icon={ChevronDown} size="sm" />
              View All ({rankedCandidates.length})
            </>
          )}
        </Button>
      ) : null}
      {showViewAllLink ? (
        <Link href="/dashboard/company/matching/ai" className="text-link text-sm font-semibold">
          Full page
        </Link>
      ) : null}
    </>
  );

  return (
    <>
      <CompanyDashboardSection
        id="dashboard-matched-candidates"
        icon={Sparkles}
        title="AI Matched Candidates"
        description={
          defaultLimit > 0
            ? `Top ${defaultLimit} AI-ranked shortlist with explainable match and scheduling intelligence.`
            : "Full AI-ranked shortlist with explainable match and scheduling intelligence."
        }
        actions={sectionActions}
        hideTitle={hideTitle}
      >
        {visibleCandidates.length === 0 ? (
          <CompanyDashboardEmptyState title="No matched candidates available yet." icon={Sparkles} />
        ) : isHrScoped ? (
          <div className="flex flex-col gap-3">
            {visibleCandidates.map((ranked) => {
              const recommended = recommendedByRole.get(ranked.internshipId);
              const isRecommended = recommended?.candidateId === cardKey(ranked);
              return (
                <HrCandidateMatchCard
                  key={`${ranked.internshipId}-${ranked.internProfileId || ranked.match.internProfile?._id || ranked.rankingPosition}`}
                  ranked={ranked}
                  internships={internships}
                  isRecommended={isRecommended}
                  saving={saving}
                  insightOpen={openInsightKey === cardKey(ranked)}
                  onToggleInsight={() =>
                    setOpenInsightKey((current) => (current === cardKey(ranked) ? null : cardKey(ranked)))
                  }
                  onOpenProfile={onOpenProfile}
                  onMessage={onMessage}
                  onViewResume={(applicationId, candidateName) =>
                    setResumePreview({
                      applicationId,
                      candidateName,
                      atsScore: ranked.application?.intern?.resume?.analysis?.categoryScores?.ats,
                      resumeScore: ranked.match.internProfile?.resume?.score ?? ranked.application?.intern?.resume?.score,
                      matchScore: ranked.evaluation.overallScore
                    })
                  }
                  onScheduleInterview={onScheduleInterview}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleCandidates.map((ranked) => {
              const recommended = recommendedByRole.get(ranked.internshipId);
              const isRecommended = recommended?.candidateId === cardKey(ranked);
              return (
                <CandidateCard
                  key={`${ranked.internshipId}-${ranked.internProfileId || ranked.match.internProfile?._id || ranked.rankingPosition}`}
                  ranked={ranked}
                  internships={internships}
                  isRecommended={isRecommended}
                  saving={saving}
                  insightOpen={openInsightKey === cardKey(ranked)}
                  onToggleInsight={() =>
                    setOpenInsightKey((current) => (current === cardKey(ranked) ? null : cardKey(ranked)))
                  }
                  onOpenProfile={onOpenProfile}
                  onMessage={onMessage}
                  onShortlist={onShortlist}
                  onViewResume={onViewResume}
                  onScheduleInterview={onScheduleInterview}
                />
              );
            })}
          </div>
        )}
      </CompanyDashboardSection>

      {isHrScoped ? (
        <ResumePreviewModal
          open={Boolean(resumePreview)}
          applicationId={resumePreview?.applicationId ?? null}
          candidateName={resumePreview?.candidateName}
          atsScore={resumePreview?.atsScore}
          resumeScore={resumePreview?.resumeScore}
          matchScore={resumePreview?.matchScore}
          onClose={() => setResumePreview(null)}
        />
      ) : null}
    </>
  );
}

function cardKey(ranked: RankedCandidate) {
  return ranked.internProfileId || ranked.applicationId || `${ranked.internshipId}-${ranked.rankingPosition}`;
}

type CandidateCardProps = {
  ranked: RankedCandidate;
  internships: CompanyInternship[];
  isRecommended: boolean;
  saving: boolean;
  insightOpen: boolean;
  onToggleInsight: () => void;
  onOpenProfile: (applicationId: string) => void;
  onMessage: (match: CompanyMatchedCandidate, applicationId: string) => void;
  onShortlist: (applicationId: string) => void;
  onViewResume: (applicationId: string) => void;
  onScheduleInterview: (applicationId: string, candidateName: string) => void;
};

function CandidateCard({
  ranked,
  internships,
  isRecommended,
  saving,
  insightOpen,
  onToggleInsight,
  onOpenProfile,
  onMessage,
  onShortlist,
  onViewResume,
  onScheduleInterview
}: CandidateCardProps) {
  const { match, applicationId, application } = ranked;
  const skills = (match.internProfile?.skills || application?.intern?.skills || []).slice(0, 5);
  const candidateName = match.internProfile?.fullName || "Candidate";
  const experience = (application?.intern?.experience || [])[0];
  const explanation = useMemo(() => hiringAIEngine.explainMatch(ranked, internships), [ranked, internships]);

  return (
    <CompanyDashboardItemCard
      highlighted={isRecommended}
      className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5"
    >
      {/* Identity + details — click opens the applicant profile */}
      <button
        type="button"
        className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left transition disabled:cursor-default"
        onClick={() => {
          if (applicationId) onOpenProfile(applicationId);
        }}
        disabled={!applicationId}
      >
        <span className="mt-0.5 flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-[var(--ds-surface-raised)] px-2 text-xs font-bold tabular-nums text-[var(--ds-muted)]">
          #{ranked.rankingPosition}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="ds-h3 truncate">{candidateName}</h3>
            {isRecommended ? (
              <Badge tone="success" className="!px-1.5 !py-0.5 !text-[10px]">
                Recommended Hire
              </Badge>
            ) : null}
          </div>
          <p className="ds-caption mt-0.5 truncate">{match.internshipRole}</p>
          {experience ? (
            <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-[var(--ds-muted)]">
              <AppIcon icon={Briefcase} size="xs" className="text-current" />
              {experience}
            </p>
          ) : null}
          {skills.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {skills.map((skill) => (
                <span
                  key={`${match.internshipId}-${skill}`}
                  className="rounded-md bg-[var(--ds-surface-hover)] px-2 py-0.5 text-xs font-medium text-[var(--ds-muted)]"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </button>

      {/* Match score + quick actions */}
      <div className="flex shrink-0 flex-col gap-3 sm:items-end">
        <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
          <Badge tone="accent" className="!text-sm">
            {ranked.evaluation.overallScore}% Match
          </Badge>
          <span className="text-[10px] text-[var(--ds-muted)]">
            Conf. {ranked.evaluation.confidenceScore}%
            {!isRejectionLanguage(ranked.evaluation.recommendationLevel) ? ` · ${ranked.evaluation.recommendationLevel}` : ""}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <CandidateCompareToggle applicationId={applicationId} />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!applicationId || saving}
            onClick={(event) => {
              event.stopPropagation();
              onToggleInsight();
            }}
          >
            <AppIcon icon={Brain} size="xs" />
            AI Insight
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!applicationId || saving}
            onClick={(event) => {
              event.stopPropagation();
              if (applicationId) onMessage(match, applicationId);
            }}
          >
            Message
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!applicationId || saving}
            onClick={(event) => {
              event.stopPropagation();
              if (applicationId) onViewResume(applicationId);
            }}
          >
            View Resume
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!applicationId || saving}
            className="bg-gradient-to-r from-[var(--ds-gradient-from)] to-[var(--ds-gradient-to)] text-[var(--ds-on-primary)]"
            onClick={(event) => {
              event.stopPropagation();
              if (applicationId) onScheduleInterview(applicationId, candidateName);
            }}
          >
            Schedule Interview
          </Button>
        </div>
      </div>

      <AiMatchInsightModal
        open={insightOpen}
        candidateName={candidateName}
        role={match.internshipRole}
        explanation={explanation}
        evaluation={ranked.evaluation}
        onClose={onToggleInsight}
      />
    </CompanyDashboardItemCard>
  );
}
