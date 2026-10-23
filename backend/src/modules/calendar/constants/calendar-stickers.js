const CALENDAR_STICKER_EMOJIS = Object.freeze([
  "😶‍🌫️",
  "🤐",
  "😣",
  "🫥",
  "😍",
  "😨",
  "🥶",
  "😰",
  "😵‍💫",
  "🥳",
  "🥺",
  "🥹",
  "🫣",
  "☠️",
  "👻",
  "🐻",
  "🐼",
  "🐰",
  "🐹",
  "🐭",
  "🐾",
  "👀",
  "🎯",
  "🩻",
  "💐",
  "❤️‍🔥",
  "❤️‍🩹",
  "💓",
  "❤️",
  "🎉",
  "🍾"
]);

const CALENDAR_NOTE_MAX_LENGTH = 500;

function isAllowedCalendarSticker(emoji) {
  return CALENDAR_STICKER_EMOJIS.includes(String(emoji || "").trim());
}

module.exports = {
  CALENDAR_STICKER_EMOJIS,
  CALENDAR_NOTE_MAX_LENGTH,
  isAllowedCalendarSticker
};
