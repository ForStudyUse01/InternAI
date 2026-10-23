const asyncHandler = require("../../../shared/utils/asyncHandler");
const AppError = require("../../../shared/utils/AppError");
const { REPORT_CODES } = require("../../../constants/report-types");
const { generateEnterpriseReport } = require("../../../services/report-pdf.service");
const {
  formatUserName,
  buildResumeAnalysisData,
  buildSkillGapData,
  buildApplicationHistoryData,
  buildCandidateEvaluationData,
  buildInterviewReportData,
  buildHiringReportData,
  buildPlatformStatisticsData,
  buildVerificationReportData
} = require("../../../services/report-data.service");

function sendPdf(res, { buffer, filename, reportNumber }) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("X-Report-Number", reportNumber);
  res.send(buffer);
}

async function renderReport(res, code, generatedBy, subject, data) {
  const result = await generateEnterpriseReport({ code, generatedBy, subject, data });
  sendPdf(res, result);
}

exports.downloadInternResumeAnalysis = asyncHandler(async (req, res) => {
  const data = await buildResumeAnalysisData(req.user);
  await renderReport(res, REPORT_CODES.RAR, data.subject.name || formatUserName(req.user, req.user.email), data.subject, data);
});

exports.downloadInternSkillGap = asyncHandler(async (req, res) => {
  const internshipId = req.query.internshipId || null;
  const data = await buildSkillGapData(req.user, internshipId);
  await renderReport(res, REPORT_CODES.SGR, data.subject.name || formatUserName(req.user, req.user.email), data.subject, data);
});

exports.downloadInternApplicationHistory = asyncHandler(async (req, res) => {
  const data = await buildApplicationHistoryData(req.user);
  await renderReport(res, REPORT_CODES.AHR, data.subject.name || formatUserName(req.user, req.user.email), data.subject, data);
});

exports.downloadCompanyCandidateEvaluation = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  if (!applicationId) throw new AppError("applicationId is required", 400);
  const data = await buildCandidateEvaluationData(req.user, applicationId);
  await renderReport(res, REPORT_CODES.CHR, data.subject.name || formatUserName(req.user, req.user.email), data.subject, data);
});

exports.downloadCompanyInterviewReport = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  if (!applicationId) throw new AppError("applicationId is required", 400);
  const data = await buildInterviewReportData(req.user, applicationId);
  await renderReport(res, REPORT_CODES.INR, data.subject.name || formatUserName(req.user, req.user.email), data.subject, data);
});

exports.downloadCompanyHiringReport = asyncHandler(async (req, res) => {
  const data = await buildHiringReportData(req.user);
  await renderReport(res, REPORT_CODES.HIR, data.subject.name || formatUserName(req.user, req.user.email), data.subject, data);
});

exports.downloadAdminPlatformStatistics = asyncHandler(async (req, res) => {
  const data = await buildPlatformStatisticsData();
  await renderReport(res, REPORT_CODES.PSR, formatUserName(req.user, req.user.email), data.subject, data);
});

exports.downloadAdminVerificationReport = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  if (!companyId) throw new AppError("companyId is required", 400);
  const data = await buildVerificationReportData(companyId);
  await renderReport(res, REPORT_CODES.VER, formatUserName(req.user, req.user.email), data.subject, data);
});
