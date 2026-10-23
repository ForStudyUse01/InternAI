const YEAR_REGEX = /\b(?:19|20)\d{2}\b/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/i;
const PHONE_REGEX = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?)?\d[\d\s-]{7,13}\d/;
const URL_REGEX = /https?:\/\/[^\s)]+|www\.[^\s)]+|(?:linkedin\.com|github\.com)\/[^\s)]+/gi;

const SECTION_RULES = [
  { key: "summary", labels: ["summary", "profile summary", "professional summary", "career summary", "objective", "about", "about me", "career objective", "personal statement", "executive summary"] },
  { key: "skills", labels: ["technical skills", "skills", "core skills", "key skills", "technologies", "tools", "tech stack", "programming languages", "skills & tools", "areas of expertise", "core competencies"] },
  { key: "projects", labels: ["projects", "project", "project experience", "major projects", "academic projects", "personal projects", "key projects", "notable projects"] },
  { key: "education", labels: ["education", "academic", "academics", "qualifications", "educational qualification", "academic background", "academic qualifications", "educational background", "education & qualifications"] },
  { key: "experience", labels: ["experience", "work experience", "professional experience", "internship", "internships", "employment", "work history", "employment history", "career history", "relevant experience"] },
  { key: "certifications", labels: ["certifications", "certificates", "courses", "licenses", "trainings", "certification", "professional certifications", "licenses & certifications", "courses & certifications"] },
  { key: "achievements", labels: ["achievements", "awards", "accomplishments", "honors", "accolades", "awards & achievements"] },
  { key: "additional", labels: ["additional information", "additional details", "extra curricular", "extracurricular", "profiles", "contact links", "interests", "hobbies"] }
];

const SKILL_ALIASES = {
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  sql: "sql",
  mysql: "mysql",
  postgresql: "postgresql",
  postgres: "postgresql",
  html: "html",
  html5: "html",
  css: "css",
  css3: "css",
  nodejs: "node.js",
  "node js": "node.js",
  node: "node.js",
  expressjs: "express.js",
  express: "express.js",
  reactjs: "react",
  react: "react",
  "react.js": "react",
  nextjs: "next.js",
  next: "next.js",
  vuejs: "vue.js",
  vue: "vue.js",
  "vue.js": "vue.js",
  angularjs: "angular",
  angular: "angular",
  svelte: "svelte",
  ml: "machine learning",
  ai: "artificial intelligence",
  dl: "deep learning",
  nlp: "natural language processing",
  cv: "computer vision",
  mongo: "mongodb",
  mongodb: "mongodb",
  cpp: "c++",
  "c++": "c++",
  csharp: "c#",
  "c#": "c#",
  golang: "go",
  go: "go",
  tailwind: "tailwind css",
  "tailwindcss": "tailwind css",
  powerbi: "power bi",
  sklearn: "scikit-learn",
  k8s: "kubernetes",
  kubernetes: "kubernetes",
  gh: "github",
  "gh actions": "github actions",
  "github actions": "github actions",
  cicd: "ci/cd",
  "ci cd": "ci/cd",
  "ci/cd": "ci/cd",
  aws: "aws",
  gcp: "gcp",
  azure: "azure",
  "microsoft azure": "azure",
  nosql: "nosql",
  restapi: "rest api",
  "rest api": "rest api",
  "rest apis": "rest api",
  graphql: "graphql",
  dotnet: ".net",
  ".net": ".net",
  "asp.net": "asp.net",
  reactnative: "react native",
  "react native": "react native",
  rn: "react native",
  bigquery: "bigquery",
  "big query": "bigquery",
  postgre: "postgresql"
};

const DISPLAY_OVERRIDES = {
  "node.js": "Node.js",
  "express.js": "Express.js",
  "next.js": "Next.js",
  "vue.js": "Vue.js",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  aws: "AWS",
  gcp: "GCP",
  mongodb: "MongoDB",
  "c++": "C++",
  "c#": "C#",
  "power bi": "Power BI",
  "scikit-learn": "Scikit-learn",
  graphql: "GraphQL",
  nosql: "NoSQL",
  "rest api": "REST API",
  "ci/cd": "CI/CD",
  "github actions": "GitHub Actions",
  ".net": ".NET",
  "asp.net": "ASP.NET",
  php: "PHP",
  ios: "iOS",
  aws_lambda: "AWS Lambda",
  bigquery: "BigQuery",
  nlp: "NLP",
  api: "API",
  ui: "UI",
  ux: "UX",
  "ui design": "UI Design",
  "ux research": "UX Research",
  "api design": "API Design",
  siem: "SIEM",
  "vs code": "VS Code",
  "adobe xd": "Adobe XD"
};

const KNOWN_SKILLS = new Set([
  "javascript", "typescript", "react", "next.js", "node.js", "express.js", "html", "css", "tailwind css", "bootstrap",
  "python", "java", "c++", "c#", "sql", "mysql", "postgresql", "mongodb", "firebase", "docker", "kubernetes",
  "git", "github", "aws", "gcp", "machine learning", "artificial intelligence", "deep learning", "natural language processing",
  "data analysis", "data structure", "oops", "excel", "power bi", "tableau", "tensorflow", "pytorch", "scikit-learn",
  "pandas", "numpy", "figma", "postman", "matplotlib", "azure", "microsoft azure", "data mining", "data warehousing",
  // Frontend frameworks & tooling
  "vue.js", "angular", "svelte", "redux", "webpack", "vite", "sass", "graphql", "jquery", "material ui",
  // Backend frameworks
  "django", "flask", "fastapi", "spring", "spring boot", "ruby on rails", ".net", "asp.net", "laravel", "php", "go",
  // Mobile
  "react native", "flutter", "android", "ios", "kotlin", "swift",
  // Cloud & DevOps
  "terraform", "ansible", "jenkins", "ci/cd", "github actions", "gitlab ci", "circleci", "nginx", "linux", "bash",
  "serverless", "rest api", "microservices", "nosql", "redis",
  // Data / ML
  "keras", "opencv", "hugging face", "transformers", "spark", "hadoop", "airflow", "xgboost", "nltk", "spacy",
  "bigquery", "snowflake", "databricks", "looker",
  // Testing
  "jest", "mocha", "cypress", "selenium", "junit", "pytest",
  // Practice / collaboration
  "agile", "scrum", "jira", "socket.io",
  // System design / architecture / general engineering practice
  "system design", "authentication", "api design", "deployment", "accessibility", "state management",
  // Cybersecurity
  "networking", "network security", "penetration testing", "vulnerability assessment", "siem",
  "cryptography", "incident response", "cloud security", "compliance", "wireshark", "burp suite",
  "nmap", "metasploit",
  // UI / UX design
  "ui design", "ux research", "wireframing", "prototyping", "user testing", "design systems",
  "adobe xd", "sketch",
  // Cloud / DevOps gaps
  "cloud architecture", "cost optimization", "monitoring", "vs code"
]);

const DEGREE_REGEX = /\b(?:b\.?\s?tech|m\.?\s?tech|b\.?\s?e|m\.?\s?e|b\.?\s?c\.?\s?a|m\.?\s?c\.?\s?a|b\.?\s?sc|m\.?\s?sc|mba|ph\.?d|diploma|bachelor[^,|;]*|master[^,|;]*|higher secondary|secondary school)\b/i;
const INSTITUTE_REGEX = /(university|college|institute|school|academy|polytechnic|vidyalankar|mahavidyalaya)/i;
const PROJECT_ACTION_REGEX = /(developed|built|designed|implemented|deployed|trained|created|engineered|simulated|optimized)/i;
const SOFT_SKILL_SET = new Set([
  "communication",
  "teamwork",
  "leadership",
  "problem solving",
  "critical thinking",
  "adaptability",
  "time management",
  "collaboration",
  "presentation",
  "creativity"
]);

const SKILL_CATEGORIES = {
  "programming languages": ["javascript", "typescript", "python", "java", "c++", "c#", "sql", "html", "css", "go", "kotlin", "swift", "php"],
  "web development": ["react", "next.js", "node.js", "express.js", "tailwind css", "bootstrap", "vue.js", "angular", "svelte", "django", "flask", "fastapi", "spring boot", "laravel", "asp.net", "graphql", "rest api", "system design", "authentication", "api design", "deployment", "accessibility", "state management"],
  databases: ["mongodb", "mysql", "postgresql", "sql", "firebase", "redis", "nosql", "bigquery", "snowflake"],
  "ai / ml": ["machine learning", "artificial intelligence", "deep learning", "natural language processing", "tensorflow", "pytorch", "scikit-learn", "keras", "opencv", "hugging face", "transformers", "xgboost", "nltk", "spacy"],
  "mobile": ["react native", "flutter", "android", "ios", "kotlin", "swift"],
  "cloud & devops": ["aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ansible", "jenkins", "ci/cd", "github actions", "gitlab ci", "circleci", "nginx", "linux", "serverless", "cloud architecture", "cost optimization", "monitoring", "vs code"],
  "testing": ["jest", "mocha", "cypress", "selenium", "junit", "pytest"],
  "tools & platforms": ["git", "github", "postman", "power bi", "tableau", "excel", "jira", "agile", "scrum", "spark", "hadoop", "airflow", "databricks", "looker"],
  security: ["networking", "network security", "penetration testing", "vulnerability assessment", "siem", "cryptography", "incident response", "cloud security", "compliance", "wireshark", "burp suite", "nmap", "metasploit"],
  design: ["ui design", "ux research", "wireframing", "prototyping", "user testing", "design systems", "figma", "adobe xd", "sketch"]
};

function cleanLine(input = "") {
  return String(input || "")
    .replace(/\u2022|\u25CF|\u25AA/g, "-")
    .replace(/[\t\r]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function toLines(rawText = "") {
  return String(rawText || "")
    .split(/\n/)
    .map(cleanLine)
    .filter(Boolean)
    .filter((line) => !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line));
}

function normalizeHeaderText(line = "") {
  return String(line || "")
    .toLowerCase()
    .replace(/[:|\-]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyHeading(line = "") {
  const trimmed = String(line || "").trim();
  if (!trimmed) return false;
  if (trimmed.length > 55) return false;

  const normalized = normalizeHeaderText(trimmed);
  const words = normalized.split(" ").filter(Boolean);
  if (words.length === 0 || words.length > 6) return false;

  const upperRatio = (trimmed.match(/[A-Z]/g) || []).length / Math.max(trimmed.replace(/[^a-zA-Z]/g, "").length, 1);

  // Title Case ("Work Experience", "Education") is the most common real-world
  // heading style -- far more common than ALL CAPS or a trailing colon, which
  // were previously the only accepted signals. Every alphabetic word starting
  // with a capital, with no sentence-ending punctuation, distinguishes a
  // genuine heading from an ordinary sentence that merely contains a section
  // keyword as a substring (those fail this check, or are already excluded
  // above by the 6-word cap).
  const rawWords = trimmed.split(/\s+/).filter(Boolean);
  const isTitleCase =
    rawWords.length > 0 &&
    rawWords.every((word) => !/[a-zA-Z]/.test(word) || /^[A-Z]/.test(word)) &&
    !/[.!?,;]$/.test(trimmed);

  return upperRatio > 0.65 || /:$/.test(trimmed) || isTitleCase;
}

function detectSection(line = "") {
  const normalized = normalizeHeaderText(line);
  if (!normalized) return null;

  for (const rule of SECTION_RULES) {
    if (rule.labels.some((label) => normalized === label || normalized.includes(label))) {
      return rule.key;
    }
  }
  return null;
}

// High-precision signals: distinctive enough (explicit labels, regex-anchored
// vocabulary like degree/institute names, award words) that they're trusted
// to override even a section we're already confidently inside -- this is
// what recovers content that a two-column PDF scrambled out of order.
function classifyLineStrong(line = "") {
  const lower = line.toLowerCase();

  if (/^languages?\s*:/i.test(line)) return "additional";
  if (/award|winner|rank|achievement|finalist|hackathon|scholar|medal|honor|1st place|2nd place|3rd place|competition/i.test(line)) return "achievements";

  // A bare contact-info link (e.g. a lone "github.com/username" line near the
  // header) is not a project -- only treat link-bearing lines as project
  // content when there is real descriptive text alongside the link.
  if (/demo\s*link|github\.com|portfolio|behance|dribbble|linkedin\.com/i.test(line)) {
    const withoutLink = line.replace(URL_REGEX, "").replace(/demo\s*link|portfolio|behance|dribbble/i, "").trim();
    if (withoutLink.length > 8) return "projects";
  }
  if (/tech\s*stack|technologies?\s*:/i.test(line)) return "skills";
  if (DEGREE_REGEX.test(line) || INSTITUTE_REGEX.test(line) || /cgpa|gpa|semester|aggregate|percentage|%/i.test(line) || /\b(?:19|20)\d{2}\s*-\s*(?:19|20)\d{2}\b/.test(line)) return "education";
  if (/cert|credential|course completion|nptel|coursera|udemy/i.test(lower)) return "certifications";

  const strongExperiencePhrase = /\b(worked at|working at|interned? at|employed at)\b/i.test(lower);
  const experienceLabel = /^(role|position|designation|company|employer|organi[sz]ation)\s*[:\-]/i.test(line);
  if (strongExperiencePhrase || experienceLabel) return "experience";

  return null;
}

// Low-precision signals: a single generic action verb ("developed", "built",
// "designed"...) or a bare keyword shows up constantly inside normal
// Experience/Project bullet prose *regardless* of which section it's really
// in, so these must never override a heading we've already confidently
// detected -- only used to bucket lines in a resume section with no
// detectable heading at all (see splitSections).
function classifyLineWeak(line = "") {
  const lower = line.toLowerCase();
  const hasYear = YEAR_REGEX.test(line);
  const experienceKeyword = /internship|experience|responsibilit/i.test(lower);
  if (experienceKeyword && hasYear) return "experience";

  if (/^[A-Z][A-Za-z0-9 '&()+.#/-]{2,70}$/.test(line) && /\b(model|simulator|application|app|system|prediction|dashboard|portal)\b/i.test(line)) return "projects";
  if (PROJECT_ACTION_REGEX.test(line)) return "projects";

  const skillTokens = line
    .split(/[|,;/()]/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map(canonicalSkill)
    .filter(Boolean);
  if (skillTokens.some((token) => KNOWN_SKILLS.has(token))) return "skills";

  return null;
}

function splitSections(lines = []) {
  const sections = {
    header: [],
    summary: [],
    skills: [],
    projects: [],
    education: [],
    experience: [],
    certifications: [],
    achievements: [],
    additional: []
  };

  let current = "header";

  for (const line of lines) {
    const section = detectSection(line);
    if (section && isLikelyHeading(line)) {
      current = section;
      continue;
    }

    // Recover from mixed-order PDFs (e.g. two-column layouts) by semantic
    // reassignment -- but only the high-precision signals get to override a
    // section heading we've already confidently detected. The low-precision
    // "weak" signals (a bare action verb, a bare keyword) exist to bucket
    // lines when there is NO heading at all (poorly-formatted resumes), and
    // must not be allowed to steal lines away from an already-identified
    // section -- e.g. an Experience bullet starting with "Developed..." must
    // stay in Experience, not get stolen into a fabricated Project entry.
    const strong = classifyLineStrong(line);
    if (strong) {
      sections[strong].push(line);
      continue;
    }

    if (current === "header" || current === "additional") {
      const weak = classifyLineWeak(line);
      if (weak) {
        sections[weak].push(line);
        continue;
      }
    }

    sections[current].push(line);
  }

  return sections;
}

function extractEmail(text = "") {
  const match = String(text).match(EMAIL_REGEX);
  return match ? match[0].toLowerCase() : "";
}

function extractMobile(text = "") {
  const matches = [...String(text).matchAll(new RegExp(PHONE_REGEX.source, "g"))].map((m) => m[0]);
  const candidate = matches
    .map((value) => value.replace(/[^\d]/g, ""))
    .filter((digits) => digits.length >= 10 && digits.length <= 12)
    .sort((a, b) => b.length - a.length)[0];
  return candidate || "";
}

function extractLinks(text = "") {
  const links = String(text).match(URL_REGEX) || [];
  return [...new Set(links.map((link) => (link.startsWith("http") ? link : `https://${link}`)))];
}

function extractLocation(lines = []) {
  const cityLine = lines.find((line) => /(mumbai|nagpur|pune|india)/i.test(line) && !INSTITUTE_REGEX.test(line));
  if (!cityLine) return "";
  const match = cityLine.match(/([A-Za-z\s]+,\s*(?:India|Maharashtra|Mumbai|Nagpur|Pune))/i);
  return match ? cleanLine(match[1]) : cleanLine(cityLine);
}

const NAME_NEGATIVE_REGEX = /\b(resume|curriculum vitae|cv|objective|summary|profile|skills|education|experience|projects?|certifications?|achievements|career|contact|address|declaration|internship)\b/i;

// Document titles and bare job titles that regularly sit on line 1-2 of a
// resume and satisfy the generic "2-5 Title Case words" shape but are never
// a person's name. Matched as a *whole line* (after trimming punctuation),
// not a substring, so a real name that happens to contain "Engineer" nowhere
// in it is unaffected.
const NAME_BLOCKLIST = new Set([
  "resume", "curriculum vitae", "cv", "portfolio", "student", "fresher",
  "job seeker", "applicant", "intern", "trainee",
  "software engineer", "software developer", "computer engineer",
  "web developer", "frontend developer", "front end developer",
  "backend developer", "back end developer", "full stack developer",
  "fullstack developer", "data scientist", "data analyst", "data engineer",
  "ui/ux designer", "ui ux designer", "product designer",
  "devops engineer", "cloud engineer", "cybersecurity engineer",
  "security engineer", "ai/ml engineer", "ai engineer", "ml engineer",
  "machine learning engineer", "mobile developer", "android developer",
  "ios developer", "qa engineer", "test engineer", "business analyst",
  "project manager", "product manager", "career objective", "objective",
  "professional summary", "about me", "personal details", "personal information"
]);

function isBlockedNameLine(line = "") {
  const normalized = String(line || "")
    .toLowerCase()
    .replace(/[.,:;|]+$/g, "")
    .trim();
  return NAME_BLOCKLIST.has(normalized);
}

function looksLikeName(line = "") {
  if (!line) return false;
  if (EMAIL_REGEX.test(line) || PHONE_REGEX.test(line) || URL_REGEX.test(line)) return false;
  if (YEAR_REGEX.test(line)) return false;
  if (NAME_NEGATIVE_REGEX.test(line)) return false;
  if (isBlockedNameLine(line)) return false;
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;
  if (!/^[a-zA-Z.\s'-]+$/.test(line)) return false;
  return true;
}

function normalizeNameToken(value = "") {
  return String(value || "").toLowerCase().replace(/[^a-z]/g, "");
}

// Cross-checks a name candidate against the email local-part and any
// linkedin/github profile slug -- resumes reliably encode the person's name
// in at least one of these, so agreement is strong corroborating evidence.
function nameMatchesContactSignals(candidate = "", email = "", links = []) {
  const nameTokens = candidate.toLowerCase().split(/\s+/).filter((t) => t.length > 1).map(normalizeNameToken).filter(Boolean);
  if (nameTokens.length === 0) return false;

  const emailLocal = String(email || "").split("@")[0]?.toLowerCase() || "";
  const linkSlugs = (links || [])
    .filter((link) => /linkedin\.com|github\.com/i.test(link))
    .map((link) => normalizeNameToken(link.split("/").filter(Boolean).pop() || ""));

  return nameTokens.some((token) => token.length > 2 && (emailLocal.includes(token) || linkSlugs.some((slug) => slug.includes(token))));
}

// Poorly-formatted resumes are often typed all-lowercase or ALL CAPS. Titles
// stay as-is (mixed case is assumed intentional -- e.g. "McDonald").
function normalizeNameCasing(name = "") {
  if (!name) return name;
  const isAllCaps = name === name.toUpperCase() && /[A-Z]/.test(name);
  const isAllLower = name === name.toLowerCase() && /[a-z]/.test(name);
  if (!isAllCaps && !isAllLower) return name;
  return name.replace(/[A-Za-z]+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function looksLikeContactLine(line = "") {
  return Boolean(line) && (EMAIL_REGEX.test(line) || PHONE_REGEX.test(line) || URL_REGEX.test(line));
}

// Returns { value, confidence } -- confidence in [0, 1]. Callers must gate
// database writes on a minimum confidence rather than trusting extraction
// blindly (a resume's line 1 is not reliably the candidate's name -- it can
// be a document title, job title, or section header).
function extractFullName(lines = [], email = "", links = []) {
  const candidates = lines.slice(0, 16);

  // Strongest signal: an explicit "Name:" label.
  const labeled = candidates.find((line) => /^name\s*[:\-]\s*.+/i.test(line));
  if (labeled) {
    const value = normalizeNameCasing(cleanLine(labeled.replace(/^name\s*[:\-]\s*/i, "")));
    if (looksLikeName(value)) {
      const boosted = nameMatchesContactSignals(value, email, links);
      return { value, confidence: boosted ? 0.95 : 0.85 };
    }
  }

  const first = candidates[0];
  if (looksLikeName(first)) {
    const strongCasing = first.toUpperCase() === first || /^[A-Z][a-z]+(\s+[A-Z][a-z'.-]+){1,4}$/.test(first);
    // Layout signal: whatever sits directly above the contact block (email
    // phone/links) on line 2 is almost always the candidate's name, even if
    // it wasn't typed in a "proper" case.
    const nextLineIsContact = looksLikeContactLine(candidates[1]);
    if (strongCasing || nextLineIsContact) {
      const value = normalizeNameCasing(first.trim());
      const boosted = nameMatchesContactSignals(value, email, links);
      const base = strongCasing ? 0.6 : 0.5;
      return { value, confidence: boosted ? Math.min(0.9, base + 0.3) : base };
    }
  }

  for (const line of candidates) {
    if (!looksLikeName(line)) continue;
    if (line.toUpperCase() === line || /^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(line)) {
      const value = normalizeNameCasing(line.trim());
      const boosted = nameMatchesContactSignals(value, email, links);
      return { value, confidence: boosted ? 0.75 : 0.45 };
    }
  }

  return { value: "", confidence: 0 };
}

function canonicalSkill(raw = "") {
  const cleaned = String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9+.#\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  return SKILL_ALIASES[cleaned] || cleaned;
}

function displaySkill(skill = "") {
  if (!skill) return "";
  if (DISPLAY_OVERRIDES[skill]) return DISPLAY_OVERRIDES[skill];
  return skill
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function collectSkillCandidates(sourceLines = []) {
  const tokens = [];
  for (const line of sourceLines) {
    const parts = line
      .split(/[|,;/()]/)
      .map((part) => part.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);

    for (const part of parts) {
      const normalized = canonicalSkill(part);
      if (normalized) tokens.push(normalized);
    }
  }
  return tokens;
}

function extractSkills(rawText = "", sections = {}, extraSource = "") {
  const skillLines = [
    ...(sections.skills || []),
    ...((sections.projects || []).filter((line) => /tech\s*stack|using|technologies?/i.test(line))),
    ...((sections.additional || []).filter((line) => /skill|tech/i.test(line)))
  ];

  const normalized = new Set();
  for (const token of collectSkillCandidates(skillLines)) {
    if (KNOWN_SKILLS.has(token)) normalized.add(token);
  }

  const fullText = `${rawText}\n${extraSource}`.toLowerCase();
  for (const skill of KNOWN_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(fullText)) {
      normalized.add(skill);
    }
  }

  return [...normalized].map(displaySkill).sort((a, b) => a.localeCompare(b));
}

function extractSummary(sections = {}, lines = []) {
  const explicit = sections.summary || [];
  if (explicit.length > 0) {
    const filtered = explicit
      .filter((line) => line.length > 35)
      .filter((line) => !/project|tech stack|demo link|github\.com|cgpa|degree|college|university/i.test(line))
      .filter((line) => !/certification|award|achievement|languages?\s*:/i.test(line));
    if (filtered.length > 0) {
      return [...new Set(filtered)].slice(0, 3).join(" ");
    }
  }

  const candidate = lines.find((line) => {
    if (line.length < 60) return false;
    if (detectSection(line)) return false;
    if (EMAIL_REGEX.test(line) || PHONE_REGEX.test(line)) return false;
    if (/project|github|cgpa|college|university|certification/i.test(line)) return false;
    return /objective|summary|profile|about|seeking|aspiring|motivated|detail-oriented|career/i.test(line);
  });
  return candidate ? cleanLine(candidate) : "";
}

function splitBlocks(lines = []) {
  const blocks = [];
  let current = [];

  const flush = () => {
    if (current.length > 0) {
      blocks.push(current);
      current = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/^[-*]\s+|^\d+[.)]\s+/, "").trim();
    if (!line) continue;

    // A genuine block title is short and never contains sentence-ending
    // punctuation followed by more words -- "E-commerce Platform" qualifies,
    // but a wrapped description line like "Stripe payment integration.
    // github.com/..." must NOT be mistaken for a new title just because it
    // happens to start with a capitalized word after the mid-sentence period.
    const looksLikeMidSentenceContinuation = /[.!?]\s+\S/.test(line);
    const startNew =
      (/^[A-Z][A-Za-z0-9 '&()+.#/-]{2,70}$/.test(line) &&
        !PROJECT_ACTION_REGEX.test(line) &&
        !/tech stack|demo link/i.test(line) &&
        !looksLikeMidSentenceContinuation) ||
      /^project\s*[:\-]/i.test(line);

    if (startNew && current.length > 0) flush();
    current.push(line);
  }

  flush();
  return blocks;
}

function extractTechStack(text = "") {
  const found = new Set();
  const lower = String(text || "").toLowerCase();

  for (const skill of KNOWN_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(lower)) {
      found.add(displaySkill(skill));
    }
  }

  return [...found].sort((a, b) => a.localeCompare(b));
}

// A bare contact-info link (no descriptive text beyond the URL itself) is
// never a project on its own -- guards the "additional"/"profiles" bucket
// where a lone github/portfolio link commonly lives.
function hasSubstanceBeyondLink(line = "") {
  return line.replace(URL_REGEX, "").trim().length > 8;
}

function extractProjects(sections = {}) {
  const projectLines = [
    ...(sections.projects || []),
    ...((sections.additional || []).filter((line) => /demo\s*link|github\.com|deployed|developed|built|model|simulator|prediction/i.test(line) && hasSubstanceBeyondLink(line))),
    ...((sections.education || []).filter((line) => /demo\s*link|deployed|developed|built|trained|model|simulator|prediction/i.test(line)))
  ];

  if (projectLines.length === 0) return [];

  return splitBlocks(projectLines)
    .slice(0, 12)
    .map((block, index) => {
      const combined = block.join(" ");
      const first = block[0] || "";

      let title = first.replace(/^project\s*[:\-]?/i, "").trim();
      if (title.length < 3 || /developed|built|trained|used/i.test(title)) {
        const titleCandidate = block.find((line) => line.split(" ").length <= 8 && !PROJECT_ACTION_REGEX.test(line) && !/tech stack|demo link/i.test(line));
        title = titleCandidate || `Project ${index + 1}`;
      }

      const links = (combined.match(/https?:\/\/[^\s)]+|www\.[^\s)]+/gi) || []).map((link) => (link.startsWith("http") ? link : `https://${link}`));
      const githubLink = links.find((link) => /github\.com/i.test(link)) || "";
      const demoLink = links.find((link) => !/github\.com/i.test(link)) || githubLink || "";

      const techMatch = combined.match(/(?:tech(?:nologies|\s*stack)?|stack|built with|using)\s*[:\-]\s*([^.;]+)/i);
      const techStack = techMatch ? extractTechStack(techMatch[1]) : extractTechStack(combined);

      return {
        title: cleanLine(title),
        description: combined,
        techStack,
        githubLink,
        demoLink
      };
    })
    .filter((item) => item.title || item.description)
    .filter((item, idx, arr) => arr.findIndex((cmp) => cmp.title === item.title) === idx);
}

function extractEducation(sections = {}) {
  const source = [...(sections.education || []), ...(sections.additional || []).filter((line) => /cgpa|%|semester|higher secondary|secondary/i.test(line))];
  if (source.length === 0) return [];

  const items = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    if (current.degree || current.institution || current.grade || current.startYear || current.endYear) {
      items.push({ ...current, raw: current.raw.filter(Boolean).join(" | ") });
    }
    current = null;
  };

  for (const line of source) {
    if (/demo\s*link|developed|built|trained|model|simulator|prediction/i.test(line)) continue;
    if (/detail-oriented|proven ability|eager to|data-driven/i.test(line)) continue;

    const years = line.match(YEAR_REGEX) || [];
    const degreeMatch = line.match(DEGREE_REGEX);
    const gradeMatch = line.match(/(?:cgpa|gpa|grade|percentage|percent|aggregate)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?\s*%?)/i);
    const looksInstitution = INSTITUTE_REGEX.test(line) && line.split(/\s+/).length <= 10 && !/[.]/.test(line) && !/student/i.test(line);
    // An institution-only line starts a genuinely new entry only when there's
    // no open entry yet, or the open entry already has its institution set
    // (a second college line really is a separate degree). Otherwise it's the
    // institution line for the degree just seen above it -- fold it in rather
    // than fragmenting one education block into two broken entries.
    const institutionStartsNewEntry = looksInstitution && (!current || Boolean(current.institution));
    const newEntry = Boolean(degreeMatch || institutionStartsNewEntry || /higher secondary|secondary school/i.test(line));

    if (newEntry) {
      flush();
      const branchMatch = line.match(/\b(computer(?: science| engineering)?|information technology|electronics(?: and communication)?|mechanical|civil|electrical|data science|ai|artificial intelligence)\b/i);
      current = {
        degree: degreeMatch ? cleanLine(degreeMatch[0]) : "",
        branch: branchMatch ? cleanLine(branchMatch[0]) : "",
        institution: looksInstitution ? cleanLine(line) : "",
        startYear: years[0] || "",
        endYear: years[1] || years[0] || "",
        grade: gradeMatch ? cleanLine(gradeMatch[1]) : "",
        graduationYear: years[years.length - 1] || "",
        raw: [line]
      };
      continue;
    }

    if (!current) continue;
    if (/^[A-Z][A-Za-z0-9 '&()+.#/-]{2,70}$/.test(line) && /\b(model|simulator|application|app|system|prediction)\b/i.test(line)) {
      flush();
      continue;
    }
    current.raw.push(line);
    if (!current.startYear && years[0]) current.startYear = years[0];
    if (!current.endYear && (years[1] || years[0])) current.endYear = years[1] || years[0];
    if (!current.graduationYear && (years[years.length - 1] || years[0])) current.graduationYear = years[years.length - 1] || years[0];
    if (!current.grade && gradeMatch) current.grade = cleanLine(gradeMatch[1]);
    if (!current.institution && INSTITUTE_REGEX.test(line)) current.institution = cleanLine(line);
    if (!current.branch) {
      const branchMatch = line.match(/\b(computer(?: science| engineering)?|information technology|electronics(?: and communication)?|mechanical|civil|electrical|data science|ai|artificial intelligence)\b/i);
      if (branchMatch) current.branch = cleanLine(branchMatch[0]);
    }

    if (!current.institution && /[:]/.test(line) && !/cgpa|gpa|aggregate/i.test(line)) {
      current.institution = cleanLine(line.split(":")[0]);
      if (!current.grade) {
        const inlineGrade = line.match(/([0-9]+(?:\.[0-9]+)?\s*%?)/);
        if (inlineGrade) current.grade = cleanLine(inlineGrade[1]);
      }
    }
  }
  flush();

  return items
    .filter((item) => !/competition|innovation lounge|hackathon/i.test(item.raw))
    .filter((item) => !/detail-oriented|proven ability|student at/i.test(item.raw))
    .filter((item, idx, arr) => arr.findIndex((cmp) => cmp.raw === item.raw) === idx);
}

function splitTechnicalAndSoftSkills(skillList = []) {
  const technical = [];
  const soft = [];
  for (const skill of skillList) {
    const normalized = canonicalSkill(skill);
    if (!normalized) continue;
    if (SOFT_SKILL_SET.has(normalized)) soft.push(displaySkill(normalized));
    else technical.push(displaySkill(normalized));
  }
  return {
    technicalSkills: [...new Set(technical)],
    softSkills: [...new Set(soft)]
  };
}

function categorizeSkills(skillList = []) {
  const normalized = skillList.map((item) => canonicalSkill(item)).filter(Boolean);
  const groups = {};
  for (const [category, tokens] of Object.entries(SKILL_CATEGORIES)) {
    const items = normalized.filter((skill) => tokens.includes(skill)).map(displaySkill);
    if (items.length > 0) groups[category] = [...new Set(items)];
  }
  return groups;
}

function extractCertifications(sections = {}) {
  const lines = [
    ...(sections.certifications || []),
    ...((sections.additional || []).filter((line) => /cert|credential|course completion|workshop/i.test(line)))
  ];

  if (lines.length === 0) return [];

  return splitBlocks(lines)
    .slice(0, 12)
    .map((block) => {
      const text = block.join(" ");
      const years = text.match(YEAR_REGEX) || [];
      const issuer = (text.match(/coursera|udemy|nptel|edx|google|microsoft|aws|meta|ibm|oracle|linkedin/i) || [""])[0];
      return {
        name: text.replace(/(?:19|20)\d{2}/g, "").trim(),
        issuer,
        year: years[years.length - 1] || "",
        raw: text
      };
    })
    .filter((item) => item.name || item.raw);
}

function extractExperience(sections = {}) {
  const lines = sections.experience || [];
  if (lines.length === 0) return [];

  return splitBlocks(lines)
    .slice(0, 12)
    .map((block) => {
      const text = block.join(" ");
      const years = text.match(YEAR_REGEX) || [];
      const first = block[0] || "";
      const pieces = first.split(/[:|-]/).map((part) => part.trim()).filter(Boolean);
      return {
        role: pieces[0] || "",
        company: pieces[1] || "",
        duration: years.length > 1 ? `${years[0]} - ${years[1]}` : years[0] || "",
        description: text
      };
    })
    .filter((item) => item.role || item.company || item.description);
}

function extractAchievementsAndLanguages(sections = {}) {
  const lines = [...(sections.achievements || []), ...(sections.additional || []), ...(sections.education || [])];

  const achievements = [];
  const languages = [];

  for (const raw of lines) {
    const line = raw.replace(/^[-*]\s*/, "").trim();
    if (!line) continue;

    if (/^languages?\s*:/i.test(line)) {
      const values = line
        .split(":")
        .slice(1)
        .join(":")
        .split(/[|,;/]/)
        .map((item) => cleanLine(item))
        .filter(Boolean);
      languages.push(...values);
      continue;
    }

    if (/award|winner|rank|achievement|finalist|hackathon|scholar|medal|honor|place/i.test(line)) {
      achievements.push(line);
    }
  }

  return {
    achievements: [...new Set(achievements)].slice(0, 20),
    languages: [...new Set(languages)].slice(0, 20)
  };
}

function parserDebugSnapshot(sections = {}, parsed = {}, rawText = "") {
  return {
    rawPreview: String(rawText || "").split(/\n/).slice(0, 60),
    sectionCounts: Object.fromEntries(Object.entries(sections).map(([key, value]) => [key, Array.isArray(value) ? value.length : 0])),
    extractionCounts: {
      skills: parsed.skills?.length || 0,
      projects: parsed.projects?.length || 0,
      education: parsed.education?.length || 0,
      certifications: parsed.certifications?.length || 0,
      experience: parsed.experience?.length || 0,
      achievements: parsed.achievements?.length || 0,
      languages: parsed.languages?.length || 0,
      links: parsed.links?.length || 0
    },
    sectionPreview: Object.fromEntries(
      Object.entries(sections).map(([key, value]) => [key, Array.isArray(value) ? value.slice(0, 12) : []])
    )
  };
}

function structuredResumeParse(text = "") {
  const rawText = String(text || "");
  const lines = toLines(rawText);
  const sections = splitSections(lines);

  const projects = extractProjects(sections);
  const projectText = projects.map((project) => `${project.title} ${project.description} ${project.techStack.join(" ")}`).join("\n");
  const skills = extractSkills(rawText, sections, projectText);
  const education = extractEducation(sections);
  const certs = extractCertifications(sections);
  const experience = extractExperience(sections);
  const { achievements, languages } = extractAchievementsAndLanguages(sections);
  const email = extractEmail(rawText);
  const links = extractLinks(rawText);
  const nameResult = extractFullName(lines, email, links);

  const parsed = {
    fullName: nameResult.value,
    fullNameConfidence: nameResult.confidence,
    email,
    mobile: extractMobile(rawText),
    location: extractLocation(lines),
    summary: extractSummary(sections, lines),
    skills,
    projects,
    education,
    certifications: certs,
    experience,
    achievements,
    languages,
    links
  };
  const splitSkills = splitTechnicalAndSoftSkills(parsed.skills || []);
  parsed.technicalSkills = splitSkills.technicalSkills;
  parsed.softSkills = splitSkills.softSkills;
  parsed.skillCategories = categorizeSkills(parsed.skills || []);

  // Future integration point: replace/augment this with Gemini/OpenAI structured extraction.
  if (process.env.RESUME_PARSER_DEBUG === "true") {
    const snapshot = parserDebugSnapshot(sections, parsed, rawText);
    // eslint-disable-next-line no-console
    console.log("[resume-parser] debug", JSON.stringify(snapshot));
  }

  return parsed;
}

module.exports = {
  structuredResumeParse,
  canonicalSkill,
  displaySkill,
  parserDebugSnapshot
};
