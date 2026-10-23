export const CALENDAR_STICKER_EMOJIS = [
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
] as const;

export type CalendarStickerEmoji = (typeof CALENDAR_STICKER_EMOJIS)[number];

export const CALENDAR_NOTE_MAX_LENGTH = 500;

export type CalendarEntryType = "sticker" | "note";

export type CalendarDayEntry = {
  _id: string;
  dateKey: string;
  entryType: CalendarEntryType;
  emoji?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function isAllowedCalendarSticker(value: string): value is CalendarStickerEmoji {
  return (CALENDAR_STICKER_EMOJIS as readonly string[]).includes(value);
}
