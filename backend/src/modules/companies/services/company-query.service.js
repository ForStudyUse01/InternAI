const Internship = require("../../../models/Internship");
const Application = require("../../../models/Application");
const AppError = require("../../../shared/utils/AppError");
const {
  internshipScopeFilter,
  applicationScopeFilter,
  isHrScopedUser,
  buildListMeta
} = require("../../../services/company-access.service");
const { resolvePagination } = require("../../../shared/utils/pagination");

async function findInternships(companyId, user, { page = 1, limit = 10, sort = { createdAt: -1 } } = {}) {
  const { page: safePage, limit: safeLimit, skip } = resolvePagination({ page, limit }, { defaultLimit: 10, maxLimit: 100 });
  const query = internshipScopeFilter(companyId, user);

  const [internships, total] = await Promise.all([
    Internship.find(query).sort(sort).skip(skip).limit(safeLimit).lean(),
    Internship.countDocuments(query)
  ]);

  return {
    internships,
    page: safePage,
    limit: safeLimit,
    total,
    meta: buildListMeta(user)
  };
}

async function findInternshipById(companyId, internshipId, user) {
  const internship = await Internship.findOne({
    _id: internshipId,
    ...internshipScopeFilter(companyId, user)
  });
  if (!internship) {
    throw new AppError("Internship not found", 404);
  }
  return internship;
}

async function findApplicationById(companyId, applicationId, user, populate = "internship") {
  const application = await Application.findOne({
    _id: applicationId,
    ...applicationScopeFilter(companyId, user)
  }).populate(populate);

  if (!application) {
    throw new AppError("Application not found", 404);
  }

  const internshipCompanyId =
    application.internship?.company || application.internship?.companyId;
  if (internshipCompanyId && String(internshipCompanyId) !== String(companyId)) {
    throw new AppError("Not allowed for this internship", 403);
  }

  if (
    isHrScopedUser(user) &&
    application.assignedRecruiter &&
    String(application.assignedRecruiter) !== String(user._id)
  ) {
    throw new AppError("Not allowed for this recruiter scope", 403);
  }

  return application;
}

async function findAllApplications(companyId, user, { page = 1, limit = 100, status = "" } = {}) {
  const { page: safePage, limit: safeLimit, skip } = resolvePagination({ page, limit }, { defaultLimit: 100, maxLimit: 100 });
  const query = applicationScopeFilter(companyId, user);
  if (status) query.status = status;

  const [applications, total] = await Promise.all([
    Application.find(query)
      .populate("intern", "fullName email mobile skills resume.score education projects summary")
      .populate("internship", "role location department assignedRecruiter")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Application.countDocuments(query)
  ]);

  return {
    applications,
    page: safePage,
    limit: safeLimit,
    total,
    meta: buildListMeta(user)
  };
}

module.exports = {
  findInternships,
  findInternshipById,
  findApplicationById,
  findAllApplications
};
