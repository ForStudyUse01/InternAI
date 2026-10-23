import type { InternProfile, InternshipListing } from "@/lib/intern-portal";
import {
  TARGET_ROLE_PROFILES,
  TIER_WEIGHT,
  type RoleSkillProfile,
  type SkillTier
} from "@/lib/data/role-skill-profiles";
import {
  GENERIC_BLOCKLIST,
  KNOWN_SKILL_DICTIONARY,
  SEMANTIC_EQUIVALENTS,
  SKILL_CANONICAL_MAP,
  SKILL_CATEGORY_MAP,
  SKILL_EFFORT_HINTS,
  SKILL_QUICK_WIN_ACTIONS,
  SOFT_SKILL_BLOCKLIST,
  SUMMARY_CATEGORY_KEYS,
  SUMMARY_CATEGORY_LABELS,
  type SkillCategoryKey,
  type SummaryCategoryKey
} from "@/lib/skill-gap-dictionary";
import { normalizeSkillList, toDisplaySkill } from "@/lib/skill-normalizer";

export type SkillStatus = "present" | "partial" | "missing";
export type ConfidenceTier = "high" | "medium" | "low";
export type MatchLayer = "exact" | "semantic" | "context" | "none";

export type SkillEvidence = {
  source: "skills" | "project" | "experience" | "certification" | "profile" | "implicit";
  label: string;
  pass: 1 | 2 | 3;
};

export type SelfReportedLevel = "beginner" | "intermediate" | "advanced" | "expert";

export type SkillAssessment = {
  skill: string;
  displayName: string;
  normalized: string;
  status: SkillStatus;
  proficiency: number;
  tier: SkillTier;
  confidence: number;
  confidenceTier: ConfidenceTier;
  matchLayer: MatchLayer;
  verified: boolean;
  explanation: string;
  evidence: SkillEvidence[];
  /** Only set when the student explicitly self-reported this level in their profile — never estimated. */
  selfReportedLevel: SelfReportedLevel | null;
};

export type SkillVisualStatus = "missing" | "partial" | "strong";

export type CategorySummaryBar = {
  key: SummaryCategoryKey;
  category: string;
  userScore: number;
  requiredScore: number;
};

export type ProgressBarItem = {
  skill: string;
  displayName: string;
  userLevel: number;
  requiredLevel: number;
  status: SkillVisualStatus;
  tier: SkillTier;
  confidence: number;
  verified: boolean;
  tooltip: string;
  selfReportedLevel: SelfReportedLevel | null;
};

/** Unified row produced by STEP 2 before chart aggregation */
export type StructuredSkillRow = {
  skillName: string;
  normalized: string;
  category: SkillTier;
  skillArea: SkillCategoryKey;
  userLevel: number;
  requiredLevel: number;
  status: SkillStatus;
  confidence: number;
  verified: boolean;
  explanation: string;
  selfReportedLevel: SelfReportedLevel | null;
};

export type ChartValidationResult<T> = {
  valid: boolean;
  data: T[];
};

export type QuickWinEffort = "Low" | "Medium";
export type QuickWinImpact = "High" | "Medium";

export type QuickWinItem = {
  skill: string;
  displayName: string;
  why: string;
  effort: QuickWinEffort;
  impact: QuickWinImpact;
  action: string;
  /** Live search on a real course platform for this skill — not a fabricated course catalog entry. */
  courseSearchUrl: string;
};

/** A skill-gap analysis can target either a generic role preset (roleKey string) or a real internship posting. */
export type SkillGapTarget = string | InternshipListing;

export type SkillPriority = "High" | "Medium" | "Low";

export type RecommendedSkillItem = {
  skill: string;
  displayName: string;
  priority: SkillPriority;
  reason: string;
  courseSearchUrl: string;
};

/** Result of comparing one requirement (education/experience) against the student's profile — only populated in internship mode, since generic role presets carry no such requirements. */
export type RequirementCheck = {
  status: "match" | "mismatch" | "not_stated" | "unknown";
  score: number;
  explanation: string;
};

export type CertificationCheckResult = {
  relevantCertifications: string[];
  score: number;
  explanation: string;
};

export type SkillGapResult = {
  roleKey: string;
  roleLabel: string;
  roleMappingReliable: boolean;
  /** True when compared against a real internship posting rather than a generic role preset. */
  scoredAgainstInternship: boolean;
  matchPercent: number;
  matchPercentLow: number;
  matchPercentHigh: number;
  showMatchRange: boolean;
  analysisConfidence: number;
  lowConfidenceAnalysis: boolean;
  present: SkillAssessment[];
  partial: SkillAssessment[];
  missing: SkillAssessment[];
  verifiedPresent: SkillAssessment[];
  criticalMissing: SkillAssessment[];
  optionalMissing: SkillAssessment[];
  strongSkills: SkillAssessment[];
  /** Required-skill assessments only — populated in internship mode. */
  requiredSkillAssessments: SkillAssessment[];
  /** Preferred-skill assessments only — populated in internship mode. */
  preferredSkillAssessments: SkillAssessment[];
  /** Skills the student has evidence for that aren't required or preferred for this role. */
  additionalValuableSkills: string[];
  educationCheck: RequirementCheck | null;
  experienceCheck: RequirementCheck | null;
  certificationCheck: CertificationCheckResult | null;
  /** Priority-ordered (High/Medium/Low) skill recommendations with reasons — internship mode. */
  recommendedSkills: RecommendedSkillItem[];
  priorityRoadmap: SkillAssessment[];
  quickWins: QuickWinItem[];
  structuredSkills: StructuredSkillRow[];
  categorySummary: CategorySummaryBar[];
  categorySummaryValid: boolean;
  progressBars: ProgressBarItem[];
  progressBarsChartValid: boolean;
  extractedSkillCount: number;
  verifiedSkillCount: number;
  hasResumeData: boolean;
  insufficientData: boolean;
};

export type ExtractedResumeSkills = {
  pass1: Set<string>;
  pass2: Set<string>;
  pass3: Set<string>;
  verified: Set<string>;
  all: Set<string>;
  evidence: Map<string, SkillEvidence[]>;
  /** Skill -> level, only populated from the student's own explicit input (profile.skillDetails). */
  selfReportedLevels: Map<string, SelfReportedLevel>;
  projectCount: number;
  experienceCount: number;
  extractionQuality: number;
};

const VALID_SELF_REPORTED_LEVELS: ReadonlySet<string> = new Set(["beginner", "intermediate", "advanced", "expert"]);

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function canonicalForGap(raw: string): string {
  const cleaned = String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9+.#\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";

  const fromNormalizer = normalizeSkillList([cleaned])[0] || cleaned;
  return SKILL_CANONICAL_MAP[fromNormalizer] || SKILL_CANONICAL_MAP[cleaned] || fromNormalizer;
}

function isValidTechnicalSkill(canonical: string): boolean {
  if (!canonical || canonical.length < 2) return false;
  if (SOFT_SKILL_BLOCKLIST.has(canonical)) return false;
  if (GENERIC_BLOCKLIST.has(canonical)) return false;
  return KNOWN_SKILL_DICTIONARY.has(canonical);
}

function addEvidence(
  map: Map<string, SkillEvidence[]>,
  skill: string,
  entry: SkillEvidence
) {
  const list = map.get(skill) || [];
  if (!list.some((e) => e.source === entry.source && e.label === entry.label && e.pass === entry.pass)) {
    list.push(entry);
    map.set(skill, list);
  }
}

function registerSkill(
  bucket: Set<string>,
  verified: Set<string>,
  evidence: Map<string, SkillEvidence[]>,
  raw: string,
  entry: SkillEvidence
) {
  const c = canonicalForGap(raw);
  if (!c || SOFT_SKILL_BLOCKLIST.has(c) || GENERIC_BLOCKLIST.has(c)) return;
  if (!isValidTechnicalSkill(c)) return;

  bucket.add(c);
  addEvidence(evidence, c, entry);
  if (entry.pass <= 2 || entry.source === "skills" || entry.source === "profile") {
    verified.add(c);
  }
}

function textContainsSkill(text: string, skill: string): boolean {
  if (!text || !skill) return false;
  const escaped = skill.replace(/[.+#]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text.toLowerCase());
}

function scanTextForKnownSkills(text: string): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const skill of KNOWN_SKILL_DICTIONARY) {
    if (textContainsSkill(lower, skill)) found.push(skill);
  }
  for (const [alias, canonical] of Object.entries(SKILL_CANONICAL_MAP)) {
    if (alias.length >= 2 && textContainsSkill(lower, alias) && isValidTechnicalSkill(canonical)) {
      found.push(canonical);
    }
  }
  return [...new Set(found.map(canonicalForGap))];
}

/** PASS 1: direct | PASS 2: context | PASS 3: implicit */
export function extractSkillsFromResume(profile: InternProfile | null): ExtractedResumeSkills {
  const parsed = profile?.resume?.parsed;
  const pass1 = new Set<string>();
  const pass2 = new Set<string>();
  const pass3 = new Set<string>();
  const verified = new Set<string>();
  const evidence = new Map<string, SkillEvidence[]>();
  const selfReportedLevels = new Map<string, SelfReportedLevel>();

  const addPass1 = (skills: unknown, label = "Resume skills section") => {
    for (const s of normalizeSkillList(skills)) {
      registerSkill(pass1, verified, evidence, s, { source: "skills", label, pass: 1 });
    }
  };

  addPass1(parsed?.skills);
  addPass1(parsed?.technicalSkills);
  addPass1(profile?.skills);
  addPass1((profile?.skillDetails || []).map((d) => d.name).filter(Boolean));

  for (const detail of profile?.skillDetails || []) {
    if (!detail?.name) continue;
    const level = String(detail.level || "").toLowerCase().trim();
    if (!VALID_SELF_REPORTED_LEVELS.has(level)) continue;
    const c = canonicalForGap(detail.name);
    if (c) selfReportedLevels.set(c, level as SelfReportedLevel);
  }

  for (const s of normalizeSkillList(profile?.softSkills)) {
    const c = canonicalForGap(s);
    if (c && isValidTechnicalSkill(c)) {
      registerSkill(pass1, verified, evidence, c, { source: "profile", label: "Profile skills", pass: 1 });
    }
  }

  const projects = parsed?.projects || profile?.profileSections?.projects || [];
  for (const proj of projects) {
    const title = proj.title || "Project";
    for (const s of normalizeSkillList(proj.techStack)) {
      registerSkill(pass2, verified, evidence, s, { source: "project", label: title, pass: 2 });
    }
    const blob = [proj.title, proj.description].filter(Boolean).join(" ");
    for (const s of scanTextForKnownSkills(blob)) {
      registerSkill(pass2, verified, evidence, s, { source: "project", label: title, pass: 2 });
    }
  }

  const experience = parsed?.experience || profile?.profileSections?.experience || [];
  for (const exp of experience) {
    const label = [exp.role, exp.company].filter(Boolean).join(" @ ") || "Experience";
    const blob = [exp.role, exp.company, exp.description].filter(Boolean).join(" ");
    for (const s of scanTextForKnownSkills(blob)) {
      registerSkill(pass2, verified, evidence, s, { source: "experience", label, pass: 2 });
    }
  }

  const certs =
    parsed?.certifications || profile?.certificationEntries || profile?.profileSections?.certifications || [];
  for (const cert of certs) {
    const name = cert.name || "Certification";
    const blob = [cert.name, cert.issuer].filter(Boolean).join(" ");
    for (const s of scanTextForKnownSkills(blob)) {
      registerSkill(pass2, verified, evidence, s, { source: "certification", label: name, pass: 2 });
    }
  }

  const resumeText = profile?.resume?.text || "";
  const summary = parsed?.summary || profile?.summary || "";
  for (const s of scanTextForKnownSkills(`${summary} ${resumeText.slice(0, 8000)}`)) {
    if (!pass1.has(s) && !pass2.has(s)) {
      registerSkill(pass3, verified, evidence, s, { source: "implicit", label: "Resume context", pass: 3 });
    }
  }

  for (const s of pass1) pass3.delete(s);
  for (const s of pass2) pass3.delete(s);

  const all = new Set([...pass1, ...pass2, ...pass3]);
  const dictionaryHits = [...all].filter((s) => KNOWN_SKILL_DICTIONARY.has(s)).length;
  const extractionQuality = all.size ? dictionaryHits / all.size : 0;

  return {
    pass1,
    pass2,
    pass3,
    verified,
    all,
    evidence,
    selfReportedLevels,
    projectCount: projects.length,
    experienceCount: experience.length,
    extractionQuality
  };
}

export function getTargetRoleSkills(roleKey: string): {
  roleKey: string;
  profile: RoleSkillProfile;
  core: string[];
  secondary: string[];
  optional: string[];
  tiers: Array<{ skill: string; tier: SkillTier }>;
  mappingReliable: boolean;
} {
  const mappingReliable = Boolean(TARGET_ROLE_PROFILES[roleKey]);
  const profile = TARGET_ROLE_PROFILES[roleKey] || TARGET_ROLE_PROFILES.full_stack_developer;
  const core = profile.coreSkills.map(canonicalForGap).filter(Boolean);
  const secondary = profile.secondarySkills.map(canonicalForGap).filter(Boolean);
  const optional = profile.optionalSkills.map(canonicalForGap).filter(Boolean);
  const tiers: Array<{ skill: string; tier: SkillTier }> = [
    ...core.map((skill) => ({ skill, tier: "core" as SkillTier })),
    ...secondary.map((skill) => ({ skill, tier: "secondary" as SkillTier })),
    ...optional.map((skill) => ({ skill, tier: "optional" as SkillTier }))
  ];
  return {
    roleKey: mappingReliable ? roleKey : "full_stack_developer",
    profile,
    core,
    secondary,
    optional,
    tiers,
    mappingReliable
  };
}

function isInternshipTarget(target: SkillGapTarget): target is InternshipListing {
  return typeof target === "object" && target !== null;
}

type ResolvedSkillGapTarget = {
  roleKey: string;
  roleLabel: string;
  tiers: Array<{ skill: string; tier: SkillTier }>;
  mappingReliable: boolean;
  internshipMode: boolean;
  internship: InternshipListing | null;
};

/** Single entry point for resolving either a generic role preset or a real internship into a comparable skill set. */
export function resolveSkillGapTarget(target: SkillGapTarget): ResolvedSkillGapTarget {
  if (isInternshipTarget(target)) {
    const required = target.skillsRequired?.map(canonicalForGap).filter(Boolean) || [];
    const preferred = (target.prioritySkills || [])
      .map(canonicalForGap)
      .filter((skill) => Boolean(skill) && !required.includes(skill));
    const tiers: Array<{ skill: string; tier: SkillTier }> = [
      ...required.map((skill) => ({ skill, tier: "core" as SkillTier })),
      ...preferred.map((skill) => ({ skill, tier: "secondary" as SkillTier }))
    ];
    return {
      roleKey: target._id,
      roleLabel: target.role || "Selected internship",
      tiers,
      mappingReliable: true,
      internshipMode: true,
      internship: target
    };
  }

  const { roleKey, profile, tiers, mappingReliable } = getTargetRoleSkills(target);
  return { roleKey, roleLabel: profile.label, tiers, mappingReliable, internshipMode: false, internship: null };
}

function userHasExact(skill: string, extracted: ExtractedResumeSkills): boolean {
  return extracted.pass1.has(skill) || extracted.verified.has(skill);
}

function userHasSemantic(skill: string, extracted: ExtractedResumeSkills): string | null {
  const equivalents = SEMANTIC_EQUIVALENTS[skill] || [skill];
  for (const eq of equivalents) {
    const c = canonicalForGap(eq);
    if (extracted.all.has(c)) return c;
  }
  return null;
}

function hasContextEvidence(skill: string, extracted: ExtractedResumeSkills): boolean {
  const ev = extracted.evidence.get(skill) || [];
  return ev.some((e) => e.source === "project" || e.source === "experience" || e.source === "certification");
}

function tierFromConfidence(c: number): ConfidenceTier {
  if (c >= 0.8) return "high";
  if (c >= 0.5) return "medium";
  return "low";
}

function buildExplanation(
  skill: string,
  displayName: string,
  status: SkillStatus,
  layer: MatchLayer,
  evidence: SkillEvidence[]
): string {
  if (status === "present") {
    if (layer === "exact") return `${displayName} verified in resume skills section`;
    if (layer === "semantic") return `${displayName} matched via equivalent skill naming`;
    return `${displayName} supported by project or experience evidence`;
  }
  if (status === "partial") {
    const src = evidence[0]?.source || "context";
    return `${displayName} found in ${src} only — limited evidence`;
  }
  return `${displayName} marked missing because no project or skills evidence found`;
}

function assessOneSkill(
  normalized: string,
  tier: SkillTier,
  extracted: ExtractedResumeSkills
): SkillAssessment {
  const displayName = toDisplaySkill(normalized) || normalized;
  const evidence = [...(extracted.evidence.get(normalized) || [])];

  const semanticHit = userHasSemantic(normalized, extracted);
  if (semanticHit && semanticHit !== normalized && !evidence.some((e) => e.label.includes(semanticHit))) {
    evidence.push(...(extracted.evidence.get(semanticHit) || []));
  }

  const uniqueEvidence = evidence.filter(
    (e, i, arr) => arr.findIndex((x) => x.source === e.source && x.label === e.label) === i
  );

  let matchLayer: MatchLayer = "none";
  let confidence = 0;

  const exact = userHasExact(normalized, extracted) || extracted.pass1.has(normalized);
  const semantic = Boolean(semanticHit);
  const context = hasContextEvidence(normalized, extracted) || uniqueEvidence.some((e) => e.pass === 2);

  if (exact && context) {
    matchLayer = "exact";
    confidence = 0.95;
  } else if (exact) {
    matchLayer = "exact";
    confidence = 0.85;
  } else if (semantic && context) {
    matchLayer = "semantic";
    confidence = 0.75;
  } else if (semantic) {
    matchLayer = "semantic";
    confidence = 0.65;
  } else if (context && uniqueEvidence.length >= 2) {
    matchLayer = "context";
    confidence = 0.6;
  } else if (context || uniqueEvidence.length === 1) {
    matchLayer = "context";
    confidence = 0.4;
  }

  const verified = confidence >= 0.5;
  let status: SkillStatus = "missing";
  let proficiency = 0;

  if (confidence >= 0.8) {
    status = "present";
    proficiency = clamp(confidence * 100);
  } else if (confidence >= 0.5) {
    status = "present";
    proficiency = clamp(confidence * 100 - 5);
  } else if (confidence >= 0.35) {
    status = "partial";
    proficiency = clamp(confidence * 100);
  } else {
    status = "missing";
    proficiency = 0;
  }

  return {
    skill: normalized,
    displayName,
    normalized,
    status,
    proficiency,
    tier,
    confidence,
    confidenceTier: tierFromConfidence(confidence),
    matchLayer,
    verified,
    explanation: buildExplanation(normalized, displayName, status, matchLayer, uniqueEvidence),
    evidence: uniqueEvidence,
    selfReportedLevel: extracted.selfReportedLevels.get(normalized) || null
  };
}

function computeWeightedMatch(assessments: SkillAssessment[]): number {
  let numerator = 0;
  let denominator = 0;

  for (const a of assessments) {
    const w = TIER_WEIGHT[a.tier];
    denominator += w;
    if (a.verified && a.status === "present") {
      numerator += w;
    } else if (a.verified && a.status === "partial") {
      numerator += w * 0.5;
    }
  }

  if (!denominator) return 0;
  return clamp((numerator / denominator) * 100);
}

function computeAnalysisConfidence(
  extracted: ExtractedResumeSkills,
  profile: InternProfile | null,
  mappingReliable: boolean
): number {
  let score = 0;

  const hasExplicit = extracted.pass1.size > 0 ? 0.35 : 0;
  const hasContext = extracted.pass2.size > 0 || extracted.projectCount > 0 ? 0.25 : 0;
  const clarity = extracted.extractionQuality * 0.2;
  const resumeQuality = profile?.resume?.analysis?.quality?.isReliable ? 0.1 : 0.05;
  const roleMap = mappingReliable ? 0.1 : 0.03;

  score = hasExplicit + hasContext + clarity + resumeQuality + roleMap;

  if (!profile?.resumeUploaded) score *= 0.5;
  if (extracted.all.size < 3) score *= 0.7;

  return clamp(score * 100);
}

/**
 * Weighted match for a real internship: required skills 60%, preferred 15%,
 * projects proving those skills 10%, relevant certifications 5%, education
 * match 5%, experience match 5% — sums to 100%. Every sub-score is derived
 * directly from evidence already extracted from the resume/profile, never
 * from an estimated proficiency.
 */
function scoreAssessmentGroup(assessments: SkillAssessment[]): number {
  if (!assessments.length) return 100;
  let credit = 0;
  for (const a of assessments) {
    if (a.status === "present") credit += 1;
    else if (a.status === "partial") credit += 0.5;
  }
  return clamp((credit / assessments.length) * 100);
}

function computeProjectsProvingScore(relevantAssessments: SkillAssessment[]): number {
  const proven = relevantAssessments.filter((a) => a.status === "present" || a.status === "partial");
  if (!proven.length) return 0;
  const withProjectEvidence = proven.filter((a) => a.evidence.some((e) => e.source === "project"));
  return clamp((withProjectEvidence.length / proven.length) * 100);
}

function computeCertificationCheck(profile: InternProfile | null, targetSkillsCanonical: string[]): CertificationCheckResult {
  const entries = [...(profile?.certificationEntries || []), ...(profile?.verifiedCertificationEntries || [])];
  const seen = new Set<string>();
  const uniqueCerts = entries.filter((c) => {
    const key = String(c?.name || "").toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (uniqueCerts.length === 0) {
    return { relevantCertifications: [], score: 0, explanation: "No certifications on your profile — this is a bonus dimension, not a requirement." };
  }

  if (targetSkillsCanonical.length === 0) {
    return {
      relevantCertifications: uniqueCerts.map((c) => c.name || "").filter(Boolean),
      score: 60,
      explanation: `${uniqueCerts.length} certification(s) on file.`
    };
  }

  const relevant = uniqueCerts.filter((c) => {
    const blob = `${c.name || ""} ${c.issuer || ""}`.toLowerCase();
    return targetSkillsCanonical.some((skill) => blob.includes(skill));
  });

  return {
    relevantCertifications: relevant.map((c) => c.name || "").filter(Boolean),
    score: relevant.length ? clamp(50 + Math.min(50, relevant.length * 20)) : 10,
    explanation:
      relevant.length > 0
        ? `${relevant.length} of ${uniqueCerts.length} certification(s) are relevant to this role's required skills.`
        : `${uniqueCerts.length} certification(s) on file, but none appear relevant to this role's required skills.`
  };
}

const DEGREE_SYNONYM_GROUPS: string[][] = [
  ["b.tech", "btech", "bachelor of technology", "b.e", "be"],
  ["m.tech", "mtech", "master of technology", "m.e", "me"],
  ["bca", "bachelor of computer applications"],
  ["mca", "master of computer applications"],
  ["b.sc", "bsc", "bachelor of science"],
  ["m.sc", "msc", "master of science"],
  ["mba"],
  ["bba"],
  ["diploma"],
  ["phd", "ph.d", "doctorate"]
];

function normalizeForDegreeMatch(text?: string): string {
  return String(text || "").toLowerCase().replace(/[.]+/g, " ").replace(/\s+/g, " ").trim();
}

function textsReferToSameDegree(a?: string, b?: string): boolean {
  const na = normalizeForDegreeMatch(a);
  const nb = normalizeForDegreeMatch(b);
  if (!na || !nb) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  return DEGREE_SYNONYM_GROUPS.some((group) => group.some((g) => na.includes(g)) && group.some((g) => nb.includes(g)));
}

/** Mirrors the backend ATS engine's education comparison so both surfaces agree — see resume-intelligence-v2.service.js scoreEducation. */
function computeEducationCheck(profile: InternProfile | null, internship: InternshipListing): RequirementCheck {
  const hasRequirement = Boolean(internship.educationQualification || internship.degreePreferences || internship.minimumCgpa);
  const candidateEntries = (profile?.educationDetails || []).filter((e) => e.degree || e.branch || e.cgpa);

  if (!hasRequirement) {
    return { status: "not_stated", score: 100, explanation: "This internship doesn't list specific education requirements." };
  }
  if (candidateEntries.length === 0) {
    return {
      status: "unknown",
      score: 40,
      explanation: "This internship lists education requirements, but no education details were found on your profile."
    };
  }

  const primary = candidateEntries[0];
  let score = 100;
  const reasons: string[] = [];

  if (internship.educationQualification) {
    const matches = candidateEntries.some((e) => textsReferToSameDegree(e.degree, internship.educationQualification));
    if (!matches) {
      score -= 40;
      reasons.push(
        `Degree requirement (${internship.educationQualification}) doesn't clearly match your listed degree (${primary.degree || "not specified"}).`
      );
    }
  }
  if (internship.degreePreferences) {
    const prefNormalized = normalizeForDegreeMatch(internship.degreePreferences);
    const matches = candidateEntries.some((e) => e.branch && prefNormalized.includes(normalizeForDegreeMatch(e.branch)));
    if (!matches) {
      score -= 30;
      reasons.push(
        `Preferred branch (${internship.degreePreferences}) doesn't clearly match your listed branch (${primary.branch || "not specified"}).`
      );
    }
  }
  if (internship.minimumCgpa) {
    const minCgpa = parseFloat(internship.minimumCgpa);
    const candidateCgpa = parseFloat(primary.cgpa || "");
    if (!Number.isNaN(minCgpa)) {
      if (Number.isNaN(candidateCgpa)) {
        score -= 10;
        reasons.push(`Minimum CGPA of ${minCgpa} is required, but no CGPA was found on your profile.`);
      } else if (candidateCgpa < minCgpa) {
        score -= 20;
        reasons.push(`Your CGPA (${candidateCgpa}) is below the required minimum (${minCgpa}).`);
      }
    }
  }

  score = clamp(score);
  return {
    status: reasons.length ? "mismatch" : "match",
    score,
    explanation: reasons.length ? reasons.join(" ") : "Your education matches this internship's stated requirements."
  };
}

function parseExperienceRequirementMonths(text?: string): { requiredMonths: number; stated: boolean } {
  const t = String(text || "").toLowerCase().trim();
  if (!t) return { requiredMonths: 0, stated: false };
  if (/fresher|no\s*experience|not\s*required|entry[-\s]?level|no\s*prior|0\s*(year|month)/i.test(t)) {
    return { requiredMonths: 0, stated: true };
  }
  const match = t.match(/(\d+(?:\.\d+)?)\s*\+?\s*(year|yr|month|mo)/i);
  if (!match) return { requiredMonths: 0, stated: true };
  const n = parseFloat(match[1]);
  const months = match[2].toLowerCase().startsWith("y") ? Math.round(n * 12) : Math.round(n);
  return { requiredMonths: months, stated: true };
}

/** Mirrors the backend ATS engine's experience comparison — see resume-intelligence-v2.service.js scoreExperience. */
function computeExperienceCheck(profile: InternProfile | null, internship: InternshipListing, extracted: ExtractedResumeSkills): RequirementCheck {
  const { requiredMonths, stated } = parseExperienceRequirementMonths(internship.experienceRequirement);
  const hasAnyExperience = extracted.experienceCount > 0 || (profile?.experience || []).length > 0;

  if (!stated || requiredMonths === 0) {
    return { status: "not_stated", score: 100, explanation: "No specific experience requirement for this internship." };
  }
  if (hasAnyExperience) {
    return {
      status: "match",
      score: 100,
      explanation: `This internship prefers ~${requiredMonths} month(s) of experience, and relevant experience/internship entries were found on your resume.`
    };
  }
  return {
    status: "mismatch",
    score: 40,
    explanation: `This internship prefers ~${requiredMonths} month(s) of experience, but no experience/internship entries were found on your resume.`
  };
}

function recommendedSkillReason(a: SkillAssessment, priority: SkillPriority, roleLabel: string): string {
  if (priority === "High") return `Required by ${roleLabel} — not yet found in your resume or profile.`;
  if (priority === "Medium") return `Preferred skill for ${roleLabel} — having it strengthens your application.`;
  return `You have some evidence of this skill (via ${a.evidence[0]?.source || "resume context"}) — strengthen it with a dedicated project or list it explicitly.`;
}

/** Priority-ordered, evidence-based recommendations — never invents a skill not present in the role's actual requirements. */
function buildRecommendedSkills(assessments: SkillAssessment[], roleLabel: string): RecommendedSkillItem[] {
  const items: RecommendedSkillItem[] = [];
  for (const a of assessments) {
    let priority: SkillPriority | null = null;
    if (a.tier === "core" && a.status === "missing") priority = "High";
    else if (a.tier === "secondary" && a.status === "missing") priority = "Medium";
    else if (a.status === "partial") priority = "Low";
    if (!priority) continue;
    items.push({
      skill: a.normalized,
      displayName: a.displayName,
      priority,
      reason: recommendedSkillReason(a, priority, roleLabel),
      courseSearchUrl: courseSearchUrl(a.displayName)
    });
  }
  const rank: Record<SkillPriority, number> = { High: 0, Medium: 1, Low: 2 };
  return items.sort((x, y) => rank[x.priority] - rank[y.priority]);
}

export function calculateSkillGap(profile: InternProfile | null, target: SkillGapTarget): SkillGapResult {
  const extracted = extractSkillsFromResume(profile);
  const { roleKey: resolvedKey, roleLabel, tiers, mappingReliable, internshipMode, internship } = resolveSkillGapTarget(target);

  const hasResumeData =
    Boolean(profile?.resumeUploaded) &&
    (extracted.pass1.size > 0 || extracted.pass2.size > 0 || extracted.projectCount > 0);

  const assessments: SkillAssessment[] = tiers.map(({ skill, tier }) =>
    assessOneSkill(skill, tier, extracted)
  );

  const present = assessments.filter((a) => a.status === "present");
  const partial = assessments.filter((a) => a.status === "partial");
  const missing = assessments.filter((a) => a.status === "missing");
  const verifiedPresent = assessments.filter((a) => a.verified && a.status === "present");
  const criticalMissing = missing.filter((a) => a.tier === "core");
  const optionalMissing = missing.filter((a) => a.tier === "optional");
  const strongSkills = present.filter((a) => a.confidence >= 0.8);

  let matchPercent: number;
  let educationCheck: RequirementCheck | null = null;
  let experienceCheck: RequirementCheck | null = null;
  let certificationCheck: CertificationCheckResult | null = null;
  let additionalValuableSkills: string[] = [];
  let recommendedSkills: RecommendedSkillItem[] = [];
  const requiredSkillAssessments = assessments.filter((a) => a.tier === "core");
  const preferredSkillAssessments = assessments.filter((a) => a.tier === "secondary");

  if (internshipMode && internship) {
    const requiredPercent = scoreAssessmentGroup(requiredSkillAssessments);
    const preferredPercent = preferredSkillAssessments.length ? scoreAssessmentGroup(preferredSkillAssessments) : null;
    const projectsScore = computeProjectsProvingScore([...requiredSkillAssessments, ...preferredSkillAssessments]);
    const targetCanonical = tiers.map((t) => t.skill);

    certificationCheck = computeCertificationCheck(profile, targetCanonical);
    educationCheck = computeEducationCheck(profile, internship);
    experienceCheck = computeExperienceCheck(profile, internship, extracted);

    matchPercent = clamp(
      requiredPercent * 0.6 +
        (preferredPercent ?? requiredPercent) * 0.15 +
        projectsScore * 0.1 +
        certificationCheck.score * 0.05 +
        educationCheck.score * 0.05 +
        experienceCheck.score * 0.05
    );

    const targetSet = new Set(targetCanonical);
    additionalValuableSkills = [...extracted.all]
      .filter((s) => !targetSet.has(s) && isValidTechnicalSkill(s))
      .map((s) => toDisplaySkill(s))
      .filter(Boolean)
      .slice(0, 10);

    recommendedSkills = buildRecommendedSkills(assessments, roleLabel);
  } else {
    matchPercent = computeWeightedMatch(assessments);
  }

  const analysisConfidence = computeAnalysisConfidence(extracted, profile, mappingReliable);
  const lowConfidenceAnalysis = analysisConfidence < 70 || !hasResumeData;

  const variance = lowConfidenceAnalysis ? Math.max(5, Math.round((100 - analysisConfidence) * 0.15)) : 3;
  const matchPercentLow = clamp(matchPercent - variance);
  const matchPercentHigh = clamp(matchPercent + variance);
  const showMatchRange = analysisConfidence < 70;

  const priorityRoadmap = [...criticalMissing, ...partial.filter((p) => p.tier === "core")]
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, 5);

  const chartDatasets = buildChartDatasets(assessments, extracted);

  return {
    roleKey: resolvedKey,
    roleLabel,
    roleMappingReliable: mappingReliable,
    scoredAgainstInternship: internshipMode,
    matchPercent,
    matchPercentLow,
    matchPercentHigh,
    showMatchRange,
    analysisConfidence,
    lowConfidenceAnalysis,
    present,
    partial,
    missing,
    verifiedPresent,
    criticalMissing,
    optionalMissing,
    strongSkills,
    requiredSkillAssessments,
    preferredSkillAssessments,
    additionalValuableSkills,
    educationCheck,
    experienceCheck,
    certificationCheck,
    recommendedSkills,
    priorityRoadmap,
    quickWins: buildQuickWins(assessments, roleLabel),
    structuredSkills: chartDatasets.structured,
    categorySummary: chartDatasets.categorySummary,
    categorySummaryValid: chartDatasets.categorySummaryValid,
    progressBars: chartDatasets.progressBars,
    progressBarsChartValid: chartDatasets.progressBarsValid,
    extractedSkillCount: extracted.all.size,
    verifiedSkillCount: extracted.verified.size,
    hasResumeData,
    insufficientData: !hasResumeData || tiers.length === 0
  };
}

const REQUIRED_LEVEL_BY_TIER: Record<SkillTier, number> = {
  core: 100,
  secondary: 85,
  optional: 70
};

const IMPACT_RANK: Record<QuickWinImpact, number> = { High: 2, Medium: 1 };
const EFFORT_RANK: Record<QuickWinEffort, number> = { Low: 0, Medium: 1 };

function quickWinImpact(tier: SkillTier): QuickWinImpact {
  return tier === "core" ? "High" : "Medium";
}

function quickWinEffort(skill: string, tier: SkillTier): QuickWinEffort {
  const canonical = canonicalForGap(skill);
  if (SKILL_EFFORT_HINTS[canonical]) return SKILL_EFFORT_HINTS[canonical];
  return tier === "optional" ? "Low" : "Medium";
}

function quickWinWhy(assessment: SkillAssessment, roleLabel: string): string {
  if (assessment.tier === "core" && assessment.status === "missing") {
    return `Core requirement for ${roleLabel} roles`;
  }
  if (assessment.status === "missing") {
    return `Commonly expected in ${roleLabel} positions`;
  }
  return `Needs stronger proof for ${roleLabel} hiring`;
}

function quickWinAction(skill: string, displayName: string, tier: SkillTier): string {
  const canonical = canonicalForGap(skill);
  if (SKILL_QUICK_WIN_ACTIONS[canonical]) return SKILL_QUICK_WIN_ACTIONS[canonical];
  if (tier === "core") return `Complete a focused ${displayName} practice exercise`;
  return `Try a short ${displayName} tutorial`;
}

/** Real live search on a course platform — never a fabricated specific course title. */
function courseSearchUrl(displayName: string): string {
  return `https://www.coursera.org/search?query=${encodeURIComponent(displayName)}`;
}

/** Missing or weak skills ranked for Quick Wins (impact → effort) */
export function buildQuickWins(assessments: SkillAssessment[], roleLabel: string): QuickWinItem[] {
  const weak = assessments.filter(
    (a) => a.status === "missing" || a.status === "partial" || (a.status === "present" && !a.verified)
  );

  const seen = new Set<string>();
  const items: QuickWinItem[] = [];

  for (const a of weak) {
    if (seen.has(a.normalized)) continue;
    seen.add(a.normalized);
    items.push({
      skill: a.normalized,
      displayName: a.displayName,
      why: quickWinWhy(a, roleLabel),
      effort: quickWinEffort(a.normalized, a.tier),
      impact: quickWinImpact(a.tier),
      action: quickWinAction(a.normalized, a.displayName, a.tier),
      courseSearchUrl: courseSearchUrl(a.displayName)
    });
  }

  return items
    .sort((a, b) => {
      const impactDiff = IMPACT_RANK[b.impact] - IMPACT_RANK[a.impact];
      if (impactDiff !== 0) return impactDiff;
      return EFFORT_RANK[a.effort] - EFFORT_RANK[b.effort];
    })
    .slice(0, 5);
}

function safeChartNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  if (value == null || !Number.isFinite(n) || Number.isNaN(n)) return fallback;
  return clamp(n);
}

function getSkillArea(skill: string): SkillCategoryKey {
  const canonical = canonicalForGap(skill);
  return SKILL_CATEGORY_MAP[canonical] || "tools";
}

/** Fold internal areas into the 6 summary categories shown in flat bar chart */
function toSummaryCategory(area: SkillCategoryKey): SummaryCategoryKey | null {
  if (area === "data_ml") return "programming";
  if (SUMMARY_CATEGORY_KEYS.includes(area as SummaryCategoryKey)) return area as SummaryCategoryKey;
  return null;
}

function toVisualStatus(row: StructuredSkillRow): SkillVisualStatus {
  if (row.status === "missing" || row.userLevel === 0) return "missing";
  if (
    row.status === "partial" ||
    row.confidence < 0.7 ||
    row.userLevel < row.requiredLevel * 0.7
  ) {
    return "partial";
  }
  return "strong";
}

/** STEP 1 — normalize, dedupe, and drop invalid extracted skills */
export function cleanRawExtractedSkills(extracted: ExtractedResumeSkills): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of extracted.all) {
    const canonical = canonicalForGap(raw);
    if (!canonical || seen.has(canonical)) continue;
    if (!isValidTechnicalSkill(canonical)) continue;
    seen.add(canonical);
    cleaned.push(canonical);
  }
  return cleaned;
}

/** STEP 2 — unified structure for mapping + chart layers */
export function structureSkillData(assessments: SkillAssessment[]): StructuredSkillRow[] {
  return assessments.map((a) => {
    const chartStatus: SkillStatus =
      a.confidence < 0.7 && a.status === "present" ? "partial" : a.status;
    const userLevel = chartStatus === "missing" ? 0 : safeChartNumber(a.proficiency, 0);

    return {
      skillName: a.displayName,
      normalized: a.normalized,
      category: a.tier,
      skillArea: getSkillArea(a.normalized),
      userLevel,
      requiredLevel: REQUIRED_LEVEL_BY_TIER[a.tier],
      status: chartStatus,
      confidence: a.confidence,
      verified: a.verified && a.confidence >= 0.7,
      explanation: a.explanation,
      selfReportedLevel: a.selfReportedLevel
    };
  });
}

/** STEP 3A — flat category summary bars (linear comparison, not radar) */
export function aggregateCategorySummary(rows: StructuredSkillRow[]): CategorySummaryBar[] {
  return SUMMARY_CATEGORY_KEYS.map((key) => {
    const inCategory = rows.filter((r) => toSummaryCategory(r.skillArea) === key);
    if (!inCategory.length) {
      return {
        key,
        category: SUMMARY_CATEGORY_LABELS[key],
        userScore: 0,
        requiredScore: 0
      };
    }

    let userWeighted = 0;
    let requiredWeighted = 0;
    let totalWeight = 0;

    for (const row of inCategory) {
      const w = TIER_WEIGHT[row.category];
      totalWeight += w;
      userWeighted += row.userLevel * w;
      requiredWeighted += row.requiredLevel * w;
    }

    return {
      key,
      category: SUMMARY_CATEGORY_LABELS[key],
      userScore: totalWeight ? safeChartNumber(userWeighted / totalWeight, 0) : 0,
      requiredScore: totalWeight ? safeChartNumber(requiredWeighted / totalWeight, 0) : 0
    };
  });
}

/** Categories with role requirements — used for summary display */
export function getActiveCategorySummary(bars: CategorySummaryBar[]): CategorySummaryBar[] {
  return bars.filter((bar) => bar.requiredScore > 0);
}

/** STEP 3B — progress bar matrix: top deduped skills (CORE → SECONDARY → OPTIONAL) */
export function aggregateProgressBarDataset(rows: StructuredSkillRow[], limit = 10): ProgressBarItem[] {
  const tierOrder: Record<SkillTier, number> = { core: 0, secondary: 1, optional: 2 };
  const statusOrder: Record<SkillVisualStatus, number> = { missing: 0, partial: 1, strong: 2 };
  const seen = new Set<string>();

  return rows
    .filter((r) => {
      if (seen.has(r.normalized)) return false;
      seen.add(r.normalized);
      return r.verified || r.status === "missing" || r.status === "partial";
    })
    .map((r) => {
      const visualStatus = toVisualStatus(r);
      return {
        skill: r.normalized,
        displayName: r.skillName,
        userLevel: safeChartNumber(r.userLevel, 0),
        requiredLevel: safeChartNumber(r.requiredLevel, 100),
        status: visualStatus,
        tier: r.category,
        confidence: r.confidence,
        verified: r.verified,
        tooltip: r.explanation,
        selfReportedLevel: r.selfReportedLevel
      };
    })
    .sort((a, b) => {
      const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
      if (tierDiff !== 0) return tierDiff;
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      const gapA = a.requiredLevel - a.userLevel;
      const gapB = b.requiredLevel - b.userLevel;
      return gapB - gapA;
    })
    .slice(0, limit);
}

/** Safety validation before category summary bars render */
export function validateCategorySummaryData(
  bars: CategorySummaryBar[]
): ChartValidationResult<CategorySummaryBar> {
  if (!Array.isArray(bars)) return { valid: false, data: [] };

  const byKey = new Map<string, CategorySummaryBar>();
  for (const bar of bars) {
    if (!bar?.key) continue;
    const key = bar.key as SummaryCategoryKey;
    byKey.set(bar.key, {
      key,
      category: String(bar.category || SUMMARY_CATEGORY_LABELS[key] || bar.key),
      userScore: safeChartNumber(bar.userScore, 0),
      requiredScore: safeChartNumber(bar.requiredScore, 0)
    });
  }

  const data = getActiveCategorySummary(
    SUMMARY_CATEGORY_KEYS.map((key) =>
      byKey.get(key) ?? {
        key,
        category: SUMMARY_CATEGORY_LABELS[key],
        userScore: 0,
        requiredScore: 0
      }
    )
  );

  const valid =
    data.length > 0 &&
    data.every(
      (d) =>
        d.category.length > 0 &&
        Number.isFinite(d.userScore) &&
        Number.isFinite(d.requiredScore)
    );

  return { valid, data: valid ? data : [] };
}

export function validateProgressBarChartData(
  bars: ProgressBarItem[]
): ChartValidationResult<ProgressBarItem> {
  if (!Array.isArray(bars) || bars.length === 0) return { valid: false, data: [] };

  const seen = new Set<string>();
  const data = bars
    .map((bar) => ({
      skill: String(bar?.skill ?? "").trim(),
      displayName: String(bar?.displayName ?? bar?.skill ?? "").trim(),
      userLevel: safeChartNumber(bar?.userLevel ?? (bar as { proficiency?: number }).proficiency, 0),
      requiredLevel: safeChartNumber(bar?.requiredLevel, 100),
      status: (["strong", "partial", "missing"].includes(bar?.status)
        ? bar.status
        : "missing") as SkillVisualStatus,
      tier: (["core", "secondary", "optional"].includes(bar?.tier)
        ? bar.tier
        : "secondary") as SkillTier,
      confidence: safeChartNumber(bar?.confidence, 0),
      verified: Boolean(bar?.verified),
      tooltip: String(bar?.tooltip ?? ""),
      selfReportedLevel: VALID_SELF_REPORTED_LEVELS.has(String((bar as { selfReportedLevel?: string })?.selfReportedLevel))
        ? ((bar as { selfReportedLevel?: string }).selfReportedLevel as SelfReportedLevel)
        : null
    }))
    .filter((bar) => {
      if (!bar.skill.length || !bar.displayName.length || seen.has(bar.skill)) return false;
      seen.add(bar.skill);
      return true;
    });

  const valid =
    data.length > 0 &&
    data.every(
      (bar) =>
        Number.isFinite(bar.userLevel) &&
        Number.isFinite(bar.requiredLevel) &&
        bar.userLevel >= 0 &&
        bar.userLevel <= 100 &&
        bar.requiredLevel >= 0 &&
        bar.requiredLevel <= 100
    );

  return { valid, data: valid ? data : [] };
}

function buildChartDatasets(
  assessments: SkillAssessment[],
  extracted: ExtractedResumeSkills
): {
  structured: StructuredSkillRow[];
  categorySummary: CategorySummaryBar[];
  categorySummaryValid: boolean;
  progressBars: ProgressBarItem[];
  progressBarsValid: boolean;
} {
  cleanRawExtractedSkills(extracted);
  const structured = structureSkillData(assessments);
  const rawSummary = aggregateCategorySummary(structured);
  // Cap generous enough to cover every role's total tiered-skill count (max
  // 17, full_stack_developer) so no skill that contributes to matchPercent's
  // denominator is ever silently excluded from the dataset the UI renders.
  const rawBars = aggregateProgressBarDataset(structured, 20);
  const summaryValidation = validateCategorySummaryData(rawSummary);
  const barsValidation = validateProgressBarChartData(rawBars);

  return {
    structured,
    categorySummary: summaryValidation.data,
    categorySummaryValid: summaryValidation.valid,
    progressBars: barsValidation.data,
    progressBarsValid: barsValidation.valid
  };
}
