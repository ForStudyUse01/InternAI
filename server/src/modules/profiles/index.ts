import { Router } from "express";
import { authenticateJwt } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/rbac.middleware";
import { successResponse } from "../../utils/apiResponse";

const profilesRouter = Router();

profilesRouter.get("/intern/me", authenticateJwt, authorizeRoles("intern"), (req, res) => {
  res.status(200).json(successResponse("Intern route access granted", { user: req.user }));
});

profilesRouter.get("/company/me", authenticateJwt, authorizeRoles("company"), (req, res) => {
  res.status(200).json(successResponse("Company route access granted", { user: req.user }));
});

export { profilesRouter };
