import { Schema, model } from "mongoose";

const internshipSchema = new Schema(
  {
    companyUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    stipend: { type: String, required: true, trim: true },
    requiredSkills: { type: [String], default: [] },
    preferredSkills: { type: [String], default: [] },
    status: { type: String, enum: ["open", "closed", "draft"], default: "open" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

internshipSchema.index({ companyUserId: 1, createdAt: -1 });
internshipSchema.index({ status: 1, createdAt: -1 });

export const InternshipModel = model("Internship", internshipSchema);
