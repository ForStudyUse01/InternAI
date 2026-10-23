/** Validated technical skill dictionary — used to reject false positives */
export const KNOWN_SKILL_DICTIONARY = new Set([
  "javascript", "typescript", "react", "next.js", "node.js", "express.js", "html", "css",
  "tailwind css", "bootstrap", "redux", "vue", "angular", "webpack", "state management",
  "python", "java", "c++", "c#", "go", "rust", "kotlin", "swift", "sql", "mysql",
  "postgresql", "mongodb", "firebase", "redis", "docker", "kubernetes", "git", "github",
  "aws", "gcp", "azure", "machine learning", "deep learning", "artificial intelligence",
  "natural language processing", "computer vision", "opencv", "tensorflow", "pytorch", "scikit-learn",
  "pandas", "numpy", "data analysis", "data visualization", "statistics", "tableau", "power bi", "excel",
  "figma", "postman", "jenkins", "terraform", "github actions", "ci/cd", "testing",
  "api design", "authentication", "microservices", "system design", "deployment",
  "accessibility", "graphql", "rest api",
  // Cybersecurity — previously entirely absent, so the cybersecurity_engineer
  // role could never show a present skill regardless of resume content.
  "linux", "networking", "network security", "penetration testing", "vulnerability assessment",
  "siem", "cryptography", "incident response", "cloud security", "compliance", "wireshark",
  "burp suite", "nmap", "metasploit",
  // UI/UX — previously only "figma" was recognized.
  "ui design", "ux research", "wireframing", "prototyping", "user testing", "design systems",
  "adobe xd", "sketch",
  // DevOps / Cloud gaps.
  "cloud architecture", "cost optimization", "monitoring", "ansible", "vs code"
]);

/** Soft / non-technical terms — never treated as technical skills */
export const SOFT_SKILL_BLOCKLIST = new Set([
  "teamwork", "communication", "leadership", "problem solving", "critical thinking",
  "adaptability", "time management", "collaboration", "presentation", "creativity",
  "interpersonal", "motivated", "detail oriented", "hardworking", "fast learner",
  "self motivated", "work ethic", "positive attitude", "multitasking", "organization"
]);

/** Generic resume nouns — ignored unless in skill dictionary */
export const GENERIC_BLOCKLIST = new Set([
  "team", "project", "projects", "experience", "work", "development", "developer",
  "engineer", "software", "application", "applications", "system", "systems", "data",
  "technology", "technologies", "tool", "tools", "platform", "platforms", "service",
  "services", "management", "analysis", "design", "implementation", "building", "built"
]);

/** Canonical alias map (all keys → canonical value) */
export const SKILL_CANONICAL_MAP: Record<string, string> = {
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  reactjs: "react",
  "react.js": "react",
  react: "react",
  nextjs: "next.js",
  "next js": "next.js",
  "next.js": "next.js",
  nodejs: "node.js",
  "node js": "node.js",
  node: "node.js",
  "node.js": "node.js",
  expressjs: "express.js",
  express: "express.js",
  "express.js": "express.js",
  mongo: "mongodb",
  mongodb: "mongodb",
  postgres: "postgresql",
  postgresql: "postgresql",
  sklearn: "scikit-learn",
  "scikit learn": "scikit-learn",
  "scikit-learn": "scikit-learn",
  ml: "machine learning",
  "machine-learning": "machine learning",
  "machine learning": "machine learning",
  "ml models": "machine learning",
  dl: "deep learning",
  "deep learning": "deep learning",
  ai: "artificial intelligence",
  nlp: "natural language processing",
  "natural language processing": "natural language processing",
  tailwind: "tailwind css",
  tailwindcss: "tailwind css",
  "tailwind css": "tailwind css",
  powerbi: "power bi",
  "power bi": "power bi",
  k8s: "kubernetes",
  kubernetes: "kubernetes",
  "api design": "api design",
  "rest api": "api design",
  apis: "api design",
  auth: "authentication",
  authentication: "authentication",
  "data analysis": "data analysis",
  "data analytics": "data analysis",
  html5: "html",
  css3: "css",
  cv: "computer vision",
  // Git and GitHub are used interchangeably on resumes for the same
  // version-control skill.
  git: "github",
  github: "github",
  opencv: "opencv"
};

/** Semantic equivalents — required skill → acceptable user tokens */
export const SEMANTIC_EQUIVALENTS: Record<string, string[]> = {
  react: ["react", "reactjs", "react.js"],
  "node.js": ["node.js", "nodejs", "node"],
  "express.js": ["express.js", "express", "expressjs"],
  "next.js": ["next.js", "nextjs", "next"],
  "machine learning": ["machine learning", "ml", "ml models", "scikit-learn"],
  "deep learning": ["deep learning", "tensorflow", "pytorch"],
  "natural language processing": ["natural language processing", "nlp"],
  javascript: ["javascript", "js", "ecmascript"],
  typescript: ["typescript", "ts"],
  mongodb: ["mongodb", "mongo"],
  postgresql: ["postgresql", "postgres"],
  "scikit-learn": ["scikit-learn", "sklearn", "machine learning"],
  "api design": ["api design", "rest api", "rest apis", "graphql"],
  "computer vision": ["computer vision", "opencv", "cv"]
};

/** Skill area keys for category aggregation (never raw skill names in charts) */
export type SkillCategoryKey =
  | "programming"
  | "frameworks"
  | "tools"
  | "databases"
  | "data_ml"
  | "projects"
  | "problem_solving";

export type SummaryCategoryKey =
  | "programming"
  | "frameworks"
  | "tools"
  | "databases"
  | "projects"
  | "problem_solving";

export const CATEGORY_LABELS: Record<SkillCategoryKey, string> = {
  programming: "Programming",
  frameworks: "Frameworks",
  tools: "Tools",
  databases: "Databases",
  data_ml: "Data / ML",
  projects: "Projects",
  problem_solving: "Problem Solving"
};

/** Flat category summary bars — 6 fixed categories (linear chart only) */
export const SUMMARY_CATEGORY_KEYS: SummaryCategoryKey[] = [
  "programming",
  "frameworks",
  "tools",
  "databases",
  "projects",
  "problem_solving"
];

export const SUMMARY_CATEGORY_LABELS: Record<SummaryCategoryKey, string> = {
  programming: "Programming",
  frameworks: "Frameworks",
  tools: "Tools",
  databases: "Databases",
  projects: "Projects",
  problem_solving: "Problem Solving"
};

/** Maps canonical skills → skill area for aggregation */
export const SKILL_CATEGORY_MAP: Record<string, SkillCategoryKey> = {
  javascript: "programming",
  typescript: "programming",
  python: "programming",
  java: "programming",
  "c++": "programming",
  "c#": "programming",
  go: "programming",
  rust: "programming",
  kotlin: "programming",
  swift: "programming",
  html: "programming",
  css: "programming",
  react: "frameworks",
  "next.js": "frameworks",
  "node.js": "frameworks",
  "express.js": "frameworks",
  redux: "frameworks",
  vue: "frameworks",
  angular: "frameworks",
  "tailwind css": "frameworks",
  bootstrap: "frameworks",
  webpack: "frameworks",
  "state management": "frameworks",
  graphql: "frameworks",
  git: "tools",
  github: "tools",
  docker: "tools",
  kubernetes: "tools",
  aws: "tools",
  gcp: "tools",
  azure: "tools",
  testing: "tools",
  postman: "tools",
  figma: "tools",
  jenkins: "tools",
  terraform: "tools",
  "github actions": "tools",
  "ci/cd": "tools",
  redis: "databases",
  firebase: "databases",
  sql: "databases",
  mongodb: "databases",
  postgresql: "databases",
  mysql: "databases",
  pandas: "data_ml",
  numpy: "data_ml",
  "scikit-learn": "data_ml",
  tensorflow: "data_ml",
  pytorch: "data_ml",
  "machine learning": "data_ml",
  "deep learning": "data_ml",
  "artificial intelligence": "data_ml",
  "natural language processing": "data_ml",
  "computer vision": "data_ml",
  statistics: "data_ml",
  "data analysis": "data_ml",
  tableau: "data_ml",
  "power bi": "data_ml",
  excel: "data_ml",
  deployment: "projects",
  accessibility: "projects",
  "api design": "problem_solving",
  authentication: "problem_solving",
  microservices: "problem_solving",
  "system design": "problem_solving",
  opencv: "data_ml",
  linux: "tools",
  networking: "tools",
  "network security": "tools",
  "penetration testing": "tools",
  "vulnerability assessment": "tools",
  siem: "tools",
  cryptography: "tools",
  "incident response": "tools",
  "cloud security": "tools",
  compliance: "tools",
  wireshark: "tools",
  "burp suite": "tools",
  nmap: "tools",
  metasploit: "tools",
  "ui design": "tools",
  "ux research": "tools",
  wireframing: "tools",
  prototyping: "tools",
  "user testing": "tools",
  "design systems": "tools",
  "adobe xd": "tools",
  sketch: "tools",
  "cloud architecture": "tools",
  "cost optimization": "tools",
  monitoring: "tools",
  ansible: "tools",
  "vs code": "tools",
  "data visualization": "data_ml"
};

/** Practice suggestions for Quick Wins (canonical skill → short action) */
export const SKILL_QUICK_WIN_ACTIONS: Record<string, string> = {
  javascript: "Build a small interactive DOM app",
  typescript: "Refactor a JS file with typed interfaces",
  react: "Build a counter app with hooks",
  "next.js": "Create a page with dynamic routing",
  "node.js": "Build a simple REST API",
  "express.js": "Add CRUD routes to an API",
  html: "Recreate a landing page section",
  css: "Style a responsive card layout",
  git: "Practice branching on a sample repo",
  docker: "Containerize a hello-world app",
  mongodb: "Design a document schema for a blog",
  postgresql: "Write queries for a sample dataset",
  sql: "Practice JOIN queries on sample data",
  python: "Automate a small data task",
  pandas: "Clean and summarize a CSV file",
  "machine learning": "Train a model on a public dataset",
  "scikit-learn": "Run a classification baseline",
  tensorflow: "Build a simple neural net tutorial",
  pytorch: "Complete a tensor basics exercise",
  statistics: "Analyze a dataset with summary stats",
  "api design": "Sketch endpoints for a todo API",
  authentication: "Implement login with JWT",
  testing: "Write unit tests for one module",
  redux: "Add global state to a React app",
  "tailwind css": "Rebuild a component with utility classes"
};

/** Effort hints for Quick Wins (default derived from tier if absent) */
export const SKILL_EFFORT_HINTS: Record<string, "Low" | "Medium"> = {
  git: "Low",
  html: "Low",
  css: "Low",
  javascript: "Low",
  sql: "Low",
  mongodb: "Low",
  postgresql: "Low",
  excel: "Low",
  testing: "Low",
  "tailwind css": "Low",
  redux: "Medium",
  docker: "Medium",
  kubernetes: "Medium",
  "machine learning": "Medium",
  "deep learning": "Medium",
  "system design": "Medium",
  microservices: "Medium",
  tensorflow: "Medium",
  pytorch: "Medium"
};
