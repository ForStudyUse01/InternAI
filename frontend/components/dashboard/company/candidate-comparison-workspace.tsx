"use client";

import { useMemo } from "react";
import { safeUrl } from "@/lib/safe-url";
import {
  Award,
  Briefcase,
  Calendar,
  FolderGit2,
  GitCompare,
  GraduationCap,
  Languages as LanguagesIcon,
  Link2,
  MessageSquare,
  ScrollText,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  UserX,
  X
} from "lucide-react";
import type { CompanyApplication, CompanyInternship, CompanyMatchedCandidate } from "@/lib/company-portal";
import type { PortfolioSummary } from "@/lib/portfolio-types";
import { hiringAIEngine, type RankedCandidate } from "@/lib/ai-hiring";
import { normalizeToPipelineStage, PIPELINE_STAGE_TONE, INTERVIEW_STATUS_TONE } from "@/components/dashboard/hiring/hiring-utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { AppIcon } from "@/components/icons/app-icon";
import { initialsFirstLast as initialsFor } from "@/components/dashboard/shared/avatar-initials";
import { cn } from "@/lib/utils";
import { useCandidateCompare } from "./candidate-comparison-context";

const RECOMMENDATION_TONE: Record<string, BadgeTone> = {
  "Highly Recommended": "success",
  "Strong Candidate": "success",
  Consider: "info",
  "Potential Fit": "warning",
  "Not Recommended Currently": "danger"
};

const AVATAR_GRADIENTS = [
  "from-[var(--ds-chart-1)] to-[var(--ds-chart-2)]",
  "from-[var(--ds-chart-3)] to-[var(--ds-chart-4)]",
  "from-[var(--ds-chart-5)] to-[var(--ds-chart-6)]",
  "from-[var(--ds-chart-2)] to-[var(--ds-chart-4)]"
];

function dedupe(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function latestInterviewStage(application: CompanyApplication | null) {
  const rounds = application?.interviewRounds || [];
  if (rounds.length === 0) return null;
  const latest = [...rounds].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.interviewDate || 0).getTime();
    const bTime = new Date(b.updatedAt || b.interviewDate || 0).getTime();
    return bTime - aTime;
  })[0];
  return latest;
}

type CompareEntry = {
  applicationId: string;
  ranked: RankedCandidate;
  candidateName: string;
  roleApplied: string;
  resumeScore: number | null;
  atsScore: number | null;
  aiMatchScore: number;
  confidenceScore: number;
  recommendationLevel: string;
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
  skills: string[];
  missingSkills: string[];
  projects: string[];
  certifications: string[];
  experience: string[];
  education: string[];
  languages: string[];
  portfolio: PortfolioSummary | null;
  applicationStage: string;
  interviewStage: { roundType?: string; status?: string } | null;
};

function matchFromApplication(application: CompanyApplication): CompanyMatchedCandidate {
  const intern = application.intern;
  return {
    internshipId: application.internship?._id ?? "",
    internshipRole: application.internship?.role ?? "Role",
    internshipLocation: application.internship?.location,
    score: application.relevanceScore ?? application.matchScore ?? 0,
    internProfile: {
      _id: intern?._id,
      fullName: intern?.fullName,
      email: intern?.email,
      mobile: intern?.mobile,
      skills: intern?.skills,
      resume: intern?.resume ? { score: intern.resume.score } : undefined
    }
  };
}

function buildEntry(ranked: RankedCandidate): CompareEntry {
  const { match, application, applicationId } = ranked;
  const intern = application?.intern;
  const latestRound = latestInterviewStage(application);
  return {
    applicationId: applicationId || "",
    ranked,
    candidateName: match.internProfile?.fullName || intern?.fullName || "Candidate",
    roleApplied: match.internshipRole || application?.internship?.role || "Role",
    resumeScore: match.internProfile?.resume?.score ?? intern?.resume?.score ?? null,
    atsScore: intern?.resume?.analysis?.categoryScores?.ats ?? null,
    aiMatchScore: ranked.evaluation.overallScore,
    confidenceScore: ranked.evaluation.confidenceScore,
    recommendationLevel: ranked.evaluation.recommendationLevel,
    reasoning: ranked.evaluation.reasoning,
    strengths: ranked.evaluation.strengths?.length ? ranked.evaluation.strengths : ranked.strengths,
    weaknesses: ranked.evaluation.weaknesses?.length ? ranked.evaluation.weaknesses : ranked.weaknesses,
    skills: dedupe(intern?.skills || match.internProfile?.skills || []),
    missingSkills: dedupe(match.skillGap?.missing || []),
    projects: dedupe(intern?.projects || []),
    certifications: dedupe(intern?.certifications || []),
    experience: dedupe(intern?.experience || []),
    education: dedupe(intern?.education || []),
    languages: dedupe(intern?.languages || []),
    portfolio: intern?.portfolio ?? null,
    applicationStage: application ? normalizeToPipelineStage(application.status) : "applied",
    interviewStage: latestRound ? { roundType: latestRound.roundType, status: latestRound.status } : null
  };
}

function maxIds(entries: CompareEntry[], selector: (entry: CompareEntry) => number | null) {
  const values = entries.map((entry) => selector(entry)).filter((value): value is number => typeof value === "number");
  if (values.length < 2) return new Set<string>();
  const max = Math.max(...values);
  return new Set(entries.filter((entry) => selector(entry) === max).map((entry) => entry.applicationId));
}

function minIds(entries: CompareEntry[], selector: (entry: CompareEntry) => number | null) {
  const values = entries.map((entry) => selector(entry)).filter((value): value is number => typeof value === "number");
  if (values.length < 2) return new Set<string>();
  const min = Math.min(...values);
  if (min === Math.max(...values)) return new Set<string>();
  return new Set(entries.filter((entry) => selector(entry) === min).map((entry) => entry.applicationId));
}

function ScoreCell({
  label,
  value,
  highest,
  lowest
}: {
  label: string;
  value: number | null;
  highest: boolean;
  lowest: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-2 text-center",
        highest
          ? "border-[var(--ds-success)] bg-[var(--ds-success-bg)]"
          : lowest
            ? "border-[var(--ds-danger)]/50 bg-[var(--ds-danger-bg)]"
            : "border-[var(--ds-border)] bg-[var(--ds-surface)]"
      )}
    >
      <span className="ds-label text-[10px] leading-none">{label}</span>
      <span className={cn("text-sm font-bold leading-none", highest && "text-[var(--ds-success)]")}>
        {typeof value === "number" ? `${Math.round(value)}%` : "—"}
        {highest ? <span className="sr-only"> (highest)</span> : null}
        {lowest ? <span className="sr-only"> (lowest)</span> : null}
      </span>
    </div>
  );
}

function ListDiff({
  icon,
  label,
  items,
  highlight
}: {
  icon: typeof Award;
  label: string;
  items: string[];
  highlight: boolean;
}) {
  return (
    <div>
      <p className="ds-label flex items-center gap-1.5 text-[10px]">
        <AppIcon icon={icon} size="xs" />
        {label}
        <span className={cn("ml-auto font-bold", highlight ? "text-[var(--ds-success)]" : "text-[var(--ds-muted)]")}>
          {items.length}
        </span>
      </p>
      {items.length === 0 ? (
        <p className="ds-caption mt-1 text-xs">None listed</p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {items.slice(0, 3).map((item, index) => (
            <li key={`${label}-${index}`} className="truncate text-xs text-[var(--ds-text)]">
              {item}
            </li>
          ))}
          {items.length > 3 ? <li className="text-[11px] text-[var(--ds-muted)]">+{items.length - 3} more</li> : null}
        </ul>
      )}
    </div>
  );
}

type CandidateComparisonWorkspaceProps = {
  applications: CompanyApplication[];
  matches: CompanyMatchedCandidate[];
  internships: CompanyInternship[];
  saving?: boolean;
  onOpenProfile: (applicationId: string) => void;
  onViewResume: (applicationId: string) => void;
  onScheduleInterview: (applicationId: string, candidateName: string) => void;
  onMessage: (match: CompanyMatchedCandidate, applicationId: string) => void;
  onShortlist: (applicationId: string) => void;
  onReject: (applicationId: string) => void;
};

export function CandidateComparisonWorkspace({
  applications,
  matches,
  internships,
  saving = false,
  onOpenProfile,
  onViewResume,
  onScheduleInterview,
  onMessage,
  onShortlist,
  onReject
}: CandidateComparisonWorkspaceProps) {
  const { selectedIds, workspaceOpen, closeWorkspace, remove } = useCandidateCompare();

  // `matches` is only fetched on Overview / AI Matching. On Applicants, Shortlisted and Pipeline it is
  // empty, so selected applications without a server match get a synthesized one and flow through the
  // same scoring engine; otherwise the modal never opens (entries.length < 2).
  const ranked = useMemo(() => {
    const fromMatches = hiringAIEngine.rankAllCandidates({ matches, applications, internships });
    const matchedApplicationIds = new Set(fromMatches.map((item) => item.applicationId));
    const synthesized = applications
      .filter((application) => selectedIds.includes(application._id) && !matchedApplicationIds.has(application._id))
      .map(matchFromApplication);
    if (synthesized.length === 0) return fromMatches;
    return hiringAIEngine.rankAllCandidates({ matches: [...matches, ...synthesized], applications, internships });
  }, [matches, applications, internships, selectedIds]);

  const entries = useMemo(() => {
    return selectedIds
      .map((id) => ranked.find((item) => item.applicationId === id))
      .filter((item): item is RankedCandidate => Boolean(item))
      .map(buildEntry);
  }, [selectedIds, ranked]);

  const highestMatch = maxIds(entries, (entry) => entry.aiMatchScore);
  const lowestMatch = minIds(entries, (entry) => entry.aiMatchScore);
  const highestResume = maxIds(entries, (entry) => entry.resumeScore);
  const lowestResume = minIds(entries, (entry) => entry.resumeScore);
  const highestAts = maxIds(entries, (entry) => entry.atsScore);
  const lowestAts = minIds(entries, (entry) => entry.atsScore);
  const highestExperience = maxIds(entries, (entry) => entry.experience.length);
  const highestCertifications = maxIds(entries, (entry) => entry.certifications.length);

  const skillCounts = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((entry) => {
      new Set(entry.skills.map((skill) => skill.toLowerCase())).forEach((skill) => {
        counts.set(skill, (counts.get(skill) || 0) + 1);
      });
    });
    return counts;
  }, [entries]);

  const gridColsClass =
    entries.length >= 4 ? "lg:grid-cols-4" : entries.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2";

  return (
    <Modal
      open={workspaceOpen && entries.length >= 2}
      onClose={closeWorkspace}
      title="Candidate Comparison Workspace"
      subtitle={`Comparing ${entries.length} candidate${entries.length === 1 ? "" : "s"} side-by-side.`}
      icon={GitCompare}
      size="xl"
      bodyClassName="!px-3 sm:!px-5"
    >
      <div className={cn("flex flex-col gap-4 sm:flex-row sm:overflow-x-auto sm:pb-2 lg:grid lg:overflow-visible lg:pb-0", gridColsClass)}>
        {entries.map((entry) => {
          const gradient = AVATAR_GRADIENTS[Math.abs(entry.applicationId.length + entry.candidateName.length) % AVATAR_GRADIENTS.length];
          const isBestFit = highestMatch.has(entry.applicationId);
          const commonSkills = entry.skills.filter((skill) => (skillCounts.get(skill.toLowerCase()) || 0) === entries.length && entries.length > 1);
          const uniqueSkills = entry.skills.filter((skill) => (skillCounts.get(skill.toLowerCase()) || 0) === 1 && entries.length > 1);

          return (
            <div
              key={entry.applicationId}
              className="company-dashboard-item-card flex min-w-[280px] shrink-0 flex-col gap-4 sm:min-w-[320px] lg:min-w-0 lg:shrink"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-3 text-left"
                  onClick={() => onOpenProfile(entry.applicationId)}
                >
                  <span
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)] shadow-soft",
                      gradient
                    )}
                  >
                    {initialsFor(entry.candidateName)}
                  </span>
                  <div className="min-w-0">
                    <h3 className="ds-h3 truncate">{entry.candidateName}</h3>
                    <p className="ds-caption truncate">{entry.roleApplied}</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => remove(entry.applicationId)}
                  aria-label={`Remove ${entry.candidateName} from comparison`}
                  className="ds-icon-btn shrink-0"
                >
                  <AppIcon icon={X} size="xs" className="text-current" />
                </button>
              </div>

              {/* Stage badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                {isBestFit ? (
                  <Badge tone="success" className="!px-1.5 !py-0.5 !text-[10px]">
                    Best Fit
                  </Badge>
                ) : null}
                <Badge tone={PIPELINE_STAGE_TONE[entry.applicationStage] || "neutral"} className="capitalize !px-1.5 !py-0.5 !text-[10px]">
                  {entry.applicationStage.replace(/_/g, " ")}
                </Badge>
                {entry.interviewStage ? (
                  <Badge
                    tone={INTERVIEW_STATUS_TONE[entry.interviewStage.status || "scheduled"] || "info"}
                    className="capitalize !px-1.5 !py-0.5 !text-[10px]"
                  >
                    {(entry.interviewStage.status || "scheduled").replace(/_/g, " ")}
                    {entry.interviewStage.roundType ? ` · ${entry.interviewStage.roundType}` : ""}
                  </Badge>
                ) : null}
              </div>

              {/* Scores */}
              <div className="flex gap-2">
                <ScoreCell
                  label="AI Match"
                  value={entry.aiMatchScore}
                  highest={highestMatch.has(entry.applicationId)}
                  lowest={lowestMatch.has(entry.applicationId)}
                />
                <ScoreCell
                  label="Resume"
                  value={entry.resumeScore}
                  highest={highestResume.has(entry.applicationId)}
                  lowest={lowestResume.has(entry.applicationId)}
                />
                <ScoreCell
                  label="ATS"
                  value={entry.atsScore}
                  highest={highestAts.has(entry.applicationId)}
                  lowest={lowestAts.has(entry.applicationId)}
                />
              </div>

              {/* AI Summary (reused evaluation) */}
              <div className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="ds-label text-[10px]">Role Suitability</span>
                  <Badge tone={RECOMMENDATION_TONE[entry.recommendationLevel] || "neutral"} className="!px-1.5 !py-0.5 !text-[10px]">
                    {entry.recommendationLevel}
                  </Badge>
                </div>
                <p className="ds-caption mt-1.5 line-clamp-2 text-xs leading-relaxed">{entry.reasoning}</p>

                {entry.strengths.length > 0 ? (
                  <div className="mt-2 flex items-start gap-1.5">
                    <AppIcon icon={ThumbsUp} size="xs" className="mt-0.5 shrink-0 text-[var(--ds-success)]" />
                    <p className="line-clamp-2 text-xs text-[var(--ds-text)]">{entry.strengths[0]}</p>
                  </div>
                ) : null}
                {entry.weaknesses.length > 0 ? (
                  <div className="mt-1.5 flex items-start gap-1.5">
                    <AppIcon icon={ThumbsDown} size="xs" className="mt-0.5 shrink-0 text-[var(--ds-danger)]" />
                    <p className="line-clamp-2 text-xs text-[var(--ds-text)]">{entry.weaknesses[0]}</p>
                  </div>
                ) : null}
              </div>

              {/* Skills */}
              <div>
                <p className="ds-label text-[10px]">Skills</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {commonSkills.slice(0, 4).map((skill) => (
                    <span key={`common-${skill}`} className="rounded-md bg-[var(--ds-info-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--ds-info)]" title="Common skill">
                      {skill}
                      <span className="sr-only"> (common skill)</span>
                    </span>
                  ))}
                  {uniqueSkills.slice(0, 4).map((skill) => (
                    <span key={`unique-${skill}`} className="rounded-md bg-[var(--ds-success-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--ds-success)]" title="Unique to this candidate">
                      {skill}
                      <span className="sr-only"> (unique to this candidate)</span>
                    </span>
                  ))}
                  {entry.skills
                    .filter((skill) => !commonSkills.includes(skill) && !uniqueSkills.includes(skill))
                    .slice(0, 3)
                    .map((skill) => (
                      <span key={`shared-${skill}`} className="rounded-md bg-[var(--ds-surface-raised)] px-2 py-0.5 text-[11px] font-medium text-[var(--ds-muted)]">
                        {skill}
                      </span>
                    ))}
                </div>
                {entry.missingSkills.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {entry.missingSkills.slice(0, 4).map((skill) => (
                      <span key={`missing-${skill}`} className="rounded-md bg-[var(--ds-danger-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--ds-danger)]" title="Missing skill">
                        {skill}
                        <span className="sr-only"> (missing skill)</span>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Projects / Certifications / Experience / Education / Languages */}
              <div className="grid grid-cols-2 gap-3">
                <ListDiff icon={FolderGit2} label="Projects" items={entry.projects} highlight={false} />
                <ListDiff
                  icon={Award}
                  label="Certifications"
                  items={entry.certifications}
                  highlight={highestCertifications.has(entry.applicationId)}
                />
                <ListDiff
                  icon={Briefcase}
                  label="Experience"
                  items={entry.experience}
                  highlight={highestExperience.has(entry.applicationId)}
                />
                <ListDiff icon={GraduationCap} label="Education" items={entry.education} highlight={false} />
                <ListDiff icon={LanguagesIcon} label="Languages" items={entry.languages} highlight={false} />
                <div>
                  <p className="ds-label flex items-center gap-1.5 text-[10px]">
                    <AppIcon icon={Link2} size="xs" />
                    Portfolio
                  </p>
                  {entry.portfolio ? (
                    <a
                      href={safeUrl(entry.portfolio.portfolioUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-link mt-1 inline-block truncate text-xs"
                    >
                      View portfolio
                      <span className="sr-only"> (opens in new tab)</span>
                    </a>
                  ) : (
                    <p className="ds-caption mt-1 text-xs">Not published</p>
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div className="mt-auto grid grid-cols-2 gap-2 border-t border-[var(--ds-border)] pt-3">
                <Button type="button" size="sm" variant="ghost" onClick={() => onOpenProfile(entry.applicationId)}>
                  <AppIcon icon={UserRound} size="xs" />
                  Profile
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => onViewResume(entry.applicationId)}>
                  <AppIcon icon={ScrollText} size="xs" />
                  Resume
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => onScheduleInterview(entry.applicationId, entry.candidateName)}
                >
                  <AppIcon icon={Calendar} size="xs" />
                  Interview
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => onMessage(entry.ranked.match, entry.applicationId)}
                >
                  <AppIcon icon={MessageSquare} size="xs" />
                  Message
                </Button>
                <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => onShortlist(entry.applicationId)}>
                  Shortlist
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  className="text-[var(--ds-danger)] hover:bg-[var(--ds-danger-bg)]"
                  onClick={() => onReject(entry.applicationId)}
                >
                  <AppIcon icon={UserX} size="xs" />
                  Reject
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
