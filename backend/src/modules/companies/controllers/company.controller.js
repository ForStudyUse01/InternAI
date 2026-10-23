const fs = require("fs/promises");
const path = require("path");
const User = require("../../../models/User");
const CompanyProfile = require("../../../models/CompanyProfile");
const Internship = require("../../../models/Internship");
const Application = require("../../../models/Application");
const InternProfile = require("../../../models/InternProfile");
const asyncHandler = require("../../../shared/utils/asyncHandler");
const AppError = require("../../../shared/utils/AppError");
const { sendSuccess } = require("../../../shared/utils/api-response");
const { rankApplicantsForInternship } = require("../../../services/ai.service");
const { computeApplicationRelevance } = require("../../../services/application-relevance.service");
const { normalizeSkillList, toDisplaySkillList } = require("../../../shared/utils/skill-normalizer");
const { APPLICATION_STATUS } = require("../../../constants/enums");
const { canTransition, TERMINAL_STATUSES } = require("../../../services/pipeline.service");
const { withVersionRetry } = require("../../../shared/utils/with-version-retry");
const { resolvePagination } = require("../../../shared/utils/pagination");
const { logActivity } = require("../../../services/activity-log.service");
const { sendNotificationEmail } = require("../../../services/notification.service");
const { notifyInternByProfileId } = require("../../../services/in-app-notification.service");
const { NOTIFICATION_TYPES } = require("../../../constants/notification-types");
const {
  canAssignRecruiters,
  buildListMeta,
  applicantsQueryForInternship,
  resolveEffectiveSidebarModules,
  sanitizeApplicationFeedback,
  sanitizeApplicationListFeedback
} = require("../../../services/company-access.service");
const companyQuery = require("../../../services/company-query.service");
const portfolioService = require("../../../services/portfolio.service");
const { storeUploadedFile } = require("../../../shared/infrastructure/storage/storage.adapter");
const { UPLOAD_DIRECTORIES } = require("../../students/services/file-upload.service");
const { buildCompanyAnalytics } = require("../../../services/company-analytics.service");
const { isEnabled } = require("../../../shared/config/feature-flags");
const interviewRoomService = require("../../../services/interview-room.service");
const { notifyInterviewScheduled, notifyInterviewUpdated } = require("../../../services/interview-workflow.service");

const VALID_ROUND_STATUSES = new Set(["scheduled", "completed", "cleared", "rejected", "cancelled", "no_show"]);

function normalizeDateKey(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function parseInterviewDateOnly(value) {
  const raw = String(value || "").trim();
  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? raw
    : raw.includes("T")
      ? new Date(raw).toISOString().slice(0, 10)
      : raw.slice(0, 10);
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return new Date(value);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function normalizeInterviewers(value) {
  const list = Array.isArray(value) ? value : [];
  return list
    .map((entry) => {
      if (typeof entry === "string") return { name: entry.trim(), role: "" };
      if (entry && typeof entry === "object") {
        return { name: String(entry.name || "").trim(), role: String(entry.role || "").trim() };
      }
      return null;
    })
    .filter((entry) => entry && entry.name);
}

function normalizeDurationMinutes(value, fallback = 60) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.min(480, Math.max(5, Math.round(num)));
}

function isDuplicateScheduledRound(rounds, { roundType, interviewDate, interviewTime }) {
  const normalizedType = String(roundType || "").trim().toLowerCase();
  const dateKey = normalizeDateKey(interviewDate);
  const timeKey = String(interviewTime || "").slice(0, 5);
  return (rounds || []).some(
    (round) =>
      String(round.status || "").toLowerCase() === "scheduled" &&
      String(round.roundType || "").trim().toLowerCase() === normalizedType &&
      normalizeDateKey(round.interviewDate) === dateKey &&
      String(round.interviewTime || "").slice(0, 5) === timeKey
  );
}

function normalizeIncomingSkills(value) {
  const list = Array.isArray(value) ? value : [];
  return toDisplaySkillList(normalizeSkillList(list));
}

function normalizeMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (!mode) return "";
  if (["remote", "on-site", "hybrid"].includes(mode)) return mode;
  throw new AppError("mode must be one of remote, on-site, hybrid", 400);
}

async function getCompanyProfileByUserId(userId) {
  const user = await User.findById(userId).select("companyProfileRef");
  if (user?.companyProfileRef) {
    const linked = await CompanyProfile.findById(user.companyProfileRef);
    if (linked) return linked;
  }

  const company = await CompanyProfile.findOne({ user: userId });
  if (!company) {
    throw new AppError("Company profile not found", 404);
  }
  return company;
}

exports.getProfile = asyncHandler(async (req, res) => {
  const profile = await getCompanyProfileByUserId(req.user._id);
  return sendSuccess(res, {
    data: {
      profile,
      currentUser: {
        _id: req.user._id,
        email: req.user.email,
        companyAccountType: req.user.companyAccountType || "owner",
        permissions: req.user.permissions || [],
        sidebarModules: resolveEffectiveSidebarModules(req.user)
      }
    },
    meta: buildListMeta(req.user)
  });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const profile = await getCompanyProfileByUserId(req.user._id);
  const allowed = [
    "companyName",
    "contactName",
    "phone",
    "landline",
    "website",
    "address",
    "description",
    "industry",
    "companySize",
    "headquarters",
    "hiringProcessOverview"
  ];

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) profile[field] = req.body[field];
  });

  if (req.body.landline !== undefined) {
    const landline = String(req.body.landline || "").trim();
    if (landline && !/^[0-9()+\-.\s]{6,20}$/.test(landline)) {
      throw new AppError("landline must be a valid phone number (6-20 digits, may include +, -, (), spaces)", 400);
    }
    profile.landline = landline;
  }

  if (req.body.website !== undefined) {
    const website = String(req.body.website || "").trim();
    if (website && !/^https?:\/\/[^\s]+$/i.test(website)) {
      throw new AppError("website must be a valid http(s) URL", 400);
    }
    profile.website = website;
  }

  if (req.body.foundedYear !== undefined) {
    const year = Number(req.body.foundedYear);
    profile.foundedYear = Number.isFinite(year) && year > 1800 && year <= new Date().getFullYear() ? year : null;
  }

  if (req.body.technologies !== undefined) {
    const rawTechnologies = Array.isArray(req.body.technologies)
      ? req.body.technologies
      : String(req.body.technologies).split(",");
    const seen = new Set();
    profile.technologies = rawTechnologies
      .map((t) => String(t).trim())
      .filter(Boolean)
      .filter((t) => {
        const key = t.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  if (!profile.technologies || profile.technologies.length === 0) {
    throw new AppError("Select at least one technology before saving the company profile.", 400);
  }

  await profile.save();
  return sendSuccess(res, {
    message: "Company profile updated",
    data: { profile },
    meta: buildListMeta(req.user)
  });
});

const PERSONAL_PROFILE_FIELDS = ["displayName", "phone", "designation", "linkedInUrl", "personalWebsite", "bio"];

function serializePersonalProfile(user) {
  return {
    _id: user._id,
    email: user.email,
    displayName: user.displayName || "",
    phone: user.phone || "",
    photoUrl: user.photoUrl || "",
    designation: user.designation || "",
    linkedInUrl: user.linkedInUrl || "",
    personalWebsite: user.personalWebsite || "",
    bio: user.bio || "",
    companyAccountType: user.companyAccountType || "owner"
  };
}

exports.getPersonalProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  return sendSuccess(res, {
    data: { personalProfile: serializePersonalProfile(user) },
    meta: buildListMeta(req.user)
  });
});

exports.updatePersonalProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  PERSONAL_PROFILE_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) user[field] = String(req.body[field] || "").trim();
  });

  await user.save();
  return sendSuccess(res, {
    message: "Personal profile updated",
    data: { personalProfile: serializePersonalProfile(user) },
    meta: buildListMeta(req.user)
  });
});

exports.uploadPersonalPhoto = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!req.file) {
    throw new AppError("No photo file was uploaded.", 400);
  }

  const previousPhotoUrl = user.photoUrl;

  const stored = await storeUploadedFile({
    filePath: req.file.path,
    folder: UPLOAD_DIRECTORIES.PROFILE_PHOTOS,
    resourceType: "image"
  });

  user.photoUrl = stored.url;
  await user.save();

  if (previousPhotoUrl && previousPhotoUrl.startsWith("/uploads/profile-photos/")) {
    const previousFilename = path.basename(previousPhotoUrl);
    const previousPath = path.join(__dirname, "../../../uploads", UPLOAD_DIRECTORIES.PROFILE_PHOTOS, previousFilename);
    if (previousPath !== req.file.path) {
      fs.unlink(previousPath).catch(() => undefined);
    }
  }

  return sendSuccess(res, {
    message: "Profile photo updated",
    data: { personalProfile: serializePersonalProfile(user) },
    meta: buildListMeta(req.user)
  });
});

exports.uploadLogo = asyncHandler(async (req, res) => {
  const profile = await getCompanyProfileByUserId(req.user._id);

  if (!req.file) {
    throw new AppError("No logo file was uploaded.", 400);
  }

  const previousLogoUrl = profile.logoUrl;

  const stored = await storeUploadedFile({
    filePath: req.file.path,
    folder: UPLOAD_DIRECTORIES.COMPANY_LOGOS,
    resourceType: "image"
  });

  profile.logoUrl = stored.url;
  await profile.save();

  if (previousLogoUrl && previousLogoUrl.startsWith("/uploads/company-logos/")) {
    const previousFilename = path.basename(previousLogoUrl);
    const previousPath = path.join(__dirname, "../../../uploads", UPLOAD_DIRECTORIES.COMPANY_LOGOS, previousFilename);
    if (previousPath !== req.file.path) {
      fs.unlink(previousPath).catch(() => undefined);
    }
  }

  return sendSuccess(res, {
    message: "Company logo updated",
    data: { profile },
    meta: buildListMeta(req.user)
  });
});

exports.postInternship = asyncHandler(async (req, res) => {
  const company = await getCompanyProfileByUserId(req.user._id);

  const {
    role,
    skillsRequired,
    prioritySkills,
    stipend,
    perks,
    openings,
    duration,
    internshipType,
    department,
    location,
    startDate,
    applicationDeadline,
    mode,
    responsibilities,
    eligibilityCriteria,
    preferredSkillsText,
    educationQualification,
    degreePreferences,
    minimumCgpa,
    experienceRequirement,
    selectionProcess,
    interviewRoundsInfo,
    additionalInstructions,
    hrContact,
    description
  } = req.body;

  if (!role || !description) {
    throw new AppError("role and description are required", 400);
  }

  const internship = await Internship.create({
    company: company._id,
    assignedRecruiter: null,
    assignedDepartment: department || "",
    role,
    skillsRequired: normalizeIncomingSkills(skillsRequired),
    prioritySkills: normalizeIncomingSkills(prioritySkills),
    stipend: stipend || "",
    perks: perks || "",
    openings: typeof openings === "number" ? openings : null,
    duration: duration || "",
    internshipType: internshipType || "",
    department: department || "",
    location: location || "",
    startDate: startDate ? new Date(startDate) : null,
    applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
    mode: normalizeMode(mode),
    responsibilities: responsibilities || "",
    eligibilityCriteria: eligibilityCriteria || "",
    preferredSkillsText: preferredSkillsText || "",
    educationQualification: educationQualification || "",
    degreePreferences: degreePreferences || "",
    minimumCgpa: minimumCgpa || "",
    experienceRequirement: experienceRequirement || "",
    selectionProcess: selectionProcess || "",
    interviewRoundsInfo: interviewRoundsInfo || "",
    additionalInstructions: additionalInstructions || "",
    hrContact: hrContact || "",
    description,
    isActive: true
  });
  await logActivity({
    actorUser: req.user._id,
    actorRole: req.user.role,
    entityType: "internship",
    entityId: internship._id,
    action: "internship_created",
    metadata: { role: internship.role },
    ipAddress: req.ip
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: "Internship posted",
    data: { internship },
    meta: buildListMeta(req.user)
  });
});

exports.getMyInternships = asyncHandler(async (req, res) => {
  const company = await getCompanyProfileByUserId(req.user._id);
  const result = await companyQuery.findInternships(company._id, req.user, {
    page: req.query.page,
    limit: req.query.limit
  });
  return sendSuccess(res, {
    data: { internships: result.internships },
    meta: {
      ...result.meta,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.limit > 0 ? Math.ceil(result.total / result.limit) : 0
      }
    }
  });
});

exports.updateMyInternship = asyncHandler(async (req, res) => {
  const company = await getCompanyProfileByUserId(req.user._id);
  const internship = await companyQuery.findInternshipById(company._id, req.params.id, req.user);

  const allowed = [
    "role", "skillsRequired", "prioritySkills", "stipend", "perks", "openings", "duration", "internshipType", "department",
    "location", "startDate", "applicationDeadline", "mode", "responsibilities", "eligibilityCriteria", "preferredSkillsText",
    "educationQualification", "degreePreferences", "minimumCgpa", "experienceRequirement", "selectionProcess",
    "interviewRoundsInfo", "additionalInstructions", "hrContact", "description", "isActive"
  ];

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (field === "skillsRequired" || field === "prioritySkills") {
        internship[field] = normalizeIncomingSkills(req.body[field]);
      } else {
        if (field === "mode") internship[field] = normalizeMode(req.body[field]);
        else if (field === "startDate" || field === "applicationDeadline") internship[field] = req.body[field] ? new Date(req.body[field]) : null;
        else if (field === "openings") internship[field] = typeof req.body[field] === "number" ? req.body[field] : null;
        else internship[field] = req.body[field];
      }
    }
  });

  await internship.save();
  await logActivity({
    actorUser: req.user._id,
    actorRole: req.user.role,
    entityType: "internship",
    entityId: internship._id,
    action: "internship_updated",
    metadata: { fields: Object.keys(req.body || {}) },
    ipAddress: req.ip
  });
  return sendSuccess(res, {
    message: "Internship updated",
    data: { internship },
    meta: buildListMeta(req.user)
  });
});

exports.deleteMyInternship = asyncHandler(async (req, res) => {
  const company = await getCompanyProfileByUserId(req.user._id);
  const internship = await companyQuery.findInternshipById(company._id, req.params.id, req.user);

  internship.isDeleted = true;
  internship.deletedAt = new Date();
  internship.deletedBy = req.user._id;
  internship.isActive = false;
  await internship.save();

  await Application.updateMany(
    { $or: [{ internshipId: internship._id }, { internship: internship._id }] },
    { $set: { status: APPLICATION_STATUS.ON_HOLD } }
  );
  await logActivity({
    actorUser: req.user._id,
    actorRole: req.user.role,
    entityType: "internship",
    entityId: internship._id,
    action: "internship_soft_deleted",
    metadata: null,
    ipAddress: req.ip
  });
  return sendSuccess(res, { message: "Internship deleted", meta: buildListMeta(req.user) });
});

exports.getApplicantsForInternship = asyncHandler(async (req, res) => {
  const company = await getCompanyProfileByUserId(req.user._id);
  const internship = await companyQuery.findInternshipById(company._id, req.params.id, req.user);

  const { page, limit, skip } = resolvePagination(req.query, { defaultLimit: 10, maxLimit: 100 });
  const status = String(req.query.status || "").trim();

  const query = applicantsQueryForInternship(internship._id, company._id, req.user);
  if (status) query.status = status;

  const [applications, total] = await Promise.all([
    Application.find(query)
      .populate("intern", "fullName email mobile skills resume.score education projects summary")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Application.countDocuments(query)
  ]);

  const bulkOps = [];
  for (const application of applications) {
    const relevance = computeApplicationRelevance(application.intern || {}, internship || {});
    const nextScore = relevance.relevanceScore;
    if ((application.relevanceScore ?? application.matchScore ?? -1) !== nextScore) {
      bulkOps.push({
        updateOne: {
          filter: { _id: application._id },
          update: { $set: { relevanceScore: nextScore, matchScore: nextScore } }
        }
      });
      application.relevanceScore = nextScore;
      application.matchScore = nextScore;
    }
  }
  if (bulkOps.length) {
    await Application.bulkWrite(bulkOps, { ordered: false });
  }

  return sendSuccess(res, {
    data: { applications: sanitizeApplicationListFeedback(applications, req.user) },
    meta: {
      ...buildListMeta(req.user),
      pagination: {
        page,
        limit,
        total,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0
      }
    }
  });
});

exports.getAllApplications = asyncHandler(async (req, res) => {
  const company = await getCompanyProfileByUserId(req.user._id);
  const { page, limit } = resolvePagination(req.query, { defaultLimit: 100, maxLimit: 100 });
  const status = String(req.query.status || "").trim();

  const result = await companyQuery.findAllApplications(company._id, req.user, { page, limit, status });
  const applications = result.applications;

  const bulkOps = [];
  for (const application of applications) {
    const relevance = computeApplicationRelevance(application.intern || {}, application.internship || {});
    const nextScore = relevance.relevanceScore;
    if ((application.relevanceScore ?? application.matchScore ?? -1) !== nextScore) {
      bulkOps.push({
        updateOne: {
          filter: { _id: application._id },
          update: { $set: { relevanceScore: nextScore, matchScore: nextScore } }
        }
      });
      application.relevanceScore = nextScore;
      application.matchScore = nextScore;
    }
  }
  if (bulkOps.length) {
    await Application.bulkWrite(bulkOps, { ordered: false });
  }

  const applicationsWithPortfolio = await portfolioService.attachPortfolioSummaries(applications);

  return sendSuccess(res, {
    data: { applications: sanitizeApplicationListFeedback(applicationsWithPortfolio, req.user) },
    meta: {
      ...result.meta,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.limit > 0 ? Math.ceil(result.total / result.limit) : 0
      }
    }
  });
});

exports.updateCandidateStage = asyncHandler(async (req, res) => {
  const company = await getCompanyProfileByUserId(req.user._id);
  const { status, note } = req.body;

  if (!status) {
    throw new AppError("status is required", 400);
  }
  if (!Object.values(APPLICATION_STATUS).includes(status)) {
    throw new AppError("Invalid status value", 400);
  }

  // Populate intern (not just internship) — this application is returned to
  // the frontend and merged into local state, so an unpopulated intern ref
  // would blank out candidate name/skills/resume until the next full refetch.
  const application = await companyQuery.findApplicationById(
    company._id,
    req.params.applicationId,
    req.user,
    "internship intern"
  );

  const previousStatus = application.status;
  if (!canTransition(previousStatus, status)) {
    throw new AppError(`Invalid stage transition from ${application.status} to ${status}`, 400);
  }
  application.status = status;
  application.stageHistory.push({ stage: status, note: note || "" });
  await application.save();
  await logActivity({
    actorUser: req.user._id,
    actorRole: req.user.role,
    entityType: "application",
    entityId: application._id,
    action: "application_stage_updated",
    metadata: { from: previousStatus, to: status, note: note || "" },
    ipAddress: req.ip
  });
  const internProfile = await InternProfile.findById(application.internId || application.intern).select("email");
  if (internProfile?.email) {
    sendNotificationEmail({
      to: internProfile.email,
      subject: "Application Status Updated",
      text: `Your application status is now ${status.replace(/_/g, " ")}.`,
      type: "application_status_changed"
    });
  }
  await notifyInternByProfileId(application.internId || application.intern, {
    type: NOTIFICATION_TYPES.APPLICATION_STATUS_CHANGED,
    title: "Application status updated",
    message: `Your application is now ${status.replace(/_/g, " ")}.`,
    link: "/dashboard/intern/applications",
    metadata: { applicationId: application._id, status }
  });

  return sendSuccess(res, {
    message: "Candidate stage updated",
    data: { application: sanitizeApplicationFeedback(application, req.user) },
    meta: buildListMeta(req.user)
  });
});

exports.scheduleInterviewRound = asyncHandler(async (req, res) => {
  const company = await getCompanyProfileByUserId(req.user._id);
  const {
    roundType,
    interviewDate,
    interviewTime,
    mode,
    meetingLink,
    location,
    notes,
    durationMinutes,
    timezone,
    interviewers
  } = req.body || {};

  if (!roundType || !interviewDate || !interviewTime) {
    throw new AppError("roundType, interviewDate and interviewTime are required", 400);
  }

  let application;
  let round;
  await withVersionRetry(async () => {
    // Populate intern (not just internship) — the response replaces this
    // application in frontend local state directly, so an unpopulated intern
    // ref would blank out the candidate name/skills/resume everywhere until
    // the next full page refetch.
    application = await companyQuery.findApplicationById(
      company._id,
      req.params.applicationId,
      req.user,
      "internship intern"
    );

    if (TERMINAL_STATUSES.has(application.status)) {
      throw new AppError(`Cannot schedule interview for application in "${application.status}" status`, 400);
    }

    if (isDuplicateScheduledRound(application.interviewRounds, { roundType, interviewDate, interviewTime })) {
      throw new AppError("An identical interview round is already scheduled for this candidate", 409);
    }

    const normalizedMode = ["online", "offline"].includes(String(mode || "").toLowerCase())
      ? String(mode).toLowerCase()
      : "";

    application.interviewRounds.push({
      roundType: String(roundType || "").trim(),
      interviewDate: parseInterviewDateOnly(interviewDate),
      interviewTime: String(interviewTime || "").trim(),
      durationMinutes: normalizeDurationMinutes(durationMinutes),
      timezone: String(timezone || "").trim(),
      interviewers: normalizeInterviewers(interviewers),
      mode: normalizedMode,
      // An in-person round must never carry an online meeting link forward —
      // it would render a bogus "Join Meeting" button for a physical interview.
      meetingLink: normalizedMode === "offline" ? "" : String(meetingLink || "").trim(),
      location: String(location || "").trim(),
      notes: String(notes || "").trim(),
      status: "scheduled",
      updatedAt: new Date()
    });

    if (canTransition(application.status, APPLICATION_STATUS.INTERVIEW_SCHEDULED)) {
      application.status = APPLICATION_STATUS.INTERVIEW_SCHEDULED;
      application.stageHistory.push({ stage: "interview_scheduled", note: "Interview round scheduled" });
    }
    await application.save();
    round = application.interviewRounds[application.interviewRounds.length - 1];
  });

  let interviewRoomLink = round.meetingLink;

  if (
    isEnabled("ENABLE_INTERVIEW_ROOMS") &&
    round.mode === "online" &&
    !interviewRoomLink
  ) {
    const room = await interviewRoomService.createRoomForRound({
      application,
      round,
      roundType
    });
    interviewRoomLink = interviewRoomService.resolveClientInterviewUrl(room.roomId);
    round.meetingLink = interviewRoomLink;
    await application.save();
  }

  const internProfile = await InternProfile.findById(application.internId || application.intern).select("email");
  if (internProfile?.email) {
    sendNotificationEmail({
      to: internProfile.email,
      subject: "Interview Scheduled",
      text: interviewRoomLink
        ? `An interview round has been scheduled. Join here: ${interviewRoomLink}`
        : "An interview round has been scheduled for your application.",
      type: NOTIFICATION_TYPES.INTERVIEW_SCHEDULED
    });
  }
  await notifyInterviewScheduled({
    application,
    round,
    companyUserId: req.user._id,
    interviewRoomLink
  });

  return sendSuccess(res, {
    message: "Interview round scheduled",
    data: { application: sanitizeApplicationFeedback(application, req.user) },
    meta: buildListMeta(req.user)
  });
});

exports.updateInterviewRound = asyncHandler(async (req, res) => {
  const company = await getCompanyProfileByUserId(req.user._id);
  const {
    status,
    notes,
    interviewDate,
    interviewTime,
    mode,
    meetingLink,
    location,
    durationMinutes,
    timezone,
    interviewers,
    cancelReason
  } = req.body || {};

  let application;
  let round;
  let rescheduled;
  const changeTypes = [];

  await withVersionRetry(async () => {
    changeTypes.length = 0;
    // Same reasoning as scheduleInterviewRound: populate intern so the
    // response doesn't blank out candidate details in frontend local state.
    application = await companyQuery.findApplicationById(
      company._id,
      req.params.applicationId,
      req.user,
      "internship intern"
    );

    round = (application.interviewRounds || []).id(req.params.roundId);
    if (!round) {
      throw new AppError("Interview round not found", 404);
    }

    const previousDate = round.interviewDate;
    const previousTime = round.interviewTime;
    const previousStatus = round.status;

    if (status) {
      const normalizedStatus = String(status).toLowerCase();
      if (!VALID_ROUND_STATUSES.has(normalizedStatus)) {
        throw new AppError(`status must be one of: ${Array.from(VALID_ROUND_STATUSES).join(", ")}`, 400);
      }
      round.status = normalizedStatus;
    }
    if (notes !== undefined) round.notes = String(notes || "").trim();
    if (durationMinutes !== undefined) round.durationMinutes = normalizeDurationMinutes(durationMinutes, round.durationMinutes);
    if (timezone !== undefined) round.timezone = String(timezone || "").trim();
    if (interviewers !== undefined) round.interviewers = normalizeInterviewers(interviewers);
    if (cancelReason !== undefined) round.cancelReason = String(cancelReason || "").trim();
    if (meetingLink !== undefined) round.meetingLink = String(meetingLink || "").trim();
    if (location !== undefined) round.location = String(location || "").trim();
    if (mode !== undefined) round.mode = ["online", "offline"].includes(String(mode || "").toLowerCase()) ? String(mode).toLowerCase() : "";

    // A round switched to in-person must not keep carrying a stale online
    // meeting link forward — it would render a bogus "Join Meeting" button.
    if (round.mode === "offline" && round.meetingLink) {
      round.meetingLink = "";
    }

    rescheduled =
      (interviewDate && normalizeDateKey(previousDate) !== normalizeDateKey(round.interviewDate)) ||
      (interviewTime !== undefined && String(previousTime || "").slice(0, 5) !== String(round.interviewTime || "").slice(0, 5));

    if (rescheduled) {
      round.rescheduleHistory.push({
        previousDate,
        previousTime,
        changedAt: new Date(),
        changedBy: req.user._id
      });
      round.rescheduleRequestedByCandidate = null;
    }
    if (interviewDate) round.interviewDate = parseInterviewDateOnly(interviewDate);
    if (interviewTime !== undefined) round.interviewTime = String(interviewTime || "").trim();
    round.updatedAt = new Date();

    if (rescheduled) {
      await interviewRoomService.syncRoomScheduleForRound(round._id, round.interviewDate, round.interviewTime);
    }

    // Cancelling a round or marking it a no-show is a round-level outcome —
    // it must NOT force-reject the whole application (that conflated two
    // different concepts in the old model).
    if (
      (round.status === "completed" || round.status === "cleared") &&
      canTransition(application.status, APPLICATION_STATUS.INTERVIEW_COMPLETED)
    ) {
      application.status = APPLICATION_STATUS.INTERVIEW_COMPLETED;
      application.stageHistory.push({ stage: "interview_completed", note: "Interview round completed" });
    }
    if (round.status === "rejected" && canTransition(application.status, APPLICATION_STATUS.REJECTED)) {
      application.status = APPLICATION_STATUS.REJECTED;
      application.stageHistory.push({ stage: "rejected", note: "Rejected after interview round" });
    }

    await application.save();

    if (round.status === "cancelled" && previousStatus !== "cancelled") changeTypes.push("cancelled");
    if (round.status === "no_show" && previousStatus !== "no_show") changeTypes.push("no_show");
    if (round.status === "rejected" && previousStatus !== "rejected") changeTypes.push("rejected");
    if (rescheduled) changeTypes.push("rescheduled");
    if ((round.status === "completed" || round.status === "cleared") && previousStatus !== round.status) {
      changeTypes.push("completed");
    }
    if (
      changeTypes.length === 0 &&
      (status ||
        interviewDate ||
        interviewTime !== undefined ||
        meetingLink !== undefined ||
        location !== undefined ||
        mode !== undefined ||
        durationMinutes !== undefined ||
        interviewers !== undefined)
    ) {
      changeTypes.push("updated");
    }
  });

  for (const changeType of changeTypes) {
    await notifyInterviewUpdated({
      application,
      round,
      companyUserId: req.user._id,
      changeType,
      interviewRoomLink: round.meetingLink || null
    });
  }

  return sendSuccess(res, {
    message: "Interview round updated",
    data: { application: sanitizeApplicationFeedback(application, req.user) },
    meta: buildListMeta(req.user)
  });
});

exports.addHrFeedback = asyncHandler(async (req, res) => {
  const company = await getCompanyProfileByUserId(req.user._id);
  const { feedback, rating, category, visibility = "candidate" } = req.body;

  if (!feedback) {
    throw new AppError("feedback is required", 400);
  }

  // Populate intern (not just internship) — same frontend state-merge reason
  // as updateApplicantStage above.
  const application = await companyQuery.findApplicationById(
    company._id,
    req.params.applicationId,
    req.user,
    "internship intern"
  );

  application.hrFeedback.push({
    feedback,
    stage: application.status,
    rating: typeof rating === "number" ? rating : null,
    category: String(category || "general"),
    visibility: ["internal", "candidate"].includes(String(visibility)) ? String(visibility) : "candidate",
    authorRole: req.user.role,
    authorId: req.user._id
  });
  await application.save();
  const internProfile = await InternProfile.findById(application.internId || application.intern).select("email");
  if (internProfile?.email) {
    sendNotificationEmail({
      to: internProfile.email,
      subject: "Recruiter Feedback Added",
      text: "New recruiter feedback is available for your application.",
      type: "feedback_added"
    });
  }
  if (visibility !== "internal") {
    await notifyInternByProfileId(application.internId || application.intern, {
      type: NOTIFICATION_TYPES.FEEDBACK_ADDED,
      title: "New recruiter feedback",
      message: "Review feedback on your application.",
      link: "/dashboard/intern/feedback/hr",
      metadata: { applicationId: application._id }
    });
  }
  await logActivity({
    actorUser: req.user._id,
    actorRole: req.user.role,
    entityType: "application",
    entityId: application._id,
    action: "hr_feedback_added",
    metadata: { stage: application.status, rating: typeof rating === "number" ? rating : null },
    ipAddress: req.ip
  });

  return sendSuccess(res, {
    message: "Feedback added",
    data: { application: sanitizeApplicationFeedback(application, req.user) },
    meta: buildListMeta(req.user)
  });
});

exports.getAiMatchedCandidates = asyncHandler(async (req, res) => {
  const company = await getCompanyProfileByUserId(req.user._id);
  const internship = await companyQuery.findInternshipById(company._id, req.params.id, req.user);

  const applications = await Application.find(
    applicantsQueryForInternship(internship._id, company._id, req.user)
  ).populate("intern");
  const profiles = applications.map((item) => item.intern).filter(Boolean);

  const ranked = rankApplicantsForInternship(internship, profiles);

  return sendSuccess(res, {
    data: {
      internship,
      matchedCandidates: ranked.map((item) => ({
        internProfile: item.profile,
        score: item.score,
        skillGap: item.skillGap
      }))
    },
    meta: buildListMeta(req.user)
  });
});

exports.assignInternshipRecruiter = asyncHandler(async (req, res) => {
  const company = await getCompanyProfileByUserId(req.user._id);
  if (!canAssignRecruiters(req.user)) {
    throw new AppError("Insufficient permission to assign recruiters", 403);
  }

  const { recruiterUserId, department = "" } = req.body || {};
  if (!recruiterUserId) throw new AppError("recruiterUserId is required", 400);

  const recruiter = await User.findOne({
    _id: recruiterUserId,
    role: "company",
    companyProfileRef: company._id,
    companyAccountType: "hr",
    isDeleted: false,
    isActive: true
  });
  if (!recruiter) throw new AppError("HR recruiter not found in this company", 404);

  const internship = await Internship.findOne({ _id: req.params.id, company: company._id, isDeleted: false });
  if (!internship) throw new AppError("Internship not found", 404);

  internship.assignedRecruiter = recruiter._id;
  internship.assignedDepartment = String(department || internship.assignedDepartment || "").trim();
  await internship.save();

  await Application.updateMany(
    { $or: [{ internshipId: internship._id }, { internship: internship._id }], companyId: company._id },
    { $set: { assignedRecruiter: recruiter._id, assignmentUpdatedAt: new Date(), assignedBy: req.user._id } }
  );

  return sendSuccess(res, {
    message: "Internship assigned to recruiter",
    data: { internship },
    meta: buildListMeta(req.user)
  });
});

exports.assignApplicationRecruiter = asyncHandler(async (req, res) => {
  const company = await getCompanyProfileByUserId(req.user._id);
  if (!canAssignRecruiters(req.user)) {
    throw new AppError("Insufficient permission to assign recruiters", 403);
  }
  const { recruiterUserId } = req.body || {};
  if (!recruiterUserId) throw new AppError("recruiterUserId is required", 400);

  const recruiter = await User.findOne({
    _id: recruiterUserId,
    role: "company",
    companyProfileRef: company._id,
    companyAccountType: "hr",
    isDeleted: false,
    isActive: true
  });
  if (!recruiter) throw new AppError("HR recruiter not found in this company", 404);

  const application = await Application.findOne({ _id: req.params.applicationId, companyId: company._id });
  if (!application) throw new AppError("Application not found", 404);

  application.assignedRecruiter = recruiter._id;
  application.assignmentUpdatedAt = new Date();
  application.assignedBy = req.user._id;
  await application.save();

  return sendSuccess(res, {
    message: "Application assigned to recruiter",
    data: { application: sanitizeApplicationFeedback(application, req.user) },
    meta: buildListMeta(req.user)
  });
});

exports.getRecruiters = asyncHandler(async (req, res) => {
  const company = await getCompanyProfileByUserId(req.user._id);
  const { listCompanyHrUsers } = require("../../../services/company-hr.service");
  const hrUsers = await listCompanyHrUsers(company._id);
  const recruiters = hrUsers
    .filter((hr) => hr.isActive)
    .map((hr) => ({
      _id: hr._id,
      email: hr.email,
      displayName: hr.displayName || hr.email.split("@")[0],
      companyAccountType: hr.companyAccountType,
      isActive: hr.isActive
    }));
  return sendSuccess(res, { data: { recruiters }, meta: buildListMeta(req.user) });
});

exports.getCompanyAnalytics = asyncHandler(async (req, res) => {
  const company = await getCompanyProfileByUserId(req.user._id);
  const payload = await buildCompanyAnalytics(company._id, req.user);
  return sendSuccess(res, { data: payload });
});
