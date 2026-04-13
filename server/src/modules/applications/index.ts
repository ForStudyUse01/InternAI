import { Router } from "express";
import { authenticateJwt } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { applyToInternshipController, listInternApplicationsController, updateApplicationStatusController } from "./applications.controller";

const applicationsRouter = Router();

applicationsRouter.use(asyncHandler(authenticateJwt));
applicationsRouter.post("/", authorizeRoles("intern"), asyncHandler(applyToInternshipController));
applicationsRouter.get("/intern/me", authorizeRoles("intern"), asyncHandler(listInternApplicationsController));
applicationsRouter.patch("/:applicationId/status", authorizeRoles("company"), asyncHandler(updateApplicationStatusController));

export { applicationsRouter };
