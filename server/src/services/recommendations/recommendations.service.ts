import { InternshipModel } from "../../models/Internship";
import { ResumeModel } from "../../models/Resume";
import type { AuthenticatedUser } from "../../types/auth";
import { normalizeSkillArray } from "../common/skill-normalizer";
import { buildPaginationMeta, resolvePaginationParams } from "../common/pagination";

interface InternshipRecommendation {
  internship: {
    id: string;
    title: string;
    description: string;
    location: string;
    duration: string;
    stipend: string;
    requiredSkills: string[];
    preferredSkills: string[];
    status: string;
  };
  requiredMatch: number;
  preferredMatch: number;
  overallScore: number;
  missingRequiredSkills: string[];
  missingPreferredSkills: string[];
}

function roundToWhole(value: number): number {
  return Math.round(value);
}

function computeMatchScore(skillPool: Set<string>, targetSkills: string[]): number {
  if (targetSkills.length === 0) {
    return 0;
  }

  const matchedCount = targetSkills.filter((skill) => skillPool.has(skill)).length;
  return roundToWhole((matchedCount / targetSkills.length) * 100);
}

function computeMissingSkills(skillPool: Set<string>, targetSkills: string[]): string[] {
  return targetSkills.filter((skill) => !skillPool.has(skill));
}

export function calculateRecommendationForInternship(
  internSkillsRaw: unknown,
  requiredSkillsRaw: unknown,
  preferredSkillsRaw: unknown
): Omit<InternshipRecommendation, "internship"> {
  const internSkills = normalizeSkillArray(internSkillsRaw);
  const requiredSkills = normalizeSkillArray(requiredSkillsRaw);
  const preferredSkills = normalizeSkillArray(preferredSkillsRaw);

  const skillPool = new Set(internSkills);

  const requiredMatch = computeMatchScore(skillPool, requiredSkills);
  const preferredMatch = computeMatchScore(skillPool, preferredSkills);

  const hasPreferred = preferredSkills.length > 0;
  const overallScore = hasPreferred ? roundToWhole(requiredMatch * 0.8 + preferredMatch * 0.2) : requiredMatch;

  return {
    requiredMatch,
    preferredMatch,
    overallScore,
    missingRequiredSkills: computeMissingSkills(skillPool, requiredSkills),
    missingPreferredSkills: computeMissingSkills(skillPool, preferredSkills),
  };
}

export async function getInternRecommendations(currentUser: AuthenticatedUser, rawPage: unknown, rawLimit: unknown) {
  const { page, limit, skip } = resolvePaginationParams(rawPage, rawLimit);

  const resume = await ResumeModel.findOne({ userId: currentUser.id }).lean();
  if (!resume) {
    return {
      items: [] as InternshipRecommendation[],
      meta: buildPaginationMeta(page, limit, 0),
      emptyStateMessage: "Upload your resume to get accurate internship recommendations.",
    };
  }

  const internSkills = normalizeSkillArray(resume.parsedData?.skills ?? []);

  const internships = await InternshipModel.find({ status: "open" }).select(
    "_id title description location duration stipend requiredSkills preferredSkills status createdAt"
  ).lean();
  const total = internships.length;

  const items = internships.map((internship) => {
    const recommendation = calculateRecommendationForInternship(
      internSkills,
      internship.requiredSkills,
      internship.preferredSkills
    );

    return {
      internship: {
        id: internship._id.toString(),
        title: internship.title,
        description: internship.description,
        location: internship.location,
        duration: internship.duration,
        stipend: internship.stipend,
        requiredSkills: normalizeSkillArray(internship.requiredSkills),
        preferredSkills: normalizeSkillArray(internship.preferredSkills),
        status: internship.status,
      },
      ...recommendation,
    };
  });

  const sortedItems = items.sort((a, b) => {
    if (b.overallScore !== a.overallScore) {
      return b.overallScore - a.overallScore;
    }
    return b.requiredMatch - a.requiredMatch;
  });

  const pagedItems = sortedItems.slice(skip, skip + limit);

  return {
    items: pagedItems,
    meta: buildPaginationMeta(page, limit, total),
  };
}
