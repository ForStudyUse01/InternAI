const CompanyProfile = require("../../../models/CompanyProfile");
const Internship = require("../../../models/Internship");
const Application = require("../../../models/Application");
const asyncHandler = require("../../../shared/utils/asyncHandler");
const AppError = require("../../../shared/utils/AppError");
const { sendSuccess } = require("../../../shared/utils/api-response");
const { APPLICATION_STATUS, COMPANY_VERIFICATION_STATUS } = require("../../../constants/enums");

exports.getPublicCompanyProfile = asyncHandler(async (req, res) => {
  const company = await CompanyProfile.findOne({
    _id: req.params.companyId,
    isDeleted: { $ne: true }
  })
    .select(
      "companyName website address description verificationStatus linkedInUrl createdAt logoUrl industry companySize headquarters foundedYear technologies hiringProcessOverview"
    )
    .lean();

  if (!company) {
    throw new AppError("Company not found", 404);
  }

  const companyId = company._id;
  const [activeOpenings, totalApplications, totalHires, openPositions] = await Promise.all([
    Internship.countDocuments({ company: companyId, isActive: true, isDeleted: { $ne: true } }),
    Application.countDocuments({ companyId }),
    Application.countDocuments({
      companyId,
      status: { $in: [APPLICATION_STATUS.SELECTED, APPLICATION_STATUS.OFFERED] }
    }),
    Internship.find({ company: companyId, isActive: true, isDeleted: { $ne: true } })
      .select("role department internshipType location mode duration stipend openings skillsRequired applicationDeadline createdAt")
      .sort({ createdAt: -1 })
      .limit(25)
      .lean()
  ]);

  const hiringSuccessRate = totalApplications > 0 ? Math.round((totalHires / totalApplications) * 100) : 0;

  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  return sendSuccess(res, {
    data: {
      company: {
        _id: company._id,
        companyName: company.companyName,
        website: company.website || "",
        address: company.address || "",
        description: company.description || "",
        linkedInUrl: company.linkedInUrl || "",
        joinedAt: company.createdAt,
        verificationStatus: company.verificationStatus,
        isVerified: company.verificationStatus === COMPANY_VERIFICATION_STATUS.VERIFIED,
        logoUrl: company.logoUrl || "",
        industry: company.industry || "",
        companySize: company.companySize || "",
        headquarters: company.headquarters || "",
        foundedYear: company.foundedYear || null,
        technologies: Array.isArray(company.technologies) ? company.technologies : [],
        hiringProcessOverview: company.hiringProcessOverview || "",
        activeOpenings,
        totalInternsHired: totalHires,
        hiringSuccessRate,
        totalApplications,
        openPositions: openPositions.map((p) => ({
          _id: p._id,
          role: p.role,
          department: p.department || "",
          internshipType: p.internshipType || "",
          location: p.location || "",
          mode: p.mode || "",
          duration: p.duration || "",
          stipend: p.stipend || "",
          openings: p.openings,
          skillsRequired: p.skillsRequired || [],
          applicationDeadline: p.applicationDeadline,
          postedAt: p.createdAt
        }))
      }
    }
  });
});
