const createUploadMiddleware = require("./create-upload-middleware");
const { UPLOAD_DIRECTORIES } = require("../../services/file-upload.service");

const personalPhotoUpload = createUploadMiddleware({
  directory: UPLOAD_DIRECTORIES.PROFILE_PHOTOS,
  allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
  allowedExtensions: [".png", ".jpg", ".jpeg", ".webp"],
  maxSizeBytes: 2 * 1024 * 1024,
  formatErrorMessage: "Unsupported file format. Upload PNG, JPG, JPEG, or WEBP only."
});

module.exports = personalPhotoUpload;
