const mongoose = require("mongoose");
const { USER_ROLES, ADMIN_ROLES, COMPANY_ACCOUNT_TYPES } = require("../../../constants/enums");
const { ROLE_PERMISSIONS } = require("../../../constants/roles");
const { normalizeHrPermissions, HR_DEFAULT_PERMISSIONS } = require("../../../constants/hr-permissions");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      required: true
    },
    adminRole: {
      type: String,
      enum: Object.values(ADMIN_ROLES),
      default: null
    },
    permissions: {
      type: [String],
      default: []
    },
    // Email verification feature rolled back (temporary). Fields kept for backward
    // compatibility with existing user records and possible future re-implementation
    // with a production email provider. Nothing reads/writes these currently.
    emailVerified: {
      type: Boolean,
      default: true
    },
    // No `default` here (deliberately, unlike the sibling fields above): a
    // unique+sparse index only excludes documents where the field is truly
    // absent. An explicit `default: null` would still get indexed (MongoDB
    // treats stored null as a value, not "missing"), so the very second user
    // ever created — with this field left unset — would collide on the
    // unique constraint and fail to save. Leaving it with no default keeps
    // the field genuinely absent until something explicitly sets it.
    verificationTokenHash: {
      type: String
    },
    verificationTokenExpiresAt: {
      type: Date,
      default: null
    },
    verificationEmailLastSentAt: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    refreshTokenHash: {
      type: String,
      default: ""
    },
    refreshTokenExpiresAt: {
      type: Date,
      default: null
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    lastLoginIp: {
      type: String,
      default: ""
    },
    mfaEnabled: {
      type: Boolean,
      default: function resolveMfaDefault() {
        return this.role === USER_ROLES.ADMIN;
      }
    },
    companyAccountType: {
      type: String,
      enum: ["owner", "hr", "ceo"],
      default: null
    },
    companyProfileRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyProfile",
      default: null
    },
    displayName: {
      type: String,
      default: "",
      trim: true
    },
    phone: {
      type: String,
      default: "",
      trim: true
    },
    photoUrl: {
      type: String,
      default: "",
      trim: true
    },
    designation: {
      type: String,
      default: "",
      trim: true
    },
    linkedInUrl: {
      type: String,
      default: "",
      trim: true
    },
    personalWebsite: {
      type: String,
      default: "",
      trim: true
    },
    bio: {
      type: String,
      default: "",
      trim: true
    },
    hrCustomPermissions: {
      type: [String],
      default: []
    },
    sidebarModules: {
      type: [String],
      default: undefined
    },
    themePreference: {
      type: String,
      default: null,
      trim: true
    },
    appearanceMode: {
      type: String,
      enum: ["light", "dark", null],
      default: null
    }
  },
  { timestamps: true }
);

userSchema.pre("save", function userPermissionsSync(next) {
  if (this.role === USER_ROLES.COMPANY) {
    const accountType = this.companyAccountType || COMPANY_ACCOUNT_TYPES.OWNER;
    this.companyAccountType = accountType;
    if (accountType === COMPANY_ACCOUNT_TYPES.HR) {
      const custom = Array.isArray(this.hrCustomPermissions) && this.hrCustomPermissions.length > 0;
      this.permissions = custom
        ? normalizeHrPermissions(this.hrCustomPermissions)
        : [...HR_DEFAULT_PERMISSIONS];
    } else {
      this.permissions = [...new Set(ROLE_PERMISSIONS.company || [])];
    }
    this.adminRole = null;
    return next();
  }

  if (this.role !== USER_ROLES.ADMIN) {
    this.adminRole = null;
    this.permissions = [];
    return next();
  }

  const adminRole = this.adminRole || ADMIN_ROLES.SUPER_ADMIN;
  this.adminRole = adminRole;
  this.permissions = [...new Set(ROLE_PERMISSIONS[adminRole] || [])];
  return next();
});

userSchema.index({ role: 1, isDeleted: 1, createdAt: -1 });
userSchema.index({ companyProfileRef: 1, companyAccountType: 1, isDeleted: 1 });
userSchema.index({ verificationTokenHash: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("User", userSchema);
