/**
 * 3-layer AI orchestrator (Grounding → Primary → Validation)
 * Deterministic validation without external LLM dependency.
 */

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function getConfidenceTier(score) {
  if (score >= 85) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function toReliabilityLevel(score) {
  if (score >= 85) return "High";
  if (score >= 60) return "Medium";
  return "Low";
}

function attachMeta(payload, grounding) {
  return {
    ...payload,
    reliabilityLevel: toReliabilityLevel(payload.confidenceScore),
    insufficientData: grounding ? !grounding.sufficient : payload.insufficientData,
    groundingSources: grounding?.sources ?? payload.groundingSources
  };
}

function compareNumeric(primary, secondary, label, tolerance = 10) {
  const delta = Math.abs(primary - secondary);
  const conflict = delta > tolerance * 2;
  return {
    delta,
    conflict,
    trace: conflict
      ? `${label}: primary=${primary}, validator=${secondary} — conflict`
      : `${label}: primary=${primary}, validator=${secondary} — Δ${delta}`
  };
}

function crossValidate(primary, secondary, baseConfidence, label, tolerance) {
  const { delta, conflict, trace } = compareNumeric(primary, secondary, label, tolerance);
  let confidenceScore = baseConfidence;
  let validationStatus = "validated";

  if (conflict) {
    confidenceScore = clampScore(baseConfidence - Math.min(35, delta * 2));
    validationStatus = confidenceScore < 50 ? "conflict_detected" : "partial";
  } else if (delta <= 3) {
    confidenceScore = clampScore(baseConfidence + 10);
  } else if (delta > tolerance) {
    confidenceScore = clampScore(baseConfidence - delta);
    validationStatus = "partial";
  }

  return { confidenceScore, validationStatus, explanationTrace: trace };
}

function validateScoreBoundaries(scores, label = "score") {
  const invalid = scores.some((s) => s < 0 || s > 100 || !Number.isFinite(s));
  return {
    valid: !invalid,
    trace: invalid ? `${label}: out-of-range values clamped` : `${label}: within 0–100`
  };
}

function groundResumeExtraction({ parsed = {}, intelligenceV2 = {}, quality = {} }) {
  const sources = ["resume"];
  const missingFields = [];
  let signalCount = 0;

  const parsedSkillCount = Array.isArray(parsed.skills) ? parsed.skills.length : 0;
  signalCount += parsedSkillCount;
  if (parsedSkillCount === 0) missingFields.push("parsed_skills");

  if (typeof intelligenceV2?.overallScore === "number") {
    sources.push("computed_metrics");
    signalCount += 1;
  } else {
    missingFields.push("overall_score");
  }

  if (quality?.isReliable) signalCount += 1;
  else missingFields.push("parse_quality");

  return {
    sources,
    sufficient: missingFields.length === 0 && signalCount >= 2,
    missingFields,
    signalCount
  };
}

function finalizeValidation({ validations, grounding, baseConfidence, insufficientTrace }) {
  if (!grounding.sufficient) {
    const score = clampScore(baseConfidence - Math.min(45, 15 + grounding.missingFields.length * 10));
    return attachMeta(
      {
        confidenceScore: score,
        validationStatus: "conflict_detected",
        explanationTrace: insufficientTrace || `insufficient data (${grounding.missingFields.join(", ")})`
      },
      grounding
    );
  }

  if (!validations.length) {
    const score = clampScore(baseConfidence);
    return attachMeta(
      {
        confidenceScore: score,
        validationStatus: "partial",
        explanationTrace: "single-source validation"
      },
      grounding
    );
  }

  const confidenceScore = clampScore(
    validations.reduce((s, v) => s + v.confidenceScore, 0) / validations.length
  );
  const hasConflict = validations.some((v) => v.validationStatus === "conflict_detected");
  const hasPartial = validations.some((v) => v.validationStatus === "partial");

  return attachMeta(
    {
      confidenceScore,
      validationStatus: hasConflict ? "conflict_detected" : hasPartial ? "partial" : "validated",
      explanationTrace: validations.map((v) => v.explanationTrace).join(" · ")
    },
    grounding
  );
}

/**
 * Validate resume extraction using parsed data + intelligence layer only.
 */
function validateResumeExtraction({ parsed = {}, intelligenceV2 = {}, quality = {} }) {
  const grounding = groundResumeExtraction({ parsed, intelligenceV2, quality });
  const parsedSkillCount = Array.isArray(parsed.skills) ? parsed.skills.length : 0;
  const intelMatched = (intelligenceV2?.skillIntelligence?.matchedSkills || []).length;
  const intelGaps = (intelligenceV2?.skillIntelligence?.skillGaps || []).length;
  const overallScore = clampScore(intelligenceV2?.overallScore ?? 0);
  const parseConfidence = typeof quality.confidence === "number" ? quality.confidence : 0.7;
  const parseScore = clampScore(parseConfidence * 100);

  if (!grounding.sufficient) {
    return {
      ...finalizeValidation({
        validations: [],
        grounding,
        baseConfidence: 35,
        insufficientTrace: `insufficient data (${grounding.missingFields.join(", ")})`
      }),
      confidenceTier: getConfidenceTier(35),
      learningHints: { weakExtractionSignals: (quality.issues || []).slice(0, 5), parsedSkillCount, intelSkillEstimate: intelMatched + intelGaps }
    };
  }

  const composite = intelligenceV2?.compositeScores;
  const compositeAvg = composite
    ? clampScore(
        (composite.recruiterReadiness ?? composite.overall ?? overallScore) * 0.35 +
          (composite.projectStrength ?? 0) * 0.25 +
          (composite.technicalStrength ?? 0) * 0.2 +
          (composite.ats ?? 0) * 0.2
      )
    : null;

  validateScoreBoundaries([overallScore, compositeAvg ?? overallScore, parseScore], "resume");

  const validations = [];
  if (compositeAvg != null) {
    validations.push(crossValidate(overallScore, compositeAvg, parseScore, "overall-vs-composite", 10));
  }
  validations.push(crossValidate(overallScore, parseScore, parseScore, "overall-vs-parse-quality", 12));
  validations.push(crossValidate(parsedSkillCount, intelMatched + intelGaps, clampScore(parseScore - 5), "skills-vs-intelligence", 8));

  const skillDelta = Math.abs(parsedSkillCount - (intelMatched + intelGaps));
  let result = finalizeValidation({ validations, grounding, baseConfidence: parseScore });

  if (skillDelta > 10) {
    result = attachMeta(
      {
        ...result,
        confidenceScore: clampScore(result.confidenceScore - 12),
        validationStatus: "partial",
        explanationTrace: `${result.explanationTrace} · skillΔ=${skillDelta}`
      },
      grounding
    );
  }

  return {
    ...result,
    confidenceTier: getConfidenceTier(result.confidenceScore),
    learningHints: {
      weakExtractionSignals: (quality.issues || []).slice(0, 5),
      parsedSkillCount,
      intelSkillEstimate: intelMatched + intelGaps
    }
  };
}

module.exports = {
  validateResumeExtraction,
  crossValidate,
  getConfidenceTier,
  toReliabilityLevel
};
