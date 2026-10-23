const bcrypt = require("bcryptjs");
const User = require("../../src/modules/authentication/models/User");
const InternProfile = require("../../src/modules/students/models/InternProfile");
const CompanyProfile = require("../../src/modules/companies/models/CompanyProfile");
const Internship = require("../../src/modules/internships/models/Internship");
const Application = require("../../src/modules/applications/models/Application");
const { signAccessToken } = require("../../src/shared/utils/jwt");

let counter = 0;
function uniqueEmail(prefix) {
  counter += 1;
  return `${prefix}${counter}.${Date.now()}@example.test`;
}

async function createUser(overrides = {}) {
  const passwordHash = await bcrypt.hash("Password123!", 4);
  const user = await User.create({
    email: overrides.email || uniqueEmail("user"),
    passwordHash,
    role: overrides.role || "intern",
    ...overrides
  });
  return user;
}

async function createInternWithProfile(overrides = {}) {
  const user = await createUser({ role: "intern", ...overrides.user });
  const profile = await InternProfile.create({
    user: user._id,
    fullName: "Test Intern",
    email: user.email,
    mobile: "9876543210",
    ...overrides.profile
  });
  return { user, profile };
}

async function createCompanyWithProfile(overrides = {}) {
  const companyUser = await createUser({
    role: "company",
    companyAccountType: overrides.companyAccountType || "owner",
    ...overrides.user
  });
  const profile = await CompanyProfile.create({
    user: companyUser._id,
    companyName: "Test Company",
    companyEmail: companyUser.email,
    gst: "27AAAAA0000A1Z5",
    contactName: "Test Contact",
    phone: "9876543211",
    address: "Test Address",
    description: "Test company description",
    ...overrides.profile
  });
  companyUser.companyProfileRef = profile._id;
  await companyUser.save();
  return { user: companyUser, profile };
}

async function createAdmin(overrides = {}) {
  return createUser({ role: "admin", adminRole: "super_admin", ...overrides });
}

async function createInternship(companyProfile, overrides = {}) {
  return Internship.create({
    company: companyProfile._id,
    role: "Software Engineering Intern",
    description: "Build things.",
    ...overrides
  });
}

async function createApplication({ internProfile, internship, companyProfile, overrides = {} }) {
  return Application.create({
    internId: internProfile._id,
    internshipId: internship._id,
    companyId: companyProfile._id,
    intern: internProfile._id,
    internship: internship._id,
    company: companyProfile._id,
    attachedResumePath: "uploads/resumes/does-not-exist.pdf",
    availabilityStatus: "yes",
    ...overrides
  });
}

function tokenFor(user) {
  return signAccessToken({ userId: String(user._id) });
}

function authHeader(user) {
  return { Authorization: `Bearer ${tokenFor(user)}` };
}

module.exports = {
  uniqueEmail,
  createUser,
  createInternWithProfile,
  createCompanyWithProfile,
  createAdmin,
  createInternship,
  createApplication,
  tokenFor,
  authHeader
};
