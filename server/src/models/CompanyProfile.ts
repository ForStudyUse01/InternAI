import { Schema, model } from "mongoose";

const companyProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    yearJoined: { type: Number },
    totalInternships: { type: Number, default: 0 },
    totalHires: { type: Number, default: 0 },
    rating: { type: Number },
  },
  { timestamps: true, versionKey: false }
);

export const CompanyProfileModel = model("CompanyProfile", companyProfileSchema);
