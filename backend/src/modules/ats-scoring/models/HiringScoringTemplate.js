const mongoose = require("mongoose");

const weightsSchema = new mongoose.Schema(
  {
    skills: { type: Number, default: 35, min: 0, max: 100 },
    tests: { type: Number, default: 25, min: 0, max: 100 },
    projects: { type: Number, default: 20, min: 0, max: 100 },
    experience: { type: Number, default: 10, min: 0, max: 100 },
    resume: { type: Number, default: 10, min: 0, max: 100 }
  },
  { _id: false }
);

const enabledSchema = new mongoose.Schema(
  {
    skills: { type: Boolean, default: true },
    tests: { type: Boolean, default: true },
    projects: { type: Boolean, default: true },
    experience: { type: Boolean, default: true },
    resume: { type: Boolean, default: true }
  },
  { _id: false }
);

const versionEntrySchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    weights: { type: weightsSchema, required: true },
    enabled: { type: enabledSchema, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { _id: false }
);

const hiringScoringTemplateSchema = new mongoose.Schema(
  {
    roleKey: { type: String, required: true, unique: true, trim: true, lowercase: true },
    roleLabel: { type: String, required: true, trim: true },
    weights: { type: weightsSchema, required: true },
    enabled: { type: enabledSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    history: { type: [versionEntrySchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("HiringScoringTemplate", hiringScoringTemplateSchema);
