import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { resendOtpController, verifyOtpController } from "./verification.controller";

const verificationRouter = Router();

verificationRouter.post("/verify-otp", asyncHandler(verifyOtpController));
verificationRouter.post("/resend-otp", asyncHandler(resendOtpController));

export { verificationRouter };
