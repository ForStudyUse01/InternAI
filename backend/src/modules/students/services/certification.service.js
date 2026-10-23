const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Certification, CERTIFICATION_STATUS } = require("../../../models/Certification");
const InternProfile = require("../../../models/InternProfile");
const AppError = require("../../../shared/utils/AppError");
const { resolvePagination } = require("../../../shared/utils/pagination");

function normalizeText(value = "", max = 500) {
  return String(value || "").trim().slice(0, max);
}

function parseCompletionDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError("Valid completion date is required", 400);
  }
  const now = new Date();
  if (date > now) {
    throw new AppError("Completion date cannot be in the future", 400);
  }
  return date;
}

function parseExpiryDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError("Expiry date is invalid", 400);
  }
  return date;
}

function computeFileHash(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function toPublicFileUrl(filePath = "") {
  const normalized = String(filePath || "").replace(/\\/g, "/");
  if (!normalized) return "";
  if (normalized.startsWith("/uploads/")) return normalized;
  const idx = normalized.indexOf("/uploads/");
  if (idx >= 0) return normalized.slice(idx);
  return `/uploads/certificates/${path.basename(normalized)}`;
}

function serializeCertification(doc) {
  const item = doc.toObject ? doc.toObject() : doc;
  return {
    _id: item._id,
    courseName: item.courseName,
    skillCategory: item.skillCategory,
    provider: item.provider,
    completionDate: item.completionDate,
    expiryDate: item.expiryDate || null,
    credentialUrl: item.credentialUrl || "",
    credentialId: item.credentialId || "",
    description: item.description || "",
    verificationStatus: item.verificationStatus,
    uploadTimestamp: item.uploadTimestamp,
    adminReviewTimestamp: item.adminReviewTimestamp || null,
    rejectionReason: item.rejectionReason || "",
    reviewNotes: item.reviewNotes || "",
    certificateFile: item.certificateFile
      ? {
          originalName: item.certificateFile.originalName,
          mimeType: item.certificateFile.mimeType,
          fileSize: item.certificateFile.fileSize,
          fileUrl: toPublicFileUrl(item.certificateFile.filePath)
        }
      : null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

async function getCertificationStats(userId) {
  const base = { user: userId, isDeleted: false };
  const [total, verified, pending, rejected] = await Promise.all([
    Certification.countDocuments(base),
    Certification.countDocuments({ ...base, verificationStatus: CERTIFICATION_STATUS.VERIFIED }),
    Certification.countDocuments({ ...base, verificationStatus: CERTIFICATION_STATUS.PENDING }),
    Certification.countDocuments({ ...base, verificationStatus: CERTIFICATION_STATUS.REJECTED })
  ]);
  return { total, verified, pending, rejected };
}

async function syncVerifiedCertificationsToProfile(userId) {
  const verified = await Certification.find({
    user: userId,
    isDeleted: false,
    verificationStatus: CERTIFICATION_STATUS.VERIFIED
  })
    .sort({ completionDate: -1 })
    .lean();

  const entries = verified.map((cert) => ({
    name: cert.courseName,
    issuer: cert.provider,
    year: cert.completionDate ? String(new Date(cert.completionDate).getFullYear()) : "",
    certificateUrl: cert.credentialUrl || "",
    verificationLink: cert.credentialUrl || "",
    skillCategory: cert.skillCategory,
    verificationStatus: CERTIFICATION_STATUS.VERIFIED,
    certificationId: String(cert._id)
  }));

  await InternProfile.findOneAndUpdate(
    { user: userId },
    {
      $set: {
        verifiedCertificationCount: verified.length,
        verifiedCertificationEntries: entries
      }
    }
  );

  return { verifiedCount: verified.length, entries };
}

async function assertNoDuplicateSubmission({
  userId,
  courseName,
  provider,
  completionDate,
  credentialUrl,
  credentialId,
  fileHash
}) {
  const base = { user: userId, isDeleted: false };

  const [urlDup, idDup, fileDup, verifiedDup] = await Promise.all([
    credentialUrl ? Certification.findOne({ ...base, credentialUrl }).select("_id").lean() : null,
    credentialId ? Certification.findOne({ ...base, credentialId }).select("_id").lean() : null,
    fileHash ? Certification.findOne({ ...base, "certificateFile.fileHash": fileHash }).select("_id").lean() : null,
    Certification.findOne({
      ...base,
      verificationStatus: CERTIFICATION_STATUS.VERIFIED,
      courseName: normalizeText(courseName, 200),
      provider: normalizeText(provider, 120),
      completionDate
    })
      .select("_id")
      .lean()
  ]);

  if (urlDup) throw new AppError("This credential URL has already been submitted.", 409);
  if (idDup) throw new AppError("This credential ID has already been submitted.", 409);
  if (fileDup) throw new AppError("This certificate file has already been uploaded.", 409);
  if (verifiedDup) {
    throw new AppError("A verified certification with the same course and completion date already exists.", 409);
  }
}

async function createCertificationSubmission({ userId, internProfileId, body, file }) {
  if (!file) throw new AppError("Certificate file is required", 400);
  if (!file.size) throw new AppError("Certificate file cannot be empty", 400);

  const courseName = normalizeText(body.courseName, 200);
  const skillCategory = normalizeText(body.skillCategory, 80);
  const provider = normalizeText(body.provider, 120);
  const completionDate = parseCompletionDate(body.completionDate);
  const expiryDate = parseExpiryDate(body.expiryDate);
  const credentialUrl = normalizeText(body.credentialUrl, 500);
  const credentialId = normalizeText(body.credentialId, 120);
  const description = normalizeText(body.description, 500);

  if (!courseName) throw new AppError("Course name is required", 400);
  if (!skillCategory) throw new AppError("Skill category is required", 400);
  if (!provider) throw new AppError("Provider is required", 400);

  const fileHash = computeFileHash(file.path);
  const storedRelativePath = `uploads/certificates/${file.filename}`;

  await assertNoDuplicateSubmission({
    userId,
    courseName,
    provider,
    completionDate,
    credentialUrl,
    credentialId,
    fileHash
  });

  const certification = await Certification.create({
    user: userId,
    internProfile: internProfileId,
    courseName,
    skillCategory,
    provider,
    completionDate,
    expiryDate,
    credentialUrl,
    credentialId,
    description,
    certificateFile: {
      originalName: file.originalname,
      storedName: file.filename,
      filePath: storedRelativePath,
      mimeType: file.mimetype,
      fileSize: file.size,
      fileHash
    },
    verificationStatus: CERTIFICATION_STATUS.PENDING,
    uploadTimestamp: new Date()
  });

  return serializeCertification(certification);
}

async function listUserCertifications(userId) {
  const items = await Certification.find({ user: userId, isDeleted: false })
    .sort({ createdAt: -1 })
    .lean();
  return items.map((item) => serializeCertification(item));
}

async function getCertificationForUser(userId, certificationId) {
  const item = await Certification.findOne({
    _id: certificationId,
    user: userId,
    isDeleted: false
  }).lean();
  if (!item) throw new AppError("Certification not found", 404);
  return serializeCertification(item);
}

async function getCertificationFileRecord(certificationId, { userId, isAdmin = false }) {
  const filter = { _id: certificationId, isDeleted: false };
  if (!isAdmin) filter.user = userId;

  const item = await Certification.findOne(filter).lean();
  if (!item || !item.certificateFile?.filePath) {
    throw new AppError("Certificate file not found", 404);
  }

  const absolutePath = path.join(__dirname, "../..", item.certificateFile.filePath.replace(/^\//, ""));

  if (!fs.existsSync(absolutePath)) {
    throw new AppError("Certificate file is missing on server", 404);
  }

  return { item, absolutePath };
}

async function listCertificationsForAdmin({ status, q, page = 1, limit = 20 }) {
  const filter = { isDeleted: false };
  if (status) filter.verificationStatus = status;
  if (q) {
    filter.$or = [
      { courseName: { $regex: q, $options: "i" } },
      { provider: { $regex: q, $options: "i" } },
      { skillCategory: { $regex: q, $options: "i" } }
    ];
  }

  const { page: resolvedPage, limit: resolvedLimit, skip } = resolvePagination(
    { page, limit },
    { defaultLimit: 20, maxLimit: 100 }
  );

  const [items, total] = await Promise.all([
    Certification.find(filter)
      .populate("user", "email role")
      .populate("internProfile", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(resolvedLimit)
      .lean(),
    Certification.countDocuments(filter)
  ]);

  return {
    certifications: items.map((item) => ({
      ...serializeCertification(item),
      userEmail: item.user?.email || "",
      internName: item.internProfile?.fullName || ""
    })),
    page: resolvedPage,
    limit: resolvedLimit,
    total,
    totalPages: resolvedLimit > 0 ? Math.ceil(total / resolvedLimit) : 0
  };
}

async function reviewCertification({ certificationId, adminUserId, status, rejectionReason = "", reviewNotes = "" }) {
  if (![CERTIFICATION_STATUS.VERIFIED, CERTIFICATION_STATUS.REJECTED].includes(status)) {
    throw new AppError("Invalid review status. Use verified or rejected.", 400);
  }

  const certification = await Certification.findOne({ _id: certificationId, isDeleted: false });
  if (!certification) throw new AppError("Certification not found", 404);

  if (certification.verificationStatus !== CERTIFICATION_STATUS.PENDING) {
    throw new AppError("Only pending certifications can be reviewed", 400);
  }

  if (status === CERTIFICATION_STATUS.REJECTED && !normalizeText(rejectionReason, 500)) {
    throw new AppError("Rejection reason is required", 400);
  }

  certification.verificationStatus = status;
  certification.adminReviewer = adminUserId;
  certification.adminReviewTimestamp = new Date();
  certification.rejectionReason = status === CERTIFICATION_STATUS.REJECTED ? normalizeText(rejectionReason, 500) : "";
  certification.reviewNotes = normalizeText(reviewNotes, 500);
  await certification.save();

  if (status === CERTIFICATION_STATUS.VERIFIED) {
    await syncVerifiedCertificationsToProfile(certification.user);
    // Keep a live/published portfolio in lock-step with verification decisions,
    // the same fire-and-forget sync profile edits and resume uploads already
    // trigger (see intern.controller.js) -- so a newly verified cert shows up
    // on the student's portfolio without them needing to regenerate it.
    const { syncPortfolioOnProfileChange } = require("../../../services/portfolio.service");
    syncPortfolioOnProfileChange(certification.user).catch(() => undefined);
  }

  return serializeCertification(certification);
}

module.exports = {
  CERTIFICATION_STATUS,
  serializeCertification,
  getCertificationStats,
  syncVerifiedCertificationsToProfile,
  createCertificationSubmission,
  listUserCertifications,
  getCertificationForUser,
  getCertificationFileRecord,
  listCertificationsForAdmin,
  reviewCertification,
  toPublicFileUrl
};
