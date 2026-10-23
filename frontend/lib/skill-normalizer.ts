const SKILL_ALIAS_MAP: Record<string, string> = {
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  "node.js": "nodejs",
  "node js": "nodejs",
  nodejs: "nodejs",
  node: "nodejs",
  ml: "machine learning",
  "machine-learning": "machine learning",
  "machine learning": "machine learning",
  "scikit learn": "scikit-learn",
  "scikit-learn": "scikit-learn"
};

const DISPLAY_SKILL_MAP: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  nodejs: "NodeJS",
  html: "HTML",
  css: "CSS",
  sql: "SQL",
  mongodb: "MongoDB",
  "machine learning": "Machine Learning",
  "scikit-learn": "Scikit-learn"
};

function splitSkillEntry(entry: string): string[] {
  return String(entry)
    .split(/\s*(?:,|;|\||\/|&|\band\b)\s*/gi)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function normalizeSkillValue(skill: unknown): string {
  if (typeof skill !== "string" && typeof skill !== "number") return "";

  const raw = String(skill)
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return "";
  return SKILL_ALIAS_MAP[raw] || raw;
}

export function normalizeSkillList(skills: unknown): string[] {
  if (!Array.isArray(skills)) return [];

  const set = new Set<string>();
  for (const skill of skills) {
    if (typeof skill !== "string" && typeof skill !== "number") continue;

    const parts = splitSkillEntry(String(skill));
    for (const part of parts) {
      const normalized = normalizeSkillValue(part);
      if (normalized) set.add(normalized);
    }
  }

  return [...set];
}

export function toDisplaySkill(skill: unknown): string {
  const normalized = normalizeSkillValue(skill);
  if (!normalized) return "";

  if (DISPLAY_SKILL_MAP[normalized]) {
    return DISPLAY_SKILL_MAP[normalized];
  }

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function toDisplaySkillList(skills: unknown): string[] {
  return normalizeSkillList(skills).map(toDisplaySkill);
}

export type SkillMatchResult = {
  normalizedInternSkills: string[];
  normalizedRequiredSkills: string[];
  normalizedPreferredSkills: string[];
  matchedRequiredCanonical: string[];
  missingRequiredCanonical: string[];
  matchedPreferredCanonical: string[];
  missingPreferredCanonical: string[];
  matchedRequiredSkills: string[];
  missingRequiredSkills: string[];
  matchedPreferredSkills: string[];
  missingPreferredSkills: string[];
  requiredMatchPercent: number;
  preferredMatchPercent: number | null;
  overallScore: number;
};

function computePercent(matchedCount: number, totalCount: number): number {
  if (!totalCount) return 0;
  return Math.round((matchedCount / totalCount) * 100);
}

/**
 * Single source of truth for frontend recommendation card skill matching.
 */
export function computeSkillMatch(
  internSkills: unknown,
  requiredSkills: unknown,
  preferredSkills: unknown
): SkillMatchResult {
  const normalizedInternSkills = normalizeSkillList(internSkills);
  const normalizedRequiredSkills = normalizeSkillList(requiredSkills);
  const normalizedPreferredSkills = normalizeSkillList(preferredSkills);

  const internSet = new Set(normalizedInternSkills);

  const matchedRequiredCanonical = normalizedRequiredSkills.filter((skill) => internSet.has(skill));
  const missingRequiredCanonical = normalizedRequiredSkills.filter((skill) => !internSet.has(skill));

  const matchedPreferredCanonical = normalizedPreferredSkills.filter((skill) => internSet.has(skill));
  const missingPreferredCanonical = normalizedPreferredSkills.filter((skill) => !internSet.has(skill));

  let requiredMatchPercent = computePercent(matchedRequiredCanonical.length, normalizedRequiredSkills.length);
  const preferredMatchPercent = normalizedPreferredSkills.length
    ? computePercent(matchedPreferredCanonical.length, normalizedPreferredSkills.length)
    : null;

  if (normalizedRequiredSkills.length > 0 && missingRequiredCanonical.length === 0) {
    requiredMatchPercent = 100;
  }

  const overallScore = preferredMatchPercent === null
    ? requiredMatchPercent
    : Math.round(requiredMatchPercent * 0.8 + preferredMatchPercent * 0.2);

  return {
    normalizedInternSkills,
    normalizedRequiredSkills,
    normalizedPreferredSkills,
    matchedRequiredCanonical,
    missingRequiredCanonical,
    matchedPreferredCanonical,
    missingPreferredCanonical,
    matchedRequiredSkills: toDisplaySkillList(matchedRequiredCanonical),
    missingRequiredSkills: toDisplaySkillList(missingRequiredCanonical),
    matchedPreferredSkills: toDisplaySkillList(matchedPreferredCanonical),
    missingPreferredSkills: toDisplaySkillList(missingPreferredCanonical),
    requiredMatchPercent,
    preferredMatchPercent,
    overallScore
  };
}
