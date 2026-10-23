/**
 * Adds dummy demo data on top of whatever already exists in the database:
 * 5 new companies, 20 new candidates (intern profiles), and 4 postings per
 * company (2 "Internship" + 2 "Full-Time Job"), plus a handful of sample
 * applications so the recruiter/candidate dashboards aren't empty.
 *
 * Idempotent: re-running skips any user/company whose email already exists,
 * so it never touches or duplicates data from a previous run or from the
 * app's own AUTO_SEED. It never deletes anything.
 *
 * Usage: node scripts/seed-dummy-demo-data.js
 */
require("dotenv").config();
const connectDB = require("../src/shared/database/db");

const User = require("../src/models/User");
const InternProfile = require("../src/models/InternProfile");
const CompanyProfile = require("../src/models/CompanyProfile");
const Internship = require("../src/models/Internship");
const Application = require("../src/models/Application");

const { hashPassword } = require("../src/shared/utils/password");
const { USER_ROLES, COMPANY_VERIFICATION_STATUS, APPLICATION_STATUS } = require("../src/shared/constants/enums");
const { calculateResumeScore } = require("../src/services/ai.service");

const SEED_RESUME_PATH = "uploads/resumes/seed-resume.pdf";
const COMPANY_PASSWORD = "Company@123";
const CANDIDATE_PASSWORD = "Student@123";

// ---------------------------------------------------------------------------
// Companies — 5 across different industries, each posting 2 internships and
// 2 full-time jobs.
// ---------------------------------------------------------------------------
const COMPANIES = [
  {
    companyName: "Zenith Fintech",
    companyEmail: "hr@zenithfintech.example",
    gst: "27ZENIT0001F1Z1",
    contactName: "Ananya Kulkarni",
    phone: "9812345601",
    website: "https://zenithfintech.example",
    address: "Pune, Maharashtra",
    description: "Digital lending and payments platform for small businesses.",
    industry: "Fintech",
    verificationStatus: COMPANY_VERIFICATION_STATUS.VERIFIED,
    postings: [
      { role: "Backend Development Intern", internshipType: "Internship", skillsRequired: ["node.js", "express.js", "mongodb", "rest api"], stipend: "18000", duration: "6 months", mode: "hybrid", location: "Pune" },
      { role: "Data Analyst Intern", internshipType: "Internship", skillsRequired: ["python", "sql", "excel", "power bi"], stipend: "15000", duration: "3 months", mode: "remote", location: "Remote" },
      { role: "Backend Engineer", internshipType: "Full-Time Job", skillsRequired: ["node.js", "postgresql", "docker", "aws"], stipend: "800000", duration: "Full-time", mode: "on-site", location: "Pune" },
      { role: "Product Analyst", internshipType: "Full-Time Job", skillsRequired: ["sql", "python", "tableau", "a/b testing"], stipend: "700000", duration: "Full-time", mode: "hybrid", location: "Pune" }
    ]
  },
  {
    companyName: "PixelForge Studios",
    companyEmail: "hr@pixelforge.example",
    gst: "29PIXEL0002G1Z2",
    contactName: "Rahul Iyer",
    phone: "9823456712",
    website: "https://pixelforge.example",
    address: "Bengaluru, Karnataka",
    description: "Indie game studio building mobile and PC titles.",
    industry: "Gaming",
    verificationStatus: COMPANY_VERIFICATION_STATUS.VERIFIED,
    postings: [
      { role: "Game Development Intern", internshipType: "Internship", skillsRequired: ["unity", "c#", "game design"], stipend: "16000", duration: "6 months", mode: "on-site", location: "Bengaluru" },
      { role: "UI/UX Design Intern", internshipType: "Internship", skillsRequired: ["figma", "ui design", "prototyping"], stipend: "14000", duration: "4 months", mode: "remote", location: "Remote" },
      { role: "Game Developer", internshipType: "Full-Time Job", skillsRequired: ["unity", "c#", "multiplayer networking"], stipend: "900000", duration: "Full-time", mode: "on-site", location: "Bengaluru" },
      { role: "Technical Artist", internshipType: "Full-Time Job", skillsRequired: ["blender", "shaders", "unity"], stipend: "750000", duration: "Full-time", mode: "hybrid", location: "Bengaluru" }
    ]
  },
  {
    companyName: "MediCore Health",
    companyEmail: "hr@medicorehealth.example",
    gst: "07MEDIC0003H1Z3",
    contactName: "Dr. Sneha Kapoor",
    phone: "9834567823",
    website: "https://medicorehealth.example",
    address: "New Delhi",
    description: "Healthtech platform connecting patients with verified clinics.",
    industry: "Healthtech",
    verificationStatus: COMPANY_VERIFICATION_STATUS.VERIFIED,
    postings: [
      { role: "Frontend Development Intern", internshipType: "Internship", skillsRequired: ["react", "javascript", "css"], stipend: "17000", duration: "5 months", mode: "remote", location: "Remote" },
      { role: "Machine Learning Intern", internshipType: "Internship", skillsRequired: ["python", "machine learning", "pandas"], stipend: "20000", duration: "6 months", mode: "hybrid", location: "New Delhi" },
      { role: "Full Stack Developer", internshipType: "Full-Time Job", skillsRequired: ["react", "node.js", "mongodb", "typescript"], stipend: "850000", duration: "Full-time", mode: "hybrid", location: "New Delhi" },
      { role: "ML Engineer", internshipType: "Full-Time Job", skillsRequired: ["python", "tensorflow", "machine learning"], stipend: "1100000", duration: "Full-time", mode: "on-site", location: "New Delhi" }
    ]
  },
  {
    companyName: "AgroLink Systems",
    companyEmail: "hr@agrolink.example",
    gst: "24AGROL0004K1Z4",
    contactName: "Vikram Solanki",
    phone: "9845678934",
    website: "https://agrolink.example",
    address: "Ahmedabad, Gujarat",
    description: "IoT and supply-chain platform for agricultural cooperatives.",
    industry: "Agritech",
    verificationStatus: COMPANY_VERIFICATION_STATUS.PENDING,
    postings: [
      { role: "IoT Development Intern", internshipType: "Internship", skillsRequired: ["c++", "embedded systems", "arduino"], stipend: "15000", duration: "4 months", mode: "on-site", location: "Ahmedabad" },
      { role: "Business Analyst Intern", internshipType: "Internship", skillsRequired: ["excel", "sql", "market research"], stipend: "12000", duration: "3 months", mode: "remote", location: "Remote" },
      { role: "Embedded Systems Engineer", internshipType: "Full-Time Job", skillsRequired: ["c++", "embedded systems", "rtos"], stipend: "780000", duration: "Full-time", mode: "on-site", location: "Ahmedabad" },
      { role: "Supply Chain Analyst", internshipType: "Full-Time Job", skillsRequired: ["sql", "excel", "logistics"], stipend: "650000", duration: "Full-time", mode: "hybrid", location: "Ahmedabad" }
    ]
  },
  {
    companyName: "ShieldNet Security",
    companyEmail: "hr@shieldnet.example",
    gst: "36SHIEL0005N1Z5",
    contactName: "Kabir Malhotra",
    phone: "9856789045",
    website: "https://shieldnet.example",
    address: "Hyderabad, Telangana",
    description: "Cybersecurity firm offering penetration testing and SOC-as-a-service.",
    industry: "Cybersecurity",
    verificationStatus: COMPANY_VERIFICATION_STATUS.VERIFIED,
    postings: [
      { role: "Cybersecurity Intern", internshipType: "Internship", skillsRequired: ["networking", "linux", "security fundamentals"], stipend: "18000", duration: "6 months", mode: "on-site", location: "Hyderabad" },
      { role: "SOC Analyst Intern", internshipType: "Internship", skillsRequired: ["siem", "networking", "linux"], stipend: "16000", duration: "4 months", mode: "hybrid", location: "Hyderabad" },
      { role: "Penetration Tester", internshipType: "Full-Time Job", skillsRequired: ["penetration testing", "networking", "linux", "python"], stipend: "950000", duration: "Full-time", mode: "on-site", location: "Hyderabad" },
      { role: "Security Engineer", internshipType: "Full-Time Job", skillsRequired: ["siem", "cloud security", "python"], stipend: "1000000", duration: "Full-time", mode: "hybrid", location: "Hyderabad" }
    ]
  }
];

// ---------------------------------------------------------------------------
// Candidates — 20 across varied branches and skill sets.
// ---------------------------------------------------------------------------
const CANDIDATES = [
  { fullName: "Aditya Deshmukh", email: "aditya.deshmukh@example.com", mobile: "9000000001", skills: ["node.js", "express.js", "mongodb", "javascript"], education: ["B.Tech CSE - Pune Institute of Technology"], projects: ["Built a REST API for an inventory system"], interests: ["backend development"] },
  { fullName: "Priya Nair", email: "priya.nair@example.com", mobile: "9000000002", skills: ["python", "sql", "power bi", "excel"], education: ["B.Sc Statistics - Delhi University"], projects: ["Sales forecasting dashboard"], interests: ["data analytics"] },
  { fullName: "Karan Mehta", email: "karan.mehta@example.com", mobile: "9000000003", skills: ["unity", "c#", "game design"], education: ["B.Tech Game Development - MIT-WPU"], projects: ["2D platformer shipped on itch.io"], interests: ["game development"] },
  { fullName: "Sanjana Rao", email: "sanjana.rao@example.com", mobile: "9000000004", skills: ["figma", "ui design", "prototyping"], education: ["B.Des - NID Ahmedabad"], projects: ["Redesigned a food-delivery app flow"], interests: ["ui/ux design"] },
  { fullName: "Rohan Kulkarni", email: "rohan.kulkarni@example.com", mobile: "9000000005", skills: ["react", "javascript", "css", "typescript"], education: ["B.Tech IT - VIT Pune"], projects: ["Portfolio site with React and Tailwind"], interests: ["frontend development"] },
  { fullName: "Meera Iyer", email: "meera.iyer@example.com", mobile: "9000000006", skills: ["python", "machine learning", "pandas", "tensorflow"], education: ["B.Tech CSE - IIIT Hyderabad"], projects: ["Image classifier for plant disease detection"], interests: ["machine learning"] },
  { fullName: "Arjun Patel", email: "arjun.patel@example.com", mobile: "9000000007", skills: ["c++", "embedded systems", "arduino"], education: ["B.Tech Electronics - Nirma University"], projects: ["Smart irrigation controller"], interests: ["iot"] },
  { fullName: "Neha Joshi", email: "neha.joshi@example.com", mobile: "9000000008", skills: ["excel", "sql", "market research"], education: ["BBA - Symbiosis Pune"], projects: ["Market entry analysis for a D2C brand"], interests: ["business analysis"] },
  { fullName: "Vivaan Choudhary", email: "vivaan.choudhary@example.com", mobile: "9000000009", skills: ["networking", "linux", "security fundamentals"], education: ["B.Tech CSE - JNTU Hyderabad"], projects: ["Home lab SOC monitoring setup"], interests: ["cybersecurity"] },
  { fullName: "Ishita Bansal", email: "ishita.bansal@example.com", mobile: "9000000010", skills: ["siem", "networking", "python"], education: ["B.Tech CSE - Osmania University"], projects: ["Log-analysis tool for suspicious login attempts"], interests: ["cybersecurity", "python"] },
  { fullName: "Aanya Shah", email: "aanya.shah@example.com", mobile: "9000000011", skills: ["java", "spring boot", "mysql", "git"], education: ["B.Tech Information Technology - Vidyalankar Institute of Technology"], projects: ["Campus placement management portal"], interests: ["backend development", "fintech"] },
  { fullName: "Dev Malhotra", email: "dev.malhotra@example.com", mobile: "9000000012", skills: ["react", "next.js", "typescript", "tailwind css"], education: ["B.Tech Computer Engineering - Vidyalankar Institute of Technology"], projects: ["Responsive student learning dashboard"], interests: ["frontend development", "web accessibility"] },
  { fullName: "Kavya Menon", email: "kavya.menon@example.com", mobile: "9000000013", skills: ["python", "sql", "tableau", "statistics"], education: ["B.Tech Information Technology - Vidyalankar Institute of Technology"], projects: ["Placement trend analytics dashboard"], interests: ["data analytics", "business intelligence"] },
  { fullName: "Reyansh Gupta", email: "reyansh.gupta@example.com", mobile: "9000000014", skills: ["flutter", "dart", "firebase", "rest api"], education: ["B.Tech Computer Engineering - Vidyalankar Institute of Technology"], projects: ["Cross-platform campus events application"], interests: ["mobile development"] },
  { fullName: "Myra Fernandes", email: "myra.fernandes@example.com", mobile: "9000000015", skills: ["figma", "user research", "wireframing", "prototyping"], education: ["B.Des Interaction Design - Mumbai University"], projects: ["Accessible redesign of a public-service portal"], interests: ["product design", "user experience"] },
  { fullName: "Atharva Sawant", email: "atharva.sawant@example.com", mobile: "9000000016", skills: ["aws", "docker", "linux", "github actions"], education: ["B.Tech Information Technology - Vidyalankar Institute of Technology"], projects: ["Containerized deployment pipeline for a web service"], interests: ["cloud engineering", "devops"] },
  { fullName: "Diya Kapoor", email: "diya.kapoor@example.com", mobile: "9000000017", skills: ["python", "pandas", "scikit-learn", "data visualization"], education: ["B.Tech Computer Engineering - Vidyalankar Institute of Technology"], projects: ["Student performance prediction and reporting tool"], interests: ["machine learning", "data science"] },
  { fullName: "Krish Verma", email: "krish.verma@example.com", mobile: "9000000018", skills: ["javascript", "node.js", "express.js", "postgresql"], education: ["B.Tech Computer Science - Mumbai University"], projects: ["Real-time team collaboration API"], interests: ["full stack development"] },
  { fullName: "Tara Singh", email: "tara.singh@example.com", mobile: "9000000019", skills: ["linux", "wireshark", "owasp", "python"], education: ["B.Tech Information Technology - Vidyalankar Institute of Technology"], projects: ["Web vulnerability assessment toolkit"], interests: ["application security", "cybersecurity"] },
  { fullName: "Neil D'Souza", email: "neil.dsouza@example.com", mobile: "9000000020", skills: ["c++", "arduino", "iot", "mqtt"], education: ["B.Tech Electronics and Telecommunication - Vidyalankar Institute of Technology"], projects: ["IoT energy monitoring system"], interests: ["embedded systems", "internet of things"] }
];

const APPLICATION_STATUSES_CYCLE = [
  APPLICATION_STATUS.APPLIED,
  APPLICATION_STATUS.SHORTLISTED,
  APPLICATION_STATUS.INTERVIEW_SCHEDULED,
  APPLICATION_STATUS.SELECTED,
  APPLICATION_STATUS.REJECTED
];

async function getOrCreateUser({ email, role, password, companyAccountType, displayName }) {
  const existing = await User.findOne({ email });
  if (existing) return existing;
  return User.create({
    email,
    role,
    passwordHash: await hashPassword(password),
    companyAccountType: companyAccountType || null,
    displayName: displayName || ""
  });
}

async function main() {
  await connectDB();

  const createdCompanies = [];
  const createdCandidates = [];
  const createdPostings = [];

  for (const companySeed of COMPANIES) {
    const user = await getOrCreateUser({
      email: companySeed.companyEmail,
      role: USER_ROLES.COMPANY,
      password: COMPANY_PASSWORD,
      companyAccountType: "owner",
      displayName: `${companySeed.companyName} HR`
    });

    let company = await CompanyProfile.findOne({ companyEmail: companySeed.companyEmail });
    if (!company) {
      company = await CompanyProfile.create({
        user: user._id,
        companyName: companySeed.companyName,
        companyEmail: companySeed.companyEmail,
        gst: companySeed.gst,
        contactName: companySeed.contactName,
        phone: companySeed.phone,
        website: companySeed.website,
        address: companySeed.address,
        description: companySeed.description,
        industry: companySeed.industry,
        verificationStatus: companySeed.verificationStatus
      });
      if (!user.companyProfileRef) {
        user.companyProfileRef = company._id;
        await user.save();
      }
      console.log(`Created company: ${companySeed.companyName}`);
    } else {
      console.log(`Company already exists, skipping: ${companySeed.companyName}`);
    }
    createdCompanies.push(company);

    for (const postingSeed of companySeed.postings) {
      const existingPosting = await Internship.findOne({ company: company._id, role: postingSeed.role });
      if (existingPosting) {
        createdPostings.push(existingPosting);
        continue;
      }
      const posting = await Internship.create({
        company: company._id,
        role: postingSeed.role,
        skillsRequired: postingSeed.skillsRequired,
        prioritySkills: postingSeed.skillsRequired.slice(0, 2),
        stipend: postingSeed.stipend,
        duration: postingSeed.duration,
        internshipType: postingSeed.internshipType,
        mode: postingSeed.mode,
        location: postingSeed.location,
        description: `${postingSeed.internshipType} opportunity at ${companySeed.companyName}: ${postingSeed.role}.`,
        openings: 2
      });
      createdPostings.push(posting);
      console.log(`  + posting: ${postingSeed.role} (${postingSeed.internshipType})`);
    }
  }

  for (const candidateSeed of CANDIDATES) {
    const user = await getOrCreateUser({
      email: candidateSeed.email,
      role: USER_ROLES.INTERN,
      password: CANDIDATE_PASSWORD
    });

    let profile = await InternProfile.findOne({ email: candidateSeed.email });
    if (!profile) {
      profile = await InternProfile.create({
        user: user._id,
        fullName: candidateSeed.fullName,
        email: candidateSeed.email,
        mobile: candidateSeed.mobile,
        skills: candidateSeed.skills,
        education: candidateSeed.education,
        projects: candidateSeed.projects,
        interests: candidateSeed.interests,
        resume: {
          filePath: SEED_RESUME_PATH,
          text: `Demo resume for ${candidateSeed.fullName}, skills: ${candidateSeed.skills.join(", ")}.`,
          score: 0
        }
      });
      profile.resume.score = calculateResumeScore(profile);
      await profile.save();
      console.log(`Created candidate: ${candidateSeed.fullName}`);
    } else {
      console.log(`Candidate already exists, skipping: ${candidateSeed.fullName}`);
    }
    createdCandidates.push(profile);
  }

  // Sample applications: each candidate applies to the posting from their own
  // domain (same index pairing used above, one posting per candidate) with a
  // status cycled across the full pipeline so every stage has an example.
  let applicationsCreated = 0;
  for (let i = 0; i < createdCandidates.length && i < createdPostings.length; i += 1) {
    const candidate = createdCandidates[i];
    const posting = createdPostings[i];
    const status = APPLICATION_STATUSES_CYCLE[i % APPLICATION_STATUSES_CYCLE.length];

    const existingApplication = await Application.findOne({ intern: candidate._id, internship: posting._id });
    if (existingApplication) continue;

    await Application.create({
      internId: candidate._id,
      internshipId: posting._id,
      companyId: posting.company,
      intern: candidate._id,
      internship: posting._id,
      company: posting.company,
      status,
      appliedAt: new Date(),
      attachedResumePath: candidate.resume?.filePath || SEED_RESUME_PATH,
      availabilityStatus: "yes",
      relevanceScore: 70 + ((i * 7) % 30),
      matchScore: 70 + ((i * 7) % 30),
      stageHistory: [
        { stage: APPLICATION_STATUS.APPLIED, note: "Dummy seeded application" },
        { stage: status, note: "Dummy seeded status" }
      ]
    });
    applicationsCreated += 1;
  }

  console.log("---");
  console.log(`Companies: ${createdCompanies.length}, Postings: ${createdPostings.length}, Candidates: ${createdCandidates.length}, New applications: ${applicationsCreated}`);
  console.log(`Company login password: ${COMPANY_PASSWORD}`);
  console.log(`Candidate login password: ${CANDIDATE_PASSWORD}`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Dummy data seed failed:", error);
  process.exit(1);
});
