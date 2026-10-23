import type { AptitudeTestResult } from "@/lib/aptitude-test-engine";
import type { ValidatedAIOutput } from "@/lib/ai-platform/types";
import { groundReadinessMetrics } from "@/lib/ai-platform/grounding-engine";
import {
  compareNumericOutputs,
  crossValidate,
  finalizeValidatedOutput,
  validateScoreBoundaries
} from "@/lib/ai-platform/validation-engine";

/** Validates aptitude output using only recomputed metrics from submitted answers */
export function validateAptitudeResult(result: AptitudeTestResult): ValidatedAIOutput<AptitudeTestResult> {
  const answeredCount = result.sectionScores
    ? Object.values(result.sectionScores).reduce((sum, s) => sum + s.correct + s.wrong, 0)
    : 0;

  const grounding = groundReadinessMetrics({
    testPerformance: result.maxScore ? Math.round((result.totalScore / result.maxScore) * 100) : 0,
    sectionAccuracies: Object.values(result.sectionScores).map((s) => s.accuracy),
    answeredCount,
    totalQuestions: Object.values(result.sectionScores).reduce((sum, s) => sum + s.total, 0)
  });

  if (!grounding.sufficient) {
    return finalizeValidatedOutput({
      result,
      validations: [],
      grounding,
      baseConfidence: 30
    });
  }

  const normalizedPerformance = result.maxScore
    ? Math.round((result.totalScore / result.maxScore) * 100)
    : 0;

  const recomputedReadiness = Math.round(
    normalizedPerformance * 0.45 + result.accuracy * 0.35 + result.timeEfficiency * 0.2
  );

  validateScoreBoundaries(
    [result.readinessScore, result.accuracy, result.timeEfficiency, recomputedReadiness],
    "aptitude"
  );

  const readinessValidation = crossValidate({
    primary: result.readinessScore,
    secondary: recomputedReadiness,
    baseConfidence: 78,
    compare: (a, b) => compareNumericOutputs(a, b, "readiness-recomputed", 12)
  });

  const accuracyFromSections =
    Object.values(result.sectionScores).reduce((sum, s) => sum + s.correct, 0) /
    Math.max(1, Object.values(result.sectionScores).reduce((sum, s) => sum + s.total, 0));
  const recomputedAccuracy = Math.round(accuracyFromSections * 100);

  const accuracyValidation = crossValidate({
    primary: result.accuracy,
    secondary: recomputedAccuracy,
    baseConfidence: readinessValidation.confidenceScore,
    compare: (a, b) => compareNumericOutputs(a, b, "accuracy-recomputed", 5)
  });

  return finalizeValidatedOutput({
    result,
    validations: [readinessValidation, accuracyValidation],
    grounding,
    baseConfidence: 78
  });
}
