const { normalizeSkillList, textMentionsSkill } = require("../../../shared/utils/skill-normalizer");
const { computeResumeIntelligenceV2 } = require("../../../services/resume-intelligence-v2.service");

const SCORER_ENABLED = String(process.env.SCORER_ENABLED || "false").toLowerCase() === "true";
const SCORER_BASE_URL = process.env.SCORER_BASE_URL || "http://localhost:5002";
const SCORER_TIMEOUT_MS = Number(process.env.SCORER_TIMEOUT_MS || 5000);
const SCORER_MAX_RETRIES = 2;

const ACTION_VERBS = [
  "built", "developed", "implemented", "optimized", "designed", "led", "created", "improved", "managed", "delivered",
  "architected", "automated", "migrated", "mentored", "spearheaded", "streamlined", "engineered", "launched",
  "scaled", "reduced", "increased", "orchestrated", "refactored", "authored", "collaborated", "negotiated",
  "presented", "deployed", "integrated", "researched", "analyzed", "coordinated", "trained", "resolved"
];

const SECTION_HINTS = ["summary", "experience", "education", "skills", "projects", "certification"];

function normalizeScore(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function cleanText(text = "") {
  return String(text)
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countRegex(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function toPercent(numerator, denominator) {
  if (!denominator) return 0;
  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
}

function analyzeResumeText(text, targetSkills = []) {
  const clean = cleanText(text).toLowerCase();
  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(clean);
  const hasPhone = /(?:\+?\d{1,3}[\s-]?)?(?:\d[\s-]?){10,12}/.test(clean);
  const hasLinkedIn = /linkedin\.com\//i.test(clean);
  const hasProjects = clean.includes("project");
  const hasExperience = clean.includes("experience");
  const hasEducation = clean.includes("education");

  const sectionCount = SECTION_HINTS.filter((section) => clean.includes(section)).length;
  const sectionScore = toPercent(sectionCount, SECTION_HINTS.length);

  let lengthScore = 0;
  if (wordCount >= 350 && wordCount <= 900) lengthScore = 100;
  else if (wordCount >= 250 && wordCount < 350) lengthScore = 75;
  else if (wordCount > 900 && wordCount <= 1200) lengthScore = 70;
  else if (wordCount >= 150 && wordCount < 250) lengthScore = 50;
  else lengthScore = 30;

  const quantCount = countRegex(
    clean,
    /(\d+(\.\d+)?\s?-\s?\d+(\.\d+)?%|\d+(\.\d+)?%|\$\d+(?:,\d{3})*(?:\.\d+)?[km]?|\d+\+|\d+x\b|\d+k\b|\d+\s?(users|clients|projects|months|years|hours|days|releases|deployments|engineers|team members|customers|requests|transactions|servers|features|bugs|tickets))/gi
  );
  const quantScore = Math.min(100, quantCount * 18);

  const verbCount = ACTION_VERBS.reduce((acc, verb) => acc + countRegex(clean, new RegExp(`\\b${verb}\\b`, "gi")), 0);
  const verbScore = Math.min(100, verbCount * 15);

  const normalizedSkills = normalizeSkillList(Array.isArray(targetSkills) ? targetSkills : []);
  const matchedSkills = normalizedSkills.filter((skill) => textMentionsSkill(clean, skill));
  const skillsScore = normalizedSkills.length > 0 ? toPercent(matchedSkills.length, normalizedSkills.length) : 60;
  const completenessChecks = [hasEmail, hasPhone, hasLinkedIn, hasProjects, hasExperience, hasEducation];
  const completenessPercent = toPercent(completenessChecks.filter(Boolean).length, completenessChecks.length);
  const roleSpecificScore = normalizedSkills.length > 0 ? skillsScore : Math.round((skillsScore + sectionScore) / 2);
  const formattingQualityScore = Math.round((sectionScore * 0.55) + (lengthScore * 0.45));
  const experienceWeightedScore = Math.round((verbScore * 0.5) + (quantScore * 0.3) + (sectionScore * 0.2));

  const atsScore = Math.round((hasEmail ? 30 : 0) + (hasPhone ? 25 : 0) + (hasLinkedIn ? 15 : 0) + sectionScore * 0.3);
  const contentScore = Math.round(lengthScore * 0.5 + sectionScore * 0.5);
  const impactScore = Math.round(quantScore * 0.55 + verbScore * 0.45);
  const structureScore = Math.round(sectionScore * 0.6 + lengthScore * 0.4);

  const categoryScores = {
    ats: normalizeScore(atsScore) || 0,
    content: normalizeScore(contentScore) || 0,
    impact: normalizeScore(impactScore) || 0,
    skills: normalizeScore(skillsScore) || 0,
    structure: normalizeScore(structureScore) || 0,
    roleSpecific: normalizeScore(roleSpecificScore) || 0,
    formattingQuality: normalizeScore(formattingQualityScore) || 0,
    experienceWeighted: normalizeScore(experienceWeightedScore) || 0,
    completeness: normalizeScore(completenessPercent) || 0
  };

  const ruleScore = normalizeScore(
    categoryScores.ats * 0.2 +
      categoryScores.content * 0.25 +
      categoryScores.impact * 0.2 +
      categoryScores.skills * 0.2 +
      categoryScores.structure * 0.15
  ) || 0;

  const improvements = [];
  if (!hasEmail) improvements.push("Add a professional email in the resume header.");
  if (!hasPhone) improvements.push("Add a contact number for recruiter outreach.");
  if (!hasLinkedIn) improvements.push("Add a LinkedIn URL for stronger profile credibility.");
  if (wordCount < 300) improvements.push("Increase resume detail: include more role impact and project specifics.");
  if (quantCount < 2) improvements.push("Add measurable achievements using numbers, percentages, or outcomes.");
  if (verbCount < 4) improvements.push("Use stronger action verbs like built, optimized, implemented, and delivered.");
  if (normalizedSkills.length > 0 && matchedSkills.length < normalizedSkills.length) {
    improvements.push("Align resume keywords with your target internship skills.");
  }

  const strengths = [];
  if (hasEmail && hasPhone) strengths.push("Contact information is present.");
  if (sectionCount >= 4) strengths.push("Resume has good section coverage.");
  if (quantCount >= 2) strengths.push("Resume includes measurable achievements.");
  if (verbCount >= 4) strengths.push("Strong use of action-oriented language.");
  if (matchedSkills.length >= Math.max(2, Math.floor(normalizedSkills.length * 0.6))) strengths.push("Good skill alignment with target roles.");

  const criticalIssues = [];
  if (!hasEmail || !hasPhone) criticalIssues.push("Contact details are incomplete.");
  if (sectionCount < 3) criticalIssues.push("Resume is missing key sections required by ATS.");
  if (wordCount < 180) criticalIssues.push("Resume is too short and may look under-detailed.");
  if (normalizedSkills.length > 0 && matchedSkills.length < Math.ceil(normalizedSkills.length * 0.4)) {
    criticalIssues.push("Skill keyword alignment is weak for target internships.");
  }

  return {
    ruleScore,
    categoryScores,
    checks: {
      hasEmail,
      hasPhone,
      hasLinkedIn,
      wordCount,
      sectionCount,
      quantifiedAchievements: quantCount,
      actionVerbHits: verbCount,
      matchedSkills,
      missingSkills: normalizedSkills.filter((skill) => !matchedSkills.includes(skill)),
      roleSpecificScore: categoryScores.roleSpecific,
      formattingQualityScore: categoryScores.formattingQuality,
      experienceWeightedScore: categoryScores.experienceWeighted,
      completenessPercent
    },
    strengths,
    improvements: improvements.slice(0, 6),
    criticalIssues: criticalIssues.slice(0, 4),
    sectionBreakdown: [
      { key: "ats", label: "ATS Compatibility", score: normalizeScore(atsScore) || 0 },
      { key: "content", label: "Content Quality", score: normalizeScore(contentScore) || 0 },
      { key: "impact", label: "Impact & Achievements", score: normalizeScore(impactScore) || 0 },
      { key: "skills", label: "Skill Match", score: normalizeScore(skillsScore) || 0 },
      { key: "structure", label: "Structure & Readability", score: normalizeScore(structureScore) || 0 },
      { key: "roleSpecific", label: "Role Specificity", score: categoryScores.roleSpecific },
      { key: "formattingQuality", label: "Formatting Quality", score: categoryScores.formattingQuality },
      { key: "experienceWeighted", label: "Experience Impact", score: categoryScores.experienceWeighted },
      { key: "completeness", label: "Resume Completeness", score: categoryScores.completeness }
    ]
  };
}

async function callScorer(text) {
  let lastError;

  for (let attempt = 1; attempt <= SCORER_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SCORER_TIMEOUT_MS);

    try {
      const response = await fetch(`${SCORER_BASE_URL}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || `Scorer returned ${response.status}`);
      }

      const resumeScore = normalizeScore(payload.resumeScore);
      if (resumeScore === null) {
        throw new Error("Scorer payload missing valid resumeScore");
      }

      return {
        resumeScore,
        predictedCategory: payload.predictedCategory || "",
        confidence: typeof payload.confidence === "number" ? payload.confidence : null,
        scoreSource: payload.scoreSource === "fallback" ? "fallback" : "sieve_model"
      };
    } catch (error) {
      lastError = error;
      if (attempt === SCORER_MAX_RETRIES) break;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

const { validateResumeExtraction } = require("../../../services/ai-orchestrator.service");

function buildAnalysisPayload(overallScore, analysis, scorerWarnings = [], intelligenceV2 = null, parsed = {}) {
  const base = {
    overallScore,
    intelligenceVersion: intelligenceV2?.intelligenceVersion || "v1",
    categoryScores: analysis.categoryScores,
    sectionBreakdown: intelligenceV2?.sectionBreakdown || analysis.sectionBreakdown || [],
    strengths: intelligenceV2?.strengths?.length ? intelligenceV2.strengths : analysis.strengths,
    weaknesses: intelligenceV2?.weaknesses || [],
    improvements: intelligenceV2?.improvements?.length ? intelligenceV2.improvements : analysis.improvements,
    criticalIssues: intelligenceV2?.criticalIssues?.length ? intelligenceV2.criticalIssues : analysis.criticalIssues || [],
    checks: {
      ...analysis.checks,
      missingSkills: intelligenceV2?.skillIntelligence?.skillGaps || analysis.checks?.missingSkills || [],
      matchedSkills: intelligenceV2?.skillIntelligence?.careerMatch?.matchedSkills || analysis.checks?.matchedSkills || []
    },
    warnings: scorerWarnings,
    confidence: intelligenceV2?.confidence ?? null
  };

  if (intelligenceV2) {
    base.compositeScores = intelligenceV2.compositeScores;
    base.dimensionBreakdown = intelligenceV2.dimensionBreakdown;
    base.scoreExplanation = intelligenceV2.scoreExplanation;
    base.skillIntelligence = intelligenceV2.skillIntelligence;
    base.quality = intelligenceV2.quality;
    base.aiValidation = validateResumeExtraction({
      parsed,
      intelligenceV2,
      quality: intelligenceV2.quality || {}
    });
  }

  return base;
}

/**
 * Deterministic ATS score: overallScore is always exactly
 * resume-intelligence-v2's weighted dimension sum — no blending with any
 * other estimate, so the same resume + same internship always produce the
 * same score. The optional external ML scorer (SCORER_ENABLED, off by
 * default) is attached as a separate supplementary signal only, never mixed
 * into resumeScore, so enabling/disabling it can't change the deterministic
 * result.
 */
async function computeResumeScore({ profile, resumeText, targetRoleKey = "full_stack_developer", internshipContext = null }) {
  const text = String(resumeText || profile?.resume?.text || "").trim();

  if (!text) {
    return {
      resumeScore: 0,
      predictedCategory: "",
      confidence: null,
      scoreSource: "none",
      analysis: {
        overallScore: 0,
        categoryScores: { ats: 0, content: 0, impact: 0, skills: 0, structure: 0 },
        sectionBreakdown: [],
        strengths: [],
        improvements: ["Upload a resume to receive detailed analysis."],
        criticalIssues: [],
        warnings: [],
        checks: {},
        insufficientData: true,
        aiValidation: {
          confidenceScore: 0,
          validationStatus: "insufficient_data",
          confidenceTier: "low",
          explanationTrace: "No resume text available for analysis."
        }
      }
    };
  }

  // Keyword relevance target: the specific internship's required + preferred
  // skills when scoring in that context, otherwise the student's own profile
  // skills (generic ATS view).
  const keywordTargetSkills = internshipContext?.requiredSkills?.length
    ? [...internshipContext.requiredSkills, ...(internshipContext.preferredSkills || [])]
    : profile?.skills || [];

  const analysis = analyzeResumeText(text, keywordTargetSkills);
  const intelligenceV2 = computeResumeIntelligenceV2({
    profile,
    resumeText: text,
    textAnalysis: analysis,
    targetRoleKey,
    internshipContext
  });

  const resumeScore = intelligenceV2.overallScore;

  const result = {
    resumeScore,
    predictedCategory: intelligenceV2.skillIntelligence?.targetRole || "",
    confidence: intelligenceV2.confidence ?? null,
    scoreSource: "resume_intelligence_v2",
    analysis: buildAnalysisPayload(resumeScore, analysis, [], intelligenceV2, profile?.resume?.parsed || {})
  };

  if (SCORER_ENABLED) {
    try {
      const scorerResult = await callScorer(text);
      result.mlScorerSignal = {
        resumeScore: scorerResult.resumeScore,
        predictedCategory: scorerResult.predictedCategory,
        confidence: scorerResult.confidence,
        scoreSource: scorerResult.scoreSource,
        note: "Supplementary external model signal, shown for reference only — not blended into resumeScore."
      };
    } catch (error) {
      result.analysis.warnings = [
        ...(result.analysis.warnings || []),
        `Optional external model scorer unavailable: ${(error && error.message) || "unknown error"}.`
      ];
    }
  }

  return result;
}

module.exports = { computeResumeScore, SCORER_ENABLED };