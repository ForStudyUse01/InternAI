/**
 * Smoke test for Resume Intelligence V2 engine.
 * Run: node scripts/test-resume-intelligence-v2.js
 */
const { computeResumeIntelligenceV2 } = require("../src/services/resume-intelligence-v2.service");
const { structuredResumeParse } = require("../src/services/resume-structured-parser.service");

const SAMPLE_RESUME = `
Jane Doe
jane.doe@email.com | +91 9876543210 | linkedin.com/in/janedoe | github.com/janedoe

PROFESSIONAL SUMMARY
Computer Science student with strong full-stack development experience building scalable web applications.

TECHNICAL SKILLS
JavaScript, TypeScript, React, Next.js, Node.js, Express, MongoDB, SQL, Git, Docker, Python, Machine Learning

PROJECTS
E-Commerce Platform
Built a full-stack store with React, Node.js, MongoDB. Implemented authentication and payment flow.
Tech Stack: React, Node.js, MongoDB, Stripe
GitHub: github.com/janedoe/ecommerce

EDUCATION
B.Tech Computer Science, ABC University, 2022 - 2026, CGPA: 8.5

EXPERIENCE
Software Intern at TechCorp (2025)
Developed REST APIs and improved response time by 30%.

CERTIFICATIONS
AWS Cloud Practitioner - Amazon Web Services - 2025
Google Data Analytics - Coursera - 2024

ACHIEVEMENTS
Winner - Smart India Hackathon 2025
`;

function run() {
  const parsed = structuredResumeParse(SAMPLE_RESUME);
  const profile = {
    skills: parsed.skills,
    resume: { text: SAMPLE_RESUME, parsed }
  };

  const result = computeResumeIntelligenceV2({
    profile,
    resumeText: SAMPLE_RESUME,
    textAnalysis: null,
    targetRoleKey: "full_stack_developer"
  });

  console.log("=== Resume Intelligence V2 Smoke Test ===");
  console.log("Overall:", result.overallScore);
  console.log("Composite:", JSON.stringify(result.compositeScores, null, 2));
  console.log("Dimensions:", result.dimensionBreakdown.map((d) => `${d.label}: ${d.score}`).join(" | "));
  console.log("Skill gaps:", (result.skillIntelligence?.skillGaps || []).join(", "));
  console.log("Confidence:", result.confidence);

  const ok =
    result.overallScore >= 50 &&
    result.overallScore <= 98 &&
    (result.skillIntelligence?.skillGaps || []).length >= 0 &&
    result.dimensionBreakdown.length === 7;

  if (!ok) {
    console.error("FAIL: unexpected scoring output");
    process.exit(1);
  }
  console.log("PASS");
}

run();
