const raw = import.meta.env.VITE_API_BASE_URL;

if (!raw || typeof raw !== "string" || !raw.trim()) {
  throw new Error("VITE_API_BASE_URL is required. Set it to your API base (e.g. https://your-api.onrender.com/api/v1).");
}

/** Normalized API origin + path prefix — no trailing slash so `${apiBaseUrl}${path}` is stable. */
export const env = {
  apiBaseUrl: raw.trim().replace(/\/+$/, ""),
};
