import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { loginController, signupCompanyController, signupInternController } from "./auth.controller";

const authRouter = Router();

authRouter.post("/signup/intern", asyncHandler(signupInternController));
authRouter.post("/signup/company", asyncHandler(signupCompanyController));
authRouter.post("/login", asyncHandler(loginController));

export { authRouter };
