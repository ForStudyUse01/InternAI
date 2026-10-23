const fs = require("fs/promises");
const path = require("path");
const { PLATFORM_CONFIG } = require("../../config/platform.config");

function isCloudinaryEnabled() {
  return (
    PLATFORM_CONFIG.storage.provider === "cloudinary" &&
    PLATFORM_CONFIG.storage.cloudinaryCloudName &&
    PLATFORM_CONFIG.storage.cloudinaryApiKey &&
    PLATFORM_CONFIG.storage.cloudinaryApiSecret
  );
}

async function uploadLocal(filePath, folder) {
  return {
    provider: "local",
    url: `/uploads/${folder}/${path.basename(filePath)}`,
    publicId: path.basename(filePath),
    path: filePath
  };
}

async function uploadCloudinary(filePath, folder, resourceType = "auto") {
  const cloudinary = require("cloudinary").v2;
  cloudinary.config({
    cloud_name: PLATFORM_CONFIG.storage.cloudinaryCloudName,
    api_key: PLATFORM_CONFIG.storage.cloudinaryApiKey,
    api_secret: PLATFORM_CONFIG.storage.cloudinaryApiSecret
  });

  const result = await cloudinary.uploader.upload(filePath, {
    folder: `${PLATFORM_CONFIG.storage.cloudinaryFolder}/${folder}`,
    resource_type: resourceType
  });

  return {
    provider: "cloudinary",
    url: result.secure_url,
    publicId: result.public_id,
    path: filePath
  };
}

async function storeUploadedFile({ filePath, folder = "resumes", resourceType = "auto" }) {
  if (!filePath) {
    throw new Error("filePath is required");
  }

  await fs.access(filePath);

  if (isCloudinaryEnabled()) {
    try {
      return await uploadCloudinary(filePath, folder, resourceType);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("[storage] Cloudinary upload failed, falling back to local:", error.message);
    }
  }

  return uploadLocal(filePath, folder);
}

function resolvePublicUrl(stored) {
  if (!stored) return null;
  if (stored.provider === "cloudinary") return stored.url;
  return stored.url;
}

module.exports = {
  isCloudinaryEnabled,
  storeUploadedFile,
  resolvePublicUrl
};
