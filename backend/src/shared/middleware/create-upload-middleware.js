const multer = require("multer");
const path = require("path");
const { resolveUploadDirectory, buildStoredFilename } = require("../../services/file-upload.service");

function createUploadMiddleware({ directory, allowedMimeTypes, allowedExtensions, maxSizeBytes, formatErrorMessage }) {
  const mimeSet = new Set(allowedMimeTypes);
  const extensionSet = new Set(allowedExtensions);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, resolveUploadDirectory(directory));
    },
    filename: (req, file, cb) => {
      cb(null, buildStoredFilename(file.originalname));
    }
  });

  return multer({
    storage,
    limits: { fileSize: maxSizeBytes },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(String(file.originalname || "")).toLowerCase();
      const mimeOk = mimeSet.has(file.mimetype);
      const extOk = extensionSet.has(ext);
      if (!mimeOk || !extOk) {
        return cb(new Error(formatErrorMessage));
      }
      cb(null, true);
    }
  });
}

module.exports = createUploadMiddleware;
