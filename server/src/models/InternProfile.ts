import { Schema, model } from "mongoose";

const internProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    skills: { type: [String], default: [] },
    location: { type: String, trim: true },
    summary: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false }
);

export const InternProfileModel = model("InternProfile", internProfileSchema);
