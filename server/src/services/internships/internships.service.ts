import { Types } from "mongoose";
import { InternshipModel } from "../../models/Internship";
import { ApplicationModel } from "../../models/Application";
import { InternProfileModel } from "../../models/InternProfile";
import { ResumeModel } from "../../models/Resume";
import { UserModel } from "../../models/User";
import type { AuthenticatedUser } from "../../types/auth";
import { HttpError } from "../../utils/httpError";
import { normalizeSkillArray } from "../common/skill-normalizer";
import { buildPaginationMeta, resolvePaginationParams } from "../common/pagination";

interface InternshipPayload {
  title: unknown;
  description: unknown;
  location: unknown;
  duration: unknown;
  stipend: unknown;
  requiredSkills: unknown;
  preferredSkills: unknown;
  status: unknown;
}

function sanitizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: unknown): "open" | "closed" | "draft" {
  const normalized = sanitizeText(value).toLowerCase();
  if (!normalized) {
    return "open";
  }

  if (normalized === "open" || normalized === "closed" || normalized === "draft") {
    return normalized;
  }

  throw new HttpError(400, "Invalid internship status");
}

function validateInternshipInput(input: InternshipPayload): void {
  const requiredFields = [
    sanitizeText(input.title),
    sanitizeText(input.description),
    sanitizeText(input.location),
    sanitizeText(input.duration),
    sanitizeText(input.stipend),
  ];

  if (requiredFields.some((field) => !field)) {
    throw new HttpError(400, "Title, description, location, duration, and stipend are required");
  }
}

export async function createInternship(currentUser: AuthenticatedUser, payload: InternshipPayload) {
  validateInternshipInput(payload);

  const internship = await InternshipModel.create({
    companyUserId: currentUser.id,
    title: sanitizeText(payload.title),
    description: sanitizeText(payload.description),
    location: sanitizeText(payload.location),
    duration: sanitizeText(payload.duration),
    stipend: sanitizeText(payload.stipend),
    requiredSkills: normalizeSkillArray(payload.requiredSkills),
    preferredSkills: normalizeSkillArray(payload.preferredSkills),
    status: normalizeStatus(payload.status),
  });

  return internship;
}

export async function updateInternship(currentUser: AuthenticatedUser, internshipId: string, payload: InternshipPayload) {
  if (!Types.ObjectId.isValid(internshipId)) {
    throw new HttpError(400, "Invalid internship ID");
  }

  const internship = await InternshipModel.findOne({ _id: internshipId, companyUserId: currentUser.id });
  if (!internship) {
    throw new HttpError(404, "Internship not found");
  }

  validateInternshipInput(payload);

  internship.title = sanitizeText(payload.title);
  internship.description = sanitizeText(payload.description);
  internship.location = sanitizeText(payload.location);
  internship.duration = sanitizeText(payload.duration);
  internship.stipend = sanitizeText(payload.stipend);
  internship.requiredSkills = normalizeSkillArray(payload.requiredSkills);
  internship.preferredSkills = normalizeSkillArray(payload.preferredSkills);
  internship.status = normalizeStatus(payload.status);

  await internship.save();
  return internship;
}

export async function deleteInternship(currentUser: AuthenticatedUser, internshipId: string): Promise<void> {
  if (!Types.ObjectId.isValid(internshipId)) {
    throw new HttpError(400, "Invalid internship ID");
  }

  const result = await InternshipModel.deleteOne({ _id: internshipId, companyUserId: currentUser.id });
  if (!result.deletedCount) {
    throw new HttpError(404, "Internship not found");
  }
}

export async function listInternships(rawPage: unknown, rawLimit: unknown, currentUser: AuthenticatedUser) {
  const { page, limit, skip } = resolvePaginationParams(rawPage, rawLimit);

  const filter = currentUser.role === "company" ? { companyUserId: currentUser.id } : { status: "open" };

  const [items, total] = await Promise.all([
    InternshipModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    InternshipModel.countDocuments(filter),
  ]);

  return {
    items,
    meta: buildPaginationMeta(page, limit, total),
  };
}

export async function listApplicants(currentUser: AuthenticatedUser, internshipId: string, rawPage: unknown, rawLimit: unknown) {
  if (!Types.ObjectId.isValid(internshipId)) {
    throw new HttpError(400, "Invalid internship ID");
  }

  const internship = await InternshipModel.findOne({ _id: internshipId, companyUserId: currentUser.id }).lean();
  if (!internship) {
    throw new HttpError(404, "Internship not found");
  }

  const { page, limit, skip } = resolvePaginationParams(rawPage, rawLimit);

  const [applications, total] = await Promise.all([
    ApplicationModel.find({ internshipId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ApplicationModel.countDocuments({ internshipId }),
  ]);

  const internIds = applications.map((application) => application.internUserId.toString());

  const [users, profiles, resumes] = await Promise.all([
    UserModel.find({ _id: { $in: internIds } }).select("_id fullName").lean(),
    InternProfileModel.find({ userId: { $in: internIds } }).select("userId skills").lean(),
    ResumeModel.find({ userId: { $in: internIds } }).select("userId resumeScore").lean(),
  ]);

  const userMap = new Map(users.map((user) => [user._id.toString(), user]));
  const profileMap = new Map(profiles.map((profile) => [profile.userId.toString(), profile]));
  const resumeMap = new Map(resumes.map((resume) => [resume.userId.toString(), resume]));

  const applicantItems = applications.map((application) => {
    const internId = application.internUserId.toString();
    const user = userMap.get(internId);
    const profile = profileMap.get(internId);
    const resume = resumeMap.get(internId);

    return {
      applicationId: application._id.toString(),
      internId,
      name: user?.fullName ?? "",
      skills: normalizeSkillArray(profile?.skills ?? []),
      resumeScore: resume?.resumeScore ?? null,
      status: application.status,
    };
  });

  return {
    items: applicantItems,
    meta: buildPaginationMeta(page, limit, total),
  };
}
