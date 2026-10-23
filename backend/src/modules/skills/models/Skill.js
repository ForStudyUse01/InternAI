const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    normalizedName: { type: String, required: true, trim: true, unique: true, index: true },
    category: { type: String, default: "general", trim: true },
    isCustom: { type: Boolean, default: false }
  },
  { timestamps: true }
);

skillSchema.index({ name: "text", normalizedName: "text" });

module.exports = mongoose.model("Skill", skillSchema);
