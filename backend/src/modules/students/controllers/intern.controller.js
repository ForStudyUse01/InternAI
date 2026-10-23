const path = require("path");

const ReportedCompany = require("../../../models/ReportedCompany");
const InternProfile = require("../../../models/InternProfile");
const Internship = require("../../../models/Internship");
const Application = require("../../../models/Application");
const CompanyProfile = require("../../../models/CompanyProfile");
const asyncHandler = require("../../../shared/utils/asyncHandler");
const AppError = require("../../../shared/utils/AppError");
const { sendSuccess } = require("../../../shared/utils/api-response");
const { getSkillGap, recommendInternships } = require("../../../services/ai.service");
const { buildRoadmap } = require("../../../services/roadmap.service");
const { computeApplicationRelevance } = require("../../../services/application-relevance.service");
const { computeResumeScore } = require("../../../services/scorer.service");
const { buildApplicationInsight } = require("../services/application-insight.service");
const { parseResumeFile } = require("../../../services/resume-parser.service");
const { structuredResumeParse } = require("../../../services/resume-structured-parser.service");
const { mergeParsedResumeIntoProfile } = require("../services/profile-sync.service");
const { normalizeSkillList, toDisplaySkillList } = require("../../../shared/utils/skill-normalizer");
const { storeUploadedFile } = require("../../../shared/infrastructure/storage/storage.adapter");
const { logActivity } = require("../../../services/activity-log.service");
const { resolvePagination } = require("../../../shared/utils/pagination");
const { sendNotificationEmail } = require("../../../services/notification.service");
const { createInAppNotification, notifyInternByProfileId, notifyCompanyApplicationStakeholders } = require("../../../services/in-app-notification.service");
const { NOTIFICATION_TYPES } = require("../../../constants/notification-types");
const { APPLICATION_STATUS } = require("../../../constants/enums");
const {
  listInternInterviews,
  processInterviewRemindersForIntern,
  notifyRescheduleRequested
} = require("../../../services/interview-workflow.service");
const { withVersionRetry } = require("../../../shared/utils/with-version-retry");
const { sanitizeApplicationFeedback } = require("../../companies/services/company-access.service");
const {
  cacheOrFetch,
  invalidateKey,
  invalidatePattern,
  CacheKeys,
  CacheTTL
} = require("../../../shared/infrastructure/cache");
const logger = require("../../../shared/logger");

// Invalidate every read model that depends on the student's profile / skills /
// resume (profile view, resume+ATS score, AI recommendation, skill-gap, and the
// application relevance scores). Called after any profile/resume mutation.
async function invalidateStudentProfileScope(userId) {
  const id = String(userId);
  await Promise.all([
    invalidateKey(CacheKeys.studentProfile(id)),
    invalidatePattern(`${CacheKeys.studentResumePrefix(id)}*`),
    invalidateKey(CacheKeys.studentATS(id)),
    invalidateKey(CacheKeys.studentRecommendation(id)),
    invalidatePattern(`${CacheKeys.studentSkillGapPrefix(id)}:*`),
    invalidatePattern(`${CacheKeys.studentApplicationsPrefix(id)}:*`)
  ]);
  logger.info(`[cache] invalidated student profile scope for ${id}`);
}

async function invalidateStudentApplicationsScope(userId) {
  const id = String(userId);
  await invalidatePattern(`${CacheKeys.studentApplicationsPrefix(id)}:*`);
  logger.info(`[cache] invalidated student applications for ${id}`);
}

function toProfilePayload(profileDoc) {
  const profile = profileDoc.toObject ? profileDoc.toObject() : profileDoc;
  const resumeUploaded = Boolean(profile?.resume?.filePath || profile?.resume?.text);
  // `profile.skills` is already the fully-synced, authoritative value --
  // profile-sync.service.js writes it on every resume upload, and
  // updateProfile writes it on every manual edit. Re-unioning it with
  // `resume.parsed.skills` here would silently resurrect a resume's skills
  // after the student manually removed one via Edit Profile (parsed.skills
  // isn't touched by manual edits, so it can go stale relative to
  // profile.skills) -- exactly the "old data reappearing" bug this profile
  // must never have.
  const savedSkills = normalizeSkillList(Array.isArray(profile?.skills) ? profile.skills : []);
  return { ...profile, skills: toDisplaySkillList(savedSkills), resumeUploaded };
}

const DEFAULT_TARGET_ROLE = "full_stack_developer";

async function getInternProfileByUserId(userId) {
  const profile = await InternProfile.findOne({ user: userId });
  if (!profile) {
    throw new AppError("Intern profile not found", 404);
  }
  return profile;
}

async function refreshProfileScore(profile, resumeTextOverride = "", targetRoleKey = "full_stack_developer") {
  const result = await computeResumeScore({
    profile,
    resumeText: resumeTextOverride || profile.resume?.text || "",
    targetRoleKey
  });

  profile.resume.score = result.resumeScore;
  profile.resume.scoreSource = result.scoreSource;
  profile.resume.predictedCategory = result.predictedCategory || "";
  profile.resume.confidence = typeof result.confidence === "number" ? result.confidence : null;
  profile.resume.analysis = result.analysis || null;
}

function getParsedResumeSkills(profile) {
  const parsedSkills = profile?.resume?.parsed?.skills;
  return normalizeSkillList(Array.isArray(parsedSkills) ? parsedSkills : []);
}

function normalizeResumePublicPath(filePath = "") {
  const normalized = String(filePath || "").replace(/\\/g, "/").trim();
  if (!normalized) return "";

  const uploadsIdx = normalized.indexOf("/uploads/");
  if (uploadsIdx >= 0) return normalized.slice(uploadsIdx + 1);
  if (normalized.startsWith("uploads/")) return normalized;
  if (normalized.includes("uploads/")) return normalized.slice(normalized.indexOf("uploads/"));
  return normalized;
}

function isValidLinkedInUrl(url) {
  if (!url) return true;
  try {
    const parsed = new URL(String(url).startsWith("http") ? String(url) : `https://${String(url)}`);
    return parsed.hostname.includes("linkedin.com");
  } catch {
    return false;
  }
}

function isValidHttpUrl(url) {
  if (!url) return true;
  try {
    const parsed = new URL(String(url).startsWith("http") ? String(url) : `https://${String(url)}`);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

exports.getProfile = asyncHandler(async (req, res) => {
  const payload = await cacheOrFetch(
    CacheKeys.studentProfile(String(req.user._id)),
    async () => {
      const profile = await getInternProfileByUserId(req.user._id);
      const { getCertificationStats } = require("../../../services/certification.service");
      const certificationStats = await getCertificationStats(req.user._id);
      return {
        profile: {
          ...toProfilePayload(profile),
          certificationStats,
          verifiedCertificationCount: profile.verifiedCertificationCount || certificationStats.verified
        }
      };
    },
    CacheTTL.profile
  );
  return sendSuccess(res, { data: payload });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const profile = await getInternProfileByUserId(req.user._id);

  const allowed = [
    "fullName",
    "mobile",
    "skills",
    "softSkills",
    "skillDetails",
    "education",
    "educationDetails",
    "projects",
    "certifications",
    "certificationEntries",
    "courseEntries",
    "experience",
    "achievements",
    "languages",
    "links",
    "summary",
    "bio",
    "address",
    "interests",
    "completedCourses",
    "linkedinUrl",
    "githubUrl",
    "portfolioUrl",
    "profileSections"
  ];

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (field === "skills" || field === "softSkills") {
        profile[field] = toDisplaySkillList(normalizeSkillList(req.body[field]));
      } else if (field === "linkedinUrl") {
        if (!isValidLinkedInUrl(req.body.linkedinUrl)) {
          throw new AppError("linkedinUrl must be a valid LinkedIn URL", 400);
        }
        profile.linkedinUrl = String(req.body.linkedinUrl || "").trim();
      } else if (field === "githubUrl") {
        if (!isValidHttpUrl(req.body.githubUrl)) {
          throw new AppError("githubUrl must be a valid URL", 400);
        }
        profile.githubUrl = String(req.body.githubUrl || "").trim();
      } else if (field === "portfolioUrl") {
        if (!isValidHttpUrl(req.body.portfolioUrl)) {
          throw new AppError("portfolioUrl must be a valid URL", 400);
        }
        profile.portfolioUrl = String(req.body.portfolioUrl || "").trim();
      } else if (field === "profileSections" && req.body.profileSections && typeof req.body.profileSections === "object") {
        // `profile.profileSections` is a Mongoose single-nested subdocument,
        // not a plain object -- spreading it directly (`{...profile.profileSections}`)
        // does not reliably copy its nested fields (e.g. personalInformation),
        // which can leave them explicitly `undefined` and fail Mongoose's cast
        // on save. Convert to a plain object first so a partial update (e.g.
        // just `{ professionalSummary }`) safely merges over the existing data
        // instead of corrupting sibling nested fields.
        const currentSections = profile.profileSections?.toObject ? profile.profileSections.toObject() : profile.profileSections || {};
        profile.profileSections = { ...currentSections, ...req.body.profileSections };
      } else {
        profile[field] = req.body[field];
      }
    }
  });

  if (profile.linkedinUrl) {
    const links = new Set(profile.links || []);
    links.add(profile.linkedinUrl);
    profile.links = Array.from(links);
  }

  if (profile.resume?.text) {
    await refreshProfileScore(profile);
  }

  await profile.save();
  await logActivity({
    actorUser: req.user._id,
    actorRole: req.user.role,
    entityType: "intern_profile",
    entityId: profile._id,
    action: "profile_updated",
    metadata: { fields: Object.keys(req.body || {}) },
    ipAddress: req.ip
  });

  const { syncPortfolioOnProfileChange } = require("../../../services/portfolio.service");
  syncPortfolioOnProfileChange(req.user._id).catch(() => undefined);

  await invalidateStudentProfileScope(req.user._id);

  return sendSuccess(res, { message: "Profile updated", data: { profile: toProfilePayload(profile) } });
});

exports.uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("Resume file is required", 400);
  }

  const profile = await getInternProfileByUserId(req.user._id);

  let resumeText = await parseResumeFile(req.file);
  if (!resumeText) {
    throw new AppError("Could not extract text from resume. Please upload a clear PDF/DOCX/TXT file.", 400);
  }

  const parsed = structuredResumeParse(resumeText);

  profile.resume.filePath = normalizeResumePublicPath(path.relative(path.join(__dirname, "../.."), req.file.path));

  try {
    const stored = await storeUploadedFile({ filePath: req.file.path, folder: "resumes", resourceType: "raw" });
    if (stored?.url) {
      profile.resume.filePath = stored.url.startsWith("http") ? stored.url : profile.resume.filePath;
    }
  } catch {
    // Local disk path remains the fallback when Cloudinary is unavailable.
  }

  profile.resume.text = resumeText;
  profile.resume.parsed = parsed;
  // Professional Summary is auto-filled only when the student has never
  // written one; once set, it is only ever replaced via an explicit student
  // confirmation on the frontend (comparing against `parsed.summary` below).
  // See profile-sync.service.js for the full merge policy.
  mergeParsedResumeIntoProfile(profile, parsed);

  await refreshProfileScore(profile, resumeText);
  await profile.save();
  await logActivity({
    actorUser: req.user._id,
    actorRole: req.user.role,
    entityType: "intern_profile",
    entityId: profile._id,
    action: "resume_uploaded",
    metadata: { filePath: profile.resume.filePath },
    ipAddress: req.ip
  });

  const { syncPortfolioOnProfileChange } = require("../../../services/portfolio.service");
  syncPortfolioOnProfileChange(req.user._id).catch(() => undefined);

  await invalidateStudentProfileScope(req.user._id);

  return sendSuccess(res, {
    message: "Resume uploaded and parsed",
    data: {
      resumeUploaded: true,
      profile: toProfilePayload(profile),
      parsed
    }
  });
});

exports.getResumeScore = asyncHandler(async (req, res) => {
  const id = String(req.user._id);
  const targetRole = String(req.query.targetRole || DEFAULT_TARGET_ROLE);
  const forceRefresh = String(req.query.refresh || "").toLowerCase() === "true";
  const internshipId = String(req.query.internshipId || "").trim();

  // On an explicit recalculation, drop the cached score/ATS view so the
  // cacheOrFetch below misses and recomputes, then re-populates the cache.
  if (forceRefresh) {
    await invalidateKey(CacheKeys.studentResume(id, internshipId, targetRole));
    await invalidateKey(CacheKeys.studentATS(id));
  }

  const payload = await cacheOrFetch(
    CacheKeys.studentResume(id, internshipId, targetRole),
    async () => {
      const profile = await getInternProfileByUserId(req.user._id);

      if (internshipId) {
        // Scored against a specific posting's actual required/preferred
        // skills (keyword relevance + required-skills-matched), instead of
        // the generic static role preset. Not persisted onto profile.resume
        // since that field holds the student's one generic/default score.
        const internship = await Internship.findById(internshipId)
          .select("role skillsRequired prioritySkills educationQualification degreePreferences minimumCgpa experienceRequirement")
          .lean();
        if (!internship) {
          throw new AppError("Internship not found", 404);
        }
        const internshipContext = {
          requiredSkills: internship.skillsRequired || [],
          preferredSkills: internship.prioritySkills || [],
          roleLabel: internship.role || "Selected internship",
          educationQualification: internship.educationQualification || "",
          degreePreferences: internship.degreePreferences || "",
          minimumCgpa: internship.minimumCgpa || "",
          experienceRequirement: internship.experienceRequirement || ""
        };
        const result = await computeResumeScore({ profile, resumeText: profile.resume?.text || "", targetRoleKey: targetRole, internshipContext });
        return {
          score: result.resumeScore,
          scoreSource: result.scoreSource,
          predictedCategory: result.predictedCategory,
          confidence: result.confidence,
          analysis: result.analysis,
          parsed: profile.resume.parsed || null
        };
      }

      // "full_stack_developer" is the platform default role: its score is the
      // one persisted onto profile.resume and reused by recruiter-facing
      // views (candidate listing, reports) that have no role context of
      // their own. Any other targetRole is a per-role, role-scoped
      // calculation for this dashboard only — it must never overwrite that
      // shared default, or switching roles on the dashboard would corrupt
      // the generic score recruiters see.
      if (targetRole === DEFAULT_TARGET_ROLE) {
        if (forceRefresh || profile.resume?.score == null) {
          await refreshProfileScore(profile, "", targetRole);
          await profile.save();
        }
        return {
          score: profile.resume.score,
          scoreSource: profile.resume.scoreSource,
          predictedCategory: profile.resume.predictedCategory,
          confidence: profile.resume.confidence,
          analysis: profile.resume.analysis,
          parsed: profile.resume.parsed || null
        };
      }

      const result = await computeResumeScore({
        profile,
        resumeText: profile.resume?.text || "",
        targetRoleKey: targetRole
      });
      return {
        score: result.resumeScore,
        scoreSource: result.scoreSource,
        predictedCategory: result.predictedCategory,
        confidence: result.confidence,
        analysis: result.analysis,
        parsed: profile.resume.parsed || null
      };
    },
    CacheTTL.resumeScore
  );

  return sendSuccess(res, { data: payload });
});

exports.getSkillGap = asyncHandler(async (req, res) => {
  const { internshipId } = req.body;
  if (!internshipId) {
    throw new AppError("internshipId is required", 400);
  }

  const payload = await cacheOrFetch(
    CacheKeys.studentSkillGap(String(req.user._id), internshipId),
    async () => {
      const profile = await getInternProfileByUserId(req.user._id);
      const internship = await Internship.findById(internshipId).lean();
      if (!internship) {
        throw new AppError("Internship not found", 404);
      }
      const internSkills = getParsedResumeSkills(profile);
      const analysis = getSkillGap(internSkills, internship.skillsRequired || []);
      return { internshipId, analysis };
    },
    CacheTTL.skillGap
  );
  return sendSuccess(res, { data: payload });
});

exports.getApplicationAiInsights = asyncHandler(async (req, res) => {
  const { internshipId } = req.params;
  if (!internshipId) {
    throw new AppError("internshipId is required", 400);
  }

  const payload = await cacheOrFetch(
    CacheKeys.studentApplicationInsight(String(req.user._id), internshipId),
    async () => {
      const profile = await getInternProfileByUserId(req.user._id);
      const internship = await Internship.findById(internshipId).lean();
      if (!internship) {
        throw new AppError("Internship not found", 404);
      }
      const result = await buildApplicationInsight({ profile, internship, userId: String(req.user._id) });
      return { internshipId, ...result };
    },
    CacheTTL.applicationInsight
  );
  return sendSuccess(res, { data: payload });
});

exports.getCareerRoadmap = asyncHandler(async (req, res) => {
  const profile = await getInternProfileByUserId(req.user._id);
  const targetRole = String(req.body?.targetRole || "full_stack_developer");
  const roadmap = buildRoadmap({
    targetRole,
    currentSkills: profile?.resume?.parsed?.skills || profile?.skills || []
  });
  return sendSuccess(res, { data: { roadmap } });
});

exports.getActiveInternships = asyncHandler(async (req, res) => {
  const profile = await getInternProfileByUserId(req.user._id);
  const { page, limit, skip } = resolvePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
  const location = String(req.query.location || "").trim();
  const mode = String(req.query.mode || "").trim();
  const role = String(req.query.role || "").trim();

  const query = { isActive: true, isDeleted: false };
  if (location) query.location = { $regex: location, $options: "i" };
  if (mode && ["remote", "on-site", "hybrid"].includes(mode)) query.mode = mode;
  if (role) query.role = { $regex: role, $options: "i" };

  const [internshipDocs, total] = await Promise.all([
    Internship.find(query).populate("company").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Internship.countDocuments(query)
  ]);

  const internships = internshipDocs.map((doc) => {
    const internship = doc.toObject ? doc.toObject() : doc;
    const relevance = computeApplicationRelevance(profile, internship);
    return {
      ...internship,
      matchPercent: relevance.relevanceScore,
      missingRequiredSkills: relevance.missingRequiredSkills || []
    };
  });

  return sendSuccess(res, {
    data: { internships, page, limit, total },
    meta: { pagination: { page, limit, total, totalPages: limit > 0 ? Math.ceil(total / limit) : 0 } }
  });
});

exports.getRecommendations = asyncHandler(async (req, res) => {
  const payload = await cacheOrFetch(
    CacheKeys.studentRecommendation(String(req.user._id)),
    async () => {
      const profile = await getInternProfileByUserId(req.user._id);

      if (profile.resume?.text && profile.resume?.score == null) {
        await refreshProfileScore(profile);
        await profile.save();
      }

      const parsedSkills = getParsedResumeSkills(profile);
      if (parsedSkills.length === 0) {
        return {
          recommendations: [],
          reason: "missing_resume_skills",
          message: "Upload your resume to get accurate AI internship recommendations."
        };
      }

      const internships = await Internship.find({ isActive: true, isDeleted: false })
        .select("role skillsRequired location mode stipend duration internshipType department description company prioritySkills")
        .populate("company", "companyName verificationStatus")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      const ranked = recommendInternships(profile, internships, { internSkills: parsedSkills });

      return {
        source: "parsed_resume_skills",
        recommendations: ranked.map((item) => ({
          internship: item.internship,
          requiredSkillMatchPercent: item.requiredSkillMatchPercent,
          preferredSkillMatchPercent: item.preferredSkillMatchPercent,
          overallRecommendationScore: item.overallRecommendationScore,
          recommendationScore: item.recommendationScore,
          skillMatchPercent: item.skillMatchPercent,
          matchedRequiredSkills: item.matchedRequiredSkills,
          missingRequiredSkills: item.missingRequiredSkills,
          matchedPreferredSkills: item.matchedPreferredSkills,
          missingPreferredSkills: item.missingPreferredSkills,
          skillGap: item.skillGap
        }))
      };
    },
    CacheTTL.recommendation
  );

  return sendSuccess(res, {
    ...(payload.message ? { message: payload.message } : {}),
    data: payload
  });
});

exports.applyToInternship = asyncHandler(async (req, res) => {
  const { internshipId } = req.params;
  const { availabilityStatus, joiningDate } = req.body || {};

  const profile = await getInternProfileByUserId(req.user._id);
  const internship = await Internship.findById(internshipId).populate("company");

  if (!internship || !internship.isActive) {
    throw new AppError("Internship not found or inactive", 404);
  }

  const company = await CompanyProfile.findById(internship.company);
  if (!company) {
    throw new AppError("Internship company not found", 404);
  }

  const existingApplication = await Application.findOne({ internId: profile._id, internshipId: internship._id });
  if (existingApplication) {
    throw new AppError("You have already applied to this internship", 409);
  }

  const resumePath = normalizeResumePublicPath(profile?.resume?.filePath || "");
  if (!resumePath) {
    throw new AppError("Please upload your resume in profile before applying.", 400);
  }

  if (!String(profile?.summary || "").trim()) {
    throw new AppError("Please add your Professional Summary in profile before applying.", 400);
  }

  if (!["yes", "no"].includes(String(availabilityStatus || "").toLowerCase())) {
    throw new AppError("availabilityStatus must be either 'yes' or 'no'", 400);
  }

  const normalizedAvailability = String(availabilityStatus).toLowerCase();
  let parsedJoiningDate = null;
  if (normalizedAvailability === "no") {
    if (!joiningDate) {
      throw new AppError("When can you join? is required when availability is No", 400);
    }
    parsedJoiningDate = new Date(joiningDate);
    if (Number.isNaN(parsedJoiningDate.getTime())) {
      throw new AppError("Invalid joining date", 400);
    }
  }

  const relevance = computeApplicationRelevance(profile, internship);

  if (process.env.RECOMMENDATION_DEBUG === "true") {
    // eslint-disable-next-line no-console
    console.log("[application-relevance-debug]", JSON.stringify({
      internshipId: internship._id,
      internId: profile._id,
      normalizedInternSkills: relevance.debug.normalizedInternSkills,
      normalizedRequiredSkills: relevance.debug.normalizedRequiredSkills,
      matchedRequiredSkills: relevance.matchedRequiredSkills,
      missingRequiredSkills: relevance.missingRequiredSkills,
      requiredSkillMatchPercent: relevance.requiredSkillMatchPercent,
      relevanceScore: relevance.relevanceScore
    }));
  }

  let application;
  try {
    application = await Application.create({
      internId: profile._id,
      internshipId: internship._id,
      companyId: company._id,
      intern: profile._id,
      internship: internship._id,
      company: company._id,
      status: APPLICATION_STATUS.APPLIED,
      appliedAt: new Date(),
      attachedResumePath: resumePath,
      assignedRecruiter: internship.assignedRecruiter || null,
      availabilityStatus: normalizedAvailability,
      joiningDate: parsedJoiningDate,
      relevanceScore: relevance.relevanceScore,
      matchScore: relevance.relevanceScore,
      relevanceBreakdown: {
        requiredSkillMatchPercent: relevance.requiredSkillMatchPercent,
        preferredSkillMatchPercent: relevance.preferredSkillMatchPercent,
        overallSkillScore: relevance.overallSkillScore,
        matchedRequiredSkills: relevance.matchedRequiredSkills,
        missingRequiredSkills: relevance.missingRequiredSkills,
        weightedComponents: relevance.weightedComponents
      },
      stageHistory: [{ stage: APPLICATION_STATUS.APPLIED, note: "Application submitted" }]
    });
  } catch (error) {
    if (error && error.code === 11000) {
      throw new AppError("You have already applied to this internship", 409);
    }
    throw error;
  }

  await invalidateStudentApplicationsScope(req.user._id);

  sendSuccess(res, {
    statusCode: 201,
    message: "Application submitted",
    data: {
      application,
      relevance: {
        relevanceScore: relevance.relevanceScore,
        requiredSkillMatchPercent: relevance.requiredSkillMatchPercent,
        preferredSkillMatchPercent: relevance.preferredSkillMatchPercent,
        missingRequiredSkills: relevance.missingRequiredSkills
      }
    }
  });
  sendNotificationEmail({
    to: profile.email,
    subject: "Application Submitted",
    text: `You have successfully applied for ${internship.role}.`,
    type: "application_submitted"
  });
  await createInAppNotification({
    userId: req.user._id,
    type: NOTIFICATION_TYPES.APPLICATION_SUBMITTED,
    title: "Application submitted",
    message: `You applied for ${internship.role}.`,
    link: "/dashboard/intern/applications",
    metadata: { applicationId: application._id, internshipId: internship._id }
  });
  await notifyCompanyApplicationStakeholders({
    companyProfileId: company._id,
    assignedRecruiterId: application.assignedRecruiter,
    internshipAssignedRecruiterId: internship.assignedRecruiter,
    payload: {
      type: NOTIFICATION_TYPES.APPLICATION_RECEIVED,
      title: "New application received",
      message: `${profile.fullName || profile.email} applied for ${internship.role}.`,
      link: "/dashboard/company/hiring-applicants",
      metadata: {
        applicationId: application._id,
        internshipId: internship._id,
        internProfileId: profile._id
      }
    }
  });
});

exports.getMyApplications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = resolvePagination(req.query, { defaultLimit: 10, maxLimit: 100 });

  const payload = await cacheOrFetch(
    CacheKeys.studentApplications(String(req.user._id), page, limit),
    async () => {
      const profile = await getInternProfileByUserId(req.user._id);

      const query = { $or: [{ internId: profile._id }, { intern: profile._id }] };
      const [applications, total] = await Promise.all([
        Application.find(query)
          .populate({
            path: "internship",
            populate: { path: "company", select: "companyName companyEmail verificationStatus website" }
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Application.countDocuments(query)
      ]);

      const enriched = applications.map((application) => {
        const relevance = computeApplicationRelevance(profile || {}, application.internship || {});
        const nextScore = relevance.relevanceScore;
        return {
          ...application,
          relevanceScore: nextScore,
          matchScore: nextScore
        };
      });

      const staleUpdates = applications
        .map((application, index) => {
          const nextScore = enriched[index].relevanceScore;
          const prevScore = application.relevanceScore ?? application.matchScore ?? -1;
          if (prevScore === nextScore) return null;
          return {
            updateOne: {
              filter: { _id: application._id },
              update: { $set: { relevanceScore: nextScore, matchScore: nextScore } }
            }
          };
        })
        .filter(Boolean);

      if (staleUpdates.length > 0) {
        Application.bulkWrite(staleUpdates).catch(() => {});
      }

      return { applications: enriched, page, limit, total };
    },
    CacheTTL.applications
  );

  return sendSuccess(res, {
    data: payload,
    meta: {
      pagination: {
        page: payload.page,
        limit: payload.limit,
        total: payload.total,
        totalPages: payload.limit > 0 ? Math.ceil(payload.total / payload.limit) : 0
      }
    }
  });
});

exports.getSavedInternships = asyncHandler(async (req, res) => {
  const profile = await getInternProfileByUserId(req.user._id);
  await profile.populate({
    path: "savedInternships",
    match: { isActive: true },
    populate: { path: "company" }
  });
  return sendSuccess(res, { data: { internships: profile.savedInternships || [] } });
});

exports.saveInternship = asyncHandler(async (req, res) => {
  const { internshipId } = req.params;
  const profile = await getInternProfileByUserId(req.user._id);
  const internship = await Internship.findOne({ _id: internshipId, isActive: true });
  if (!internship) {
    throw new AppError("Internship not found", 404);
  }

  const existing = (profile.savedInternships || []).some((item) => String(item) === String(internshipId));
  if (existing) {
    return sendSuccess(res, { message: "Internship already saved" });
  }

  profile.savedInternships = [...(profile.savedInternships || []), internship._id];
  await profile.save();
  return sendSuccess(res, { statusCode: 201, message: "Internship saved" });
});

exports.unsaveInternship = asyncHandler(async (req, res) => {
  const { internshipId } = req.params;
  const profile = await getInternProfileByUserId(req.user._id);
  profile.savedInternships = (profile.savedInternships || []).filter((item) => String(item) !== String(internshipId));
  await profile.save();
  return sendSuccess(res, { message: "Internship removed from saved list" });
});

exports.getMyFeedback = asyncHandler(async (req, res) => {
  const profile = await getInternProfileByUserId(req.user._id);

  const applications = await Application.find({ $or: [{ internId: profile._id }, { intern: profile._id }] })
    .populate("internship")
    .select("internship hrFeedback status updatedAt")
    .lean();

  const feedback = applications
    .map((item) => ({
      internship: item.internship,
      status: item.status,
      feedback: (item.hrFeedback || []).filter((entry) => entry.visibility !== "internal")
    }))
    .filter((item) => item.feedback.length > 0);

  return sendSuccess(res, { data: { feedback } });
});

const WITHDRAW_BLOCKED_STATUSES = new Set([
  APPLICATION_STATUS.SELECTED,
  APPLICATION_STATUS.OFFERED,
  APPLICATION_STATUS.REJECTED,
  APPLICATION_STATUS.WITHDRAWN
]);

exports.withdrawApplication = asyncHandler(async (req, res) => {
  const profile = await getInternProfileByUserId(req.user._id);
  const application = await Application.findOne({
    _id: req.params.applicationId,
    $or: [{ internId: profile._id }, { intern: profile._id }]
  }).populate("internship");

  if (!application) {
    throw new AppError("Application not found", 404);
  }

  if (WITHDRAW_BLOCKED_STATUSES.has(application.status)) {
    throw new AppError(`Cannot withdraw application in ${application.status} status`, 400);
  }

  application.status = APPLICATION_STATUS.WITHDRAWN;
  application.stageHistory.push({
    stage: APPLICATION_STATUS.WITHDRAWN,
    note: "Withdrawn by candidate"
  });
  await application.save();

  await logActivity({
    actorUser: req.user._id,
    actorRole: req.user.role,
    entityType: "application",
    entityId: application._id,
    action: "application_withdrawn",
    metadata: { internshipId: application.internshipId },
    ipAddress: req.ip
  });

  await invalidateStudentApplicationsScope(req.user._id);

  await notifyCompanyApplicationStakeholders({
    companyProfileId: application.companyId || application.company,
    assignedRecruiterId: application.assignedRecruiter,
    internshipAssignedRecruiterId: application.internship?.assignedRecruiter,
    excludeUserId: req.user._id,
    payload: {
      type: NOTIFICATION_TYPES.APPLICATION_STATUS_CHANGED,
      title: "Application withdrawn",
      message: `${profile.fullName || profile.email} withdrew their application for ${application.internship?.role || "an internship"}.`,
      link: "/dashboard/company/hiring-applicants",
      metadata: { applicationId: application._id, status: APPLICATION_STATUS.WITHDRAWN }
    }
  });

  return sendSuccess(res, {
    message: "Application withdrawn",
    data: { application: sanitizeApplicationFeedback(application, req.user) }
  });
});

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

exports.reportCompany = asyncHandler(async (req, res) => {
  const { companyId, reason, details = "", reportType = "other", evidenceUrls = [], internshipId = null, hrUserId = null } = req.body || {};

  if (!companyId || !reason) {
    throw new AppError("companyId and reason are required", 400);
  }
  if (!OBJECT_ID_PATTERN.test(companyId)) {
    throw new AppError("Invalid company ID", 400);
  }
  if (internshipId && !OBJECT_ID_PATTERN.test(internshipId)) {
    throw new AppError("Invalid internship ID", 400);
  }
  if (hrUserId && !OBJECT_ID_PATTERN.test(hrUserId)) {
    throw new AppError("Invalid HR user ID", 400);
  }

  const company = await CompanyProfile.exists({ _id: companyId });
  if (!company) {
    throw new AppError("Company not found", 404);
  }

  const report = await ReportedCompany.create({
    company: companyId,
    reason,
    details,
    reportType,
    evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls.filter(Boolean) : [],
    internship: internshipId,
    hrUser: hrUserId,
    reportedBy: req.user._id
  });

  await logActivity({
    actorUser: req.user._id,
    actorRole: req.user.role,
    entityType: "company_report",
    entityId: report._id,
    action: "report_created",
    metadata: { companyId },
    ipAddress: req.ip
  });

  return sendSuccess(res, { statusCode: 201, message: "Company reported", data: { report } });
});

exports.getMyInterviews = asyncHandler(async (req, res) => {
  const profile = await getInternProfileByUserId(req.user._id);
  const interviews = await listInternInterviews(profile._id);
  return sendSuccess(res, { data: { interviews } });
});

exports.checkInterviewReminders = asyncHandler(async (req, res) => {
  const profile = await getInternProfileByUserId(req.user._id);
  const result = await processInterviewRemindersForIntern(profile._id);
  return sendSuccess(res, { data: result });
});

exports.requestInterviewReschedule = asyncHandler(async (req, res) => {
  const profile = await getInternProfileByUserId(req.user._id);
  const reason = String(req.body?.reason || "").trim().slice(0, 500);

  let application;
  let round;
  await withVersionRetry(async () => {
    application = await Application.findOne({
      _id: req.params.applicationId,
      $or: [{ internId: profile._id }, { intern: profile._id }]
    });
    if (!application) {
      throw new AppError("Application not found", 404);
    }

    round = (application.interviewRounds || []).id(req.params.roundId);
    if (!round) {
      throw new AppError("Interview round not found", 404);
    }
    if (round.status !== "scheduled") {
      throw new AppError("Only a scheduled interview can have a reschedule requested", 400);
    }

    round.rescheduleRequestedByCandidate = { requestedAt: new Date(), reason, acknowledged: false };
    round.updatedAt = new Date();
    await application.save();
  });

  await notifyRescheduleRequested({ application, round }).catch((err) => {
    console.error(`[interviews] failed to notify reschedule-request for round ${round._id}:`, err.message);
  });

  return sendSuccess(res, {
    message: "Reschedule request sent",
    data: { application: sanitizeApplicationFeedback(application, req.user) }
  });
});
