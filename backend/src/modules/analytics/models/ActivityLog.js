const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    actorUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    actorRole: { type: String, default: "", index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    action: { type: String, required: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: "" }
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
