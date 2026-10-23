import type {
  CompanyApplication,
  CompanyInternship,
  CompanyMatchedCandidate
} from "@/lib/company-portal";
import { getActiveInternships, normalizeRawStatus } from "@/components/dashboard/hiring/hiring-utils";
import { evaluateCandidateProjects } from "./project-evaluation-engine";
import {
  buildMatchExplanation,
  evaluateCandidate,
  meetsRecommendedHireCriteria
} from "./master-evaluation-engine";
import { setRoleScoringTemplates } from "./role-scoring-config";
import type {
  CandidateRankingInput,
  FunnelAnalytics,
  FunnelStageAnalytics,
  InterviewScheduleSlot,
  MatchExplanation,
  RankedCandidate,
  HiringPrediction,
  BestCandidateRecommendation,
  RoleScoringTemplate
} from "./types";

const FUNNEL_STAGE_DEFS = [
  { key: "applied", label: "Applied", match: new Set(["applied", "on_hold"]) },
  { key: "shortlisted", label: "Shortlisted", match: new Set(["shortlisted"]) },
  {
    key: "interviewed",
    label: "Interviewed",
    match: new Set(["interview_scheduled", "technical_round", "hr_round", "under_review", "reviewed"])
  },
  { key: "selected", label: "Selected", match: new Set(["selected", "offered"]) },
  { key: "rejected", label: "Rejected", match: new Set(["rejected"]) }
] as const;

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function resolveInternship(internshipId: string, internships: CompanyInternship[]) {
  return internships.find((item) => item._id === internshipId);
}

function resolveApplication(
  match: CompanyMatchedCandidate,
  applications: CompanyApplication[]
): CompanyApplication | null {
  const internId = match.internProfile?._id;
  if (!internId) return null;
  return (
    applications.find(
      (application) => application.intern?._id === internId && application.internship?._id === match.internshipId
    ) ?? null
  );
}

function rankMatches(
  matches: CompanyMatchedCandidate[],
  applications: CompanyApplication[],
  internships: CompanyInternship[],
  jobId?: string
): RankedCandidate[] {
  const scopedMatches = jobId ? matches.filter((match) => match.internshipId === jobId) : matches;

  const scored = scopedMatches.map((match) => {
    const application = resolveApplication(match, applications);
    const internship = resolveInternship(match.internshipId, internships);
    const evaluation = evaluateCandidate(match, application, internship);

    return {
      applicationId: application?._id ?? null,
      internshipId: match.internshipId,
      internProfileId: match.internProfile?._id ?? application?.intern?._id ?? null,
      match,
      application,
      matchScore: evaluation.overallScore,
      rankingPosition: 0,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      projectEvaluation: evaluation.projectEvaluation,
      evaluation
    } satisfies RankedCandidate;
  });

  scored.sort((a, b) => {
    if (b.evaluation.overallScore !== a.evaluation.overallScore) {
      return b.evaluation.overallScore - a.evaluation.overallScore;
    }
    if (b.evaluation.confidenceScore !== a.evaluation.confidenceScore) {
      return b.evaluation.confidenceScore - a.evaluation.confidenceScore;
    }
    return String(a.match.internProfile?.fullName || "").localeCompare(String(b.match.internProfile?.fullName || ""));
  });

  return scored.map((item, index) => ({
    ...item,
    rankingPosition: index + 1,
    evaluation: { ...item.evaluation, rankingPosition: index + 1 }
  }));
}

function candidateKey(ranked: RankedCandidate) {
  return ranked.internProfileId || ranked.applicationId || `${ranked.internshipId}-${ranked.rankingPosition}`;
}

function isSelectedStatus(status: string) {
  const normalized = normalizeRawStatus(status);
  return normalized === "selected" || normalized === "offered";
}

function mapCurrentFunnelStage(status: string) {
  const normalized = normalizeRawStatus(status);
  const found = FUNNEL_STAGE_DEFS.find((stage) => stage.match.has(normalized));
  return found?.key || "applied";
}

function daysBetween(start?: string, end?: string) {
  if (!start || !end) return null;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return null;
  return Math.max(0, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
}

function average(values: number[]) {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function computeFunnelAnalyticsInternal(applications: CompanyApplication[]): FunnelAnalytics {
  if (!applications.length) {
    return {
      sufficient: false,
      stages: FUNNEL_STAGE_DEFS.map((stage) => ({
        key: stage.key,
        label: stage.label,
        count: 0,
        avgDaysInStage: null,
        conversionFromPrevious: null,
        dropOffFromPrevious: null
      })),
      efficiencyScore: 0,
      totalCandidates: 0
    };
  }

  const stageCounts: Record<string, number> = Object.fromEntries(FUNNEL_STAGE_DEFS.map((stage) => [stage.key, 0]));
  const stageDurations: Record<string, number[]> = Object.fromEntries(
    FUNNEL_STAGE_DEFS.map((stage) => [stage.key, [] as number[]])
  );

  applications.forEach((application) => {
    const currentStage = mapCurrentFunnelStage(application.status);
    if (currentStage === "rejected") {
      stageCounts.rejected += 1;
      stageCounts.applied += 1;
    } else {
      const rank = FUNNEL_STAGE_DEFS.findIndex((stage) => stage.key === currentStage);
      FUNNEL_STAGE_DEFS.forEach((stage, index) => {
        if (stage.key === "rejected") return;
        if (index <= rank) stageCounts[stage.key] += 1;
      });
    }

    const history = [...(application.stageHistory || [])].sort(
      (a, b) => new Date(a.changedAt || 0).getTime() - new Date(b.changedAt || 0).getTime()
    );

    if (history.length > 0) {
      for (let index = 0; index < history.length; index += 1) {
        const entry = history[index];
        const stageKey = mapCurrentFunnelStage(entry.stage);
        const nextChangedAt = history[index + 1]?.changedAt;
        const duration = daysBetween(entry.changedAt, nextChangedAt || application.updatedAt || new Date().toISOString());
        if (duration !== null) {
          stageDurations[stageKey]?.push(duration);
        }
      }
    } else {
      const appliedDuration = daysBetween(application.createdAt, application.updatedAt || new Date().toISOString());
      if (appliedDuration !== null) stageDurations.applied?.push(appliedDuration);
    }
  });

  const stages: FunnelStageAnalytics[] = FUNNEL_STAGE_DEFS.map((stage, index) => {
    const count = stageCounts[stage.key] || 0;
    const previous = index > 0 ? stageCounts[FUNNEL_STAGE_DEFS[index - 1].key] || 0 : null;
    let conversionFromPrevious: number | null = null;
    let dropOffFromPrevious: number | null = null;

    if (index > 0 && previous !== null && previous > 0) {
      conversionFromPrevious = clampScore((count / previous) * 100);
      dropOffFromPrevious = clampScore(100 - conversionFromPrevious);
    }

    return {
      key: stage.key,
      label: stage.label,
      count,
      avgDaysInStage: average(stageDurations[stage.key] || []),
      conversionFromPrevious,
      dropOffFromPrevious
    };
  });

  const applied = stageCounts.applied || applications.length;
  const selected = stageCounts.selected || 0;
  const interviewed = stageCounts.interviewed || 0;
  const appliedToSelected = applied > 0 ? (selected / applied) * 100 : 0;
  const interviewToSelected = interviewed > 0 ? (selected / interviewed) * 100 : 0;
  const avgPipelineDays = average(
    applications
      .map((application) => daysBetween(application.createdAt, application.updatedAt || new Date().toISOString()))
      .filter((value): value is number => value !== null)
  );
  const speedScore = avgPipelineDays === null ? 50 : clampScore(100 - avgPipelineDays * 3);
  const efficiencyScore = clampScore(appliedToSelected * 0.45 + interviewToSelected * 0.35 + speedScore * 0.2);

  return {
    sufficient: true,
    stages,
    efficiencyScore,
    totalCandidates: applications.length
  };
}

function computeHiringPredictionInternal(jobId: string, input: CandidateRankingInput): HiringPrediction {
  const internship = resolveInternship(jobId, input.internships);
  const jobApps = input.applications.filter((application) => application.internship?._id === jobId);
  const ranked = rankMatches(input.matches, input.applications, input.internships, jobId);
  const funnel = computeFunnelAnalyticsInternal(jobApps);

  const applicantCount = jobApps.length;
  const topScores = ranked.slice(0, Math.min(5, ranked.length)).map((item) => item.evaluation.overallScore);
  const skillDensity = average(topScores) ?? 0;

  const selectedApps = jobApps.filter((application) => isSelectedStatus(application.status));
  const historicalDays = average(
    selectedApps
      .map((application) => daysBetween(application.createdAt, application.updatedAt))
      .filter((value): value is number => value !== null)
  );

  let difficultyLevel: HiringPrediction["difficultyLevel"] = "Hard";
  if (skillDensity >= 72 && applicantCount >= 4) difficultyLevel = "Easy";
  else if (skillDensity >= 52 || applicantCount >= 2) difficultyLevel = "Medium";

  const hiringProbability = clampScore(
    skillDensity * 0.35 + funnel.efficiencyScore * 0.35 + Math.min(applicantCount * 10, 30) * 0.3
  );

  let baseDays = historicalDays ?? (applicantCount > 0 ? 18 : 28);
  if (difficultyLevel === "Easy") baseDays = Math.round(baseDays * 0.75);
  if (difficultyLevel === "Hard") baseDays = Math.round(baseDays * 1.35);
  if (funnel.efficiencyScore < 30) baseDays += 7;

  return {
    jobId,
    role: internship?.role || ranked[0]?.match.internshipRole || "Role",
    sufficient: applicantCount > 0 || ranked.length > 0,
    timeToHireEstimate: `${Math.max(7, baseDays)} days`,
    hiringProbability,
    difficultyLevel
  };
}

function recommendBestCandidateInternal(jobId: string, input: CandidateRankingInput): BestCandidateRecommendation | null {
  const ranked = rankMatches(input.matches, input.applications, input.internships, jobId);
  if (!ranked.length) return null;

  const best = ranked[0];
  const evaluation = best.evaluation;
  const candidateId = candidateKey(best);
  if (!candidateId) return null;

  const meetsCriteria = meetsRecommendedHireCriteria(evaluation, true);
  if (!meetsCriteria && evaluation.overallScore < 60) return null;

  const projectConfidenceWarning =
    evaluation.confidenceScore <= 80
      ? evaluation.projectEvaluation.lowConfidenceWarning || "Insufficient project evidence for strong recommendation"
      : null;

  const whyRecommended = [
    ...evaluation.strengths.slice(0, 3),
    evaluation.topContributors.length ? `Top contributors: ${evaluation.topContributors.join(", ")}` : "",
    evaluation.projectEvaluation.verifiedProjectCount
      ? `${evaluation.projectEvaluation.verifiedProjectCount} verified project(s) evaluated`
      : ""
  ].filter(Boolean);

  let reasonForSelection = evaluation.reasoning;
  if (projectConfidenceWarning && evaluation.confidenceScore <= 80) {
    reasonForSelection = `${reasonForSelection} Note: ${projectConfidenceWarning}.`;
  }

  return {
    candidateId,
    applicationId: best.applicationId,
    internshipId: jobId,
    role: best.match.internshipRole,
    candidateName: best.match.internProfile?.fullName || "Candidate",
    matchScore: evaluation.overallScore,
    overallScore: evaluation.overallScore,
    confidenceScore: evaluation.confidenceScore,
    recommendationLevel: evaluation.recommendationLevel,
    reasonForSelection,
    projectConfidenceWarning,
    whyRecommended,
    evaluation
  };
}

const hiringAIEngineCore = {
  id: "advanced_ai_hiring_evaluation_engine",

  configureRoleTemplates(templates: RoleScoringTemplate[]) {
    setRoleScoringTemplates(templates);
  },

  evaluateCandidate(match: CompanyMatchedCandidate, application: CompanyApplication | null, internship?: CompanyInternship) {
    return evaluateCandidate(match, application, internship);
  },

  rankCandidates(jobId: string, input: CandidateRankingInput) {
    return rankMatches(input.matches, input.applications, input.internships, jobId);
  },

  rankAllCandidates(input: CandidateRankingInput) {
    return rankMatches(input.matches, input.applications, input.internships);
  },

  getTopCandidates(input: CandidateRankingInput, limit = 10) {
    return hiringAIEngineCore.rankAllCandidates(input).slice(0, limit);
  },

  evaluateProjects(
    application: CompanyApplication | null,
    match: CompanyMatchedCandidate | null,
    requiredSkills: string[] = [],
    preferredSkills: string[] = []
  ) {
    return evaluateCandidateProjects(application, match, requiredSkills, preferredSkills);
  },

  explainMatch(ranked: RankedCandidate, _internships: CompanyInternship[]) {
    return hiringAIEngineCore.generateMatchExplanation(ranked, _internships);
  },

  generateMatchExplanation(ranked: RankedCandidate, _internships: CompanyInternship[]): MatchExplanation {
    void _internships;
    if (
      ranked.evaluation.strengths.length === 0 &&
      ranked.evaluation.weaknesses.length === 0 &&
      !ranked.projectEvaluation.sufficient
    ) {
      return {
        sufficient: false,
        skillAlignment: [],
        projectRelevance: "Insufficient data for AI analysis",
        experienceMatch: "Insufficient data for AI analysis",
        overallReasoning: "Insufficient data for AI analysis",
        projectInsights: [],
        projectConfidenceWarning: ranked.projectEvaluation.lowConfidenceWarning
      };
    }

    return buildMatchExplanation(ranked.evaluation, ranked.rankingPosition);
  },

  computeFunnelAnalytics(applications: CompanyApplication[]): FunnelAnalytics {
    return computeFunnelAnalyticsInternal(applications);
  },

  buildInterviewPayload(slot: InterviewScheduleSlot) {
    const payload: {
      roundType: string;
      interviewDate: string;
      interviewTime: string;
      durationMinutes?: number;
      timezone?: string;
      interviewers?: Array<{ name: string; role?: string }>;
      mode: "online" | "offline" | "";
      meetingLink?: string;
      location?: string;
      notes?: string;
    } = {
      roundType: slot.roundType,
      interviewDate: slot.interviewDate,
      interviewTime: slot.interviewTime,
      mode: slot.mode || "online"
    };
    const meetingLink = slot.meetingLink?.trim();
    const location = slot.location?.trim();
    const notes = slot.notes?.trim();
    if (meetingLink) payload.meetingLink = meetingLink;
    if (location) payload.location = location;
    if (notes) payload.notes = notes;
    if (slot.durationMinutes) payload.durationMinutes = slot.durationMinutes;
    if (slot.timezone) payload.timezone = slot.timezone;
    if (slot.interviewers && slot.interviewers.length > 0) payload.interviewers = slot.interviewers;
    return payload;
  },

  scheduleInterview(_candidateId: string, slot: InterviewScheduleSlot) {
    return hiringAIEngineCore.buildInterviewPayload(slot);
  },

  computeHiringPrediction(jobId: string, input: CandidateRankingInput): HiringPrediction {
    return computeHiringPredictionInternal(jobId, input);
  },

  computeAllHiringPredictions(input: CandidateRankingInput) {
    return getActiveInternships(input.internships).map((internship) =>
      computeHiringPredictionInternal(internship._id, input)
    );
  },

  recommendBestCandidate(jobId: string, input: CandidateRankingInput) {
    return recommendBestCandidateInternal(jobId, input);
  },

  recommendBestCandidatesByRole(input: CandidateRankingInput) {
    return getActiveInternships(input.internships)
      .map((internship) => recommendBestCandidateInternal(internship._id, input))
      .filter((item): item is BestCandidateRecommendation => item !== null);
  },

  buildRecommendedByRoleMap(input: CandidateRankingInput) {
    const map = new Map<string, BestCandidateRecommendation>();
    hiringAIEngineCore.recommendBestCandidatesByRole(input).forEach((item) => {
      map.set(item.internshipId, item);
    });
    return map;
  }
};

export const hiringAIEngine = hiringAIEngineCore;
export const candidateAIEngine = hiringAIEngineCore;

export type {
  RankedCandidate,
  MatchExplanation,
  FunnelAnalytics,
  InterviewScheduleSlot,
  HiringPrediction,
  BestCandidateRecommendation,
  CandidateEvaluation,
  RoleScoringTemplate
} from "./types";

export { evaluateCandidateProjects } from "./project-evaluation-engine";
export { evaluateCandidate, buildMatchExplanation } from "./master-evaluation-engine";
export {
  DEFAULT_ROLE_TEMPLATES,
  getRoleScoringTemplates,
  setRoleScoringTemplates,
  validateScoringWeights,
  previewWeightedScore
} from "./role-scoring-config";
