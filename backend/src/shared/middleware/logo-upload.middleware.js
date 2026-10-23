const createUploadMiddleware = require("./create-upload-middleware");
const { UPLOAD_DIRECTORIES } = require("../../services/file-upload.service");

// SVG is deliberately excluded: it's an XML format that can carry an inline
// <script> or event-handler attribute, so accepting it here would let a
// company user store a stored-XSS payload served back from our own origin
// (via the raw /uploads URL). PNG/JPEG/WEBP cannot execute script.
const logoUpload = createUploadMiddleware({
  directory: UPLOAD_DIRECTORIES.COMPANY_LOGOS,
  allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
  allowedExtensions: [".png", ".jpg", ".jpeg", ".webp"],
  maxSizeBytes: 2 * 1024 * 1024,
  formatErrorMessage: "Unsupported file format. Upload PNG, JPG, JPEG, or WEBP only."
});

module.exports = logoUpload;
