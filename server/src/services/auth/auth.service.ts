import { CompanyProfileModel } from "../../models/CompanyProfile";
import { InternProfileModel } from "../../models/InternProfile";
import { UserModel } from "../../models/User";
import type { UserRole } from "../../types/auth";
import { HttpError } from "../../utils/httpError";
import { generateAccessToken } from "./jwt.service";
import { comparePassword, hashPassword } from "./password.service";
import { sanitizeEmail, sanitizeMobile, sanitizeText, validateLoginInput, validateSignupInput } from "./auth.validation";
import { otpService } from "../otp/otp.service";

interface SignupPayload {
  name: string;
  email: string;
  mobileNumber: string;
  password: string;
  confirmPassword: string;
}

interface LoginPayload {
  identifier: string;
  password: string;
}

interface AuthResult {
  token: string;
  user: {
    id: string;
    role: UserRole;
    email: string;
    isVerified: boolean;
  };
}

async function ensureUserDoesNotExist(email: string, mobileNumber: string): Promise<void> {
  const existing = await UserModel.findOne({ $or: [{ email }, { mobileNumber }] }).lean();
  if (existing) {
    throw new HttpError(409, "User with this email or mobile already exists");
  }
}

async function createUserAndProfile(role: UserRole, payload: SignupPayload): Promise<void> {
  const passwordHash = await hashPassword(payload.password);

  const user = await UserModel.create({
    fullName: role === "intern" ? payload.name : undefined,
    companyName: role === "company" ? payload.name : undefined,
    email: payload.email,
    mobileNumber: payload.mobileNumber,
    passwordHash,
    role,
    isVerified: false,
  });

  if (role === "intern") {
    await InternProfileModel.create({ userId: user._id });
    return;
  }

  await CompanyProfileModel.create({ userId: user._id });
}

async function signup(role: UserRole, payload: SignupPayload): Promise<void> {
  const sanitizedPayload: SignupPayload = {
    name: sanitizeText(payload.name),
    email: sanitizeEmail(payload.email),
    mobileNumber: sanitizeMobile(payload.mobileNumber),
    password: sanitizeText(payload.password),
    confirmPassword: sanitizeText(payload.confirmPassword),
  };

  validateSignupInput(sanitizedPayload);
  await ensureUserDoesNotExist(sanitizedPayload.email, sanitizedPayload.mobileNumber);
  await createUserAndProfile(role, sanitizedPayload);
  await otpService.sendOTP(sanitizedPayload.email);
}

export async function signupIntern(payload: SignupPayload): Promise<void> {
  await signup("intern", payload);
}

export async function signupCompany(payload: SignupPayload): Promise<void> {
  await signup("company", payload);
}

export async function login(payload: LoginPayload): Promise<AuthResult> {
  const rawIdentifier = sanitizeText(payload.identifier);
  const normalizedIdentifier = rawIdentifier.includes("@") ? sanitizeEmail(rawIdentifier) : sanitizeMobile(rawIdentifier);

  const sanitizedPayload = {
    identifier: normalizedIdentifier,
    password: sanitizeText(payload.password),
  };

  validateLoginInput(sanitizedPayload);

  const query = sanitizedPayload.identifier.includes("@")
    ? { email: sanitizedPayload.identifier }
    : { mobileNumber: sanitizedPayload.identifier };

  const user = await UserModel.findOne(query);
  if (!user) {
    throw new HttpError(401, "Invalid credentials");
  }

  const isPasswordValid = await comparePassword(sanitizedPayload.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new HttpError(401, "Invalid credentials");
  }

  if (!user.isVerified) {
    throw new HttpError(403, "User is not verified. Please complete OTP verification.");
  }

  const token = generateAccessToken(user._id.toString(), user.role as UserRole);
  return {
    token,
    user: {
      id: user._id.toString(),
      role: user.role as UserRole,
      email: user.email,
      isVerified: user.isVerified,
    },
  };
}
