import { Schema, model } from "mongoose";

const feedbackSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true, unique: true, index: true },
    companyUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    internUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    strengths: { type: String, trim: true },
    weaknesses: { type: String, trim: true },
    rating: { type: Number, min: 1, max: 5 },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const FeedbackModel = model("Feedback", feedbackSchema);
