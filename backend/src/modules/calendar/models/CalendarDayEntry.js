const mongoose = require("mongoose");

const calendarDayEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    dateKey: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    entryType: {
      type: String,
      enum: ["sticker", "note"],
      required: true
    },
    emoji: {
      type: String,
      default: "",
      trim: true
    },
    content: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500
    }
  },
  { timestamps: true }
);

calendarDayEntrySchema.index({ user: 1, dateKey: 1, createdAt: 1 });
calendarDayEntrySchema.index({ user: 1, entryType: 1, dateKey: 1 });

module.exports = mongoose.model("CalendarDayEntry", calendarDayEntrySchema);
