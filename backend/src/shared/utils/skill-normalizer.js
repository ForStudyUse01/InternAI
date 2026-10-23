const SKILL_ALIAS_MAP = {
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  "node js": "nodejs",
  "node.js": "nodejs",
  nodejs: "nodejs",
  node: "nodejs",
  reactjs: "react",
  "react.js": "react",
  "react js": "react",
  react: "react",
  "mongo db": "mongodb",
  mongo: "mongodb",
  mongodb: "mongodb",
  ml: "machine learning",
  "machine-learning": "machine learning",
  "machine learning": "machine learning",
  "scikit learn": "scikit-learn",
  "scikit-learn": "scikit-learn",
  // Git and GitHub are used interchangeably on resumes ("Git/GitHub", "version
  // control via GitHub") to mean the same version-control skill — unify them.
  git: "github",
  github: "github",
  opencv: "opencv",
  // Frontend frameworks (note: normalizeSkillValue strips "." to " " before this
  // lookup runs, so "next.js" arrives here as "next js" — alias on the space form)
  "next js": "nextjs",
  nextjs: "nextjs",
  next: "nextjs",
  "vue js": "vuejs",
  vuejs: "vuejs",
  vue: "vuejs",
  angularjs: "angular",
  angular: "angular",
  "express js": "expressjs",
  expressjs: "expressjs",
  express: "expressjs",
  tailwindcss: "tailwind css",
  tailwind: "tailwind css",
  "tailwind css": "tailwind css",
  html5: "html",
  html: "html",
  css3: "css",
  css: "css",
  // Databases
  postgres: "postgresql",
  postgresql: "postgresql",
  mysql: "mysql",
  // Languages
  cpp: "c++",
  "c++": "c++",
  csharp: "c#",
  "c#": "c#",
  golang: "go",
  go: "go",
  py: "python",
  python: "python",
  // Cloud / DevOps
  aws: "aws",
  "amazon web services": "aws",
  gcp: "gcp",
  "google cloud platform": "gcp",
  "google cloud": "gcp",
  azure: "azure",
  "microsoft azure": "azure",
  k8s: "kubernetes",
  kubernetes: "kubernetes",
  docker: "docker",
  cicd: "ci/cd",
  "ci cd": "ci/cd",
  "ci/cd": "ci/cd",
  "github actions": "github actions",
  // APIs & architecture
  rest: "rest api",
  restapi: "rest api",
  "rest api": "rest api",
  "rest apis": "rest api",
  restful: "rest api",
  graphql: "graphql",
  nosql: "nosql",
  microservices: "microservices",
  // Mobile
  "react native": "react native",
  reactnative: "react native",
  rn: "react native",
  flutter: "flutter",
  // AI/ML
  ai: "artificial intelligence",
  "artificial intelligence": "artificial intelligence",
  dl: "deep learning",
  "deep learning": "deep learning",
  nlp: "natural language processing",
  "natural language processing": "natural language processing",
  cv: "computer vision",
  "computer vision": "computer vision",
  tensorflow: "tensorflow",
  pytorch: "pytorch",
  ecmascript: "javascript",
  es6: "javascript",
  es2015: "javascript",
  linux: "linux",
  wireshark: "wireshark",
  "burp suite": "burp suite",
  burpsuite: "burp suite"
};

const DISPLAY_SKILL_MAP = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  nodejs: "NodeJS",
  react: "React",
  "machine learning": "Machine Learning",
  html: "HTML",
  css: "CSS",
  sql: "SQL",
  mongodb: "MongoDB",
  "scikit-learn": "Scikit-learn",
  nextjs: "NextJS",
  vuejs: "VueJS",
  expressjs: "ExpressJS",
  aws: "AWS",
  gcp: "GCP",
  "ci/cd": "CI/CD",
  "github actions": "GitHub Actions",
  "rest api": "REST API",
  graphql: "GraphQL",
  nosql: "NoSQL",
  "react native": "React Native",
  nlp: "NLP",
  github: "GitHub",
  opencv: "OpenCV",
  "burp suite": "Burp Suite"
};

function normalizeSkillValue(skill) {
  if (typeof skill !== "string" && typeof skill !== "number") return "";

  const raw = String(skill)
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return "";
  return SKILL_ALIAS_MAP[raw] || raw;
}

function splitSkillEntry(entry) {
  return String(entry)
    .split(/\s*(?:,|;|\||\/|&|\band\b)\s*/gi)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeSkillList(skills = []) {
  if (!Array.isArray(skills)) return [];

  const set = new Set();
  for (const skill of skills) {
    if (typeof skill !== "string" && typeof skill !== "number") continue;

    const parts = splitSkillEntry(skill);
    for (const part of parts) {
      const normalized = normalizeSkillValue(part);
      if (normalized) {
        set.add(normalized);
      }
    }
  }

  return [...set];
}

function toDisplaySkill(skill) {
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

function toDisplaySkillList(skills = []) {
  return normalizeSkillList(skills).map(toDisplaySkill);
}

// Reverse of SKILL_ALIAS_MAP: canonical skill -> every raw alias that maps to
// it (e.g. "nodejs" -> ["node js", "node.js", "nodejs", "node"]). Built once.
const REVERSE_ALIAS_MAP = {};
for (const [alias, canonical] of Object.entries(SKILL_ALIAS_MAP)) {
  if (!REVERSE_ALIAS_MAP[canonical]) REVERSE_ALIAS_MAP[canonical] = new Set();
  REVERSE_ALIAS_MAP[canonical].add(alias);
}

/**
 * Every raw surface form a canonical skill could appear as in free text,
 * including punctuation variants (space/dot/hyphen/joined) since resume text
 * is never pre-normalized the way skill lists are (e.g. "Node.js" vs the
 * canonical "nodejs").
 */
function skillSurfaceForms(canonicalSkillValue) {
  const bases = new Set([canonicalSkillValue, ...(REVERSE_ALIAS_MAP[canonicalSkillValue] || [])]);
  const forms = new Set();
  for (const base of bases) {
    forms.add(base);
    if (base.includes(" ")) {
      forms.add(base.replace(/ /g, ""));
      forms.add(base.replace(/ /g, "."));
      forms.add(base.replace(/ /g, "-"));
    }
  }
  return [...forms];
}

/**
 * Whether free text (e.g. resume text) mentions a skill, given as a
 * canonical/normalized value (from normalizeSkillList). Checks every known
 * surface form with word-boundary matching — single source of truth for
 * "does this resume mention Node.js / Node / NodeJS" style keyword checks.
 */
function textMentionsSkill(text, canonicalSkillValue) {
  const lower = String(text || "").toLowerCase();
  if (!lower || !canonicalSkillValue) return false;
  return skillSurfaceForms(canonicalSkillValue).some((form) => {
    if (!form) return false;
    const escaped = form.replace(/[.+#]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(lower);
  });
}

module.exports = {
  normalizeSkillValue,
  normalizeSkillList,
  toDisplaySkill,
  toDisplaySkillList,
  skillSurfaceForms,
  textMentionsSkill
};
