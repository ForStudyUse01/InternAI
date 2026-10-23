const mongoose = require("mongoose");

const INTERVIEW_ROOM_STATUS = ["scheduled", "live", "completed", "cancelled", "no_show"];
const INTERVIEW_OUTCOMES = ["selected", "rejected", "on_hold", null];

const chatMessageSchema = new mongoose.Schema(
  {
    senderRole: { type: String, enum: ["intern", "company"], required: true },
    senderName: { type: String, default: "" },
    body: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const interviewRoomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true
    },
    roundId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InternProfile",
      required: true,
      index: true
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyProfile",
      required: true,
      index: true
    },
    scheduledTime: {
      type: Date,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: INTERVIEW_ROOM_STATUS,
      default: "scheduled",
      index: true
    },
    hrNotes: {
      type: String,
      default: ""
    },
    outcome: {
      type: String,
      enum: ["selected", "rejected", "on_hold", ""],
      default: ""
    },
    roundType: { type: String, default: "" },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    chatMessages: {
      type: [chatMessageSchema],
      default: []
    },
    participants: {
      type: [
        {
          _id: false,
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
          role: { type: String, enum: ["intern", "company"], required: true },
          name: { type: String, default: "" },
          joinedAt: { type: Date, default: Date.now },
          leftAt: { type: Date, default: null }
        }
      ],
      default: []
    },
    everJoined: { type: Boolean, default: false },
    maxParticipants: { type: Number, default: 4 }
  },
  { timestamps: true }
);

interviewRoomSchema.index({ applicationId: 1, roundId: 1 }, { unique: true });

module.exports = mongoose.model("InterviewRoom", interviewRoomSchema);
