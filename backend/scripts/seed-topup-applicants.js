/**
 * Tops up every existing, active internship to MIN_APPLICANTS applications so
 * the company dashboard's Candidate Compare (needs >= 2 selected) has real
 * candidates to pick from. Most dev databases have internships seeded 1
 * applicant each (scripts/seed-dummy-demo-data.js pairs one candidate per
 * posting) or none at all (NovaTech's two seedData.js roles) — not enough to
 * compare.
 *
 * Reuses whichever InternProfile documents already exist (across all
 * companies — demo candidates apply to multiple companies here, same as the
 * existing seed scripts already do), ranked by real relevance score against
 * each internship. Creates a few additional generic candidates only if an
 * internship's pool of not-yet-applied profiles runs short.
 *
 * Idempotent: an internship already at or above MIN_APPLICANTS is skipped
 * entirely; a candidate who already applied to a given internship is never
 * re-applied. Never deletes or modifies an existing document.
 *
 * Usage: node scripts/seed-topup-applicants.js [minApplicants]
 */
require("dotenv").config();
const connectDB = require("../src/shared/database/db");

const User = require("../src/models/User");
const InternProfile = require("../src/models/InternProfile");
const Internship = require("../src/models/Internship");
const Application = require("../src/models/Application");

const { hashPassword } = require("../src/shared/utils/password");
const { USER_ROLES, APPLICATION_STATUS } = require("../src/shared/constants/enums");
const { calculateResumeScore } = require("../src/services/ai.service");
const { computeApplicationRelevance } = require("../src/modules/applications/services/application-relevance.service");

const MIN_APPLICANTS = Number(process.argv[2]) || 4;
const SEED_RESUME_PATH = "uploads/resumes/seed-resume.pdf";
const CANDIDATE_PASSWORD = "Student@123";

const STATUS_CYCLE = [
  APPLICATION_STATUS.APPLIED,
  APPLICATION_STATUS.REVIEWED,
  APPLICATION_STATUS.SHORTLISTED,
  APPLICATION_STATUS.INTERVIEW_SCHEDULED
];

// Extra candidates, used only when an internship's unused-profile pool runs
// short (small/duplicate-skill companies). Broad spread of common domains.
const FALLBACK_CANDIDATES = [
  { fullName: "Ritika Suri", skills: ["python", "machine learning", "pandas", "numpy"], education: ["B.Tech CSE - Thapar Institute"], projects: ["Churn prediction model for a subscription app"], interests: ["ai", "machine learning"] },
  { fullName: "Arnav Deshpande", skills: ["javascript", "react", "node.js", "mongodb", "express.js"], education: ["B.Tech IT - COEP Pune"], projects: ["Full-stack event booking platform"], interests: ["full stack development"] },
  { fullName: "Sanya Chawla", skills: ["figma", "ui design", "wireframing", "prototyping"], education: ["B.Des - NID Ahmedabad"], projects: ["Mobile banking app redesign"], interests: ["product design"] },
  { fullName: "Yuvaan Pillai", skills: ["aws", "docker", "kubernetes", "linux", "terraform"], education: ["B.Tech ECE - NIT Trichy"], projects: ["Auto-scaling CI/CD pipeline"], interests: ["cloud engineering", "devops"] },
  { fullName: "Mehak Grover", skills: ["java", "spring boot", "mysql", "rest api"], education: ["B.Tech CSE - PEC Chandigarh"], projects: ["Hostel allocation management system"], interests: ["backend development"] },
  { fullName: "Advait Joshi", skills: ["c++", "embedded systems", "arduino", "iot"], education: ["B.Tech EEE - VNIT Nagpur"], projects: ["Smart irrigation controller"], interests: ["embedded systems", "iot"] },
  { fullName: "Naina Chopra", skills: ["python", "sql", "excel", "power bi", "statistics"], education: ["BCA - Christ University"], projects: ["Retail sales forecasting dashboard"], interests: ["data analytics"] },
  { fullName: "Vihaan Rathod", skills: ["linux", "networking", "siem", "owasp"], education: ["B.Tech IT - IIIT Nagpur"], projects: ["Network intrusion detection lab"], interests: ["cybersecurity"] },
  { fullName: "Oorja Mahajan", skills: ["flutter", "dart", "firebase", "rest api"], education: ["B.Tech CSE - MIT Manipal"], projects: ["Campus carpool mobile app"], interests: ["mobile development"] },
  { fullName: "Kabir Sethi", skills: ["typescript", "react", "next.js", "tailwind css", "git"], education: ["B.Tech CSE - DTU Delhi"], projects: ["Open-source component library"], interests: ["frontend development"] }
];

function slugEmail(fullName, suffix) {
  const slug = fullName.toLowerCase().replace(/[^a-z\s]/g, "").trim().replace(/\s+/g, ".");
  return `${slug}${suffix}@example.com`;
}

async function getOrCreateUser(email, role, password) {
  const existing = await User.findOne({ email });
  if (existing) return existing;
  return User.create({ email, role, passwordHash: await hashPassword(password) });
}

async function materializeCandidate(seed, suffix) {
  const email = slugEmail(seed.fullName, suffix);
  const existingProfile = await InternProfile.findOne({ email });
  if (existingProfile) return existingProfile;

  const user = await getOrCreateUser(email, USER_ROLES.INTERN, CANDIDATE_PASSWORD);
  const profile = await InternProfile.create({
    user: user._id,
    fullName: seed.fullName,
    email,
    mobile: `90000${String(Math.floor(Math.random() * 90000) + 10000)}`,
    skills: seed.skills,
    education: seed.education,
    projects: seed.projects,
    interests: seed.interests,
    resume: {
      filePath: SEED_RESUME_PATH,
      text: `Demo resume for ${seed.fullName}, skills: ${seed.skills.join(", ")}.`,
      score: 0
    }
  });
  profile.resume.score = calculateResumeScore(profile);
  await profile.save();
  return profile;
}

async function main() {
  await connectDB();

  const internships = await Internship.find({ isDeleted: false, isActive: { $ne: false } });
  const pool = await InternProfile.find({});
  console.log(`Internships: ${internships.length}, existing candidate pool: ${pool.length}`);

  let internshipsToppedUp = 0;
  let applicationsCreated = 0;
  let fallbackIndex = 0;
  let fallbackSuffix = 1;

  for (const internship of internships) {
    const existing = await Application.find({ internshipId: internship._id }, { intern: 1 });
    const appliedIds = new Set(existing.map((a) => String(a.intern)));
    const needed = MIN_APPLICANTS - appliedIds.size;
    if (needed <= 0) continue;

    const internshipObj = internship.toObject();
    const candidates = pool
      .filter((p) => !appliedIds.has(String(p._id)))
      .map((profile) => ({ profile, relevance: computeApplicationRelevance(profile.toObject(), internshipObj).relevanceScore }))
      .sort((a, b) => b.relevance - a.relevance);

    const chosen = candidates.slice(0, needed);

    // Pool ran short for this posting — generate extra candidates from the fallback list.
    while (chosen.length < needed && fallbackIndex < FALLBACK_CANDIDATES.length * 3) {
      const seed = FALLBACK_CANDIDATES[fallbackIndex % FALLBACK_CANDIDATES.length];
      const suffix = fallbackIndex >= FALLBACK_CANDIDATES.length ? String(fallbackSuffix++) : "";
      fallbackIndex += 1;
      // eslint-disable-next-line no-await-in-loop
      const profile = await materializeCandidate(seed, suffix);
      if (appliedIds.has(String(profile._id)) || chosen.some((c) => String(c.profile._id) === String(profile._id))) continue;
      pool.push(profile);
      const relevance = computeApplicationRelevance(profile.toObject(), internshipObj).relevanceScore;
      chosen.push({ profile, relevance });
    }

    let created = 0;
    for (let i = 0; i < chosen.length; i += 1) {
      const { profile, relevance } = chosen[i];
      const status = STATUS_CYCLE[(appliedIds.size + i) % STATUS_CYCLE.length];
      // eslint-disable-next-line no-await-in-loop
      await Application.create({
        internId: profile._id,
        internshipId: internship._id,
        companyId: internship.company,
        intern: profile._id,
        internship: internship._id,
        company: internship.company,
        assignedRecruiter: internship.assignedRecruiter || null,
        status,
        appliedAt: new Date(),
        attachedResumePath: profile.resume?.filePath || SEED_RESUME_PATH,
        availabilityStatus: "yes",
        relevanceScore: relevance,
        matchScore: relevance,
        stageHistory: [
          { stage: APPLICATION_STATUS.APPLIED, note: "Top-up seeded application" },
          { stage: status, note: "Top-up seeded status" }
        ]
      });
      created += 1;
      applicationsCreated += 1;
    }

    if (created > 0) {
      internshipsToppedUp += 1;
      console.log(`  + ${internship.role}: ${created} new application(s) (now ${appliedIds.size + created} total)`);
    }
  }

  console.log("---");
  console.log(`Internships topped up: ${internshipsToppedUp}, new applications: ${applicationsCreated}`);
  console.log(`New candidate login password (if any created): ${CANDIDATE_PASSWORD}`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Top-up seed failed:", error);
  process.exit(1);
});
