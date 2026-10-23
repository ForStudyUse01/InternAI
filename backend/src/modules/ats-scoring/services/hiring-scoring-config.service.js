const HiringScoringTemplate = require("../../../models/HiringScoringTemplate");
const AppError = require("../../../shared/utils/AppError");

const DEFAULT_TEMPLATES = [
  {
    roleKey: "software_engineer",
    roleLabel: "Software Engineer",
    weights: { skills: 40, tests: 30, projects: 20, experience: 10, resume: 0 },
    enabled: { skills: true, tests: true, projects: true, experience: true, resume: false }
  },
  {
    roleKey: "data_scientist",
    roleLabel: "Data Scientist",
    weights: { skills: 30, tests: 25, projects: 30, experience: 10, resume: 5 },
    enabled: { skills: true, tests: true, projects: true, experience: true, resume: true }
  },
  {
    roleKey: "ai_ml_engineer",
    roleLabel: "AI/ML Engineer",
    weights: { skills: 35, tests: 20, projects: 30, experience: 10, resume: 5 },
    enabled: { skills: true, tests: true, projects: true, experience: true, resume: true }
  },
  {
    roleKey: "frontend_developer",
    roleLabel: "Frontend Developer",
    weights: { skills: 40, tests: 15, projects: 30, experience: 10, resume: 5 },
    enabled: { skills: true, tests: true, projects: true, experience: true, resume: true }
  },
  {
    roleKey: "cybersecurity",
    roleLabel: "Cybersecurity Role",
    weights: { skills: 35, tests: 30, projects: 20, experience: 10, resume: 5 },
    enabled: { skills: true, tests: true, projects: true, experience: true, resume: true }
  },
  {
    roleKey: "backend_developer",
    roleLabel: "Backend Developer",
    weights: { skills: 40, tests: 25, projects: 20, experience: 10, resume: 5 },
    enabled: { skills: true, tests: true, projects: true, experience: true, resume: true }
  },
  {
    roleKey: "general",
    roleLabel: "General Role",
    weights: { skills: 35, tests: 25, projects: 20, experience: 10, resume: 10 },
    enabled: { skills: true, tests: true, projects: true, experience: true, resume: true }
  }
];

function validateWeights(weights = {}) {
  const total =
    Number(weights.skills || 0) +
    Number(weights.tests || 0) +
    Number(weights.projects || 0) +
    Number(weights.experience || 0) +
    Number(weights.resume || 0);
  if (total !== 100) {
    return { valid: false, total, message: `Weights must total 100%. Current total: ${total}%.` };
  }
  return { valid: true, total, message: "Valid weight configuration." };
}

function serializeTemplate(doc) {
  return {
    roleKey: doc.roleKey,
    roleLabel: doc.roleLabel,
    weights: doc.weights,
    enabled: doc.enabled,
    version: doc.version,
    isActive: doc.isActive,
    updatedAt: doc.updatedAt,
    history: (doc.history || []).slice(-10).reverse()
  };
}

async function ensureDefaultTemplates() {
  const count = await HiringScoringTemplate.countDocuments();
  if (count > 0) return;
  await HiringScoringTemplate.insertMany(
    DEFAULT_TEMPLATES.map((item) => ({
      ...item,
      version: 1,
      history: [{ version: 1, weights: item.weights, enabled: item.enabled, changedAt: new Date() }]
    }))
  );
}

async function listActiveTemplates() {
  await ensureDefaultTemplates();
  const docs = await HiringScoringTemplate.find({ isActive: true }).sort({ roleLabel: 1 }).lean();
  return docs.map((doc) => serializeTemplate(doc));
}

async function upsertTemplate(payload, userId) {
  const validation = validateWeights(payload.weights);
  if (!validation.valid) {
    throw new AppError(validation.message, 400);
  }

  const roleKey = String(payload.roleKey || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_");
  if (!roleKey) {
    throw new AppError("roleKey is required", 400);
  }

  const existing = await HiringScoringTemplate.findOne({ roleKey }).select("version").lean();
  const nextVersion = (existing?.version || 0) + 1;
  const historyEntry = {
    version: nextVersion,
    weights: payload.weights,
    enabled: payload.enabled || {},
    changedAt: new Date(),
    changedBy: userId
  };

  const doc = await HiringScoringTemplate.findOneAndUpdate(
    { roleKey },
    {
      roleKey,
      roleLabel: payload.roleLabel || roleKey,
      weights: payload.weights,
      enabled: payload.enabled || {},
      isActive: payload.isActive !== false,
      version: nextVersion,
      updatedBy: userId,
      $push: { history: { $each: [historyEntry], $slice: -25 } }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return serializeTemplate(doc);
}

function previewScore(factorScores, template) {
  const keys = ["skills", "tests", "projects", "experience", "resume"];
  const activeWeight = keys.reduce((sum, key) => sum + (template.enabled?.[key] ? template.weights[key] : 0), 0) || 100;
  return Math.round(
    keys.reduce((sum, key) => {
      if (!template.enabled?.[key] || !template.weights[key]) return sum;
      return sum + (Number(factorScores[key] || 0) * template.weights[key]) / activeWeight;
    }, 0)
  );
}

module.exports = {
  DEFAULT_TEMPLATES,
  validateWeights,
  ensureDefaultTemplates,
  listActiveTemplates,
  upsertTemplate,
  previewScore
};
