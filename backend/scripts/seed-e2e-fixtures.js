// One-off, idempotent script that creates two dedicated, clearly-labeled
// accounts for Playwright E2E tests to log into. Additive only — never
// touches any existing user/profile in this shared dev database.
require("dotenv").config();
const mongoose = require("mongoose");

const E2E_INTERN_EMAIL = "e2e.intern@internai-test.local";
const E2E_INTERN_PASSWORD = "E2eIntern@123";
const E2E_COMPANY_OWNER_EMAIL = "e2e.company.owner@internai-test.local";
const E2E_COMPANY_OWNER_PASSWORD = "E2eCompanyOwner@123";
const E2E_COMPANY_HR_EMAIL = "e2e.company.hr@internai-test.local";
const E2E_COMPANY_HR_PASSWORD = "E2eCompanyHr@123";
const E2E_COMPANY_CEO_EMAIL = "e2e.company.ceo@internai-test.local";
const E2E_COMPANY_CEO_PASSWORD = "E2eCompanyCeo@123";
const E2E_INTERNSHIP_ROLE = "E2E Fixture Frontend Intern";

// A ceo@novatech.example account exists in seedData.js, but every account
// there except admin@internai.com only survives until someone runs
// `npm run seed` (destructive: seedDatabase({reset:true}) wipes Users/
// Profiles/Internships/Applications first) -- not safe for E2E to depend
// on. Keep CEO/admin-sub-role fixtures here, additive, same as owner/HR.
const E2E_ADMIN_SUB_ROLES = [
  { email: "e2e.admin.verification@internai-test.local", password: "E2eAdminVerification@123", adminRole: "verification_admin" },
  { email: "e2e.admin.moderation@internai-test.local", password: "E2eAdminModeration@123", adminRole: "moderation_admin" },
  { email: "e2e.admin.support@internai-test.local", password: "E2eAdminSupport@123", adminRole: "support_admin" }
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const User = require("../src/modules/authentication/models/User");
  const InternProfile = require("../src/modules/students/models/InternProfile");
  const CompanyProfile = require("../src/modules/companies/models/CompanyProfile");
  const { hashPassword } = require("../src/shared/utils/password");

  let internUser = await User.findOne({ email: E2E_INTERN_EMAIL });
  if (!internUser) {
    internUser = await User.create({
      email: E2E_INTERN_EMAIL,
      passwordHash: await hashPassword(E2E_INTERN_PASSWORD),
      role: "intern",
      emailVerified: true
    });
    await InternProfile.create({
      user: internUser._id,
      fullName: "E2E Test Intern",
      email: E2E_INTERN_EMAIL,
      mobile: "9999900001",
      skills: ["React", "Node.js"],
      education: [],
      projects: [],
      certifications: [],
      interests: [],
      completedCourses: []
    });
    console.log("Created E2E intern fixture:", E2E_INTERN_EMAIL);
  } else {
    // Resume-upload E2E tests merge parsed resume data (including the
    // candidate's name) straight onto this shared profile; a run that dies
    // between upload and its finally-restore leaves the drift permanent,
    // and later name-dependent specs (admin user-details modal, pipeline
    // card labels) then fail. Re-seeding re-pins the identity fields.
    const drifted = await InternProfile.findOne({ user: internUser._id });
    const hasDriftedEducation = Boolean(drifted && (drifted.educationDetails || []).length > 0);
    if (drifted && (drifted.fullName !== "E2E Test Intern" || drifted.mobile !== "9999900001" || hasDriftedEducation)) {
      drifted.fullName = "E2E Test Intern";
      drifted.mobile = "9999900001";
      // Canonical fixture has no academic entries -- the admin user-details
      // modal E2E asserts its "No academic details on file." empty state.
      drifted.educationDetails = [];
      await drifted.save();
      console.log("Reset E2E intern fixture identity fields (fullName/mobile/educationDetails)");
    } else {
      console.log("E2E intern fixture already exists:", E2E_INTERN_EMAIL);
    }
  }

  let ownerUser = await User.findOne({ email: E2E_COMPANY_OWNER_EMAIL });
  let companyProfile;
  if (!ownerUser) {
    ownerUser = await User.create({
      email: E2E_COMPANY_OWNER_EMAIL,
      passwordHash: await hashPassword(E2E_COMPANY_OWNER_PASSWORD),
      role: "company",
      companyAccountType: "owner",
      emailVerified: true
    });
    companyProfile = await CompanyProfile.create({
      user: ownerUser._id,
      companyName: "E2E Test Company",
      companyEmail: E2E_COMPANY_OWNER_EMAIL,
      gst: "27AAAAA0000A1Z5",
      contactName: "E2E Test Contact",
      phone: "9999900002",
      address: "Test Address",
      description: "Dedicated fixture account for automated E2E tests.",
      verificationStatus: "verified"
    });
    ownerUser.companyProfileRef = companyProfile._id;
    await ownerUser.save();
    console.log("Created E2E company owner fixture:", E2E_COMPANY_OWNER_EMAIL);
  } else {
    companyProfile = await CompanyProfile.findById(ownerUser.companyProfileRef);
    console.log("E2E company owner fixture already exists:", E2E_COMPANY_OWNER_EMAIL);
  }

  // A real HR account: same companyProfileRef as the owner, but its own User
  // with companyAccountType "hr" — matches how the app actually models HR
  // sub-accounts (auth.middleware.js derives HR's restricted permission set
  // from this field, not from the profile itself).
  let hrUser = await User.findOne({ email: E2E_COMPANY_HR_EMAIL });
  if (!hrUser) {
    hrUser = await User.create({
      email: E2E_COMPANY_HR_EMAIL,
      passwordHash: await hashPassword(E2E_COMPANY_HR_PASSWORD),
      role: "company",
      companyAccountType: "hr",
      companyProfileRef: companyProfile._id,
      emailVerified: true
    });
    console.log("Created E2E company HR fixture:", E2E_COMPANY_HR_EMAIL);
  } else {
    console.log("E2E company HR fixture already exists:", E2E_COMPANY_HR_EMAIL);
  }

  // A real CEO account: same companyProfileRef as owner/HR, its own User
  // with companyAccountType "ceo" -- executive tier, same as owner.
  let ceoUser = await User.findOne({ email: E2E_COMPANY_CEO_EMAIL });
  if (!ceoUser) {
    ceoUser = await User.create({
      email: E2E_COMPANY_CEO_EMAIL,
      passwordHash: await hashPassword(E2E_COMPANY_CEO_PASSWORD),
      role: "company",
      companyAccountType: "ceo",
      companyProfileRef: companyProfile._id,
      emailVerified: true
    });
    console.log("Created E2E company CEO fixture:", E2E_COMPANY_CEO_EMAIL);
  } else {
    console.log("E2E company CEO fixture already exists:", E2E_COMPANY_CEO_EMAIL);
  }

  // Admin sub-role fixtures. No dedicated "create admin with sub-role"
  // endpoint exists (only PATCH /api/admin/users/:userId from a super_admin
  // session) -- direct creation matches how admin@internai.com itself is
  // made in seedData.js. User's pre('save') hook derives `permissions` from
  // `adminRole` automatically.
  for (const spec of E2E_ADMIN_SUB_ROLES) {
    const existing = await User.findOne({ email: spec.email });
    if (!existing) {
      await User.create({
        email: spec.email,
        passwordHash: await hashPassword(spec.password),
        role: "admin",
        adminRole: spec.adminRole,
        emailVerified: true
      });
      console.log("Created E2E admin fixture:", spec.email, spec.adminRole);
    } else {
      console.log("E2E admin fixture already exists:", spec.email, spec.adminRole);
    }
  }

  // A reported-company fixture against the E2E test company, so the admin
  // Reports (moderation queue) E2E specs have a deterministic card to act
  // on instead of depending on whatever real reports happen to exist in
  // this shared dev DB. The status-transition tests drive it through
  // in_review -> escalated -> resolved and restore it to "open" in a
  // `finally`, but re-seeding also self-heals it here if a run dies mid-test.
  const ReportedCompany = require("../src/modules/admin/models/ReportedCompany");
  const E2E_REPORT_REASON = "E2E fixture abuse report for automated moderation-queue coverage.";
  let reportFixture = await ReportedCompany.findOne({ company: companyProfile._id, reason: E2E_REPORT_REASON });
  if (!reportFixture) {
    await ReportedCompany.create({
      company: companyProfile._id,
      reportedBy: internUser._id,
      reason: E2E_REPORT_REASON,
      reportType: "other",
      details: "Created by seed-e2e-fixtures.js for Playwright coverage.",
      status: "open"
    });
    console.log("Created E2E reported-company fixture");
  } else if (reportFixture.status !== "open" || reportFixture.resolutionNote) {
    reportFixture.status = "open";
    reportFixture.resolutionNote = "";
    reportFixture.reviewedBy = null;
    reportFixture.reviewedAt = null;
    await reportFixture.save();
    console.log("Reset E2E reported-company fixture status to 'open'");
  } else {
    console.log("E2E reported-company fixture already exists");
  }

  // A posted internship plus one application from the E2E intern. Without
  // these, the company dashboard has no matched candidates at all, so the
  // AI Insight modal has nothing to open and its E2E coverage silently
  // skips instead of verifying anything.
  const Internship = require("../src/modules/internships/models/Internship");
  const Application = require("../src/modules/applications/models/Application");

  const internProfile = await InternProfile.findOne({ user: internUser._id });

  let internship = await Internship.findOne({ company: companyProfile._id, role: E2E_INTERNSHIP_ROLE });
  if (!internship) {
    internship = await Internship.create({
      company: companyProfile._id,
      role: E2E_INTERNSHIP_ROLE,
      description: "Fixture internship for automated E2E tests.",
      skillsRequired: ["React", "Node.js", "MongoDB"],
      prioritySkills: ["React"],
      location: "Remote",
      mode: "remote",
      stipend: "10000",
      duration: "6 months"
    });
    console.log("Created E2E internship fixture:", E2E_INTERNSHIP_ROLE);
  } else {
    console.log("E2E internship fixture already exists:", E2E_INTERNSHIP_ROLE);
  }

  const existingApplication = await Application.findOne({
    internship: internship._id,
    intern: internProfile._id
  });
  if (!existingApplication) {
    await Application.create({
      internId: internProfile._id,
      intern: internProfile._id,
      internshipId: internship._id,
      internship: internship._id,
      companyId: companyProfile._id,
      company: companyProfile._id,
      status: "applied",
      attachedResumePath: "uploads/resumes/e2e-fixture-resume.txt",
      availabilityStatus: "yes",
      matchScore: 78,
      relevanceScore: 78
    });
    console.log("Created E2E application fixture for:", E2E_INTERNSHIP_ROLE);
  } else if (!["applied", "under_review", "shortlisted"].includes(existingApplication.status)) {
    // The pipeline E2E test moves this application forward through the
    // one-way hiring transition graph (pipeline.service.js) -- backward
    // moves are rejected by the API, so once it drifts past "shortlisted"
    // the test has nothing legally movable left. Re-seeding resets it to a
    // forward-movable state instead of leaving the fixture stuck.
    existingApplication.status = "applied";
    await existingApplication.save();
    console.log("Reset E2E application fixture status to 'applied' for:", E2E_INTERNSHIP_ROLE);
  } else {
    console.log("E2E application fixture already exists for:", E2E_INTERNSHIP_ROLE);
  }

  await mongoose.connection.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
