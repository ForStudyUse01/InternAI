import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { env } from "./config/env";
import { rootRouter } from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { createRateLimiter } from "./middleware/rateLimit.middleware";
import { requestIdMiddleware } from "./middleware/request-id.middleware";
import { createRequestTimeoutMiddleware } from "./middleware/request-timeout.middleware";
import { successResponse } from "./utils/apiResponse";

const app = express();
const apiRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 120 });

app.use(requestIdMiddleware);
app.use(createRequestTimeoutMiddleware(env.requestTimeoutMs));
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin: env.clientOrigins,
    credentials: true,
  })
);
if (env.nodeEnv !== "production") {
  app.use(morgan("combined"));
}
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.resolve("uploads")));
app.use(apiRateLimiter);

app.get("/", (_req, res) => {
  res.status(200).json(successResponse("Welcome to InternAI API"));
});

app.use("/api/v1", rootRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
