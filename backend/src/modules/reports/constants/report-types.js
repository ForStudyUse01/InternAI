const REPORT_CODES = {
  RAR: "RAR",
  SGR: "SGR",
  AHR: "AHR",
  CHR: "CHR",
  INR: "INR",
  HIR: "HIR",
  PSR: "PSR",
  VER: "VER"
};

const REPORT_DEFINITIONS = {
  [REPORT_CODES.RAR]: {
    code: REPORT_CODES.RAR,
    title: "Resume Analysis Report",
    executiveSummary:
      "This report provides a detailed evaluation of the candidate resume, ATS compatibility, strengths, weaknesses, and actionable improvement recommendations."
  },
  [REPORT_CODES.SGR]: {
    code: REPORT_CODES.SGR,
    title: "Skill Gap Report",
    executiveSummary:
      "This report compares current candidate skills against industry and internship requirements to identify gaps and recommended learning priorities."
  },
  [REPORT_CODES.AHR]: {
    code: REPORT_CODES.AHR,
    title: "Application History Report",
    executiveSummary:
      "This report summarizes internship applications, interview progress, and hiring decisions in a structured audit-ready format."
  },
  [REPORT_CODES.CHR]: {
    code: REPORT_CODES.CHR,
    title: "Candidate Evaluation Report",
    executiveSummary:
      "This report consolidates candidate profile data, resume scoring, interview outcomes, HR feedback, and final hiring recommendation."
  },
  [REPORT_CODES.INR]: {
    code: REPORT_CODES.INR,
    title: "Interview Report",
    executiveSummary:
      "This report documents interview rounds, evaluator feedback, evaluation notes, and the resulting hiring decision."
  },
  [REPORT_CODES.HIR]: {
    code: REPORT_CODES.HIR,
    title: "Hiring Report",
    executiveSummary:
      "This report presents recruitment pipeline metrics including applications, shortlists, rejections, selections, and hiring success rates."
  },
  [REPORT_CODES.PSR]: {
    code: REPORT_CODES.PSR,
    title: "Platform Statistics Report",
    executiveSummary:
      "This report provides an executive overview of platform growth, user adoption, internship activity, applications, and hiring outcomes."
  },
  [REPORT_CODES.VER]: {
    code: REPORT_CODES.VER,
    title: "Verification Report",
    executiveSummary:
      "This report documents company verification status, submitted compliance documents, administrative review notes, and verification decision."
  }
};

const { PORTAL_NAME } = require("../../../shared/constants/brand");
const REPORT_VERSION = "1.0";

module.exports = {
  REPORT_CODES,
  REPORT_DEFINITIONS,
  PORTAL_NAME,
  REPORT_VERSION
};
