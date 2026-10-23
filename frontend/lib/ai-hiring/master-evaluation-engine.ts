import type { CompanyApplication, CompanyInternship, CompanyMatchedCandidate } from "@/lib/company-portal";
import { computeSkillMatch, normalizeSkillList } from "@/lib/skill-normalizer";
import { evaluateCandidateProjects, validateClaimedSkillWithProjects } from "./project-evaluation-engine";
import { previewWeightedScore, resolveRoleTemplate } from "./role-scoring-config";
import type {
  CandidateEvaluation,
  CandidateProjectPortfolioEvaluation,
  MatchExplanation,
  RecommendationLevel,
  ScoreBreakdownItem,
  ScoreFactorKey
} from "./types";

const FACTOR_LABELS: Record<ScoreFactorKey, string> = {
  skills: "Skills Match",
  tests: "Tests / Assessments",
  projects: "Projects",
  experience: "Experience",
  resume: "Resume"
};

const RECOMMENDED_HIRE_CONFIDENCE = 80;

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function collectInternSkills(application: CompanyApplication | null, match: CompanyMatchedCandidate) {
  const parsed = application?.intern?.resume?.parsed?.skills;
  const profileSkills = application?.intern?.skills || match.internProfile?.skills || [];
  return normalizeSkillList([...(Array.isArray(parsed) ? parsed : []), ...profileSkills]);
}

function scoreExperienceFactor(experience: string[], verifiedProjectCount: number) {
  if (experience.length > 0) return clampScore(35 + Math.min(experience.length, 4) * 16);
  if (verifiedProjectCount >= 3) return 45;
  if (verifiedProjectCount >= 1) return 30;
  return 0;
}

function scoreTestsFactor(application: CompanyApplication | null, match: CompanyMatchedCandidate, resumeScore: number | null) {
  if (typeof application?.relevanceScore === "number") return clampScore(application.relevanceScore);
  if (typeof resumeScore === "number") return clampScore(resumeScore * 0.85);
  if (typeof match.score === "number") return clampScore(match.score * 0.7);
  return 0;
}

function scoreResumeFactor(application: CompanyApplication | null, match: CompanyMatchedCandidate) {
  const resumeScore =
    application?.intern?.resume?.score ??
    match.internProfile?.resume?.score ??
    null;
  return typeof resumeScore === "number" ? clampScore(resumeScore) : 0;
}

function resolveRecommendationLevel(overallScore: number): RecommendationLevel {
  if (overallScore >= 90) return "Highly Recommended";
  if (overallScore >= 80) return "Strong Candidate";
  if (overallScore >= 70) return "Consider";
  if (overallScore >= 60) return "Potential Fit";
  return "Not Recommended Currently";
}

function resolveConfidenceTier(confidenceScore: number) {
  if (confidenceScore >= 90) return "High Confidence";
  if (confidenceScore >= 70) return "Medium Confidence";
  return "Low Confidence";
}

function computeConfidenceScore(input: {
  skillsScore: number;
  projectEvaluation: CandidateProjectPortfolioEvaluation;
  testScore: number;
  resumeScore: number;
  experienceScore: number;
  verifiedSkillRatio: number;
}) {
  const { skillsScore, projectEvaluation, testScore, resumeScore, experienceScore, verifiedSkillRatio } = input;

  let confidence = 35;
  confidence += verifiedSkillRatio * 25;
  confidence += (skillsScore / 100) * 15;
  confidence += projectEvaluation.sufficient ? (projectEvaluation.aggregateScores.confidenceScore / 100) * 20 : 0;
  confidence += testScore > 0 ? 10 : 0;
  confidence += resumeScore >= 50 ? 8 : 0;
  confidence += experienceScore >= 30 ? 7 : 0;

  return clampScore(confidence);
}

function buildScoreBreakdown(
  factorScores: CandidateEvaluation["factorScores"],
  template: ReturnType<typeof resolveRoleTemplate>
): ScoreBreakdownItem[] {
  const keys: ScoreFactorKey[] = ["skills", "tests", "projects", "experience", "resume"];
  const activeWeight = keys.reduce(
    (sum, key) => sum + (template.enabled[key] ? template.weights[key] : 0),
    0
  ) || 100;

  return keys.map((factor) => {
    const weight = template.weights[factor];
    const enabled = template.enabled[factor];
    const rawScore = factorScores[factor];
    const weightedContribution = enabled && weight > 0 ? clampScore((rawScore * weight) / activeWeight) : 0;
    return {
      factor,
      label: FACTOR_LABELS[factor],
      rawScore,
      weight,
      weightedContribution,
      enabled
    };
  });
}

function buildTopContributors(breakdown: ScoreBreakdownItem[]) {
  return [...breakdown]
    .filter((item) => item.enabled && item.weight > 0)
    .sort((a, b) => b.weightedContribution - a.weightedContribution)
    .slice(0, 3)
    .map((item) => item.label);
}

function buildReasoning(input: {
  overallScore: number;
  recommendationLevel: RecommendationLevel;
  confidenceScore: number;
  templateLabel: string;
  topContributors: string[];
  strengths: string[];
  weaknesses: string[];
}) {
  const tier = resolveConfidenceTier(input.confidenceScore);
  const strengthLine = input.strengths[0] ? `Primary strength: ${input.strengths[0]}.` : "Limited verified strengths in profile data.";
  const weaknessLine = input.weaknesses[0] ? `Primary gap: ${input.weaknesses[0]}.` : "No major gaps flagged from available evidence.";
  const contributorLine =
    input.topContributors.length > 0
      ? `Top score drivers: ${input.topContributors.join(", ")}.`
      : "Score drivers unavailable due to missing profile evidence.";

  return [
    `${input.recommendationLevel} (${input.overallScore}/100) using ${input.templateLabel} weight model.`,
    `${tier} (${input.confidenceScore}/100) based on verified skills, projects, tests, and resume completeness.`,
    strengthLine,
    `${contributorLine} ${weaknessLine}`
  ].join(" ");
}

export function evaluateCandidate(
  match: CompanyMatchedCandidate,
  application: CompanyApplication | null,
  internship: CompanyInternship | undefined
): CandidateEvaluation {
  const template = resolveRoleTemplate(internship);
  const internSkills = collectInternSkills(application, match);
  const requiredSkills = internship?.skillsRequired || [];
  const preferredSkills = internship?.prioritySkills || [];
  const skillMatch = computeSkillMatch(internSkills, requiredSkills, preferredSkills);
  const projectEvaluation = evaluateCandidateProjects(application, match, requiredSkills, preferredSkills);

  const matchedFromGap = match.skillGap?.matched || skillMatch.matchedRequiredSkills;
  const missingFromGap = match.skillGap?.missing || skillMatch.missingRequiredSkills;
  const experience = application?.intern?.experience || [];
  const resumeScoreValue = scoreResumeFactor(application, match);

  const skillsScore = clampScore(match.skillGap?.matchPercent ?? skillMatch.overallScore ?? match.score);
  const projectsScore = clampScore(
    projectEvaluation.roleRelevanceScore ??
      (projectEvaluation.sufficient ? projectEvaluation.aggregateScores.qualityScore : 0)
  );
  const experienceScore = scoreExperienceFactor(experience, projectEvaluation.verifiedProjectCount);
  const testsScore = scoreTestsFactor(application, match, resumeScoreValue || null);

  const factorScores = {
    skills: skillsScore,
    tests: testsScore,
    projects: projectsScore,
    experience: experienceScore,
    resume: resumeScoreValue
  };

  const overallScore = previewWeightedScore(
    {
      skills: factorScores.skills,
      tests: factorScores.tests,
      projects: factorScores.projects,
      experience: factorScores.experience,
      resume: factorScores.resume
    },
    template.weights,
    template.enabled
  );

  const verifiedSkillRatio =
    requiredSkills.length > 0
      ? requiredSkills.filter((skill) => validateClaimedSkillWithProjects(skill, projectEvaluation, internSkills).verified).length /
        requiredSkills.length
      : internSkills.length > 0
        ? 0.6
        : 0;

  const confidenceScore = computeConfidenceScore({
    skillsScore,
    projectEvaluation,
    testScore: testsScore,
    resumeScore: resumeScoreValue,
    experienceScore,
    verifiedSkillRatio
  });

  const scoreBreakdown = buildScoreBreakdown(factorScores, template);
  const topContributors = buildTopContributors(scoreBreakdown);
  const recommendationLevel = resolveRecommendationLevel(overallScore);

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (matchedFromGap.length > 0) {
    strengths.push(`Required skill overlap: ${matchedFromGap.slice(0, 4).join(", ")}`);
  }
  if (projectEvaluation.validatedSkills.length > 0) {
    strengths.push(
      `Verified project skills: ${projectEvaluation.validatedSkills.slice(0, 4).map((entry) => entry.skill).join(", ")}`
    );
  }
  if (factorScores.projects >= 60) {
    strengths.push(`Project portfolio scored ${factorScores.projects}/100 against role requirements`);
  }
  if (factorScores.tests >= 70) {
    strengths.push(`Assessment signal ${factorScores.tests}/100 from application and profile tests`);
  }
  if (factorScores.experience >= 50) {
    strengths.push(`Experience evidence scored ${factorScores.experience}/100`);
  }
  if (factorScores.resume >= 65) {
    strengths.push(`Resume completeness ${factorScores.resume}/100`);
  }

  if (missingFromGap.length > 0) {
    weaknesses.push(`Missing required skills: ${missingFromGap.slice(0, 3).join(", ")}`);
  }
  if (!projectEvaluation.sufficient) {
    weaknesses.push(projectEvaluation.lowConfidenceWarning || "No verified project evidence available");
  } else if (projectEvaluation.aggregateScores.confidenceScore < 45) {
    weaknesses.push("Project verification confidence is below strong recommendation threshold");
  }
  if (factorScores.tests < 50 && testsScore > 0) {
    weaknesses.push(`Assessment performance ${factorScores.tests}/100 below competitive range`);
  }
  if (factorScores.experience < 30) {
    weaknesses.push("Limited verified experience documentation");
  }

  if (strengths.length === 0 && match.score > 0) {
    strengths.push(`Baseline role alignment score ${match.score}% from matching model`);
  }

  const reasoning = buildReasoning({
    overallScore,
    recommendationLevel,
    confidenceScore,
    templateLabel: template.roleLabel,
    topContributors,
    strengths,
    weaknesses
  });

  const auditTrail = [
    `Role template: ${template.roleKey} (${template.roleLabel})`,
    `Weights: skills ${template.weights.skills}%, tests ${template.weights.tests}%, projects ${template.weights.projects}%, experience ${template.weights.experience}%, resume ${template.weights.resume}%`,
    `Factor scores: skills ${factorScores.skills}, tests ${factorScores.tests}, projects ${factorScores.projects}, experience ${factorScores.experience}, resume ${factorScores.resume}`,
    `Verified projects: ${projectEvaluation.verifiedProjectCount}`,
    `Overall ${overallScore}/100 · Confidence ${confidenceScore}/100 · ${recommendationLevel}`
  ];

  return {
    overallScore,
    confidenceScore,
    recommendationLevel,
    scoreBreakdown,
    factorScores,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    reasoning,
    topContributors,
    projectEvaluation,
    roleTemplateKey: template.roleKey,
    roleTemplateLabel: template.roleLabel,
    confidenceTier: resolveConfidenceTier(confidenceScore),
    auditTrail
  };
}

export function buildMatchExplanation(evaluation: CandidateEvaluation, rankedPosition: number): MatchExplanation {
  const portfolio = evaluation.projectEvaluation;
  const skillLines = evaluation.strengths.filter((item) => item.toLowerCase().includes("skill"));
  const projectLine = portfolio.sufficient
    ? `${portfolio.verifiedProjectCount} verified project(s); portfolio quality ${portfolio.aggregateScores.qualityScore}/100`
    : portfolio.lowConfidenceWarning || "No verified project evidence";

  return {
    sufficient: true,
    skillAlignment: skillLines.length ? skillLines : evaluation.strengths.slice(0, 2),
    projectRelevance: projectLine,
    experienceMatch: evaluation.strengths.find((item) => item.toLowerCase().includes("experience")) || evaluation.reasoning,
    overallReasoning: evaluation.reasoning,
    projectInsights: portfolio.projectSummaries,
    projectConfidenceWarning: portfolio.lowConfidenceWarning,
    rankingExplanation: {
      rankedPosition,
      overallScore: evaluation.overallScore,
      confidenceScore: evaluation.confidenceScore,
      recommendationLevel: evaluation.recommendationLevel,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      topContributors: evaluation.topContributors,
      reasoning: evaluation.reasoning,
      scoreBreakdown: evaluation.scoreBreakdown
    }
  };
}

export function meetsRecommendedHireCriteria(evaluation: CandidateEvaluation, isTopRanked: boolean) {
  const criticalSkillsVerified = evaluation.strengths.some((item) => item.toLowerCase().includes("skill"));
  return (
    isTopRanked &&
    evaluation.confidenceScore > RECOMMENDED_HIRE_CONFIDENCE &&
    evaluation.overallScore >= 70 &&
    criticalSkillsVerified
  );
}

export { RECOMMENDED_HIRE_CONFIDENCE, resolveRecommendationLevel, resolveConfidenceTier };
