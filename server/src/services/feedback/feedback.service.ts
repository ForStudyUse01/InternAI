import { ApplicationModel } from "../../models/Application";
import { FeedbackModel } from "../../models/Feedback";
import { InternshipModel } from "../../models/Internship";
import type { AuthenticatedUser } from "../../types/auth";
import { HttpError } from "../../utils/httpError";
import { assertValidObjectId } from "../../utils/objectId";

function sanitizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function addFeedback(
  currentUser: AuthenticatedUser,
  payload: { applicationId: unknown; strengths: unknown; weaknesses: unknown; rating: unknown; notes: unknown }
) {
  const applicationId = sanitizeText(payload.applicationId);
  if (!applicationId) {
    throw new HttpError(400, "Application ID is required");
  }
  assertValidObjectId(applicationId, "application ID");

  const application = await ApplicationModel.findById(applicationId).lean();
  if (!application) {
    throw new HttpError(404, "Application not found");
  }

  const internship = await InternshipModel.findById(application.internshipId).lean();
  if (!internship || internship.companyUserId.toString() !== currentUser.id) {
    throw new HttpError(403, "You do not have access to add feedback for this application");
  }

  const rating = Number(payload.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, "Rating must be between 1 and 5");
  }

  const feedback = await FeedbackModel.findOneAndUpdate(
    { applicationId },
    {
      $set: {
        applicationId,
        companyUserId: currentUser.id,
        internUserId: application.internUserId,
        strengths: sanitizeText(payload.strengths),
        weaknesses: sanitizeText(payload.weaknesses),
        rating,
        notes: sanitizeText(payload.notes),
      },
    },
    { new: true, upsert: true }
  ).lean();

  return feedback;
}
