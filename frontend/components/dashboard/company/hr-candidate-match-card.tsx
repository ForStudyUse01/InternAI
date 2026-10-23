"use client";

import { useMemo } from "react";
import {
  Award,
  Brain,
  Briefcase,
  FolderGit2,
  GraduationCap,
  MapPin,
  ScrollText,
  UserRound
} from "lucide-react";
import type { CompanyInternship, CompanyMatchedCandidate } from "@/lib/company-portal";
import { hiringAIEngine, type RankedCandidate } from "@/lib/ai-hiring";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { AppIcon } from "@/components/icons/app-icon";
import { cn, isRejectionLanguage } from "@/lib/utils";
import { normalizeToFlowStage, PIPELINE_STAGE_TONE } from "@/components/dashboard/hiring/hiring-utils";
import dynamic from "next/dynamic";

const AiMatchInsightModal = dynamic(() => import("./ai-match-insight-modal").then((m) => m.AiMatchInsightModal), {
  ssr: false
});
import { CompanyDashboardItemCard } from "./company-dashboard-layout";
import { CandidateCompareToggle } from "./candidate-compare-toggle";
import { initialsFirstLast as initialsFor, gradientForName as gradientFor } from "@/components/dashboard/shared/avatar-initials";

const STATUS_LABEL: Record<string, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  interview: "Interview",
  selected: "Selected",
  rejected: "Rejected"
};

const RECOMMENDATION_TONE: Record<string, BadgeTone> = {
  "Highly Recommended": "success",
  "Strong Candidate": "success",
  Consider: "info",
  "Potential Fit": "warning"
};

function parseEducation(entry?: string) {
  if (!entry) return { degree: "", college: "" };
  const parts = entry.split(" - ").map((part) => part.trim());
  if (parts.length >= 2) return { degree: parts[0], college: parts.slice(1).join(" - ") };
  return { degree: entry, college: "" };
}

function modeLabel(mode?: string) {
  if (mode === "on-site") return "On-site";
  if (mode === "remote") return "Remote";
  if (mode === "hybrid") return "Hybrid";
  return "";
}

type HrCandidateMatchCardProps = {
  ranked: RankedCandidate;
  internships: CompanyInternship[];
  isRecommended: boolean;
  saving: boolean;
  insightOpen: boolean;
  onToggleInsight: () => void;
  onOpenProfile: (applicationId: string) => void;
  onMessage: (match: CompanyMatchedCandidate, applicationId: string) => void;
  onViewResume: (applicationId: string, candidateName: string) => void;
  onScheduleInterview: (applicationId: string, candidateName: string) => void;
};

export function HrCandidateMatchCard({
  ranked,
  internships,
  isRecommended,
  saving,
  insightOpen,
  onToggleInsight,
  onOpenProfile,
  onMessage,
  onViewResume,
  onScheduleInterview
}: HrCandidateMatchCardProps) {
  const { match, applicationId, application } = ranked;
  const candidateName = match.internProfile?.fullName || "Candidate";
  const skills = (match.internProfile?.skills || application?.intern?.skills || []).slice(0, 5);
  const totalSkills = (match.internProfile?.skills || application?.intern?.skills || []).length;
  const explanation = useMemo(() => hiringAIEngine.explainMatch(ranked, internships), [ranked, internships]);
  const internship = useMemo(
    () => internships.find((item) => item._id === ranked.internshipId),
    [internships, ranked.internshipId]
  );

  const { degree, college } = parseEducation(application?.intern?.education?.[0]);
  const experienceEntries = application?.intern?.experience || [];
  const certificationsCount = (application?.intern?.certifications || []).length;
  const projectsCount = (application?.intern?.projects || []).length;
  const resumeScore = match.internProfile?.resume?.score ?? application?.intern?.resume?.score;
  const atsScore = application?.intern?.resume?.analysis?.categoryScores?.ats;
  const resumeSummary = application?.intern?.summary?.trim();
  const roleLocation = match.internshipLocation || application?.internship?.location || internship?.location;
  const roleModeRaw = modeLabel(internship?.mode);
  const roleMode = roleModeRaw && roleModeRaw.toLowerCase() !== (roleLocation || "").toLowerCase() ? roleModeRaw : "";

  const statusStage = application ? normalizeToFlowStage(application.status) : null;
  const showRecommendationBadge = !isRejectionLanguage(ranked.evaluation.recommendationLevel);

  const gradient = gradientFor(candidateName);

  return (
    <CompanyDashboardItemCard highlighted={isRecommended} className="group !h-auto w-full overflow-hidden p-0">
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] xl:items-start">
        {/* LEFT — identity */}
        <button
          type="button"
          className="flex min-w-0 items-start gap-3 text-left xl:border-r xl:border-[var(--ds-border)] xl:pr-5"
          onClick={() => {
            if (applicationId) onOpenProfile(applicationId);
          }}
          disabled={!applicationId}
        >
          <span
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-[var(--ds-on-primary)] shadow-soft",
              gradient
            )}
          >
            {initialsFor(candidateName)}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="neutral" className="!px-1.5 !py-0.5 !text-[10px]">
                #{ranked.rankingPosition}
              </Badge>
              {isRecommended ? (
                <Badge tone="success" className="!px-1.5 !py-0.5 !text-[10px]">
                  Recommended Hire
                </Badge>
              ) : null}
            </div>
            <h3 className="ds-h3 mt-1 truncate">{candidateName}</h3>

            <div className="mt-1.5 flex flex-col gap-1 text-xs text-[var(--ds-muted)]">
              {college ? (
                <span className="flex items-center gap-1.5 truncate">
                  <AppIcon icon={GraduationCap} size="xs" />
                  <span className="truncate">{college}</span>
                </span>
              ) : null}
              {degree ? (
                <span className="flex items-center gap-1.5 truncate pl-5">{degree}</span>
              ) : null}
              {experienceEntries.length > 0 ? (
                <span className="flex items-center gap-1.5 truncate">
                  <AppIcon icon={Briefcase} size="xs" />
                  <span className="truncate">{experienceEntries[0]}</span>
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="ds-caption inline-flex items-center gap-1 truncate rounded-md bg-[var(--ds-surface-hover)] px-2 py-0.5 !text-[10px]">
                {match.internshipRole}
              </span>
              {roleLocation ? (
                <span className="ds-caption inline-flex items-center gap-1.5 truncate rounded-md bg-[var(--ds-surface-hover)] px-2 py-0.5 !text-[10px]">
                  <AppIcon icon={MapPin} size="xs" />
                  {roleLocation}
                </span>
              ) : null}
              {roleMode ? (
                <span className="ds-caption inline-flex items-center gap-1 rounded-md bg-[var(--ds-surface-hover)] px-2 py-0.5 !text-[10px]">
                  {roleMode}
                </span>
              ) : null}
            </div>
          </div>
        </button>

        {/* CENTER — skills, portfolio signal, summary */}
        <div className="min-w-0 xl:border-r xl:border-[var(--ds-border)] xl:pr-6">
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill) => (
                <span
                  key={`${match.internshipId}-${skill}`}
                  className="rounded-md bg-[var(--ds-surface-hover)] px-2 py-0.5 text-xs font-medium text-[var(--ds-muted)]"
                >
                  {skill}
                </span>
              ))}
              {totalSkills > skills.length ? (
                <span className="rounded-md bg-[var(--ds-surface-hover)] px-2 py-0.5 text-xs font-medium text-[var(--ds-muted)]">
                  +{totalSkills - skills.length}
                </span>
              ) : null}
            </div>
          ) : (
            <p className="ds-caption">No listed skills.</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--ds-muted)]">
            <span className="flex items-center gap-1.5">
              <AppIcon icon={Award} size="xs" />
              {certificationsCount} certification{certificationsCount === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-1.5">
              <AppIcon icon={FolderGit2} size="xs" />
              {projectsCount} project{projectsCount === 1 ? "" : "s"}
            </span>
          </div>

          {resumeSummary ? (
            <p className="ds-caption mt-3 line-clamp-2 italic leading-relaxed">&ldquo;{resumeSummary}&rdquo;</p>
          ) : null}
        </div>

        {/* RIGHT — scores & badges */}
        <div className="flex flex-row gap-3 xl:w-44 xl:flex-none xl:flex-col">
          <div className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border border-[var(--ds-border-strong)] bg-[var(--ds-surface-raised)] px-3 py-2 text-center">
            <span className="ds-label text-[10px] leading-none">AI Match</span>
            <span className="text-xl font-extrabold leading-tight text-[var(--ds-accent)]">
              {ranked.evaluation.overallScore}%
            </span>
          </div>
          <div className="flex flex-1 gap-2 xl:flex-row">
            <ScorePill label="ATS" value={atsScore} />
            <ScorePill label="Resume" value={resumeScore} />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 xl:justify-center">
            {showRecommendationBadge ? (
              <Badge
                tone={RECOMMENDATION_TONE[ranked.evaluation.recommendationLevel] || "neutral"}
                className="!px-1.5 !py-0.5 !text-[10px]"
              >
                {ranked.evaluation.recommendationLevel}
              </Badge>
            ) : null}
            {statusStage ? (
              <Badge tone={PIPELINE_STAGE_TONE[statusStage] || "neutral"} className="!px-1.5 !py-0.5 !text-[10px]">
                {STATUS_LABEL[statusStage] || statusStage}
              </Badge>
            ) : null}
          </div>
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

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--ds-border)] px-4 py-3 sm:px-5">
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
            if (applicationId) onOpenProfile(applicationId);
          }}
        >
          <AppIcon icon={UserRound} size="xs" />
          View Profile
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
            if (applicationId) onViewResume(applicationId, candidateName);
          }}
        >
          <AppIcon icon={ScrollText} size="xs" />
          Resume Preview
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!applicationId || saving}
          className="bg-gradient-to-r from-[var(--ds-gradient-from)] to-[var(--ds-gradient-to)] text-[var(--ds-on-primary)] hover:opacity-90"
          onClick={(event) => {
            event.stopPropagation();
            if (applicationId) onScheduleInterview(applicationId, candidateName);
          }}
        >
          Schedule Interview
        </Button>
      </div>
    </CompanyDashboardItemCard>
  );
}

function ScorePill({ label, value }: { label: string; value?: number | null }) {
  const hasValue = typeof value === "number" && !Number.isNaN(value);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2 text-center">
      <span className="ds-label text-[10px] leading-none">{label}</span>
      <span className="text-sm font-bold leading-none">{hasValue ? `${Math.round(value as number)}%` : "—"}</span>
    </div>
  );
}
