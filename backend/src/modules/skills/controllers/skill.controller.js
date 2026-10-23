const Skill = require("../../../models/Skill");
const asyncHandler = require("../../../shared/utils/asyncHandler");
const AppError = require("../../../shared/utils/AppError");
const { sendSuccess } = require("../../../shared/utils/api-response");
const { resolvePagination } = require("../../../shared/utils/pagination");

function normalizeSkillName(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

exports.searchSkills = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim();
  const { page, limit, skip } = resolvePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
  const filter = q ? { $or: [{ name: new RegExp(q, "i") }, { normalizedName: new RegExp(normalizeSkillName(q), "i") }] } : {};

  const [skills, total] = await Promise.all([
    Skill.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Skill.countDocuments(filter)
  ]);

  return sendSuccess(res, {
    data: {
      items: skills,
      page,
      limit,
      total
    }
  });
});

exports.addCustomSkill = asyncHandler(async (req, res) => {
  const { name, category } = req.body || {};
  if (!name) throw new AppError("name is required", 400);
  const normalizedName = normalizeSkillName(name);
  if (!normalizedName) throw new AppError("name is required", 400);

  const existing = await Skill.findOne({ normalizedName }).lean();
  if (existing) {
    return sendSuccess(res, { message: "Skill already exists", data: existing });
  }

  const skill = await Skill.create({
    name: String(name).trim(),
    normalizedName,
    category: String(category || "custom").trim(),
    isCustom: true
  });

  return sendSuccess(res, { statusCode: 201, message: "Skill created", data: skill });
});
