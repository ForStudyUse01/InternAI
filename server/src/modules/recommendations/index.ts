import { Router } from "express";
import { authenticateJwt } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { getRecommendationsController } from "./recommendations.controller";

const recommendationsRouter = Router();

recommendationsRouter.use(asyncHandler(authenticateJwt));
recommendationsRouter.use(authorizeRoles("intern"));
recommendationsRouter.get("/", asyncHandler(getRecommendationsController));

export { recommendationsRouter };
