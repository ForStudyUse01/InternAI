export interface OTPProvider {
  sendOTP(identifier: string): Promise<void>;
  verifyOTP(identifier: string, otp: string): Promise<boolean>;
}
