const asyncHandler = require("../../../shared/utils/asyncHandler");
const AppError = require("../../../shared/utils/AppError");
const { sendSuccess } = require("../../../shared/utils/api-response");
const {
  listActiveTemplates,
  upsertTemplate,
  validateWeights,
  previewScore
} = require("../../../services/hiring-scoring-config.service");
const { logActivity } = require("../../../services/activity-log.service");

exports.listTemplates = asyncHandler(async (_req, res) => {
  const templates = await listActiveTemplates();
  return sendSuccess(res, { data: { templates } });
});

exports.saveTemplate = asyncHandler(async (req, res) => {
  const { roleKey, roleLabel, weights, enabled, isActive } = req.body || {};
  if (!roleKey || !roleLabel || !weights) {
    throw new AppError("roleKey, roleLabel, and weights are required", 400);
  }

  const validation = validateWeights(weights);
  if (!validation.valid) {
    throw new AppError(validation.message, 400);
  }

  const template = await upsertTemplate({ roleKey, roleLabel, weights, enabled, isActive }, req.user._id);

  await logActivity({
    actorUser: req.user._id,
    actorRole: req.user.role,
    entityType: "hiring_scoring_template",
    entityId: template.roleKey,
    action: "hiring_scoring_template_updated",
    metadata: { version: template.version, weights: template.weights },
    ipAddress: req.ip
  });

  return sendSuccess(res, { message: "Hiring scoring template saved", data: { template } });
});

exports.previewTemplate = asyncHandler(async (req, res) => {
  const { weights, enabled, factorScores } = req.body || {};
  const validation = validateWeights(weights || {});
  if (!validation.valid) {
    throw new AppError(validation.message, 400);
  }

  const overallScore = previewScore(factorScores || { skills: 80, tests: 75, projects: 70, experience: 65, resume: 72 }, {
    weights,
    enabled: enabled || {}
  });

  return sendSuccess(res, { data: { overallScore, validation } });
});
