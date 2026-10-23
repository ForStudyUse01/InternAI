import type {
  ConfidenceTier,
  CrossValidationInput,
  GroundingContext,
  ReliabilityLevel,
  ValidatedAIOutput,
  ValidationStatus
} from "@/lib/ai-platform/types";
import { insufficientDataMessage } from "@/lib/ai-platform/grounding-engine";

export function getConfidenceTier(score: number): ConfidenceTier {
  if (score >= 85) return "high";
  if (score >= 60) return "medium";
  return "low";
}

export function toReliabilityLevel(score: number): ReliabilityLevel {
  if (score >= 85) return "High";
  if (score >= 60) return "Medium";
  return "Low";
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function attachMeta<T>(
  output: Omit<ValidatedAIOutput<T>, "reliabilityLevel"> & { reliabilityLevel?: ReliabilityLevel },
  grounding?: GroundingContext
): ValidatedAIOutput<T> {
  return {
    ...output,
    reliabilityLevel: output.reliabilityLevel ?? toReliabilityLevel(output.confidenceScore),
    groundingSources: grounding?.sources,
    insufficientData: grounding ? !grounding.sufficient : output.insufficientData
  };
}

/**
 * Layer 2: score boundary enforcement (0–100)
 */
export function validateScoreBoundaries(
  scores: number[],
  label = "score"
): { valid: boolean; trace: string; clamped: number[] } {
  const clamped = scores.map((s) => clampScore(s));
  const invalid = scores.some((s) => s < 0 || s > 100 || !Number.isFinite(s));
  return {
    valid: !invalid,
    clamped,
    trace: invalid
      ? `${label}: out-of-range values clamped to 0–100`
      : `${label}: all values within 0–100`
  };
}

/**
 * Layer 2: missing required data detection
 */
export function validateDataCompleteness(
  grounding: GroundingContext
): { sufficient: boolean; trace: string; penalty: number } {
  if (grounding.sufficient) {
    return { sufficient: true, trace: "data completeness: required signals present", penalty: 0 };
  }
  return {
    sufficient: false,
    trace: insufficientDataMessage(grounding.missingFields),
    penalty: Math.min(45, 15 + grounding.missingFields.length * 10)
  };
}

/**
 * Model B cross-check: compares primary vs secondary outputs on the same grounded inputs.
 */
export function crossValidate<T>(input: CrossValidationInput<T>): ValidatedAIOutput<T> {
  const { primary, secondary, compare, baseConfidence = 72 } = input;
  const { delta, conflict, trace } = compare(primary, secondary);

  let confidenceScore = baseConfidence;
  let validationStatus: ValidationStatus = "validated";

  if (conflict) {
    confidenceScore = clampScore(baseConfidence - Math.min(35, delta * 2));
    validationStatus = confidenceScore < 50 ? "conflict_detected" : "partial";
  } else if (delta <= 3) {
    confidenceScore = clampScore(baseConfidence + 12);
    validationStatus = "validated";
  } else if (delta <= 10) {
    confidenceScore = clampScore(baseConfidence + 4);
    validationStatus = "validated";
  } else {
    confidenceScore = clampScore(baseConfidence - delta);
    validationStatus = "partial";
  }

  return attachMeta({
    result: primary,
    confidenceScore,
    validationStatus,
    explanationTrace: trace,
    confidenceTier: getConfidenceTier(confidenceScore)
  });
}

export function compareNumericOutputs(
  primary: number,
  secondary: number,
  label: string,
  tolerance = 8
): { delta: number; conflict: boolean; trace: string } {
  const delta = Math.abs(primary - secondary);
  const conflict = delta > tolerance * 2;
  const trace = conflict
    ? `${label}: primary=${primary}, validator=${secondary} — mismatch flagged`
    : `${label}: primary=${primary}, validator=${secondary} — within tolerance (Δ${delta})`;
  return { delta, conflict, trace };
}

/**
 * Finalize output after grounding + one or more validation passes.
 */
export function finalizeValidatedOutput<T>(input: {
  result: T;
  validations: ValidatedAIOutput<unknown>[];
  grounding: GroundingContext;
  baseConfidence?: number;
}): ValidatedAIOutput<T> {
  const completeness = validateDataCompleteness(input.grounding);

  if (!completeness.sufficient) {
    const score = clampScore((input.baseConfidence ?? 50) - completeness.penalty);
    return attachMeta(
      {
        result: input.result,
        confidenceScore: score,
        validationStatus: "conflict_detected",
        explanationTrace: completeness.trace,
        confidenceTier: getConfidenceTier(score),
        insufficientData: true
      },
      input.grounding
    );
  }

  if (!input.validations.length) {
    const score = clampScore(input.baseConfidence ?? 70);
    return attachMeta(
      {
        result: input.result,
        confidenceScore: score,
        validationStatus: "partial",
        explanationTrace: "single-source validation only",
        confidenceTier: getConfidenceTier(score)
      },
      input.grounding
    );
  }

  const avgConfidence = clampScore(
    input.validations.reduce((sum, v) => sum + v.confidenceScore, 0) / input.validations.length
  );
  const hasConflict = input.validations.some((v) => v.validationStatus === "conflict_detected");
  const hasPartial = input.validations.some((v) => v.validationStatus === "partial");

  return attachMeta(
    {
      result: input.result,
      confidenceScore: avgConfidence,
      validationStatus: hasConflict ? "conflict_detected" : hasPartial ? "partial" : "validated",
      explanationTrace: [completeness.trace, ...input.validations.map((v) => v.explanationTrace)].join(" · "),
      confidenceTier: getConfidenceTier(avgConfidence)
    },
    input.grounding
  );
}

export function mergeValidationOutputs<T>(
  outputs: ValidatedAIOutput<T>[],
  mergeResults: (items: T[]) => T
): ValidatedAIOutput<T> {
  if (!outputs.length) {
    return attachMeta({
      result: mergeResults([]),
      confidenceScore: 0,
      validationStatus: "conflict_detected",
      explanationTrace: "No validation sources available",
      confidenceTier: "low",
      insufficientData: true
    });
  }

  const avgConfidence = clampScore(
    outputs.reduce((sum, o) => sum + o.confidenceScore, 0) / outputs.length
  );
  const hasConflict = outputs.some((o) => o.validationStatus === "conflict_detected");
  const hasPartial = outputs.some((o) => o.validationStatus === "partial");
  const insufficient = outputs.some((o) => o.insufficientData);

  return attachMeta({
    result: mergeResults(outputs.map((o) => o.result)),
    confidenceScore: avgConfidence,
    validationStatus: hasConflict ? "conflict_detected" : hasPartial ? "partial" : "validated",
    explanationTrace: outputs.map((o) => o.explanationTrace).join(" · "),
    confidenceTier: getConfidenceTier(avgConfidence),
    insufficientData: insufficient
  });
}
