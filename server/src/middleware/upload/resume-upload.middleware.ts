import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import { env } from "../../config/env";
import { HttpError } from "../../utils/httpError";

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const uploadDirectory = path.resolve(env.resumeUploadDir);
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (_req, file, callback) => {
    const safeBaseName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    callback(null, `${Date.now()}-${safeBaseName}`);
  },
});

function fileFilter(_req: Express.Request, file: Express.Multer.File, callback: multer.FileFilterCallback): void {
  if (!allowedMimeTypes.has(file.mimetype)) {
    callback(new HttpError(400, "Only PDF, DOC, and DOCX files are allowed"));
    return;
  }

  callback(null, true);
}

export const resumeUploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.resumeMaxFileSizeMb * 1024 * 1024,
  },
});
