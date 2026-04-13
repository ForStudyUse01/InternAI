import { Router } from "express";
import { authenticateJwt } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  createInternshipController,
  deleteInternshipController,
  listApplicantsController,
  listInternshipsController,
  updateInternshipController,
} from "./internships.controller";

const internshipsRouter = Router();

internshipsRouter.use(asyncHandler(authenticateJwt));
internshipsRouter.get("/", asyncHandler(listInternshipsController));
internshipsRouter.post("/", authorizeRoles("company"), asyncHandler(createInternshipController));
internshipsRouter.put("/:internshipId", authorizeRoles("company"), asyncHandler(updateInternshipController));
internshipsRouter.delete("/:internshipId", authorizeRoles("company"), asyncHandler(deleteInternshipController));
internshipsRouter.get("/:internshipId/applicants", authorizeRoles("company"), asyncHandler(listApplicantsController));

export { internshipsRouter };
