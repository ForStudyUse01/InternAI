import { Types } from "mongoose";
import { ApplicationModel } from "../../models/Application";
import { InternshipModel } from "../../models/Internship";
import type { AuthenticatedUser } from "../../types/auth";
import { HttpError } from "../../utils/httpError";
import { buildPaginationMeta, resolvePaginationParams } from "../common/pagination";

const ALLOWED_STATUSES = ["applied", "shortlisted", "test", "interview", "selected", "rejected"] as const;

type ApplicationStatus = (typeof ALLOWED_STATUSES)[number];

function normalizeStatus(status: unknown): ApplicationStatus {
  const normalized = typeof status === "string" ? status.trim().toLowerCase() : "";
  if (!ALLOWED_STATUSES.includes(normalized as ApplicationStatus)) {
    throw new HttpError(400, "Invalid application status");
  }

  return normalized as ApplicationStatus;
}

export async function applyToInternship(currentUser: AuthenticatedUser, internshipId: unknown) {
  const id = typeof internshipId === "string" ? internshipId.trim() : "";
  if (!Types.ObjectId.isValid(id)) {
    throw new HttpError(400, "Invalid internship ID");
  }

  const internship = await InternshipModel.findById(id).lean();
  if (!internship || internship.status !== "open") {
    throw new HttpError(404, "Internship not found or not open for applications");
  }

  const existing = await ApplicationModel.findOne({ internshipId: id, internUserId: currentUser.id }).lean();
  if (existing) {
    throw new HttpError(409, "Application already exists for this internship");
  }

  const application = await ApplicationModel.create({ internshipId: id, internUserId: currentUser.id, status: "applied" });
  return application;
}

export async function listInternApplications(currentUser: AuthenticatedUser, rawPage: unknown, rawLimit: unknown) {
  const { page, limit, skip } = resolvePaginationParams(rawPage, rawLimit);

  const [items, total] = await Promise.all([
    ApplicationModel.find({ internUserId: currentUser.id })
      .select("_id internshipId internUserId status createdAt updatedAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ApplicationModel.countDocuments({ internUserId: currentUser.id }),
  ]);

  return {
    items,
    meta: buildPaginationMeta(page, limit, total),
  };
}

export async function updateApplicationStatus(currentUser: AuthenticatedUser, applicationId: string, status: unknown) {
  if (!Types.ObjectId.isValid(applicationId)) {
    throw new HttpError(400, "Invalid application ID");
  }

  const targetStatus = normalizeStatus(status);

  const application = await ApplicationModel.findById(applicationId);
  if (!application) {
    throw new HttpError(404, "Application not found");
  }

  const internship = await InternshipModel.findById(application.internshipId).lean();
  if (!internship || internship.companyUserId.toString() !== currentUser.id) {
    throw new HttpError(403, "You do not have access to update this application");
  }

  const validTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
    applied: ["shortlisted", "rejected"],
    shortlisted: ["test", "rejected"],
    test: ["interview", "rejected"],
    interview: ["selected", "rejected"],
    selected: [],
    rejected: [],
  };

  if (!validTransitions[application.status as ApplicationStatus].includes(targetStatus)) {
    throw new HttpError(400, `Invalid status transition from ${application.status} to ${targetStatus}`);
  }

  application.status = targetStatus;
  await application.save();
  return application;
}
