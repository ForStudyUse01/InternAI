import nodemailer from "nodemailer";
import { env } from "../../../config/env";
import { createOtpRecord, verifyOtpRecord } from "../otp-record.service";
import type { OTPProvider } from "../otp.provider";

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465,
  auth:
    env.smtpUser && env.smtpPass
      ? {
          user: env.smtpUser,
          pass: env.smtpPass,
        }
      : undefined,
});

export class EmailOTPProvider implements OTPProvider {
  async sendOTP(identifier: string): Promise<void> {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const otpCode = await createOtpRecord(normalizedIdentifier);

    await transporter.sendMail({
      from: env.smtpFrom,
      to: normalizedIdentifier,
      subject: "InternAI OTP Verification",
      text: `Your InternAI OTP is ${otpCode}. It expires in ${env.otpTtlMinutes} minutes.`,
    });
  }

  async verifyOTP(identifier: string, otp: string): Promise<boolean> {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    return verifyOtpRecord(normalizedIdentifier, otp);
  }
}
