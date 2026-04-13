import { e2eRegisterOtp } from "../e2e-otp-ledger";
import { createOtpRecord, verifyOtpRecord } from "../otp-record.service";
import type { OTPProvider } from "../otp.provider";

export class MockOTPProvider implements OTPProvider {
  async sendOTP(identifier: string): Promise<void> {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const otpCode = await createOtpRecord(normalizedIdentifier);
    e2eRegisterOtp(normalizedIdentifier, otpCode);
  }

  async verifyOTP(identifier: string, otp: string): Promise<boolean> {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    return verifyOtpRecord(normalizedIdentifier, otp);
  }
}
