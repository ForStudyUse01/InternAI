import { Schema, model } from "mongoose";

const otpVerificationSchema = new Schema(
  {
    identifier: { type: String, required: true, trim: true, lowercase: true, index: true },
    otpCode: { type: String, required: true },
    expiryTime: { type: Date, required: true, index: true },
    verified: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

otpVerificationSchema.index({ identifier: 1, verified: 1, expiryTime: 1 });

export const OTPVerificationModel = model("OTPVerification", otpVerificationSchema);
