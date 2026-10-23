const asyncHandler = require("../../../shared/utils/asyncHandler");
const CompanyProfile = require("../../../models/CompanyProfile");
const User = require("../../../models/User");
const AppError = require("../../../shared/utils/AppError");
const { sendSuccess } = require("../../../shared/utils/api-response");
const { buildListMeta } = require("../../../services/company-access.service");
const {
  buildHrInsights,
  createHrAccount,
  deleteHrAccount,
  updateHrPermissions
} = require("../../../services/company-hr.service");
const { HR_ASSIGNABLE_PERMISSIONS } = require("../../../constants/hr-permissions");
const { SIDEBAR_MODULE_REGISTRY } = require("../../../constants/sidebar-modules");

async function getCompanyProfileByUserId(userId) {
  const user = await User.findById(userId).select("companyProfileRef").lean();
  if (user?.companyProfileRef) {
    const linked = await CompanyProfile.findById(user.companyProfileRef).lean();
    if (linked) return linked;
  }
  const company = await CompanyProfile.findOne({ user: userId }).lean();
  if (!company) throw new AppError("Company profile not found", 404);
  return company;
}

exports.createHr = asyncHandler(async (req, res) => {
  const company = await getCompanyProfileByUserId(req.user._id);
  const hrUser = await createHrAccount(company._id, req.body || {});
  return sendSuccess(res, {
    statusCode: 201,
    message: "HR account created",
    data: { hrUser, sidebarModuleRegistry: SIDEBAR_MODULE_REGISTRY },
    meta: buildListMeta(req.user)
  });
});

exports.deleteHr = asyncHandler(async (req, res) => {
  const company = await getCompanyProfileByUserId(req.user._id);
  const result = await deleteHrAccount(company._id, req.params.id, req.user._id);
  return sendSuccess(res, {
    message: "HR account deleted",
    data: { ...result },
    meta: buildListMeta(req.user)
  });
});

exports.getHrInsights = asyncHandler(async (req, res) => {
  const company = await getCompanyProfileByUserId(req.user._id);
  const insights = await buildHrInsights(company._id);
  return sendSuccess(res, {
    data: { ...insights, assignablePermissions: HR_ASSIGNABLE_PERMISSIONS, sidebarModuleRegistry: SIDEBAR_MODULE_REGISTRY },
    meta: buildListMeta(req.user)
  });
});

exports.patchHrPermissions = asyncHandler(async (req, res) => {
  const company = await getCompanyProfileByUserId(req.user._id);
  const { permissions, sidebarModules } = req.body || {};
  if (!Array.isArray(permissions)) {
    throw new AppError("permissions array is required", 400);
  }
  const hrUser = await updateHrPermissions(company._id, req.params.id, permissions, sidebarModules);
  return sendSuccess(res, {
    message: "HR permissions updated",
    data: { hrUser, assignablePermissions: HR_ASSIGNABLE_PERMISSIONS, sidebarModuleRegistry: SIDEBAR_MODULE_REGISTRY },
    meta: buildListMeta(req.user)
  });
});
