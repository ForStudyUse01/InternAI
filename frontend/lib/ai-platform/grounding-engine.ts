import type { InternProfile, ResumeAnalysis } from "@/lib/intern-portal";
import type { AptitudeTestSet } from "@/lib/data/aptitude-tests";
import { resolveSkillGapTarget, type SkillGapTarget } from "@/lib/skill-gap-engine";
import type { GroundingContext, GroundingSource } from "@/lib/ai-platform/types";

const INSUFFICIENT = "insufficient data";

export { INSUFFICIENT };

function ctx(
  sources: GroundingSource[],
  sufficient: boolean,
  missingFields: string[],
  signalCount: number
): GroundingContext {
  return { sources, sufficient, missingFields, signalCount };
}

/** Step 1–2: retrieve resume + role requirement signals only */
export function groundSkillGap(
  profile: InternProfile | null,
  target: SkillGapTarget
): GroundingContext {
  const sources: GroundingSource[] = ["role_requirements"];
  const missingFields: string[] = [];
  let signalCount = 0;

  const { tiers } = resolveSkillGapTarget(target);
  signalCount += tiers.length;

  if (!profile?.resumeUploaded) {
    missingFields.push("resume_upload");
  } else {
    sources.push("resume");
    const resumeText = profile?.resume?.text ?? "";
    const skillCount =
      (profile?.resume?.parsed?.skills?.length ?? 0) +
      (profile?.skills?.length ?? 0) +
      (profile?.resume?.analysis?.checks?.matchedSkills?.length ?? 0);
    signalCount += skillCount + (resumeText.length > 100 ? 1 : 0);
    if (skillCount === 0 && resumeText.length < 100) {
      missingFields.push("resume_skills");
    }
  }

  if (tiers.length === 0) {
    missingFields.push("role_skill_map");
  }

  const sufficient = missingFields.length === 0 && signalCount > 0;
  return ctx(sources, sufficient, missingFields, signalCount);
}

/** Ground aptitude analysis only on submitted answers + computed metrics */
export function groundAptitudeEvaluation(
  test: AptitudeTestSet,
  answers: Record<string, number | null | undefined>
): GroundingContext {
  const sources: GroundingSource[] = ["test_answers", "computed_metrics"];
  const missingFields: string[] = [];

  const answered = test.questions.filter((q) => {
    const selected = answers[q.id];
    return selected != null && selected >= 0;
  }).length;

  if (answered === 0) {
    missingFields.push("submitted_answers");
  }

  const sufficient = answered > 0 && test.questions.length > 0;
  return ctx(sources, sufficient, missingFields, answered);
}

/** Ground resume score only on parsed resume + analysis artifacts */
export function groundResumeAnalysis(analysis: ResumeAnalysis | null | undefined): GroundingContext {
  const sources: GroundingSource[] = [];
  const missingFields: string[] = [];
  let signalCount = 0;

  if (!analysis) {
    return ctx([], false, ["resume_analysis"], 0);
  }

  sources.push("resume");

  const skillCount =
    (analysis.checks?.matchedSkills?.length ?? 0) +
    (analysis.skillIntelligence?.careerMatch?.matchedSkills?.length ?? 0);
  signalCount += skillCount;
  if (skillCount === 0) missingFields.push("parsed_skills");

  if (typeof analysis.overallScore === "number") {
    sources.push("computed_metrics");
    signalCount += 1;
  } else {
    missingFields.push("overall_score");
  }

  if (analysis.quality?.isReliable) signalCount += 1;
  else missingFields.push("parse_quality");

  const sufficient = missingFields.length === 0 && signalCount >= 2;
  return ctx(sources, sufficient, missingFields, signalCount);
}

/** Ground readiness strictly on computed test metrics */
export function groundReadinessMetrics(input: {
  testPerformance: number;
  sectionAccuracies: number[];
  answeredCount: number;
  totalQuestions: number;
}): GroundingContext {
  const sources: GroundingSource[] = ["computed_metrics", "test_answers"];
  const missingFields: string[] = [];

  if (input.answeredCount === 0) missingFields.push("submitted_answers");
  if (input.totalQuestions === 0) missingFields.push("question_bank");
  if (input.sectionAccuracies.length === 0) missingFields.push("section_scores");

  const sufficient = missingFields.length === 0;
  return ctx(sources, sufficient, missingFields, input.answeredCount);
}

/** Ground weak-area detection on statistical section performance only */
export function groundWeakAreaDetection(
  sectionStats: Array<{ total: number; correct: number }>
): GroundingContext {
  const sources: GroundingSource[] = ["computed_metrics", "test_answers"];
  const answeredSections = sectionStats.filter((s) => s.total > 0);
  const sufficient = answeredSections.length > 0;
  return ctx(
    sources,
    sufficient,
    sufficient ? [] : ["section_attempts"],
    answeredSections.reduce((sum, s) => sum + s.total, 0)
  );
}

/** Optional user history — never used alone for predictions */
export function augmentWithUserHistory(base: GroundingContext, hasHistory: boolean): GroundingContext {
  if (!hasHistory) return base;
  return {
    ...base,
    sources: [...new Set([...base.sources, "user_history" as GroundingSource])]
  };
}

export function insufficientDataMessage(missingFields: string[]): string {
  if (!missingFields.length) return INSUFFICIENT;
  return `${INSUFFICIENT} (${missingFields.join(", ")})`;
}
