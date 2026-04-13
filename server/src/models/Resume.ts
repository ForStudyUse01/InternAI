import { Schema, model } from "mongoose";

const resumeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    fileName: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true },
    parsingStatus: { type: String, enum: ["pending", "parsed", "failed"], default: "pending" },
    parsedData: {
      summary: { type: String, trim: true },
      skills: { type: [String], default: [] },
      projects: { type: [String], default: [] },
      contact: { type: String, trim: true },
      location: { type: String, trim: true },
    },
    resumeScore: { type: Number, min: 0, max: 100 },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const ResumeModel = model("Resume", resumeSchema);
