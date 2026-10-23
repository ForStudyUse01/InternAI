import type { InternProfile, ResumeAnalysis } from "@/lib/intern-portal";
import {
  calculateSkillGap,
  type SkillAssessment,
  type SkillGapResult,
  type SkillGapTarget
} from "@/lib/skill-gap-engine";
import type { ValidatedAIOutput } from "@/lib/ai-platform/types";
import {
  augmentWithUserHistory,
  groundResumeAnalysis,
  groundSkillGap,
  INSUFFICIENT
} from "@/lib/ai-platform/grounding-engine";
import {
  compareNumericOutputs,
  crossValidate,
  finalizeValidatedOutput,
  validateScoreBoundaries
} from "@/lib/ai-platform/validation-engine";
import { getLearningMemory, recordSkillGapLearning } from "@/lib/ai-platform/learning-memory";

export { validateAptitudeResult } from "@/lib/ai-platform/aptitude-validation";

export type ValidatedSkillGapResult = SkillGapResult & {
  aiValidation: ValidatedAIOutput<SkillGapResult>;
};

function computeExactMatchPercent(assessments: SkillAssessment[]): number {
  if (!assessments.length) return 0;
  const present = assessments.filter((a) => a.status === "present").length;
  return Math.round((present / assessments.length) * 100);
}

function computeVerifiedMatchPercent(assessments: SkillAssessment[]): number {
  if (!assessments.length) return 0;
  const verified = assessments.filter((a) => a.verified && a.status === "present").length;
  return Math.round((verified / assessments.length) * 100);
}

export function runSkillGapPipeline(
  profile: InternProfile | null,
  target: SkillGapTarget,
  backendAnalysis?: ResumeAnalysis | null | undefined
): ValidatedSkillGapResult {
  const grounding = augmentWithUserHistory(
    groundSkillGap(profile, target),
    getLearningMemory().skillGapsSeen.length > 0
  );

  if (!grounding.sufficient) {
    const primary = calculateSkillGap(profile, target);
    const aiValidation = finalizeValidatedOutput({
      result: primary,
      validations: [],
      grounding,
      baseConfidence: 35
    });
    return { ...primary, aiValidation, insufficientData: true };
  }

  const primary = calculateSkillGap(profile, target);
  const assessments = [...primary.present, ...primary.partial, ...primary.missing];
  const exactMatch = computeExactMatchPercent(assessments);
  const verifiedMatch = computeVerifiedMatchPercent(assessments);
  const backendMatch = backendAnalysis?.skillIntelligence?.careerMatch?.matchPercent;

  validateScoreBoundaries([primary.matchPercent, exactMatch, verifiedMatch], "skill-gap");

  const validations = [
    crossValidate({
      primary: primary.matchPercent,
      secondary: exactMatch,
      baseConfidence: primary.analysisConfidence,
      compare: (a, b) => compareNumericOutputs(a, b, "weighted-vs-exact", 12)
    }),
    crossValidate({
      primary: primary.matchPercent,
      secondary: verifiedMatch,
      baseConfidence: Math.max(55, primary.analysisConfidence - 8),
      compare: (a, b) => compareNumericOutputs(a, b, "weighted-vs-verified", 15)
    })
  ];

  if (typeof backendMatch === "number") {
    validations.push(
      crossValidate({
        primary: primary.matchPercent,
        secondary: backendMatch,
        baseConfidence: primary.analysisConfidence,
        compare: (a, b) => compareNumericOutputs(a, b, "client-vs-backend", 10)
      })
    );
  }

  const aiValidation = finalizeValidatedOutput({
    result: primary,
    validations,
    grounding,
    baseConfidence: primary.analysisConfidence
  });

  if (!primary.insufficientData && aiValidation.confidenceScore >= 60) {
    recordSkillGapLearning(primary.missing.map((m) => m.displayName));
  }

  return { ...primary, aiValidation };
}

/** Validates resume score using parse quality + composite breakdown only — no synthetic estimates */
export function validateResumeAnalysis(analysis: ResumeAnalysis): ValidatedAIOutput<{ overallScore: number }> {
  const grounding = groundResumeAnalysis(analysis);

  if (!grounding.sufficient) {
    return finalizeValidatedOutput({
      result: { overallScore: analysis.overallScore ?? 0 },
      validations: [],
      grounding,
      baseConfidence: 35
    });
  }

  const overallScore = analysis.overallScore ?? 0;
  const composite = analysis.compositeScores;
  const compositeAvg = composite
    ? Math.round(
        composite.recruiterReadiness * 0.35 +
          composite.projectStrength * 0.25 +
          composite.technicalStrength * 0.2 +
          composite.ats * 0.2
      )
    : null;

  const categoryAvg = analysis.categoryScores
    ? Math.round(
        Object.values(analysis.categoryScores).reduce((sum, v) => sum + (typeof v === "number" ? v : 0), 0) /
          Math.max(1, Object.values(analysis.categoryScores).filter((v) => typeof v === "number").length)
      )
    : null;

  validateScoreBoundaries(
    [overallScore, compositeAvg ?? overallScore, categoryAvg ?? overallScore],
    "resume"
  );

  const validations: ValidatedAIOutput<number>[] = [];

  if (compositeAvg != null) {
    validations.push(
      crossValidate({
        primary: overallScore,
        secondary: compositeAvg,
        baseConfidence: Math.round((analysis.quality?.confidence ?? 0.7) * 100),
        compare: (a, b) => compareNumericOutputs(a, b, "overall-vs-composite", 10)
      })
    );
  }

  if (categoryAvg != null) {
    validations.push(
      crossValidate({
        primary: overallScore,
        secondary: categoryAvg,
        baseConfidence: validations[0]?.confidenceScore ?? 70,
        compare: (a, b) => compareNumericOutputs(a, b, "overall-vs-categories", 12)
      })
    );
  }

  const parseScore =
    analysis.quality?.confidence != null ? Math.round(analysis.quality.confidence * 100) : null;
  if (parseScore != null) {
    validations.push(
      crossValidate({
        primary: overallScore,
        secondary: parseScore,
        baseConfidence: validations[0]?.confidenceScore ?? 68,
        compare: (a, b) => compareNumericOutputs(a, b, "overall-vs-parse-quality", 15)
      })
    );
  }

  return finalizeValidatedOutput({
    result: { overallScore },
    validations,
    grounding,
    baseConfidence: Math.round((analysis.quality?.confidence ?? 0.72) * 100)
  });
}

export { INSUFFICIENT };
