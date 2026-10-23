const InternProfile = require("../../../models/InternProfile");
const CompanyProfile = require("../../../models/CompanyProfile");
const Application = require("../../../models/Application");
const Internship = require("../../../models/Internship");
const User = require("../../../models/User");
const AppError = require("../../../shared/utils/AppError");
const { getSkillGap, recommendInternships } = require("../../../services/ai.service");
const { computeApplicationRelevance } = require("../../../services/application-relevance.service");
const { computeResumeScore } = require("../../../services/scorer.service");
const { buildCompanyAnalytics } = require("../../../services/company-analytics.service");
const { applicationScopeFilter, sanitizeFeedbackEntries } = require("../../../services/company-access.service");
const { USER_ROLES } = require("../../../constants/enums");
const { BRAND_NAME, PORTAL_NAME } = require("../../../shared/constants/brand");

function getParsedResumeSkills(profile) {
  const parsed = profile?.resume?.parsed || {};
  const technical = Array.isArray(parsed.technicalSkills) ? parsed.technicalSkills : [];
  const general = Array.isArray(parsed.skills) ? parsed.skills : [];
  const manual = Array.isArray(profile?.skills) ? profile.skills : [];
  return [...new Set([...manual, ...technical, ...general].map((s) => String(s).trim()).filter(Boolean))];
}

async function getInternProfileByUserId(userId) {
  const profile = await InternProfile.findOne({ user: userId });
  if (!profile) throw new AppError("Intern profile not found", 404);
  return profile;
}

async function getCompanyProfileByUserId(userId) {
  const user = await User.findById(userId).select("companyProfileRef email").lean();
  if (user?.companyProfileRef) {
    const linked = await CompanyProfile.findById(user.companyProfileRef).lean();
    if (linked) return { company: linked, user };
  }
  const company = await CompanyProfile.findOne({ user: userId }).lean();
  if (!company) throw new AppError("Company profile not found", 404);
  return { company, user };
}

function formatUserName(user, fallback = "System") {
  if (!user) return fallback;
  return user.fullName || user.email || fallback;
}

async function buildResumeAnalysisData(user) {
  const profile = await getInternProfileByUserId(user._id);
  if (profile.resume?.text) {
    const result = await computeResumeScore({ profile, resumeText: profile.resume.text });
    profile.resume.score = result.resumeScore;
    profile.resume.scoreSource = result.scoreSource;
    profile.resume.predictedCategory = result.predictedCategory || "";
    profile.resume.confidence = typeof result.confidence === "number" ? result.confidence : null;
    profile.resume.analysis = result.analysis || null;
    await profile.save();
  }
  const analysis = profile.resume?.analysis || {};
  const checks = analysis.checks || {};
  return {
    subject: {
      name: profile.fullName,
      email: profile.email,
      phone: profile.mobile,
      role: "Student"
    },
    resumeScore: profile.resume?.score || 0,
    atsScore: analysis.categoryScores?.ats ?? analysis.overallScore ?? 0,
    strengths: analysis.strengths || [],
    weaknesses: analysis.improvements || analysis.criticalIssues || [],
    missingKeywords: checks.missingSkills || [],
    recommendations: analysis.improvements || [],
    categoryScores: analysis.categoryScores || {},
    sectionBreakdown: analysis.sectionBreakdown || []
  };
}

async function buildSkillGapData(user, internshipId) {
  const profile = await getInternProfileByUserId(user._id);
  const internSkills = getParsedResumeSkills(profile);
  let targetInternship = null;
  let analysis = { matched: [], missing: [], matchPercent: 0 };

  if (internshipId) {
    targetInternship = await Internship.findById(internshipId).populate("company").lean();
    if (!targetInternship) throw new AppError("Internship not found", 404);
    analysis = getSkillGap(internSkills, targetInternship.skillsRequired || []);
  } else {
    const internships = await Internship.find({ isActive: true, isDeleted: false }).populate("company").lean();
    const ranked = recommendInternships(profile, internships, { internSkills });
    const top = ranked[0];
    if (top) {
      targetInternship = top.internship;
      analysis = top.skillGap || getSkillGap(internSkills, top.internship.skillsRequired || []);
    }
  }

  const industrySkills = [
    ...(targetInternship?.skillsRequired || []),
    ...(targetInternship?.skillsPreferred || [])
  ];

  return {
    subject: {
      name: profile.fullName,
      email: profile.email,
      role: "Student"
    },
    currentSkills: internSkills,
    missingSkills: analysis.missing || [],
    industrySkills: [...new Set(industrySkills.map((s) => String(s).trim()).filter(Boolean))],
    matchedSkills: analysis.matched || [],
    matchPercent: analysis.matchPercent || 0,
    targetRole: targetInternship?.role || "General Internship Track",
    targetCompany: targetInternship?.company?.companyName || "—",
    learningRecommendations: (analysis.missing || []).slice(0, 12).map(
      (skill) => `Complete structured learning path for ${skill}`
    )
  };
}

async function buildApplicationHistoryData(user) {
  const profile = await getInternProfileByUserId(user._id);
  const applications = await Application.find({ $or: [{ internId: profile._id }, { intern: profile._id }] })
    .populate({ path: "internship", populate: { path: "company" } })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const rows = applications.map((app) => {
    const latestInterview = (app.interviewRounds || []).slice(-1)[0];
    const interviewStatus = latestInterview?.status || "—";
    const finalDecision = ["selected", "offered", "rejected", "withdrawn"].includes(app.status)
      ? app.status
      : "Pending";
    return {
      internshipName: app.internship?.role || "—",
      company: app.internship?.company?.companyName || "—",
      dateApplied: app.appliedAt || app.createdAt,
      currentStatus: app.status,
      interviewStatus,
      finalDecision
    };
  });

  return {
    subject: { name: profile.fullName, email: profile.email, role: "Student" },
    applications: rows
  };
}

async function buildCandidateEvaluationData(user, applicationId) {
  const { company } = await getCompanyProfileByUserId(user._id);
  const application = await Application.findOne({ _id: applicationId, ...applicationScopeFilter(company._id, user) })
    .populate("intern")
    .populate({ path: "internship", populate: { path: "company" } })
    .lean();
  if (!application) throw new AppError("Application not found", 404);

  const intern = application.intern;
  const viewableFeedback = sanitizeFeedbackEntries(application.hrFeedback, user, application.assignedRecruiter);
  const technicalFeedback = viewableFeedback.filter((f) =>
    String(f.category || "").toLowerCase().includes("technical")
  );
  const hrFeedback = viewableFeedback.filter((f) =>
    !String(f.category || "").toLowerCase().includes("technical")
  );
  const ratings = viewableFeedback.map((f) => f.rating).filter((r) => typeof r === "number");
  const avgRating = ratings.length
    ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
    : null;

  let recommendation = "Under Review";
  if (["selected", "offered"].includes(application.status)) recommendation = "Recommended for Hire";
  else if (application.status === "rejected") recommendation = "Not Recommended";

  return {
    subject: { name: company.companyName, email: company.companyEmail, role: "Company" },
    candidate: {
      name: intern?.fullName || "—",
      email: intern?.email || "—",
      phone: intern?.mobile || "—"
    },
    resumeScore: intern?.resume?.score || 0,
    interviewResults: (application.interviewRounds || []).map((round) => ({
      roundType: round.roundType || "—",
      date: round.interviewDate,
      status: round.status,
      notes: round.notes || ""
    })),
    technicalEvaluation: technicalFeedback.map((f) => f.feedback).join("\n") || "No technical evaluation recorded.",
    hrEvaluation: hrFeedback.map((f) => f.feedback).join("\n") || "No HR evaluation recorded.",
    ratings: avgRating,
    finalRecommendation: recommendation,
    internshipRole: application.internship?.role || "—",
    applicationStatus: application.status
  };
}

async function buildInterviewReportData(user, applicationId) {
  const { company } = await getCompanyProfileByUserId(user._id);
  const application = await Application.findOne({ _id: applicationId, ...applicationScopeFilter(company._id, user) })
    .populate("intern")
    .populate("internship")
    .lean();
  if (!application) throw new AppError("Application not found", 404);

  const rounds = (application.interviewRounds || []).map((round) => ({
    interviewDate: round.interviewDate,
    interviewer: company.contactName || "HR Panel",
    roundType: round.roundType || "General",
    feedback: round.notes || "—",
    evaluationNotes: round.notes || "—",
    decision: round.status || "scheduled",
    mode: round.mode || "—"
  }));

  return {
    subject: { name: company.companyName, email: company.companyEmail, role: "Company" },
    candidateName: application.intern?.fullName || "—",
    internshipRole: application.internship?.role || "—",
    rounds,
    overallDecision: application.status
  };
}

async function buildHiringReportData(user) {
  const { company } = await getCompanyProfileByUserId(user._id);
  const analytics = await buildCompanyAnalytics(company._id, user);
  const scope = applicationScopeFilter(company._id, user);
  const applications = await Application.find(scope).select("status").lean();

  const total = applications.length;
  const shortlisted = applications.filter((a) => a.status === "shortlisted").length;
  const rejected = applications.filter((a) => a.status === "rejected").length;
  const selected = applications.filter((a) => ["selected", "offered"].includes(a.status)).length;
  const successRate = total ? Number(((selected / total) * 100).toFixed(2)) : 0;

  return {
    subject: { name: company.companyName, email: company.companyEmail, role: "Company" },
    metrics: {
      applications: total,
      shortlisted,
      rejected,
      selected,
      hiringSuccessRate: successRate
    },
    recruitmentMetrics: analytics.hiringAnalytics || analytics,
    analyticsSummary: analytics
  };
}

async function buildPlatformStatisticsData() {
  const [
    totalStudents,
    totalCompanies,
    activeInternships,
    totalApplications,
    totalHires
  ] = await Promise.all([
    User.countDocuments({ role: USER_ROLES.INTERN, isDeleted: false }),
    CompanyProfile.countDocuments({ isDeleted: false }),
    Internship.countDocuments({ isActive: true, isDeleted: false }),
    Application.countDocuments({}),
    Application.countDocuments({ status: { $in: ["selected", "offered"] } })
  ]);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [recentStudents, recentApplications] = await Promise.all([
    User.countDocuments({ role: USER_ROLES.INTERN, isDeleted: false, createdAt: { $gte: thirtyDaysAgo } }),
    Application.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
  ]);

  return {
    subject: { name: PORTAL_NAME, email: "admin@internai.local", role: "Administrator" },
    statistics: {
      totalStudents,
      totalCompanies,
      totalInternships: activeInternships,
      totalApplications,
      totalHires,
      growthStatistics: {
        newStudentsLast30Days: recentStudents,
        newApplicationsLast30Days: recentApplications,
        studentGrowthRate: totalStudents
          ? Number(((recentStudents / totalStudents) * 100).toFixed(2))
          : 0,
        applicationGrowthRate: totalApplications
          ? Number(((recentApplications / totalApplications) * 100).toFixed(2))
          : 0
      }
    }
  };
}

async function buildVerificationReportData(companyId) {
  const company = await CompanyProfile.findById(companyId).populate("verifiedByAdmin", "email").lean();
  if (!company) throw new AppError("Company not found", 404);

  return {
    subject: { name: `${BRAND_NAME} Admin`, email: "admin@internai.local", role: "Administrator" },
    company: {
      name: company.companyName,
      email: company.companyEmail,
      contact: company.contactName,
      gst: company.gst,
      address: company.address
    },
    verificationStatus: company.verificationStatus,
    submittedDocuments: [
      ...(company.verificationDocuments || []),
      company.linkedInUrl,
      company.hrIdentityProofUrl,
      company.businessRegistrationProofUrl
    ].filter(Boolean),
    adminNotes: company.rejectionReason || "No additional admin notes recorded.",
    decision: company.verificationStatus,
    verifiedBy: company.verifiedByAdmin?.email || "—"
  };
}

module.exports = {
  formatUserName,
  buildResumeAnalysisData,
  buildSkillGapData,
  buildApplicationHistoryData,
  buildCandidateEvaluationData,
  buildInterviewReportData,
  buildHiringReportData,
  buildPlatformStatisticsData,
  buildVerificationReportData
};
