/**
 * Populates realistic test data under the existing VERIFIED "NovaTech" company only.
 * Idempotent: safe to re-run — skips internships/candidates/applications that already exist.
 *
 * Usage: node scripts/seed-novatech-testdata.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/shared/database/db");

const User = require("../src/models/User");
const InternProfile = require("../src/models/InternProfile");
const CompanyProfile = require("../src/models/CompanyProfile");
const Internship = require("../src/models/Internship");
const Application = require("../src/models/Application");

const { hashPassword } = require("../src/shared/utils/password");
const { COMPANY_VERIFICATION_STATUS, APPLICATION_STATUS, COMPANY_ACCOUNT_TYPES, USER_ROLES } = require("../src/shared/constants/enums");
const { computeResumeScore } = require("../src/modules/students/services/scorer.service");
const { computeApplicationRelevance } = require("../src/modules/applications/services/application-relevance.service");

const SEED_RESUME_PATH = "uploads/resumes/seed-resume.pdf";
const SHARED_PASSWORD = "Student@123";

// ---------------------------------------------------------------------------
// Domain catalogue — 20 internship roles across the requested specializations.
// targetRoleKey aligns to TARGET_ROLE_PROFILES in resume-intelligence-v2 so the
// real scoring engine produces coherent, non-zero analysis for matched candidates.
// ---------------------------------------------------------------------------
const DOMAINS = [
  {
    key: "full_stack",
    title: "Full Stack Development Intern",
    department: "Engineering",
    targetRoleKey: "full_stack_developer",
    skillsRequired: ["javascript", "react", "node.js", "mongodb", "express.js", "git"],
    prioritySkills: ["react", "node.js"],
    candidateSkillPool: ["javascript", "typescript", "react", "node.js", "express.js", "mongodb", "sql", "git", "docker", "next.js", "redux", "html", "css"],
    description:
      "Work across the stack to design, build, and ship product features for NovaTech's internal platform, from React UI components to Node.js/Express APIs backed by MongoDB.",
    responsibilities:
      "Build and maintain full-stack features end to end; write REST APIs in Express/Node.js; build responsive UI in React; write unit and integration tests; participate in code reviews and sprint planning.",
    eligibilityCriteria: "Pre-final or final year B.Tech/BCA/MCA students in Computer Science or related discipline.",
    preferredSkillsText: "Next.js, Redux, Docker, CI/CD, unit testing (Jest)",
    educationQualification: "B.Tech/B.E./BCA/MCA in Computer Science, IT, or related field",
    minimumCgpa: "7.0"
  },
  {
    key: "frontend",
    title: "Frontend Development Intern",
    department: "Engineering",
    targetRoleKey: "frontend_developer",
    skillsRequired: ["javascript", "react", "html", "css", "tailwind css"],
    prioritySkills: ["react", "javascript"],
    candidateSkillPool: ["javascript", "typescript", "react", "next.js", "html", "css", "tailwind css", "git", "redux", "figma"],
    description: "Own the client-side experience for NovaTech's web products — building pixel-perfect, accessible, and performant React interfaces.",
    responsibilities:
      "Translate Figma designs into production React components; optimize page performance and accessibility; collaborate with backend engineers on API contracts; fix cross-browser UI bugs.",
    eligibilityCriteria: "2nd/3rd/4th year students with a strong grasp of HTML, CSS, and JavaScript fundamentals.",
    preferredSkillsText: "TypeScript, Tailwind CSS, component testing, design systems",
    educationQualification: "B.Tech/B.E./BCA in Computer Science or Design-adjacent discipline",
    minimumCgpa: "6.5"
  },
  {
    key: "backend",
    title: "Backend Development Intern",
    department: "Engineering",
    targetRoleKey: "backend_developer",
    skillsRequired: ["node.js", "express.js", "mongodb", "sql", "api design"],
    prioritySkills: ["node.js", "api design"],
    candidateSkillPool: ["node.js", "express.js", "mongodb", "postgresql", "sql", "git", "docker", "redis", "microservices", "authentication"],
    description: "Design and build the server-side services and APIs that power NovaTech's internship and hiring platform at scale.",
    responsibilities:
      "Design REST APIs and database schemas; implement authentication and authorization flows; optimize query performance; write integration tests; document API contracts.",
    eligibilityCriteria: "Final/pre-final year students comfortable with server-side JavaScript and relational/NoSQL databases.",
    preferredSkillsText: "Redis, Docker, microservices, JWT-based auth, rate limiting",
    educationQualification: "B.Tech/B.E./MCA in Computer Science or IT",
    minimumCgpa: "7.0"
  },
  {
    key: "ai_ml",
    title: "AI / Machine Learning Intern",
    department: "AI Research",
    targetRoleKey: "ai_ml_engineer",
    skillsRequired: ["python", "machine learning", "tensorflow", "numpy", "pandas"],
    prioritySkills: ["python", "machine learning"],
    candidateSkillPool: ["python", "numpy", "pandas", "tensorflow", "pytorch", "scikit-learn", "machine learning", "deep learning", "natural language processing", "computer vision", "opencv"],
    description: "Support NovaTech's AI research team in building and evaluating machine learning models for candidate-job matching and resume intelligence.",
    responsibilities:
      "Prototype ML models for ranking and recommendation; clean and preprocess large datasets; run experiments and track metrics; collaborate with the platform team on model deployment.",
    eligibilityCriteria: "Students with coursework or project experience in machine learning, linear algebra, and statistics.",
    preferredSkillsText: "PyTorch, NLP, computer vision, MLOps basics",
    educationQualification: "B.Tech/B.E./M.Tech in CS, AI/ML, Data Science, or related quantitative field",
    minimumCgpa: "7.5"
  },
  {
    key: "data_science",
    title: "Data Science Intern",
    department: "Data & Analytics",
    targetRoleKey: "data_scientist",
    skillsRequired: ["python", "pandas", "numpy", "sql", "statistics"],
    prioritySkills: ["python", "sql"],
    candidateSkillPool: ["python", "pandas", "numpy", "scikit-learn", "sql", "data analysis", "statistics", "tensorflow", "tableau", "power bi"],
    description: "Analyze large-scale platform data to uncover insights on hiring funnel performance and build predictive models for candidate success.",
    responsibilities:
      "Build data pipelines for analysis; run statistical tests and A/B experiments; build predictive models; present findings to stakeholders with clear visualizations.",
    eligibilityCriteria: "Students with strong statistics/probability fundamentals and hands-on Python data-stack experience.",
    preferredSkillsText: "Scikit-learn, hypothesis testing, experiment design, Tableau",
    educationQualification: "B.Tech/B.Sc./M.Sc. in CS, Statistics, Mathematics, or Data Science",
    minimumCgpa: "7.0"
  },
  {
    key: "data_analytics",
    title: "Data Analytics Intern",
    department: "Data & Analytics",
    targetRoleKey: "data_analyst",
    skillsRequired: ["sql", "excel", "power bi", "data analysis"],
    prioritySkills: ["sql", "power bi"],
    candidateSkillPool: ["sql", "excel", "data analysis", "power bi", "tableau", "python", "pandas", "statistics", "data visualization"],
    description: "Build dashboards and reports that give NovaTech's HR and leadership teams real-time visibility into hiring and workforce metrics.",
    responsibilities:
      "Build and maintain BI dashboards in Power BI/Tableau; write SQL queries against the analytics warehouse; automate recurring reports; validate data quality.",
    eligibilityCriteria: "Students comfortable with SQL and spreadsheet-based analysis; BI tool exposure preferred.",
    preferredSkillsText: "Tableau, advanced Excel, Python for data wrangling",
    educationQualification: "B.Tech/BBA/B.Com/B.Sc. with quantitative coursework",
    minimumCgpa: "6.5"
  },
  {
    key: "devops",
    title: "DevOps Intern",
    department: "Platform Engineering",
    targetRoleKey: "devops_engineer",
    skillsRequired: ["docker", "kubernetes", "ci/cd", "linux", "aws"],
    prioritySkills: ["docker", "ci/cd"],
    candidateSkillPool: ["docker", "kubernetes", "ci/cd", "linux", "aws", "terraform", "jenkins", "github actions", "monitoring"],
    description: "Help build and maintain the CI/CD pipelines and cloud infrastructure that keep NovaTech's platform deploying safely and reliably.",
    responsibilities:
      "Maintain CI/CD pipelines (GitHub Actions/Jenkins); containerize services with Docker; manage Kubernetes manifests; set up monitoring and alerting.",
    eligibilityCriteria: "Students familiar with Linux fundamentals and at least one cloud provider.",
    preferredSkillsText: "Terraform, Kubernetes, Prometheus/Grafana, AWS",
    educationQualification: "B.Tech/B.E. in Computer Science or IT",
    minimumCgpa: "6.5"
  },
  {
    key: "cloud",
    title: "Cloud Computing Intern",
    department: "Platform Engineering",
    targetRoleKey: "cloud_engineer",
    skillsRequired: ["aws", "cloud architecture", "networking", "azure"],
    prioritySkills: ["aws", "cloud architecture"],
    candidateSkillPool: ["aws", "azure", "gcp", "cloud architecture", "networking", "terraform", "kubernetes", "docker", "security", "cost optimization"],
    description: "Support the design and operation of NovaTech's multi-cloud infrastructure, focusing on scalability, reliability, and cost efficiency.",
    responsibilities:
      "Assist in cloud infrastructure provisioning via IaC; monitor cloud cost and usage; support migration of services to managed cloud offerings; document architecture decisions.",
    eligibilityCriteria: "Students with cloud certification (AWS/Azure/GCP fundamentals) or equivalent coursework preferred.",
    preferredSkillsText: "Terraform, cost optimization, multi-region architecture",
    educationQualification: "B.Tech/B.E. in Computer Science, IT, or Cloud Computing specialization",
    minimumCgpa: "6.5"
  },
  {
    key: "cybersecurity",
    title: "Cybersecurity Intern",
    department: "Security",
    targetRoleKey: "cybersecurity_engineer",
    skillsRequired: ["linux", "networking", "vulnerability assessment", "network security"],
    prioritySkills: ["vulnerability assessment", "networking"],
    candidateSkillPool: ["linux", "networking", "penetration testing", "vulnerability assessment", "wireshark", "network security", "siem", "burp suite", "cryptography", "python"],
    description: "Assist NovaTech's security team in identifying vulnerabilities, monitoring threats, and hardening the platform's security posture.",
    responsibilities:
      "Run vulnerability assessments and basic penetration tests under supervision; monitor security alerts; assist with incident response drills; document findings and remediation steps.",
    eligibilityCriteria: "Students with foundational networking knowledge and interest in application/infrastructure security.",
    preferredSkillsText: "Burp Suite, Wireshark, SIEM tools, scripting for automation",
    educationQualification: "B.Tech/B.E. in Computer Science, IT, or Cybersecurity",
    minimumCgpa: "6.5"
  },
  {
    key: "ui_ux",
    title: "UI/UX Design Intern",
    department: "Design",
    targetRoleKey: "ui_ux_designer",
    skillsRequired: ["figma", "ui design", "ux research", "wireframing"],
    prioritySkills: ["figma", "ui design"],
    candidateSkillPool: ["figma", "ui design", "ux research", "wireframing", "prototyping", "sketch", "adobe xd", "user testing", "design systems", "accessibility"],
    description: "Design intuitive, accessible experiences for candidates and recruiters across NovaTech's hiring platform.",
    responsibilities:
      "Conduct user research and usability testing; create wireframes and high-fidelity prototypes in Figma; maintain the design system; collaborate closely with frontend engineers.",
    eligibilityCriteria: "Design or CS students with a strong portfolio demonstrating UI/UX process.",
    preferredSkillsText: "Design systems, accessibility (WCAG), motion/interaction design",
    educationQualification: "B.Des/B.Tech/BCA with a design portfolio",
    minimumCgpa: "6.0"
  },
  {
    key: "mobile",
    title: "Mobile App Development Intern",
    department: "Engineering",
    targetRoleKey: "frontend_developer",
    skillsRequired: ["react native", "javascript", "android", "ios"],
    prioritySkills: ["react native"],
    candidateSkillPool: ["react native", "flutter", "android", "ios", "kotlin", "swift", "javascript", "typescript", "firebase", "git"],
    description: "Build and ship features for NovaTech's cross-platform mobile app used by students to track applications and interviews.",
    responsibilities:
      "Develop features in React Native/Flutter; integrate REST APIs and push notifications; optimize app performance; test across Android and iOS devices.",
    eligibilityCriteria: "Students with hands-on mobile app development experience (personal or academic projects).",
    preferredSkillsText: "Native module integration, Firebase, app store deployment basics",
    educationQualification: "B.Tech/B.E./BCA in Computer Science or IT",
    minimumCgpa: "6.5"
  },
  {
    key: "qa_automation",
    title: "QA Automation Intern",
    department: "Quality Engineering",
    targetRoleKey: "backend_developer",
    skillsRequired: ["selenium", "test automation", "javascript", "api testing"],
    prioritySkills: ["selenium", "test automation"],
    candidateSkillPool: ["selenium", "cypress", "playwright", "test automation", "javascript", "python", "api testing", "postman", "git", "ci/cd"],
    description: "Build and maintain the automated test suites that keep NovaTech's platform releases reliable and regression-free.",
    responsibilities:
      "Write and maintain automated UI/API test suites (Selenium/Cypress); integrate tests into CI/CD; triage and log defects; collaborate with developers on test coverage.",
    eligibilityCriteria: "Students with programming fundamentals and interest in software quality/testing.",
    preferredSkillsText: "Cypress, Playwright, Postman, CI/CD integration",
    educationQualification: "B.Tech/B.E./BCA in Computer Science or IT",
    minimumCgpa: "6.0"
  },
  {
    key: "software_testing",
    title: "Software Testing Intern",
    department: "Quality Engineering",
    targetRoleKey: "backend_developer",
    skillsRequired: ["manual testing", "test case design", "sql", "api testing"],
    prioritySkills: ["manual testing", "test case design"],
    candidateSkillPool: ["manual testing", "test case design", "sql", "api testing", "postman", "jira", "regression testing", "bug tracking", "git"],
    description: "Own manual and exploratory testing for new features across NovaTech's web platform before every release.",
    responsibilities:
      "Design and execute test cases from requirements; perform exploratory and regression testing; log and track defects in Jira; verify bug fixes.",
    eligibilityCriteria: "Students with attention to detail and basic understanding of SDLC/STLC.",
    preferredSkillsText: "SQL for data validation, Postman for API testing, Jira",
    educationQualification: "B.Tech/B.E./BCA/B.Sc. in Computer Science or IT",
    minimumCgpa: "6.0"
  },
  {
    key: "java",
    title: "Java Development Intern",
    department: "Engineering",
    targetRoleKey: "backend_developer",
    skillsRequired: ["java", "spring boot", "sql", "git"],
    prioritySkills: ["java", "spring boot"],
    candidateSkillPool: ["java", "spring boot", "sql", "mysql", "hibernate", "rest apis", "git", "docker", "microservices"],
    description: "Build backend services for NovaTech's enterprise integrations using Java and Spring Boot.",
    responsibilities:
      "Develop REST APIs using Spring Boot; write unit tests with JUnit; work with relational databases; participate in code reviews.",
    eligibilityCriteria: "Students with strong OOP fundamentals and Java coursework or project experience.",
    preferredSkillsText: "Spring Security, Hibernate, microservices basics, Docker",
    educationQualification: "B.Tech/B.E./MCA in Computer Science or IT",
    minimumCgpa: "7.0"
  },
  {
    key: "python",
    title: "Python Development Intern",
    department: "Engineering",
    targetRoleKey: "backend_developer",
    skillsRequired: ["python", "django", "sql", "api design"],
    prioritySkills: ["python", "django"],
    candidateSkillPool: ["python", "django", "flask", "sql", "postgresql", "rest apis", "git", "docker", "celery"],
    description: "Build backend services and internal tooling for NovaTech using Python, Django, and Flask.",
    responsibilities:
      "Build REST APIs with Django/Flask; write and maintain automated scripts and internal tools; work with PostgreSQL; write unit tests.",
    eligibilityCriteria: "Students with solid Python fundamentals and exposure to at least one web framework.",
    preferredSkillsText: "Django REST Framework, Celery, Docker, PostgreSQL",
    educationQualification: "B.Tech/B.E./MCA/BCA in Computer Science or IT",
    minimumCgpa: "6.5"
  },
  {
    key: "mern",
    title: "MERN Stack Development Intern",
    department: "Engineering",
    targetRoleKey: "full_stack_developer",
    skillsRequired: ["mongodb", "express.js", "react", "node.js"],
    prioritySkills: ["react", "mongodb"],
    candidateSkillPool: ["mongodb", "express.js", "react", "node.js", "javascript", "redux", "git", "tailwind css", "rest apis"],
    description: "Build features end-to-end on NovaTech's MERN-based candidate portal, from MongoDB schema design to React UI.",
    responsibilities:
      "Design MongoDB schemas; build Express/Node APIs; implement React UI with Redux state management; write tests and participate in sprint reviews.",
    eligibilityCriteria: "Students with project experience covering the full MERN stack.",
    preferredSkillsText: "Redux Toolkit, Mongoose, JWT auth, deployment basics",
    educationQualification: "B.Tech/B.E./BCA/MCA in Computer Science or IT",
    minimumCgpa: "6.5"
  },
  {
    key: "react",
    title: "React Development Intern",
    department: "Engineering",
    targetRoleKey: "frontend_developer",
    skillsRequired: ["react", "javascript", "redux", "css"],
    prioritySkills: ["react", "redux"],
    candidateSkillPool: ["react", "javascript", "typescript", "redux", "next.js", "css", "tailwind css", "git", "testing"],
    description: "Build and maintain complex, state-heavy React interfaces for NovaTech's recruiter and candidate dashboards.",
    responsibilities:
      "Build reusable React components and hooks; manage complex state with Redux/Context; optimize rendering performance; write component tests.",
    eligibilityCriteria: "Students with hands-on React project experience.",
    preferredSkillsText: "TypeScript, React Testing Library, performance profiling",
    educationQualification: "B.Tech/B.E./BCA in Computer Science or IT",
    minimumCgpa: "6.5"
  },
  {
    key: "nodejs",
    title: "Node.js Development Intern",
    department: "Engineering",
    targetRoleKey: "backend_developer",
    skillsRequired: ["node.js", "express.js", "mongodb", "rest apis"],
    prioritySkills: ["node.js", "express.js"],
    candidateSkillPool: ["node.js", "express.js", "mongodb", "rest apis", "javascript", "typescript", "git", "docker", "authentication", "redis"],
    description: "Build and scale backend services powering NovaTech's core platform APIs using Node.js and Express.",
    responsibilities:
      "Build and document REST APIs; implement authentication/authorization middleware; optimize database queries; write integration tests.",
    eligibilityCriteria: "Students with backend project experience in Node.js/Express.",
    preferredSkillsText: "TypeScript, Redis caching, rate limiting, Docker",
    educationQualification: "B.Tech/B.E./MCA in Computer Science or IT",
    minimumCgpa: "6.5"
  },
  {
    key: "business_analyst",
    title: "Business Analyst Intern",
    department: "Strategy & Operations",
    targetRoleKey: "data_analyst",
    skillsRequired: ["excel", "sql", "data analysis", "communication"],
    prioritySkills: ["excel", "communication"],
    candidateSkillPool: ["excel", "sql", "data analysis", "power bi", "communication", "problem solving", "presentation", "stakeholder management"],
    description: "Support NovaTech's operations team in analyzing business processes and translating requirements into actionable insights.",
    responsibilities:
      "Gather and document business requirements; build process and data flow diagrams; analyze operational metrics; prepare stakeholder presentations.",
    eligibilityCriteria: "Students from any discipline with strong analytical and communication skills.",
    preferredSkillsText: "SQL, Power BI, requirement documentation (BRD/FRD)",
    educationQualification: "BBA/B.Com/B.Tech/MBA (pursuing) or related",
    minimumCgpa: "6.0"
  },
  {
    key: "product_management",
    title: "Product Management Intern",
    department: "Product",
    targetRoleKey: "full_stack_developer",
    skillsRequired: ["product strategy", "communication", "data analysis", "wireframing"],
    prioritySkills: ["product strategy", "communication"],
    candidateSkillPool: ["product strategy", "communication", "data analysis", "wireframing", "figma", "sql", "presentation", "problem solving", "agile"],
    description: "Work alongside NovaTech's product team to shape roadmap decisions for the hiring and internship platform.",
    responsibilities:
      "Assist in writing product requirement docs; analyze feature usage data; run competitor research; coordinate with design and engineering on delivery.",
    eligibilityCriteria: "Students with strong communication skills and interest in product/tech strategy.",
    preferredSkillsText: "Wireframing basics, SQL, agile ceremonies exposure",
    educationQualification: "B.Tech/BBA/MBA (pursuing) or related discipline",
    minimumCgpa: "6.5"
  }
];

const LOCATIONS = [
  { location: "Bengaluru, Karnataka", mode: "hybrid" },
  { location: "Remote", mode: "remote" },
  { location: "Hyderabad, Telangana", mode: "on-site" },
  { location: "Pune, Maharashtra", mode: "hybrid" },
  { location: "Bengaluru, Karnataka", mode: "remote" },
  { location: "Gurugram, Haryana", mode: "on-site" }
];

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Reyansh", "Ayaan", "Krishna", "Ishaan", "Shaurya",
  "Rohan", "Karan", "Aryan", "Dhruv", "Kabir", "Yash", "Rahul", "Nikhil", "Siddharth", "Varun",
  "Aisha", "Diya", "Ananya", "Isha", "Kavya", "Meera", "Naina", "Priya", "Riya", "Saanvi",
  "Sneha", "Tanvi", "Zara", "Neha", "Pooja", "Anjali", "Divya", "Ritika", "Simran", "Aditi",
  "Manav", "Devansh", "Harsh", "Om", "Parth", "Raghav", "Sahil", "Tanish", "Uday", "Vikram",
  "Aarohi", "Bhavya", "Charvi", "Esha", "Fatima", "Gauri", "Ira", "Jiya", "Khushi", "Lavanya"
];

const LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Mehta", "Patel", "Reddy", "Nair", "Iyer", "Rao", "Singh",
  "Kumar", "Das", "Bose", "Chatterjee", "Mukherjee", "Joshi", "Kapoor", "Malhotra", "Chopra", "Bhatt",
  "Agarwal", "Shah", "Desai", "Pillai", "Menon", "Naidu", "Krishnan", "Pandey", "Trivedi", "Rastogi"
];

const COLLEGES = [
  "Indian Institute of Technology, Bombay",
  "Indian Institute of Technology, Delhi",
  "National Institute of Technology, Trichy",
  "Vellore Institute of Technology",
  "BITS Pilani",
  "Delhi Technological University",
  "SRM Institute of Science and Technology",
  "Manipal Institute of Technology",
  "PES University",
  "RV College of Engineering",
  "Anna University",
  "Jadavpur University",
  "IIIT Hyderabad",
  "IIIT Bangalore",
  "Thapar Institute of Engineering and Technology",
  "Amity University",
  "Chandigarh University",
  "Lovely Professional University",
  "Symbiosis Institute of Technology",
  "KIIT University"
];

const DEGREES = ["B.Tech", "B.E.", "BCA", "MCA"];
const BRANCHES = ["Computer Science", "Information Technology", "Electronics & Communication", "Data Science", "AI & ML"];
const SOFT_SKILLS = ["communication", "teamwork", "leadership", "problem solving", "critical thinking", "adaptability", "time management", "collaboration"];
const CERT_ISSUERS = ["Coursera", "NPTEL", "Udemy", "Google", "AWS", "Microsoft", "freeCodeCamp"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function daysFromNow(n) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

function buildInternshipDoc(domain, companyId, hrUserId, index) {
  const loc = LOCATIONS[index % LOCATIONS.length];
  const openings = randInt(2, 8);
  const stipendBase = randInt(8, 35) * 1000;
  return {
    company: companyId,
    assignedRecruiter: hrUserId,
    assignedDepartment: domain.department,
    role: domain.title,
    skillsRequired: domain.skillsRequired,
    prioritySkills: domain.prioritySkills,
    stipend: `Rs. ${stipendBase.toLocaleString("en-IN")} - Rs. ${(stipendBase + 12000).toLocaleString("en-IN")}/month`,
    perks: "Certificate of completion, letter of recommendation, flexible working hours, mentorship from senior engineers",
    openings,
    duration: pick(["3 months", "4 months", "6 months"]),
    internshipType: pick(["Full-time Internship", "Part-time Internship"]),
    department: domain.department,
    location: loc.location,
    startDate: daysFromNow(randInt(15, 45)),
    applicationDeadline: daysFromNow(randInt(7, 30)),
    mode: loc.mode,
    responsibilities: domain.responsibilities,
    eligibilityCriteria: domain.eligibilityCriteria,
    preferredSkillsText: domain.preferredSkillsText,
    educationQualification: domain.educationQualification,
    degreePreferences: "B.Tech/B.E./BCA/MCA preferred",
    minimumCgpa: domain.minimumCgpa,
    experienceRequirement: "No prior professional experience required; relevant projects/coursework valued",
    selectionProcess: "Resume shortlisting, online assessment, technical interview, HR round",
    interviewRoundsInfo: "2 rounds: Technical Interview (45 min) and HR Interview (30 min)",
    additionalInstructions: "Please attach an updated resume and, if available, a link to your GitHub/portfolio.",
    hrContact: "hr@novatech.example",
    description: domain.description,
    isActive: true
  };
}

function buildCandidateProfile(index, domain) {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const fullName = `${firstName} ${lastName}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@studentmail.example`;
  const college = pick(COLLEGES);
  const degree = pick(DEGREES);
  const branch = pick(BRANCHES);
  const cgpa = (Math.random() * (9.6 - 6.5) + 6.5).toFixed(2);
  const gradYear = String(pick([2025, 2026, 2027]));
  const mobile = `9${randInt(100000000, 999999999)}`;

  const skills = pickN(domain.candidateSkillPool, randInt(6, Math.min(9, domain.candidateSkillPool.length)));
  const softSkills = pickN(SOFT_SKILLS, randInt(3, 5));

  const projectTitles = [
    `${domain.title.replace(" Intern", "")} Portfolio Project`,
    `${pick(["Personal", "Campus", "Open Source"])} ${domain.department} Tool`,
    `${pick(["Real-time", "AI-powered", "Collaborative"])} ${pick(["Dashboard", "Application", "Platform"])}`
  ];
  const projects = pickN(projectTitles, randInt(2, 3)).map((title) => ({
    title,
    description: `Built ${title.toLowerCase()} using ${skills.slice(0, 3).join(", ")}, focused on ${pick([
      "clean architecture",
      "performance optimization",
      "user experience",
      "scalability",
      "test coverage"
    ])}.`,
    techStack: skills.slice(0, 4),
    githubLink: `https://github.com/${firstName.toLowerCase()}${lastName.toLowerCase()}/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    demoLink: ""
  }));

  const certifications = pickN(
    [
      `${domain.title.replace(" Intern", "")} Fundamentals`,
      `${skills[0]} Certification`,
      `${pick(CERT_ISSUERS)} ${domain.department} Bootcamp`
    ],
    randInt(1, 2)
  ).map((name) => ({
    name,
    issuer: pick(CERT_ISSUERS),
    year: String(pick([2023, 2024, 2025]))
  }));

  const hasExperience = Math.random() < 0.35;
  const experience = hasExperience
    ? [
        {
          role: `${domain.title.replace(" Intern", "")} Trainee`,
          company: pick(["Freelance", "Campus Innovation Cell", "Local Startup"]),
          duration: `${randInt(1, 4)} months`,
          description: `Contributed to ${pick(["feature development", "bug fixes", "testing", "documentation"])} using ${skills[0]} and ${skills[1] || skills[0]}.`
        }
      ]
    : [];

  const summary = `${degree} student in ${branch} at ${college}, graduating ${gradYear}. Passionate about ${domain.title
    .replace(" Intern", "")
    .toLowerCase()}, with hands-on project experience in ${skills.slice(0, 3).join(", ")}. Seeking an internship to apply and grow these skills in a production environment.`;

  const achievements = pickN(
    ["Hackathon finalist", "Dean's list", "Coding contest top 10%", "Open-source contributor", "College tech-fest organizer"],
    randInt(0, 2)
  );

  const resumeTextLines = [
    fullName,
    `${email} | ${mobile}`,
    "",
    "PROFESSIONAL SUMMARY",
    summary,
    "",
    "EDUCATION",
    `${degree} in ${branch}, ${college}, ${gradYear}, CGPA: ${cgpa}`,
    "",
    "SKILLS",
    skills.join(", "),
    "",
    "PROJECTS",
    ...projects.map((p) => `- ${p.title}: ${p.description}`),
    "",
    "CERTIFICATIONS",
    ...certifications.map((c) => `- ${c.name} (${c.issuer}, ${c.year})`),
    ...(experience.length ? ["", "EXPERIENCE", ...experience.map((e) => `- ${e.role} at ${e.company} (${e.duration}): ${e.description}`)] : []),
    ...(achievements.length ? ["", "ACHIEVEMENTS", ...achievements.map((a) => `- ${a}`)] : [])
  ];
  const resumeText = resumeTextLines.join("\n");

  return {
    fullName,
    email,
    mobile,
    skills,
    softSkills,
    education: [`${degree} ${branch} - ${college}`],
    educationDetails: [{ college, degree, branch, cgpa, passingYear: gradYear }],
    projects: projects.map((p) => p.title),
    certifications: certifications.map((c) => c.name),
    certificationEntries: certifications,
    experience: experience.map((e) => `${e.role} at ${e.company}`),
    achievements,
    linkedinUrl: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}${index}`,
    githubUrl: `https://github.com/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
    portfolioUrl: "",
    address: college.split(",")[0],
    bio: summary,
    summary,
    interests: skills.slice(0, 3),
    profileSections: {
      personalInformation: { location: pick(LOCATIONS).location, headline: `${domain.title.replace(" Intern", "")} enthusiast` },
      professionalSummary: summary,
      education: [{ degree, institution: college, startYear: String(Number(gradYear) - 4), endYear: gradYear, grade: cgpa }],
      experience: experience.map((e) => ({ role: e.role, company: e.company, duration: e.duration, description: e.description })),
      projects: projects.map((p) => ({ title: p.title, description: p.description, techStack: p.techStack, demoLink: p.demoLink })),
      certifications: certifications.map((c) => ({ name: c.name, issuer: c.issuer, year: c.year })),
      skills,
      socialLinks: [
        { platform: "GitHub", url: `https://github.com/${firstName.toLowerCase()}${lastName.toLowerCase()}` },
        { platform: "LinkedIn", url: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}${index}` }
      ],
      achievements
    },
    resumeText,
    resumeParsed: {
      skills,
      technicalSkills: skills,
      softSkills,
      projects: projects.map((p) => ({ title: p.title, description: p.description, techStack: p.techStack, githubLink: p.githubLink, demoLink: p.demoLink })),
      education: [{ institution: college, degree, branch, grade: cgpa, graduationYear: gradYear }],
      certifications: certifications.map((c) => ({ name: c.name, issuer: c.issuer, year: c.year })),
      experience: experience.map((e) => ({ role: e.role, company: e.company, duration: e.duration, description: e.description })),
      achievements,
      links: [`https://github.com/${firstName.toLowerCase()}${lastName.toLowerCase()}`, `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}${index}`],
      summary,
      email,
      mobile
    },
    targetRoleKey: domain.targetRoleKey
  };
}

// ---------------------------------------------------------------------------
// Pipeline distribution — 100 candidates across real APPLICATION_STATUS values.
// ---------------------------------------------------------------------------
const PIPELINE_PLAN = [
  { status: APPLICATION_STATUS.APPLIED, count: 18 },
  { status: APPLICATION_STATUS.REVIEWED, count: 7 },
  { status: APPLICATION_STATUS.SCREENING, count: 7 },
  { status: APPLICATION_STATUS.SHORTLISTED, count: 14 },
  { status: APPLICATION_STATUS.INTERVIEW_SCHEDULED, count: 10 },
  { status: APPLICATION_STATUS.TECHNICAL_ROUND, count: 5 },
  { status: APPLICATION_STATUS.HR_ROUND, count: 5 },
  { status: APPLICATION_STATUS.INTERVIEW_COMPLETED, count: 7 },
  { status: APPLICATION_STATUS.ON_HOLD, count: 4 },
  { status: APPLICATION_STATUS.SELECTED, count: 6 },
  { status: APPLICATION_STATUS.OFFERED, count: 5 },
  { status: APPLICATION_STATUS.REJECTED, count: 10 },
  { status: APPLICATION_STATUS.WITHDRAWN, count: 2 }
];

function buildStageHistory(status) {
  const order = [
    APPLICATION_STATUS.APPLIED,
    APPLICATION_STATUS.REVIEWED,
    APPLICATION_STATUS.SCREENING,
    APPLICATION_STATUS.SHORTLISTED,
    APPLICATION_STATUS.INTERVIEW_SCHEDULED,
    APPLICATION_STATUS.TECHNICAL_ROUND,
    APPLICATION_STATUS.HR_ROUND,
    APPLICATION_STATUS.INTERVIEW_COMPLETED,
    APPLICATION_STATUS.SELECTED,
    APPLICATION_STATUS.OFFERED
  ];

  if (status === APPLICATION_STATUS.REJECTED) {
    const cutoff = pick([APPLICATION_STATUS.SCREENING, APPLICATION_STATUS.SHORTLISTED, APPLICATION_STATUS.INTERVIEW_COMPLETED]);
    const idx = order.indexOf(cutoff);
    const path = order.slice(0, idx + 1);
    let day = 21;
    const history = path.map((stage) => {
      const entry = { stage, note: `Progressed to ${stage.replace(/_/g, " ")}`, changedAt: daysAgo(day) };
      day -= randInt(2, 4);
      return entry;
    });
    history.push({ stage: APPLICATION_STATUS.REJECTED, note: "Not moving forward after review", changedAt: daysAgo(Math.max(day, 1)) });
    return history;
  }

  if (status === APPLICATION_STATUS.WITHDRAWN) {
    return [
      { stage: APPLICATION_STATUS.APPLIED, note: "Application submitted", changedAt: daysAgo(15) },
      { stage: APPLICATION_STATUS.WITHDRAWN, note: "Candidate withdrew application", changedAt: daysAgo(5) }
    ];
  }

  if (status === APPLICATION_STATUS.ON_HOLD) {
    return [
      { stage: APPLICATION_STATUS.APPLIED, note: "Application submitted", changedAt: daysAgo(18) },
      { stage: APPLICATION_STATUS.SHORTLISTED, note: "Shortlisted for review", changedAt: daysAgo(12) },
      { stage: APPLICATION_STATUS.ON_HOLD, note: "Put on hold pending headcount confirmation", changedAt: daysAgo(4) }
    ];
  }

  const idx = order.indexOf(status);
  const path = idx === -1 ? [APPLICATION_STATUS.APPLIED] : order.slice(0, idx + 1);
  let day = 3 + path.length * 4;
  return path.map((stage) => {
    const entry = { stage, note: `Progressed to ${stage.replace(/_/g, " ")}`, changedAt: daysAgo(day) };
    day -= randInt(2, 4);
    return entry;
  });
}

function buildInterviewRounds(status, hrDisplayName, ceoDisplayName) {
  const interviewStages = [
    APPLICATION_STATUS.INTERVIEW_SCHEDULED,
    APPLICATION_STATUS.TECHNICAL_ROUND,
    APPLICATION_STATUS.HR_ROUND,
    APPLICATION_STATUS.INTERVIEW_COMPLETED,
    APPLICATION_STATUS.SELECTED,
    APPLICATION_STATUS.OFFERED
  ];
  if (!interviewStages.includes(status)) return [];

  const rounds = [];
  const technicalIsPast = status !== APPLICATION_STATUS.INTERVIEW_SCHEDULED;
  rounds.push({
    roundType: "Technical Interview",
    interviewDate: technicalIsPast ? daysAgo(randInt(3, 12)) : daysFromNow(randInt(1, 7)),
    interviewTime: pick(["10:00 AM", "11:30 AM", "2:00 PM", "4:00 PM"]),
    durationMinutes: 45,
    timezone: "Asia/Kolkata",
    interviewers: [{ name: hrDisplayName, role: "HR Recruiter" }],
    mode: pick(["online", "offline"]),
    meetingLink: "https://meet.novatech.example/interview-room",
    location: "",
    notes: "Assess core technical skills and problem-solving approach.",
    status: technicalIsPast ? "completed" : "scheduled"
  });

  if ([APPLICATION_STATUS.HR_ROUND, APPLICATION_STATUS.INTERVIEW_COMPLETED, APPLICATION_STATUS.SELECTED, APPLICATION_STATUS.OFFERED].includes(status)) {
    const hrIsPast = status !== APPLICATION_STATUS.HR_ROUND;
    rounds.push({
      roundType: "HR Round",
      interviewDate: hrIsPast ? daysAgo(randInt(1, 6)) : daysFromNow(randInt(1, 4)),
      interviewTime: pick(["11:00 AM", "1:00 PM", "3:30 PM"]),
      durationMinutes: 30,
      timezone: "Asia/Kolkata",
      interviewers: [{ name: ceoDisplayName, role: "CEO" }],
      mode: pick(["online", "offline"]),
      meetingLink: "https://meet.novatech.example/hr-round",
      location: "",
      notes: "Culture fit, expectations, and compensation discussion.",
      status: hrIsPast ? "completed" : "scheduled"
    });
  }

  return rounds;
}

function buildHrFeedback(status) {
  const feedback = [];
  if ([APPLICATION_STATUS.SHORTLISTED, APPLICATION_STATUS.INTERVIEW_SCHEDULED, APPLICATION_STATUS.TECHNICAL_ROUND, APPLICATION_STATUS.HR_ROUND, APPLICATION_STATUS.INTERVIEW_COMPLETED, APPLICATION_STATUS.SELECTED, APPLICATION_STATUS.OFFERED].includes(
    status
  )) {
    feedback.push({
      feedback: pick([
        "Strong fundamentals and clear communication during screening.",
        "Solid project portfolio, matches role requirements well.",
        "Good technical depth; recommend moving forward.",
        "Confident presentation of past project work."
      ]),
      stage: APPLICATION_STATUS.SHORTLISTED,
      rating: randInt(3, 5),
      category: "technical",
      visibility: "internal",
      authorRole: "company",
      createdAt: daysAgo(randInt(10, 20))
    });
  }
  if ([APPLICATION_STATUS.SELECTED, APPLICATION_STATUS.OFFERED].includes(status)) {
    feedback.push({
      feedback: "CEO approval granted after HR round — candidate cleared for offer.",
      stage: APPLICATION_STATUS.SELECTED,
      rating: randInt(4, 5),
      category: "general",
      visibility: "internal",
      authorRole: "company",
      createdAt: daysAgo(randInt(2, 6))
    });
  }
  if (status === APPLICATION_STATUS.REJECTED) {
    feedback.push({
      feedback: pick([
        "Skill gap in core requirements identified during screening.",
        "Did not clear the technical bar for this role.",
        "Another candidate was a stronger fit for this opening."
      ]),
      stage: APPLICATION_STATUS.REJECTED,
      rating: randInt(1, 3),
      category: "general",
      visibility: "candidate",
      authorRole: "company",
      createdAt: daysAgo(randInt(2, 8))
    });
  }
  return feedback;
}

async function main() {
  await connectDB();

  // 1. Resolve the existing verified NovaTech company — never create one.
  const company = await CompanyProfile.findOne({
    companyName: /^novatech$/i,
    verificationStatus: COMPANY_VERIFICATION_STATUS.VERIFIED,
    isDeleted: false
  });
  if (!company) {
    throw new Error("ABORT: No existing verified 'NovaTech' company found. Refusing to create one.");
  }
  console.log(`Using existing verified company: ${company.companyName} (${company._id})`);

  const hrUser = await User.findOne({
    companyProfileRef: company._id,
    companyAccountType: COMPANY_ACCOUNT_TYPES.HR,
    isDeleted: false
  });
  const ceoUser = await User.findOne({
    companyProfileRef: company._id,
    companyAccountType: COMPANY_ACCOUNT_TYPES.CEO,
    isDeleted: false
  });
  if (!hrUser || !ceoUser) {
    throw new Error("ABORT: NovaTech must already have an HR and CEO user linked. None created by this script.");
  }
  console.log(`HR user: ${hrUser.email} | CEO user: ${ceoUser.email}`);

  // 2. Create the 20 internships (skip any whose exact role already exists for this company).
  const internships = [];
  for (let i = 0; i < DOMAINS.length; i += 1) {
    const domain = DOMAINS[i];
    let internship = await Internship.findOne({ company: company._id, role: domain.title, isDeleted: false });
    if (internship) {
      console.log(`  [skip] Internship already exists: ${domain.title}`);
    } else {
      const doc = buildInternshipDoc(domain, company._id, hrUser._id, i);
      internship = await Internship.create(doc);
      console.log(`  [created] Internship: ${domain.title}`);
    }
    internships.push({ domain, internship });
  }

  // 3. Create 100 candidates (User + InternProfile), skipping any that already exist by email.
  const sharedPasswordHash = await hashPassword(SHARED_PASSWORD);
  const candidates = [];
  let created = 0;
  let skipped = 0;
  for (let i = 1; i <= 100; i += 1) {
    const domain = DOMAINS[i % DOMAINS.length];
    const profileSeed = buildCandidateProfile(i, domain);

    let user = await User.findOne({ email: profileSeed.email });
    let profile;
    if (user) {
      profile = await InternProfile.findOne({ user: user._id });
      skipped += 1;
    } else {
      user = await User.create({
        email: profileSeed.email,
        passwordHash: sharedPasswordHash,
        role: USER_ROLES.INTERN,
        emailVerified: true,
        isActive: true,
        displayName: profileSeed.fullName
      });

      profile = await InternProfile.create({
        user: user._id,
        fullName: profileSeed.fullName,
        email: profileSeed.email,
        mobile: profileSeed.mobile,
        skills: profileSeed.skills,
        softSkills: profileSeed.softSkills,
        education: profileSeed.education,
        educationDetails: profileSeed.educationDetails,
        projects: profileSeed.projects,
        certifications: profileSeed.certifications,
        certificationEntries: profileSeed.certificationEntries,
        experience: profileSeed.experience,
        achievements: profileSeed.achievements,
        linkedinUrl: profileSeed.linkedinUrl,
        githubUrl: profileSeed.githubUrl,
        portfolioUrl: profileSeed.portfolioUrl,
        address: profileSeed.address,
        bio: profileSeed.bio,
        summary: profileSeed.summary,
        interests: profileSeed.interests,
        profileSections: profileSeed.profileSections,
        resume: {
          filePath: SEED_RESUME_PATH,
          text: profileSeed.resumeText,
          parsed: profileSeed.resumeParsed
        }
      });

      // Run the real scoring engine so ATS score / analysis / skill intelligence
      // match exactly what the production resume-score API would compute.
      const scoreResult = await computeResumeScore({
        profile: profile.toObject(),
        resumeText: profileSeed.resumeText,
        targetRoleKey: profileSeed.targetRoleKey
      });
      profile.resume.score = scoreResult.resumeScore;
      profile.resume.scoreSource = scoreResult.scoreSource;
      profile.resume.predictedCategory = scoreResult.predictedCategory;
      profile.resume.confidence = scoreResult.confidence;
      profile.resume.analysis = scoreResult.analysis;
      await profile.save();

      created += 1;
    }

    candidates.push({ user, profile, domain });
  }
  console.log(`Candidates: ${created} created, ${skipped} already existed (reused).`);

  // 4. Build the hiring-pipeline assignment list (100 statuses -> shuffled).
  const statusAssignments = [];
  for (const plan of PIPELINE_PLAN) {
    for (let i = 0; i < plan.count; i += 1) statusAssignments.push(plan.status);
  }
  statusAssignments.sort(() => Math.random() - 0.5);

  let appsCreated = 0;
  let appsSkipped = 0;
  for (let i = 0; i < candidates.length; i += 1) {
    const { profile, domain } = candidates[i];
    const status = statusAssignments[i] || APPLICATION_STATUS.APPLIED;

    // 70% apply to the internship matching their built skill domain; 30% apply to a random other NovaTech internship.
    const sameDomainMatch = internships.find((entry) => entry.domain.key === domain.key);
    const target = Math.random() < 0.7 && sameDomainMatch ? sameDomainMatch : pick(internships);
    const { internship } = target;

    const existingApp = await Application.findOne({ internId: profile._id, internshipId: internship._id });
    if (existingApp) {
      appsSkipped += 1;
      continue;
    }

    const relevance = computeApplicationRelevance(profile.toObject(), internship.toObject());
    const stageHistory = buildStageHistory(status);
    const interviewRounds = buildInterviewRounds(status, hrUser.displayName || "NovaTech HR", ceoUser.displayName || "NovaTech CEO");
    const hrFeedback = buildHrFeedback(status);

    await Application.create({
      internId: profile._id,
      internshipId: internship._id,
      companyId: company._id,
      intern: profile._id,
      internship: internship._id,
      company: company._id,
      assignedRecruiter: hrUser._id,
      assignmentUpdatedAt: daysAgo(randInt(5, 20)),
      assignedBy: ceoUser._id,
      status,
      appliedAt: stageHistory[0]?.changedAt || daysAgo(20),
      attachedResumePath: profile.resume?.filePath || SEED_RESUME_PATH,
      availabilityStatus: "yes",
      joiningDate: [APPLICATION_STATUS.SELECTED, APPLICATION_STATUS.OFFERED].includes(status) ? daysFromNow(randInt(10, 30)) : null,
      relevanceScore: relevance.relevanceScore,
      matchScore: relevance.relevanceScore,
      relevanceBreakdown: relevance,
      stageHistory,
      hrFeedback,
      interviewRounds
    });
    appsCreated += 1;
  }
  console.log(`Applications: ${appsCreated} created, ${appsSkipped} already existed (skipped).`);

  return {
    companyId: company._id.toString(),
    internshipsTotal: internships.length,
    candidatesCreated: created,
    candidatesSkipped: skipped,
    applicationsCreated: appsCreated,
    applicationsSkipped: appsSkipped
  };
}

main()
  .then((summary) => {
    console.log("\n=== SEED SUMMARY ===");
    console.log(JSON.stringify(summary, null, 2));
    return mongoose.disconnect();
  })
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("SEED FAILED:", error);
    return mongoose.disconnect().finally(() => process.exit(1));
  });
