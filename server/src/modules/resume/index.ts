import { Router } from "express";
import { authenticateJwt } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/rbac.middleware";
import { resumeUploadMiddleware } from "../../middleware/upload/resume-upload.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { getParsedResumeController, updateManualSkillsController, uploadResumeController } from "./resume.controller";

const resumeRouter = Router();

resumeRouter.use(asyncHandler(authenticateJwt));
resumeRouter.use(authorizeRoles("intern"));

resumeRouter.post("/upload", resumeUploadMiddleware.single("resume"), asyncHandler(uploadResumeController));
resumeRouter.get("/parsed", asyncHandler(getParsedResumeController));
resumeRouter.patch("/manual-skills", asyncHandler(updateManualSkillsController));

export { resumeRouter };
