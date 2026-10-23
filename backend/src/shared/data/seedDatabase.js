const User = require("../../models/User");
const InternProfile = require("../../models/InternProfile");
const CompanyProfile = require("../../models/CompanyProfile");
const Internship = require("../../models/Internship");
const Application = require("../../models/Application");
const ReportedCompany = require("../../models/ReportedCompany");
const { hashPassword } = require("../utils/password");
const seedData = require("./seedData");
const { calculateResumeScore } = require("../../services/ai.service");

async function resetCollections() {
  await Promise.all([
    User.deleteMany({}),
    InternProfile.deleteMany({}),
    CompanyProfile.deleteMany({}),
    Internship.deleteMany({}),
    Application.deleteMany({}),
    ReportedCompany.deleteMany({})
  ]);
}

async function seedDatabase({ reset = false } = {}) {
  if (!reset) {
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      return { seeded: false, reason: "database-not-empty" };
    }
  } else {
    await resetCollections();
  }

  const usersByEmail = {};
  for (const userSeed of seedData.users) {
    const user = await User.create({
      email: userSeed.email,
      role: userSeed.role,
      passwordHash: await hashPassword(userSeed.password),
      adminRole: userSeed.adminRole || null,
      companyAccountType: userSeed.companyAccountType || null,
      displayName: userSeed.displayName || ""
    });
    usersByEmail[user.email] = user;
  }

const SEED_RESUME_PATH = "uploads/resumes/seed-resume.pdf";

  const internProfilesByEmail = {};
  for (const profileSeed of seedData.internProfiles) {
    const user = usersByEmail[profileSeed.email];
    const profile = await InternProfile.create({
      user: user._id,
      ...profileSeed,
      resume: {
        filePath: SEED_RESUME_PATH,
        text: "Demo resume for seeded intern profile.",
        score: 0
      }
    });

    profile.resume.score = calculateResumeScore(profile);
    await profile.save();

    internProfilesByEmail[profile.email] = profile;
  }

  const companiesByEmail = {};
  for (const companySeed of seedData.companyProfiles) {
    const user = usersByEmail[companySeed.companyEmail];
    const company = await CompanyProfile.create({
      user: user._id,
      ...companySeed
    });
    companiesByEmail[company.companyEmail] = company;
  }

  for (const userSeed of seedData.users) {
    if (!userSeed.linkedCompanyEmail) continue;
    const user = usersByEmail[userSeed.email];
    const company = companiesByEmail[userSeed.linkedCompanyEmail];
    if (!user || !company) continue;
    user.companyProfileRef = company._id;
    await user.save();
  }

  const internshipsByRole = {};
  for (const internshipSeed of seedData.internships) {
    const company = companiesByEmail[internshipSeed.companyEmail];
    const hrUser = internshipSeed.assignToHrEmail ? usersByEmail[internshipSeed.assignToHrEmail] : null;
    const { assignToHrEmail, companyEmail, ...internshipFields } = internshipSeed;
    const internship = await Internship.create({
      ...internshipFields,
      company: company._id,
      assignedRecruiter: hrUser?._id || null,
      assignedDepartment: internshipFields.department || ""
    });
    internshipsByRole[internship.role] = internship;
  }

  for (const applicationSeed of seedData.applications) {
    const intern = internProfilesByEmail[applicationSeed.internEmail];
    const internship = internshipsByRole[applicationSeed.internshipRole];
    const hrUser = applicationSeed.assignToHrEmail ? usersByEmail[applicationSeed.assignToHrEmail] : null;

    await Application.create({
      internId: intern._id,
      internshipId: internship._id,
      companyId: internship.company,
      intern: intern._id,
      internship: internship._id,
      company: internship.company,
      assignedRecruiter: hrUser?._id || internship.assignedRecruiter || null,
      status: applicationSeed.status,
      appliedAt: new Date(),
      attachedResumePath: intern.resume?.filePath || SEED_RESUME_PATH,
      availabilityStatus: applicationSeed.availabilityStatus || "yes",
      relevanceScore: applicationSeed.matchScore,
      matchScore: applicationSeed.matchScore,
      hrFeedback: applicationSeed.hrFeedback,
      stageHistory: [
        { stage: "applied", note: "Seeded application" },
        { stage: applicationSeed.status, note: "Seeded status" }
      ]
    });
  }

  return { seeded: true, reason: reset ? "reset-seed" : "empty-database" };
}

module.exports = { seedDatabase, resetCollections };
