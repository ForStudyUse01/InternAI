const reveal = process.env.E2E_REVEAL_OTP === "true";
const ledger = new Map<string, string>();

/** Captures plaintext OTP for automated E2E when `E2E_REVEAL_OTP=true` (never set in production). */
export function e2eRegisterOtp(identifier: string, code: string): void {
  if (!reveal) {
    return;
  }
  ledger.set(identifier.trim().toLowerCase(), code);
}

export function e2ePeekOtp(identifier: string): string {
  const key = identifier.trim().toLowerCase();
  const code = ledger.get(key);
  if (!code) {
    throw new Error(`No E2E OTP recorded for ${key}. Set E2E_REVEAL_OTP=true before imports.`);
  }
  return code;
}
