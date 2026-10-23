/**
 * OTP flow integration test — run with backend connected to MongoDB.
 * Usage: node scripts/test-otp-flow.mjs
 */
const BASE = process.env.API_BASE_URL || "http://localhost:5000";

async function api(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function assert(condition, label, detail = "") {
  if (!condition) {
    throw new Error(`FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
  }
  console.log(`PASS: ${label}`);
}

async function main() {
  const email = `otp-test-${Date.now()}@example.com`;
  console.log(`Testing OTP flow for ${email}\n`);

  const invalidEmail = await api("/api/auth/intern/send-otp", { email: "not-an-email" });
  assert(invalidEmail.status === 400, "Invalid email rejected on send");

  const send1 = await api("/api/auth/intern/send-otp", { email });
  assert(send1.status === 200, "Send OTP succeeds", JSON.stringify(send1.data));
  const devOtp = send1.data.devOtp;
  assert(devOtp && /^\d{6}$/.test(devOtp), "Dev OTP returned in non-production");

  const resendTooSoon = await api("/api/auth/intern/send-otp", { email });
  assert(resendTooSoon.status === 429, "Resend blocked during cooldown");

  const wrongVerify = await api("/api/auth/intern/verify-otp", { email, otp: "000000" });
  assert(wrongVerify.status === 400, "Wrong OTP rejected", wrongVerify.data.message);

  const correctVerify = await api("/api/auth/intern/verify-otp", { email, otp: devOtp });
  assert(correctVerify.status === 200 && correctVerify.data.verified, "Correct OTP verifies");

  const alreadyVerified = await api("/api/auth/intern/verify-otp", { email, otp: devOtp });
  assert(alreadyVerified.status === 200, "Already verified returns success");

  const sendWhenVerified = await api("/api/auth/intern/send-otp", { email });
  assert(sendWhenVerified.status === 400, "Send blocked when already verified within window");

  const signupWithoutFields = await api("/api/auth/intern/signup", { email, password: "Test@1234" });
  assert(signupWithoutFields.status === 400, "Signup requires full fields");

  const signup = await api("/api/auth/intern/signup", {
    fullName: "OTP Test User",
    email,
    mobile: "9876543210",
    password: "Test@1234"
  });
  assert(signup.status === 201, "Signup after OTP verification succeeds");

  const duplicateSend = await api("/api/auth/intern/send-otp", { email });
  assert(duplicateSend.status === 409, "Registered email blocked on send");

  console.log("\nAll OTP integration checks passed.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
