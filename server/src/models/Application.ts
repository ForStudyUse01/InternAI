import { Schema, model } from "mongoose";

const applicationSchema = new Schema(
  {
    internshipId: { type: Schema.Types.ObjectId, ref: "Internship", required: true, index: true },
    internUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["applied", "shortlisted", "test", "interview", "selected", "rejected"],
      default: "applied",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

applicationSchema.index({ internshipId: 1, internUserId: 1 }, { unique: true });
applicationSchema.index({ internUserId: 1, internshipId: 1 });

export const ApplicationModel = model("Application", applicationSchema);
