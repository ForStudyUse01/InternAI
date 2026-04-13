import { HttpError } from "../../utils/httpError";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^\+?[0-9]{8,15}$/;
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /[0-9]/;
const SPECIAL_REGEX = /[^A-Za-z0-9]/;

export interface SignupInput {
  name: string;
  email: string;
  mobileNumber: string;
  password: string;
  confirmPassword: string;
}

export interface LoginInput {
  identifier: string;
  password: string;
}

export function sanitizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function sanitizeEmail(value: unknown): string {
  return sanitizeText(value).toLowerCase();
}

export function sanitizeMobile(value: unknown): string {
  return sanitizeText(value).replace(/[\s-]/g, "");
}

export function validateSignupInput(input: SignupInput): void {
  if (!input.name || !input.email || !input.mobileNumber || !input.password || !input.confirmPassword) {
    throw new HttpError(400, "All fields are required");
  }

  if (!EMAIL_REGEX.test(input.email)) {
    throw new HttpError(400, "Invalid email format");
  }

  if (!MOBILE_REGEX.test(input.mobileNumber)) {
    throw new HttpError(400, "Invalid mobile number format");
  }

  if (input.password !== input.confirmPassword) {
    throw new HttpError(400, "Password and confirm password do not match");
  }

  const isStrongPassword =
    input.password.length >= 8 &&
    UPPERCASE_REGEX.test(input.password) &&
    LOWERCASE_REGEX.test(input.password) &&
    NUMBER_REGEX.test(input.password) &&
    SPECIAL_REGEX.test(input.password);

  if (!isStrongPassword) {
    throw new HttpError(400, "Password must contain uppercase, lowercase, number, and special character");
  }
}

export function validateLoginInput(input: LoginInput): void {
  if (!input.identifier || !input.password) {
    throw new HttpError(400, "Identifier and password are required");
  }

  const isEmail = EMAIL_REGEX.test(input.identifier);
  const isMobile = MOBILE_REGEX.test(input.identifier);
  if (!isEmail && !isMobile) {
    throw new HttpError(400, "Identifier must be a valid email or mobile number");
  }
}
