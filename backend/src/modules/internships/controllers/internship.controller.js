const Internship = require("../../../models/Internship");
const asyncHandler = require("../../../shared/utils/asyncHandler");
const AppError = require("../../../shared/utils/AppError");
const { sendSuccess, sendPaginated } = require("../../../shared/utils/api-response");
const { resolvePagination } = require("../../../shared/utils/pagination");
const { COMPANY_VERIFICATION_STATUS } = require("../../../constants/enums");

exports.getAllInternships = asyncHandler(async (req, res) => {
  const filter = { isActive: true, isDeleted: false };
  const { page, limit, skip } = resolvePagination(req.query, { defaultLimit: 10, maxLimit: 100 });

  if (req.query.location) {
    filter.location = { $regex: req.query.location, $options: "i" };
  }

  if (req.query.role) {
    filter.role = { $regex: req.query.role, $options: "i" };
  }

  const [internships, total] = await Promise.all([
    Internship.find(filter).populate("company").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Internship.countDocuments(filter)
  ]);

  // Production note: this currently filters by active internships only.
  // Add full-text indexes for advanced search/scoring in future iterations.
  const filtered = internships.filter((item) => item.company?.verificationStatus === COMPANY_VERIFICATION_STATUS.VERIFIED);

  return sendPaginated(res, { items: filtered, itemsKey: "internships", page, limit, total });
});

exports.getInternshipById = asyncHandler(async (req, res) => {
  const internship = await Internship.findOne({ _id: req.params.id, isDeleted: false }).populate("company").lean();
  if (!internship) {
    throw new AppError("Internship not found", 404);
  }

  if (!internship.company || internship.company.verificationStatus !== COMPANY_VERIFICATION_STATUS.VERIFIED) {
    throw new AppError("Internship not available", 404);
  }

  return sendSuccess(res, { data: { internship } });
});
