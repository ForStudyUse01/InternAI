import { Router } from "express";
import { authenticateJwt } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { addFeedbackController } from "./feedback.controller";

const feedbackRouter = Router();

feedbackRouter.use(asyncHandler(authenticateJwt));
feedbackRouter.use(authorizeRoles("company"));
feedbackRouter.post("/", asyncHandler(addFeedbackController));

export { feedbackRouter };
