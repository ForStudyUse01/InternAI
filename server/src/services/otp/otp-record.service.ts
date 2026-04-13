import { OTPVerificationModel } from "../../models/OTPVerification";
import { comparePassword, hashPassword } from "../auth/password.service";
import { computeOtpExpiryDate, generateOtpCode } from "./otp.utils";

export async function createOtpRecord(identifier: string): Promise<string> {
  const otpCode = generateOtpCode();
  await OTPVerificationModel.updateMany({ identifier, verified: false }, { $set: { verified: true } });

  await OTPVerificationModel.create({
    identifier,
    otpCode: await hashPassword(otpCode),
    expiryTime: computeOtpExpiryDate(),
    verified: false,
  });

  return otpCode;
}

export async function verifyOtpRecord(identifier: string, otp: string): Promise<boolean> {
  const record = await OTPVerificationModel.findOne({
    identifier,
    verified: false,
    expiryTime: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!record) {
    return false;
  }

  const isValid = await comparePassword(otp, record.otpCode);
  if (!isValid) {
    return false;
  }

  record.verified = true;
  await record.save();
  return true;
}
