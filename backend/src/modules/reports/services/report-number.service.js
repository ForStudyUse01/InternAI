const ReportSequence = require("../../../models/ReportSequence");

function padSequence(value) {
  return String(value).padStart(4, "0");
}

async function generateReportNumber(code) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  const year = new Date().getFullYear();
  const updated = await ReportSequence.findOneAndUpdate(
    { code: normalizedCode, year },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `INT-AI-${year}-${normalizedCode}-${padSequence(updated.sequence)}`;
}

module.exports = { generateReportNumber };
