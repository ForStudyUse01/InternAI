const PHONE_PATTERN = /^[6-9]\d{9}$/;
const GST_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function requireEmail(req) {
  const email = String(req.body?.email || "").trim();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return { valid, message: valid ? "" : "Valid email is required" };
}

function passwordStrengthError(password) {
  const value = String(password || "");
  if (value.length < 8) return "Password must be at least 8 characters";
  if (value.length > 128) return "Password must be at most 128 characters";
  return "";
}

function maxLengthError(label, value, max) {
  return String(value || "").trim().length > max ? `${label} must be at most ${max} characters` : "";
}

function requireInternSignup(req) {
  const { fullName, email, mobile, password } = req.body || {};
  if (!fullName || !email || !mobile || !password) {
    return { valid: false, message: "fullName, email, mobile and password are required" };
  }
  if (!PHONE_PATTERN.test(String(mobile).trim())) {
    return { valid: false, message: "Enter a valid 10-digit mobile number" };
  }
  const passwordError = passwordStrengthError(password);
  if (passwordError) return { valid: false, message: passwordError };
  const nameError = maxLengthError("fullName", fullName, 120);
  if (nameError) return { valid: false, message: nameError };
  return { valid: true, message: "" };
}

function requireCompanySignup(req) {
  const { companyName, gst, contactName, phone, address, description, password } = req.body || {};
  if (!companyName || !gst || !contactName || !phone || !address || !description || !password) {
    return { valid: false, message: "All required company fields must be provided" };
  }
  if (!PHONE_PATTERN.test(String(phone).trim())) {
    return { valid: false, message: "Enter a valid 10-digit mobile number" };
  }
  if (!GST_PATTERN.test(String(gst).trim().toUpperCase())) {
    return { valid: false, message: "Enter a valid GSTIN" };
  }
  const passwordError = passwordStrengthError(password);
  if (passwordError) return { valid: false, message: passwordError };
  const lengthError =
    maxLengthError("companyName", companyName, 150) ||
    maxLengthError("contactName", contactName, 120) ||
    maxLengthError("address", address, 500) ||
    maxLengthError("description", description, 2000);
  if (lengthError) return { valid: false, message: lengthError };
  return { valid: true, message: "" };
}

function requireOtpVerify(req) {
  const email = String(req.body?.email || "").trim();
  const otp = String(req.body?.otp || "").trim();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validOtp = /^\d{6}$/.test(otp);
  return {
    valid: validEmail && validOtp,
    message: !validEmail ? "Valid email is required" : !validOtp ? "Enter the 6-digit OTP" : ""
  };
}

function requirePasswordReset(req) {
  const email = String(req.body?.email || "").trim();
  const otp = String(req.body?.otp || "").trim();
  const newPassword = String(req.body?.newPassword || "");
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validOtp = /^\d{6}$/.test(otp);
  const validPassword = newPassword.length >= 8;
  return {
    valid: validEmail && validOtp && validPassword,
    message: !validEmail
      ? "Valid email is required"
      : !validOtp
        ? "Enter the 6-digit OTP"
        : !validPassword
          ? "Password must be at least 8 characters"
          : ""
  };
}

module.exports = { requireEmail, requireInternSignup, requireCompanySignup, requireOtpVerify, requirePasswordReset };
