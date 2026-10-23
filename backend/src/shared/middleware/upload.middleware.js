const createUploadMiddleware = require("./create-upload-middleware");
const { UPLOAD_DIRECTORIES } = require("../../services/file-upload.service");

const upload = createUploadMiddleware({
  directory: UPLOAD_DIRECTORIES.RESUMES,
  allowedMimeTypes: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain"
  ],
  allowedExtensions: [".pdf", ".doc", ".docx", ".txt"],
  maxSizeBytes: 5 * 1024 * 1024,
  formatErrorMessage: "Unsupported file format. Upload PDF, DOC, DOCX, or TXT only."
});

module.exports = upload;
