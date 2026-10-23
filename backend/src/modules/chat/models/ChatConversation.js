const mongoose = require("mongoose");

const chatConversationSchema = new mongoose.Schema(
  {
    internProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InternProfile",
      required: true,
      index: true
    },
    internUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyProfile",
      required: true,
      index: true
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null
    },
    lastMessageText: { type: String, default: "" },
    lastMessageAt: { type: Date, default: null },
    lastSenderRole: { type: String, enum: ["intern", "company", ""], default: "" },
    unreadIntern: { type: Number, default: 0 },
    unreadCompany: { type: Number, default: 0 }
  },
  { timestamps: true }
);

chatConversationSchema.index({ internProfile: 1, company: 1 }, { unique: true });
chatConversationSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model("ChatConversation", chatConversationSchema);
