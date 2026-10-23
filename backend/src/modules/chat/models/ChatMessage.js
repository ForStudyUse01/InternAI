const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatConversation",
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    senderRole: {
      type: String,
      enum: ["intern", "company"],
      required: true
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent"
    },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null }
  },
  { timestamps: true }
);

chatMessageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
