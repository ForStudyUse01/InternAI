const mongoose = require("mongoose");

const otpVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    otpHash: {
      type: String,
      required: true
    },
    purpose: {
      type: String,
      enum: ["intern_signup", "login", "password_reset", "admin_login"],
      default: "intern_signup"
    },
    verified: {
      type: Boolean,
      default: false
    },
    attemptCount: {
      type: Number,
      default: 0
    },
    lastSentAt: {
      type: Date,
      default: null
    },
    lastVerifiedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

otpVerificationSchema.index({ email: 1, purpose: 1 }, { unique: true });
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OtpVerification", otpVerificationSchema);
