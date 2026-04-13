import type { Request, Response } from "express";
import { signupIntern, signupCompany, login } from "../../services/auth/auth.service";
import { successResponse } from "../../utils/apiResponse";

export async function signupInternController(req: Request, res: Response): Promise<void> {
  const { fullName, email, mobileNumber, password, confirmPassword } = req.body as Record<string, string>;

  await signupIntern({
    name: fullName,
    email,
    mobileNumber,
    password,
    confirmPassword,
  });

  res.status(201).json(successResponse("Intern signup successful. OTP sent for verification."));
}

export async function signupCompanyController(req: Request, res: Response): Promise<void> {
  const { companyName, officialEmail, mobileNumber, password, confirmPassword } = req.body as Record<string, string>;

  await signupCompany({
    name: companyName,
    email: officialEmail,
    mobileNumber,
    password,
    confirmPassword,
  });

  res.status(201).json(successResponse("Company signup successful. OTP sent for verification."));
}

export async function loginController(req: Request, res: Response): Promise<void> {
  const { email, mobileNumber, password } = req.body as Record<string, string>;
  const identifier = email ?? mobileNumber;
  const result = await login({ identifier, password });

  res.status(200).json(successResponse("Login successful", result));
}
