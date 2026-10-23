/**
 * Structured ROLE → SKILL TAXONOMY
 * core = critical required | secondary = important | optional = nice-to-have
 */
export type SkillTier = "core" | "secondary" | "optional";

export type RoleSkillProfile = {
  label: string;
  coreSkills: string[];
  secondarySkills: string[];
  optionalSkills: string[];
};

export const TARGET_ROLE_PROFILES: Record<string, RoleSkillProfile> = {
  full_stack_developer: {
    label: "Full Stack Developer",
    coreSkills: ["javascript", "react", "node.js", "express.js", "mongodb", "sql", "git"],
    secondarySkills: ["typescript", "html", "css", "docker", "api design"],
    optionalSkills: ["next.js", "kubernetes", "aws", "testing", "github actions"]
  },
  frontend_developer: {
    label: "Frontend Developer",
    coreSkills: ["html", "css", "javascript", "react"],
    secondarySkills: ["typescript", "next.js", "tailwind css", "git", "redux"],
    optionalSkills: ["testing", "accessibility", "figma", "webpack", "state management"]
  },
  backend_developer: {
    label: "Backend Developer",
    coreSkills: ["node.js", "express.js", "sql", "mongodb", "git", "api design"],
    secondarySkills: ["postgresql", "docker", "authentication", "redis"],
    optionalSkills: ["kubernetes", "aws", "microservices", "system design"]
  },
  data_scientist: {
    label: "Data Scientist",
    coreSkills: ["python", "pandas", "statistics", "sql", "data analysis"],
    secondarySkills: ["numpy", "scikit-learn", "machine learning"],
    optionalSkills: ["tensorflow", "pytorch", "tableau", "power bi", "deep learning"]
  },
  ai_ml_engineer: {
    label: "AI / ML Engineer",
    // Core = concrete tools a resume actually names. "Machine learning" /
    // "deep learning" describe the field rather than a literal skill-list
    // entry, so they sit in secondary/optional rather than core — mirrors
    // backend constants/resume-intelligence-v2.js.
    coreSkills: ["python", "numpy", "pandas", "tensorflow"],
    secondarySkills: ["pytorch", "scikit-learn", "machine learning", "deep learning"],
    optionalSkills: ["natural language processing", "computer vision", "opencv", "docker", "aws"]
  },
  data_analyst: {
    label: "Data Analyst",
    coreSkills: ["sql", "excel", "data analysis"],
    secondarySkills: ["power bi", "tableau", "statistics"],
    optionalSkills: ["python", "pandas", "data visualization"]
  },
  ui_ux_designer: {
    label: "UI/UX Designer",
    coreSkills: ["figma", "ui design", "ux research", "wireframing"],
    secondarySkills: ["prototyping", "user testing", "design systems"],
    optionalSkills: ["adobe xd", "accessibility", "sketch"]
  },
  devops_engineer: {
    label: "DevOps Engineer",
    coreSkills: ["docker", "kubernetes", "ci/cd", "linux"],
    secondarySkills: ["aws", "terraform", "jenkins"],
    optionalSkills: ["ansible", "github actions", "monitoring"]
  },
  cloud_engineer: {
    label: "Cloud Engineer",
    coreSkills: ["aws", "azure", "gcp", "cloud architecture"],
    secondarySkills: ["networking", "terraform", "kubernetes"],
    optionalSkills: ["docker", "security", "cost optimization"]
  },
  cybersecurity_engineer: {
    label: "Cybersecurity Engineer",
    // Core = concrete, named tools/skills a student resume actually states —
    // mirrors backend constants/resume-intelligence-v2.js.
    coreSkills: ["linux", "networking", "penetration testing"],
    secondarySkills: ["vulnerability assessment", "wireshark", "network security"],
    optionalSkills: ["siem", "burp suite", "cryptography", "incident response", "cloud security", "compliance", "python"]
  }
};

/** @deprecated alias — maps to optional tier */
export const legacyEmerging = (profile: RoleSkillProfile) => profile.optionalSkills;

export const TARGET_ROLE_OPTIONS = Object.entries(TARGET_ROLE_PROFILES).map(([key, profile]) => ({
  key,
  label: profile.label
}));

export const TIER_WEIGHT: Record<SkillTier, number> = {
  core: 2,
  secondary: 1,
  optional: 0.5
};
