import type { CompanyApplication, CompanyInternship, CompanyMatchedCandidate } from "@/lib/company-portal";
import type { BadgeTone } from "@/components/ui/badge";

// Canonical status→color mapping shared across the company dashboard so the same
// stage/status always reads the same color regardless of which card renders it.
export const PIPELINE_STAGE_TONE: Record<string, BadgeTone> = {
  applied: "warning",
  reviewed: "neutral",
  shortlisted: "success",
  interview: "info",
  interview_scheduled: "info",
  interviewed: "info",
  selected: "emerald",
  rejected: "danger"
};

export const INTERVIEW_STATUS_TONE: Record<string, BadgeTone> = {
  scheduled: "info",
  completed: "purple",
  cleared: "success",
  rejected: "danger",
  cancelled: "neutral",
  no_show: "warning"
};

export const EXTENDED_PIPELINE_STAGES = [
  { key: "applied", label: "Applied" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview_scheduled", label: "Interview Scheduled" },
  { key: "interviewed", label: "Interviewed" },
  { key: "selected", label: "Selected" }
] as const;

export type ExtendedPipelineStageKey = (typeof EXTENDED_PIPELINE_STAGES)[number]["key"];

export function normalizeToExtendedStage(status: string): ExtendedPipelineStageKey {
  const normalized = normalizeRawStatus(status);
  if (normalized === "shortlisted") return "shortlisted";
  if (["interview_scheduled", "technical_round", "hr_round", "interview"].includes(normalized)) {
    return "interview_scheduled";
  }
  if (normalized === "interview_completed") return "interviewed";
  if (normalized === "selected" || normalized === "offered") return "selected";
  if (normalized === "rejected") return "applied";
  return "applied";
}

export function computeExtendedStageCounts(applications: CompanyApplication[]) {
  const counts: Record<ExtendedPipelineStageKey, number> = {
    applied: 0,
    shortlisted: 0,
    interview_scheduled: 0,
    interviewed: 0,
    selected: 0
  };
  applications.forEach((application) => {
    const normalized = normalizeRawStatus(application.status);
    if (normalized === "rejected" || normalized === "withdrawn") return;
    counts[normalizeToExtendedStage(application.status)] += 1;
  });
  return counts;
}

export function countOffersSent(applications: CompanyApplication[]) {
  return applications.filter((application) =>
    ["selected", "offered"].includes(normalizeRawStatus(application.status))
  ).length;
}

export const HIRING_FLOW_STAGES = [
  { key: "applied", label: "Applied" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview", label: "Interview" },
  { key: "selected", label: "Selected" },
  { key: "rejected", label: "Rejected" }
] as const;

export type HiringFlowStageKey = (typeof HIRING_FLOW_STAGES)[number]["key"];

export function normalizeRawStatus(status: string) {
  const value = String(status || "").toLowerCase();
  if (value === "screening" || value === "reviewed") return "under_review";
  if (value === "offered") return "selected";
  if (value === "interview") return "interview_scheduled";
  return value;
}

export function normalizeToFlowStage(status: string): HiringFlowStageKey {
  const normalized = normalizeRawStatus(status);
  if (normalized === "shortlisted") return "shortlisted";
  if (["interview_scheduled", "technical_round", "hr_round", "under_review"].includes(normalized)) {
    return "interview";
  }
  if (normalized === "selected") return "selected";
  if (normalized === "rejected") return "rejected";
  return "applied";
}

export function computeFlowStageCounts(applications: CompanyApplication[]) {
  const counts: Record<HiringFlowStageKey, number> = {
    applied: 0,
    shortlisted: 0,
    interview: 0,
    selected: 0,
    rejected: 0
  };
  applications.forEach((application) => {
    const stage = normalizeToFlowStage(application.status);
    counts[stage] += 1;
  });
  return counts;
}

export function countApplicationsForJob(applications: CompanyApplication[], internshipId: string) {
  return applications.filter((application) => application.internship?._id === internshipId).length;
}

export function getActiveInternships(internships: CompanyInternship[]) {
  return internships.filter((internship) => internship.isActive);
}

export function getShortlistedCandidates(applications: CompanyApplication[], limit = 8) {
  return applications
    .filter((application) => normalizeToFlowStage(application.status) === "shortlisted")
    .sort((a, b) => (b.relevanceScore ?? b.matchScore ?? 0) - (a.relevanceScore ?? a.matchScore ?? 0))
    .slice(0, limit);
}

export const OVERVIEW_PIPELINE_STAGES = [
  { key: "applied", label: "Applied" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview", label: "Interview" },
  { key: "selected", label: "Selected" }
] as const;

export function findApplicationForMatch(match: CompanyMatchedCandidate, applications: CompanyApplication[]) {
  const internId = match.internProfile?._id;
  if (!internId) return null;
  return (
    applications.find(
      (application) => application.intern?._id === internId && application.internship?._id === match.internshipId
    ) ?? null
  );
}

export function countInterviewStageCandidates(applications: CompanyApplication[]) {
  return computeFlowStageCounts(applications).interview;
}

export const HIRING_PIPELINE_STAGES = [
  { key: "applied", label: "Applied" },
  { key: "reviewed", label: "Reviewed" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview", label: "Interview" },
  { key: "selected", label: "Selected" },
  { key: "rejected", label: "Rejected" }
] as const;

export type HiringPipelineStageKey = (typeof HIRING_PIPELINE_STAGES)[number]["key"];

export function normalizeToPipelineStage(status: string): HiringPipelineStageKey {
  const normalized = normalizeRawStatus(status);
  if (normalized === "rejected" || normalized === "withdrawn") return "rejected";
  if (normalized === "selected") return "selected";
  if (["interview_scheduled", "technical_round", "hr_round"].includes(normalized)) return "interview";
  if (normalized === "shortlisted") return "shortlisted";
  if (normalized === "under_review" || normalized === "on_hold") return "reviewed";
  return "applied";
}

export function computePipelineStageCounts(applications: CompanyApplication[]) {
  const counts: Record<HiringPipelineStageKey, number> = {
    applied: 0,
    reviewed: 0,
    shortlisted: 0,
    interview: 0,
    selected: 0,
    rejected: 0
  };
  applications.forEach((application) => {
    counts[normalizeToPipelineStage(application.status)] += 1;
  });
  return counts;
}

export function countOffersPending(applications: CompanyApplication[]) {
  return applications.filter((application) => String(application.status || "").toLowerCase() === "offered").length;
}

export function computeAcceptanceRate(applications: CompanyApplication[]) {
  const offered = applications.filter((application) => String(application.status || "").toLowerCase() === "offered").length;
  const selected = applications.filter((application) => String(application.status || "").toLowerCase() === "selected").length;
  const total = offered + selected;
  return total > 0 ? Math.round((selected / total) * 100) : 0;
}

export function computeInterviewRate(applications: CompanyApplication[]) {
  if (applications.length === 0) return 0;
  const reached = applications.filter((application) => {
    const stage = normalizeToPipelineStage(application.status);
    return stage === "interview" || stage === "selected";
  }).length;
  return Math.round((reached / applications.length) * 100);
}

export function computeHiringProgress(applications: CompanyApplication[]) {
  if (applications.length === 0) return 0;
  const advanced = applications.filter((application) => normalizeToPipelineStage(application.status) !== "applied").length;
  return Math.round((advanced / applications.length) * 100);
}

export function getMatchScore(application: CompanyApplication) {
  return application.relevanceScore ?? application.matchScore ?? null;
}

export function getSkillPreview(application: CompanyApplication, max = 5) {
  const skills = application.intern?.skills || [];
  return skills.slice(0, max);
}

export function getInterviewStageCandidates(applications: CompanyApplication[]) {
  return applications.filter((application) => normalizeToFlowStage(application.status) === "interview");
}
