const mongoose = require("mongoose");
const { REPORTED_COMPANY_STATUS } = require("../../../constants/enums");

const reportedCompanySchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyProfile",
      required: true
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    reportType: {
      type: String,
      enum: ["fake_internship", "abusive_hr", "scam_company", "inappropriate_behavior", "other"],
      default: "other"
    },
    evidenceUrls: [{ type: String, trim: true }],
    details: { type: String, default: "", trim: true },
    internship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Internship",
      default: null
    },
    hrUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    status: {
      type: String,
      enum: Object.values(REPORTED_COMPANY_STATUS),
      default: REPORTED_COMPANY_STATUS.OPEN
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    resolutionNote: {
      type: String,
      default: ""
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

reportedCompanySchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("ReportedCompany", reportedCompanySchema);
