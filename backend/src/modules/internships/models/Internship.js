const mongoose = require("mongoose");

const internshipSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyProfile",
      required: true
    },
    assignedRecruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    assignedDepartment: {
      type: String,
      default: "",
      trim: true
    },
    role: { type: String, required: true, trim: true },
    skillsRequired: [{ type: String, trim: true }],
    prioritySkills: [{ type: String, trim: true }],
    stipend: { type: String, default: "" },
    perks: { type: String, default: "" },
    openings: { type: Number, default: null },
    duration: { type: String, default: "" },
    internshipType: { type: String, default: "" },
    department: { type: String, default: "" },
    location: { type: String, default: "" },
    startDate: { type: Date, default: null },
    applicationDeadline: { type: Date, default: null },
    mode: { type: String, enum: ["remote", "on-site", "hybrid", ""], default: "" },
    responsibilities: { type: String, default: "", trim: true },
    eligibilityCriteria: { type: String, default: "", trim: true },
    preferredSkillsText: { type: String, default: "", trim: true },
    educationQualification: { type: String, default: "", trim: true },
    degreePreferences: { type: String, default: "", trim: true },
    minimumCgpa: { type: String, default: "", trim: true },
    experienceRequirement: { type: String, default: "", trim: true },
    selectionProcess: { type: String, default: "", trim: true },
    interviewRoundsInfo: { type: String, default: "", trim: true },
    additionalInstructions: { type: String, default: "", trim: true },
    hrContact: { type: String, default: "", trim: true },
    description: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

internshipSchema.index({ createdAt: -1, isActive: 1, isDeleted: 1 });
internshipSchema.index({ company: 1, isDeleted: 1, isActive: 1 });
internshipSchema.index({ company: 1, assignedRecruiter: 1, isDeleted: 1 });

module.exports = mongoose.model("Internship", internshipSchema);
