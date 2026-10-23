/**
 * ATS Resume Intelligence V2 — dimension weights (must sum to 1).
 * Rebalanced for a student/internship platform where most candidates are
 * freshers by definition: keyword + verified-skill matching still dominate,
 * but projects (the primary signal students actually have) count 3x what
 * they used to, and years-of-experience counts roughly half what it used to
 * since internships should not be scored like senior full-time hiring.
 */
const DIMENSION_WEIGHTS = Object.freeze({
  keywordMatch: 0.35,
  technicalSkillsMatch: 0.15,
  projectsAchievements: 0.15,
  experience: 0.1,
  education: 0.1,
  structure: 0.1,
  certifications: 0.05
});

const SKILL_CATEGORY_TAXONOMY = Object.freeze({
  "Programming Languages": [
    "javascript", "typescript", "python", "java", "c++", "c#", "sql", "html", "css", "go", "rust", "kotlin", "swift"
  ],
  "Web Development": ["react", "next.js", "node.js", "express.js", "angular", "vue", "tailwind css", "bootstrap", "redux"],
  "Mobile Development": ["react native", "flutter", "android", "ios", "kotlin", "swift"],
  Databases: ["mongodb", "mysql", "postgresql", "sql", "firebase", "redis", "dynamodb"],
  Cloud: ["aws", "gcp", "azure", "microsoft azure"],
  DevOps: ["docker", "kubernetes", "ci/cd", "jenkins", "terraform", "github actions"],
  "AI / ML": [
    "machine learning", "artificial intelligence", "deep learning", "natural language processing", "tensorflow", "pytorch",
    "scikit-learn", "keras", "computer vision", "opencv"
  ],
  "Data Science": ["pandas", "numpy", "data analysis", "data mining", "tableau", "power bi", "matplotlib", "statistics"],
  Design: ["figma", "ui design", "ux research", "wireframing", "prototyping", "sketch", "adobe xd"],
  Security: [
    "network security", "penetration testing", "vulnerability assessment", "siem", "cryptography", "incident response",
    "cloud security", "wireshark", "burp suite", "nmap", "metasploit"
  ],
  Tools: ["git", "github", "postman", "figma", "jira", "linux", "vs code"],
  "Soft Skills": [
    "communication", "teamwork", "leadership", "problem solving", "critical thinking", "adaptability", "time management",
    "collaboration", "presentation", "creativity"
  ]
});

const TARGET_ROLE_PROFILES = Object.freeze({
  full_stack_developer: {
    label: "Full Stack Developer",
    coreSkills: ["javascript", "typescript", "react", "node.js", "express.js", "mongodb", "sql", "git", "docker"],
    emergingSkills: ["next.js", "kubernetes", "aws", "testing", "github actions"]
  },
  frontend_developer: {
    label: "Frontend Developer",
    coreSkills: ["javascript", "typescript", "react", "next.js", "html", "css", "tailwind css", "git"],
    emergingSkills: ["redux", "testing", "accessibility", "figma", "webpack"]
  },
  backend_developer: {
    label: "Backend Developer",
    coreSkills: ["node.js", "express.js", "mongodb", "postgresql", "sql", "git", "docker", "api design"],
    emergingSkills: ["kubernetes", "aws", "redis", "microservices", "authentication"]
  },
  data_scientist: {
    label: "Data Scientist",
    coreSkills: ["python", "pandas", "numpy", "scikit-learn", "sql", "data analysis", "statistics"],
    emergingSkills: ["tensorflow", "pytorch", "machine learning", "tableau", "power bi"]
  },
  ai_ml_engineer: {
    label: "AI / ML Engineer",
    // Core = concrete tools/libraries a resume actually names ("TensorFlow",
    // "PyTorch"). Discipline-level terms like "machine learning"/"deep
    // learning" describe the field, not a literal skill-list entry — students
    // who list only tools rarely also type these phrases verbatim, so they
    // belong in the bonus tier, not the required tier.
    coreSkills: ["python", "numpy", "pandas", "tensorflow", "pytorch", "scikit-learn"],
    emergingSkills: ["machine learning", "deep learning", "natural language processing", "computer vision", "opencv", "docker", "aws"]
  },
  data_analyst: {
    label: "Data Analyst",
    coreSkills: ["sql", "excel", "data analysis", "power bi", "tableau"],
    emergingSkills: ["python", "pandas", "statistics", "data visualization", "numpy"]
  },
  ui_ux_designer: {
    label: "UI/UX Designer",
    coreSkills: ["figma", "ui design", "ux research", "wireframing", "prototyping"],
    emergingSkills: ["user testing", "design systems", "adobe xd", "accessibility", "sketch"]
  },
  devops_engineer: {
    label: "DevOps Engineer",
    coreSkills: ["docker", "kubernetes", "ci/cd", "linux", "aws"],
    emergingSkills: ["terraform", "ansible", "jenkins", "github actions", "monitoring"]
  },
  cloud_engineer: {
    label: "Cloud Engineer",
    coreSkills: ["aws", "azure", "gcp", "cloud architecture", "networking"],
    emergingSkills: ["terraform", "kubernetes", "docker", "security", "cost optimization"]
  },
  cybersecurity_engineer: {
    label: "Cybersecurity Engineer",
    // Core = concrete, named tools/skills a student resume actually states
    // (Linux, Wireshark, Burp Suite, hands-on pentesting/vuln-assessment
    // practice). Broader domain terms (SIEM, cryptography, compliance) are
    // real but less often literally listed by students — bonus tier.
    coreSkills: ["linux", "networking", "penetration testing", "vulnerability assessment", "wireshark"],
    emergingSkills: ["network security", "siem", "burp suite", "cryptography", "incident response", "cloud security", "compliance", "python"]
  }
});

const REQUIRED_SECTIONS = ["summary", "skills", "projects", "education", "experience", "certifications", "achievements"];

module.exports = {
  DIMENSION_WEIGHTS,
  SKILL_CATEGORY_TAXONOMY,
  TARGET_ROLE_PROFILES,
  REQUIRED_SECTIONS
};
