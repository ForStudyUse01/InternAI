import { Router } from "express";
import { healthController } from "../controllers/health.controller";
import { authRouter } from "../modules/auth";
import { verificationRouter } from "../modules/verification";
import { resumeRouter } from "../modules/resume";
import { internshipsRouter } from "../modules/internships";
import { applicationsRouter } from "../modules/applications";
import { recommendationsRouter } from "../modules/recommendations";
import { feedbackRouter } from "../modules/feedback";
import { profilesRouter } from "../modules/profiles";

const rootRouter = Router();

rootRouter.get("/health", healthController);

rootRouter.use("/auth", authRouter);
rootRouter.use("/verification", verificationRouter);
rootRouter.use("/resume", resumeRouter);
rootRouter.use("/internships", internshipsRouter);
rootRouter.use("/applications", applicationsRouter);
rootRouter.use("/recommendations", recommendationsRouter);
rootRouter.use("/feedback", feedbackRouter);
rootRouter.use("/profiles", profilesRouter);

export { rootRouter };
