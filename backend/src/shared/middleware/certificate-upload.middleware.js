const createUploadMiddleware = require("./create-upload-middleware");
const { UPLOAD_DIRECTORIES } = require("../../services/file-upload.service");

const certificateUpload = createUploadMiddleware({
  directory: UPLOAD_DIRECTORIES.CERTIFICATES,
  allowedMimeTypes: [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ],
  allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".doc", ".docx"],
  maxSizeBytes: 10 * 1024 * 1024,
  formatErrorMessage: "Unsupported file format. Upload PDF, DOC, DOCX, PNG, JPG, JPEG, or WEBP only."
});

module.exports = certificateUpload;
