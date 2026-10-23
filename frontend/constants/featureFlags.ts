function parseBool(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

export const FEATURE_FLAGS = Object.freeze({
  ENABLE_AI: parseBool(process.env.NEXT_PUBLIC_ENABLE_AI, true),
  ENABLE_NOTIFICATIONS: parseBool(process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS, true),
  ENABLE_RECORDINGS: parseBool(process.env.NEXT_PUBLIC_ENABLE_RECORDINGS, false),
  ENABLE_CHAT: parseBool(process.env.NEXT_PUBLIC_ENABLE_CHAT, true),
  ENABLE_INTERVIEW_ROOMS: parseBool(process.env.NEXT_PUBLIC_ENABLE_INTERVIEW_ROOMS, true),
  ENABLE_3D_PORTFOLIO: parseBool(process.env.NEXT_PUBLIC_ENABLE_3D_PORTFOLIO, true)
});
