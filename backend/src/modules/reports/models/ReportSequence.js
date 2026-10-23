const mongoose = require("mongoose");

const reportSequenceSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    year: { type: Number, required: true },
    sequence: { type: Number, default: 0 }
  },
  { timestamps: true }
);

reportSequenceSchema.index({ code: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("ReportSequence", reportSequenceSchema);
