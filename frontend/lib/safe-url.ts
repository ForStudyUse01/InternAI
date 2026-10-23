// Render-time URL guard against `javascript:` / `data:` / `vbscript:` href-based XSS.
//
// User-editable fields (company website, project demo/github links, portfolio links,
// abuse-report evidence URLs, interview meeting links) are rendered into <a href>.
// The backend does not scheme-validate all of them, so a stored `javascript:...`
// value would execute in the session of whoever clicks. Neutralize at render.

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:", "blob:"]);

// Control chars (incl. tabs/newlines) that browsers strip mid-scheme, e.g.
// "java\tscript:" — remove them before parsing so the scheme can't be hidden.
const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;

/**
 * Returns `raw` when it is a safe URL to place in an href, otherwise `fallback`.
 * Safe = a relative/anchor path, or an absolute URL using an allowed scheme
 * (http, https, mailto, tel, blob). Everything else (javascript:, data:,
 * vbscript:, file:, …) collapses to the fallback.
 */
export function safeUrl(raw: string | null | undefined, fallback = "#"): string {
  if (!raw) return fallback;

  const cleaned = String(raw).replace(CONTROL_CHARS, "").trim();
  if (!cleaned) return fallback;

  // Relative paths, anchors, and query-only refs are always safe.
  if (/^(\/|#|\?|\.\/|\.\.\/)/.test(cleaned)) return cleaned;

  try {
    const parsed = new URL(cleaned);
    return SAFE_PROTOCOLS.has(parsed.protocol) ? cleaned : fallback;
  } catch {
    // Not an absolute URL and not a recognized relative form — treat as unsafe.
    return fallback;
  }
}
