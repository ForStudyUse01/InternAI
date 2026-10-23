const mongoose = require("mongoose");
const { PORTFOLIO_THEMES, PORTFOLIO_STATUSES } = require("../../../constants/portfolio-themes");

const internPortfolioSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    internProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InternProfile",
      required: true,
      unique: true,
      index: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    status: {
      type: String,
      enum: PORTFOLIO_STATUSES,
      default: "draft",
      index: true
    },
    theme: {
      type: String,
      enum: PORTFOLIO_THEMES,
      default: "midnight"
    },
    autoSync: { type: Boolean, default: true },
    content: { type: mongoose.Schema.Types.Mixed, default: null },
    metadata: {
      viewCount: { type: Number, default: 0 },
      lastViewedAt: { type: Date, default: null },
      aiGenerated: { type: Boolean, default: false },
      sourceHash: { type: String, default: "" },
      needsRegeneration: { type: Boolean, default: false }
    },
    lastGeneratedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    moderatedAt: { type: Date, default: null },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    moderationNote: { type: String, default: "", trim: true }
  },
  { timestamps: true }
);

internPortfolioSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model("InternPortfolio", internPortfolioSchema);
