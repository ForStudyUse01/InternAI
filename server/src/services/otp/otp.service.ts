import { env } from "../../config/env";
import { logError } from "../../utils/logger";
import type { OTPProvider } from "./otp.provider";
import { EmailOTPProvider } from "./providers/email-otp.provider";
import { MockOTPProvider } from "./providers/mock-otp.provider";

class OTPService {
  private readonly mockProvider: OTPProvider;
  private readonly emailProvider: OTPProvider;

  constructor() {
    this.mockProvider = new MockOTPProvider();
    this.emailProvider = new EmailOTPProvider();
  }

  private getActiveProvider(): OTPProvider {
    return env.otpProvider === "email" ? this.emailProvider : this.mockProvider;
  }

  async sendOTP(identifier: string): Promise<void> {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const activeProvider = this.getActiveProvider();

    try {
      await activeProvider.sendOTP(normalizedIdentifier);
    } catch (error) {
      if (env.otpProvider === "email") {
        logError("Email OTP send failed; using mock provider", error);
        await this.mockProvider.sendOTP(normalizedIdentifier);
        return;
      }

      throw error;
    }
  }

  async verifyOTP(identifier: string, otp: string): Promise<boolean> {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const normalizedOtp = otp.trim();
    const activeProvider = this.getActiveProvider();

    try {
      return await activeProvider.verifyOTP(normalizedIdentifier, normalizedOtp);
    } catch (error) {
      if (env.otpProvider === "email") {
        logError("Email OTP verify failed; using mock provider", error);
        return this.mockProvider.verifyOTP(normalizedIdentifier, normalizedOtp);
      }

      throw error;
    }
  }
}

export const otpService = new OTPService();
