import type { Request, Response } from "express";
import { UserModel } from "../../models/User";
import { otpService } from "../../services/otp/otp.service";
import { successResponse } from "../../utils/apiResponse";
import { HttpError } from "../../utils/httpError";

function sanitize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function verifyOtpController(req: Request, res: Response): Promise<void> {
  const identifier = sanitize(req.body.identifier).toLowerCase();
  const otp = sanitize(req.body.otp);

  if (!identifier || !otp) {
    throw new HttpError(400, "Identifier and OTP are required");
  }

  const isValid = await otpService.verifyOTP(identifier, otp);
  if (!isValid) {
    throw new HttpError(400, "Invalid or expired OTP");
  }

  const updatedUser = await UserModel.findOneAndUpdate({ email: identifier }, { $set: { isVerified: true } }, { new: true });
  if (!updatedUser) {
    throw new HttpError(404, "User not found for this identifier");
  }

  res.status(200).json(successResponse("OTP verified successfully"));
}

export async function resendOtpController(req: Request, res: Response): Promise<void> {
  const identifier = sanitize(req.body.identifier).toLowerCase();
  if (!identifier) {
    throw new HttpError(400, "Identifier is required");
  }

  const user = await UserModel.findOne({ email: identifier });
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  await otpService.sendOTP(identifier);
  res.status(200).json(successResponse("OTP resent successfully"));
}
