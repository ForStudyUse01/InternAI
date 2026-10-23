const CalendarDayEntry = require("../../../models/CalendarDayEntry");
const asyncHandler = require("../../../shared/utils/asyncHandler");
const AppError = require("../../../shared/utils/AppError");
const {
  CALENDAR_NOTE_MAX_LENGTH,
  isAllowedCalendarSticker
} = require("../../../constants/calendar-stickers");
const {
  cacheOrFetch,
  invalidatePattern,
  CacheKeys,
  CacheTTL
} = require("../../../shared/infrastructure/cache");
const logger = require("../../../shared/logger");
const { sendSuccess } = require("../../../shared/utils/api-response");

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Any calendar write affects an unknown subset of cached date ranges, so drop
// the whole per-user calendar namespace (small, per-student key space).
async function invalidateCalendar(userId) {
  const id = String(userId);
  await invalidatePattern(`${CacheKeys.studentCalendarPrefix(id)}:*`);
  logger.info(`[cache] invalidated calendar for ${id}`);
}

function normalizeDateKey(value) {
  const key = String(value || "").trim();
  if (!DATE_KEY_PATTERN.test(key)) {
    throw new AppError("dateKey must use YYYY-MM-DD format", 400);
  }
  const parsed = new Date(`${key}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("Invalid dateKey", 400);
  }
  return key;
}

exports.listEntries = asyncHandler(async (req, res) => {
  const from = req.query.from ? normalizeDateKey(req.query.from) : null;
  const to = req.query.to ? normalizeDateKey(req.query.to) : null;

  const payload = await cacheOrFetch(
    CacheKeys.studentCalendar(String(req.user._id), from || "all", to || "all"),
    async () => {
      const query = { user: req.user._id };
      if (from && to) {
        query.dateKey = { $gte: from, $lte: to };
      } else if (from) {
        query.dateKey = { $gte: from };
      } else if (to) {
        query.dateKey = { $lte: to };
      }

      const entries = await CalendarDayEntry.find(query).sort({ dateKey: 1, createdAt: 1 }).lean();
      return { entries };
    },
    CacheTTL.calendar
  );
  return sendSuccess(res, { data: payload });
});

exports.createEntry = asyncHandler(async (req, res) => {
  const { dateKey, entryType, emoji, content } = req.body || {};
  const normalizedDateKey = normalizeDateKey(dateKey);
  const type = String(entryType || "").trim();

  if (!["sticker", "note"].includes(type)) {
    throw new AppError("entryType must be 'sticker' or 'note'", 400);
  }

  if (type === "sticker") {
    const sticker = String(emoji || "").trim();
    if (!isAllowedCalendarSticker(sticker)) {
      throw new AppError("Emoji is not in the allowed sticker set", 400);
    }
    const entry = await CalendarDayEntry.create({
      user: req.user._id,
      dateKey: normalizedDateKey,
      entryType: "sticker",
      emoji: sticker,
      content: ""
    });
    await invalidateCalendar(req.user._id);
    return sendSuccess(res, { statusCode: 201, message: "Sticker added", data: { entry } });
  }

  const noteText = String(content || "").trim();
  if (!noteText) {
    throw new AppError("Note content is required", 400);
  }
  if (noteText.length > CALENDAR_NOTE_MAX_LENGTH) {
    throw new AppError(`Note must be at most ${CALENDAR_NOTE_MAX_LENGTH} characters`, 400);
  }

  const entry = await CalendarDayEntry.create({
    user: req.user._id,
    dateKey: normalizedDateKey,
    entryType: "note",
    emoji: "",
    content: noteText
  });
  await invalidateCalendar(req.user._id);
  return sendSuccess(res, { statusCode: 201, message: "Note added", data: { entry } });
});

exports.updateEntry = asyncHandler(async (req, res) => {
  const entry = await CalendarDayEntry.findOne({ _id: req.params.entryId, user: req.user._id });
  if (!entry) {
    throw new AppError("Calendar entry not found", 404);
  }

  if (entry.entryType === "sticker") {
    const sticker = String(req.body?.emoji || "").trim();
    if (!isAllowedCalendarSticker(sticker)) {
      throw new AppError("Emoji is not in the allowed sticker set", 400);
    }
    entry.emoji = sticker;
  } else {
    const noteText = String(req.body?.content || "").trim();
    if (!noteText) {
      throw new AppError("Note content is required", 400);
    }
    if (noteText.length > CALENDAR_NOTE_MAX_LENGTH) {
      throw new AppError(`Note must be at most ${CALENDAR_NOTE_MAX_LENGTH} characters`, 400);
    }
    entry.content = noteText;
  }

  await entry.save();
  await invalidateCalendar(req.user._id);
  return sendSuccess(res, { message: "Calendar entry updated", data: { entry } });
});

exports.deleteEntry = asyncHandler(async (req, res) => {
  const entry = await CalendarDayEntry.findOneAndDelete({
    _id: req.params.entryId,
    user: req.user._id
  });
  if (!entry) {
    throw new AppError("Calendar entry not found", 404);
  }
  await invalidateCalendar(req.user._id);
  return sendSuccess(res, { message: "Calendar entry deleted", data: { entryId: entry._id } });
});
