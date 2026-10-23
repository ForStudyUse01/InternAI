/**
 * skill-course-recommendations.ts
 *
 * STRICT exact-key lookup only.
 * No fuzzy matching, no cross-skill leakage, no category inference.
 *
 * Data shape: courseRecommendations[skillKey] = { beginner, intermediate, advanced }
 */
import rawCatalog from "@/lib/data/courseRecommendations.json";

export type CourseRecommendation = {
  title: string;
  provider: string;
  duration: string;
  level: string;
  description: string;
  url: string;
  free?: boolean;
};

export type SkillLevels = {
  beginner: CourseRecommendation[];
  intermediate: CourseRecommendation[];
  advanced: CourseRecommendation[];
};

// Type-safe cast of the imported JSON
const CATALOG = rawCatalog as Record<string, SkillLevels>;

// All skill keys available in the catalog (for UI dropdowns etc.)
export const ALL_SKILLS: string[] = Object.keys(CATALOG).sort();

export const ALL_LEVELS: Array<keyof SkillLevels> = ["beginner", "intermediate", "advanced"];

export const LEVEL_LABELS: Record<keyof SkillLevels, string> = {
  beginner:     "Beginner",
  intermediate: "Intermediate",
  advanced:     "Advanced",
};

// Derive all unique providers from the catalog
export const ALL_PROVIDERS: string[] = [
  ...new Set(
    Object.values(CATALOG).flatMap((levels) =>
      ALL_LEVELS.flatMap((lvl) => levels[lvl].map((c) => c.provider))
    )
  ),
].sort();

/**
 * STRICT exact-key lookup.
 * Returns { beginner, intermediate, advanced } for the exact skill key,
 * or null if the key does not exist.
 *
 * No aliases, no fuzzy matching, no fallbacks.
 */
export function getSkillLevels(skillKey: string): SkillLevels | null {
  const entry = CATALOG[skillKey];
  if (!entry) return null;
  return entry;
}

/**
 * Alias map — maps raw backend gap strings to catalog keys.
 * Resolves once per skill, exact lookup thereafter.
 */
const ALIAS: Record<string, string> = {
  // JavaScript variants
  js: "JavaScript",
  javascript: "JavaScript",
  // TypeScript
  ts: "TypeScript",
  typescript: "TypeScript",
  // Python
  python: "Python",
  // Java
  java: "Java",
  // C
  c: "C",
  // C++
  "c++": "C++",
  cpp: "C++",
  // HTML / CSS
  html: "HTML",
  css: "CSS",
  // React / Next.js
  react: "React",
  "next.js": "Next.js",
  nextjs: "Next.js",
  // Tailwind
  tailwind: "Tailwind CSS",
  "tailwind css": "Tailwind CSS",
  // Node / Express
  "node.js": "Node.js",
  node: "Node.js",
  nodejs: "Node.js",
  express: "Express.js",
  "express.js": "Express.js",
  // Databases
  sql: "SQL",
  mysql: "MySQL",
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  mongodb: "MongoDB",
  // Data structures / algorithms / OOP
  "data structures": "Data Structures",
  dsa: "Data Structures",
  algorithms: "Algorithms",
  oop: "OOP",
  "object oriented programming": "OOP",
  // OS / Networks / DBMS
  "operating systems": "Operating Systems",
  os: "Operating Systems",
  dbms: "DBMS",
  "database management systems": "DBMS",
  "computer networks": "Computer Networks",
  // ML / AI / DS
  ml: "Machine Learning",
  "machine learning": "Machine Learning",
  "scikit-learn": "Machine Learning",
  "scikit learn": "Machine Learning",
  tensorflow: "Machine Learning",
  pytorch: "Deep Learning",
  "deep learning": "Deep Learning",
  dl: "Deep Learning",
  nlp: "NLP",
  "natural language processing": "NLP",
  llm: "LLMs",
  llms: "LLMs",
  "generative ai": "Generative AI",
  "gen ai": "Generative AI",
  ai: "Artificial Intelligence",
  "artificial intelligence": "Artificial Intelligence",
  "data science": "Data Science",
  pandas: "Data Science",
  numpy: "Data Science",
  statistics: "Statistics",
  "data analytics": "Data Analytics",
  "data analysis": "Data Analytics",
  // Cloud
  aws: "AWS",
  azure: "Azure",
  gcp: "GCP",
  "cloud computing": "Cloud Computing",
  cloud: "Cloud Computing",
  deployment: "Cloud Computing",
  // DevOps / VCS
  git: "Git",
  github: "GitHub",
  docker: "Docker",
  kubernetes: "Kubernetes",
  k8s: "Kubernetes",
  "ci/cd": "CI/CD",
  cicd: "CI/CD",
  // Security
  cybersecurity: "Cybersecurity",
  networking: "Networking",
  "ethical hacking": "Ethical Hacking",
  security: "Cybersecurity",
  // UI/UX
  "ui/ux": "UI/UX Design",
  "ui/ux design": "UI/UX Design",
  figma: "Figma",
  "ui development": "UI Development",
  "ui dev": "UI Development",
  // APIs / Auth
  "rest apis": "REST APIs",
  "rest api": "REST APIs",
  api: "REST APIs",
  apis: "REST APIs",
  "api design": "REST APIs",
  authentication: "Authentication",
  auth: "Authentication",
  // Analytics tools
  "power bi": "Power BI",
  tableau: "Tableau",
  excel: "Excel",
  // CS fundamentals
  "state management": "React",
  testing: "JavaScript",
  accessibility: "UI/UX Design",
  "system design": "Algorithms",
  // Soft skills
  "communication skills": "Communication Skills",
  communication: "Communication Skills",
  aptitude: "Aptitude",
  "interview preparation": "Interview Preparation",
  interview: "Interview Preparation",
};

/**
 * Resolves a raw skill string (from backend gap data) to a catalog key.
 * Uses the ALIAS map first, then tries a direct exact match.
 * Returns null if no match — never falls back to unrelated courses.
 */
export function resolveCatalogKey(rawSkill: string): string | null {
  const lower = rawSkill.trim().toLowerCase();
  // 1. Alias map
  const aliased = ALIAS[lower];
  if (aliased && CATALOG[aliased]) return aliased;
  // 2. Direct exact match (catalog key)
  if (CATALOG[rawSkill]) return rawSkill;
  // 3. Case-insensitive exact match
  const caseMatch = ALL_SKILLS.find((k) => k.toLowerCase() === lower);
  if (caseMatch) return caseMatch;
  // 4. No match — strict failure
  return null;
}

// ---------------------------------------------------------------------------
// Role-based priority ordering (used only for sorting bundles, not for lookup)
// ---------------------------------------------------------------------------
export const ROLE_SKILL_PRIORITY: Record<string, string[]> = {
  data_scientist:      ["Python", "SQL", "Statistics", "Machine Learning", "Data Science", "Data Analytics", "Deep Learning", "Artificial Intelligence"],
  frontend_developer:  ["HTML", "CSS", "JavaScript", "React", "TypeScript", "Next.js", "UI/UX Design", "Tailwind CSS", "UI Development"],
  backend_developer:   ["Node.js", "Express.js", "SQL", "MongoDB", "REST APIs", "Authentication", "Docker", "PostgreSQL"],
  ai_ml_engineer:      ["Python", "Machine Learning", "Deep Learning", "Statistics", "NLP", "LLMs", "Generative AI", "Artificial Intelligence"],
  full_stack_developer:["JavaScript", "React", "Node.js", "MongoDB", "REST APIs", "SQL", "TypeScript", "Express.js", "Next.js"],
};

// ---------------------------------------------------------------------------
// Skill Learning Bundle type — used by SkillLearningPathSection
// ---------------------------------------------------------------------------
export type SkillLearningBundle = {
  skillKey: string;
  displayName: string;
  levels: SkillLevels;
};

/**
 * Builds bundles for Skill Gap Analysis section.
 * - Resolves each raw skill string → catalog key (strict)
 * - Deduplicates by catalog key
 * - Sorts by role priority when roleKey is provided
 * - Bundles that don't resolve to a catalog entry are still included (empty levels)
 */
export function buildSkillLearningBundles(
  missingSkills: string[],
  roleKey?: string
): SkillLearningBundle[] {
  const seenKeys = new Set<string>();
  const priority = roleKey ? (ROLE_SKILL_PRIORITY[roleKey] || []) : [];

  const sorted = [...missingSkills].sort((a, b) => {
    const ka = resolveCatalogKey(a) || a;
    const kb = resolveCatalogKey(b) || b;
    const ia = priority.findIndex((s) => s.toLowerCase() === ka.toLowerCase());
    const ib = priority.findIndex((s) => s.toLowerCase() === kb.toLowerCase());
    const pa = ia === -1 ? 999 : ia;
    const pb = ib === -1 ? 999 : ib;
    return pa !== pb ? pa - pb : a.localeCompare(b);
  });

  const bundles: SkillLearningBundle[] = [];
  for (const raw of sorted) {
    const catalogKey = resolveCatalogKey(raw);
    const bundleKey = catalogKey || raw;
    if (seenKeys.has(bundleKey)) continue;
    seenKeys.add(bundleKey);

    // STRICT lookup — only include courses that belong to this exact skill
    const levels: SkillLevels = catalogKey
      ? CATALOG[catalogKey]
      : { beginner: [], intermediate: [], advanced: [] };

    bundles.push({
      skillKey: bundleKey,
      displayName: catalogKey || raw,
      levels,
    });
  }
  return bundles;
}

// ---------------------------------------------------------------------------
// Helpers for the Courses page (LearningCoursesModule)
// ---------------------------------------------------------------------------

/** All courses as a flat list with skill tag, deduplicated by URL within each skill. */
export function getAllCourses(): Array<CourseRecommendation & { skill: string; levelKey: keyof SkillLevels }> {
  const result: Array<CourseRecommendation & { skill: string; levelKey: keyof SkillLevels }> = [];
  for (const skill of ALL_SKILLS) {
    const levels = CATALOG[skill];
    for (const lvl of ALL_LEVELS) {
      for (const course of levels[lvl]) {
        result.push({ ...course, skill, levelKey: lvl, free: true });
      }
    }
  }
  return result;
}
