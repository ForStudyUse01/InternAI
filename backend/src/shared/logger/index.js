const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const current = LEVELS[String(process.env.LOG_LEVEL || "info").toLowerCase()] ?? LEVELS.info;
function emit(level, message, meta) {
  if (LEVELS[level] > current) return;
  const fn = level === "debug" ? "log" : level;
  if (meta !== undefined) console[fn](`[${level.toUpperCase()}]`, message, meta);
  else console[fn](`[${level.toUpperCase()}]`, message);
}
module.exports = {
  error: (m, meta) => emit("error", m, meta),
  warn: (m, meta) => emit("warn", m, meta),
  info: (m, meta) => emit("info", m, meta),
  debug: (m, meta) => emit("debug", m, meta)
};
