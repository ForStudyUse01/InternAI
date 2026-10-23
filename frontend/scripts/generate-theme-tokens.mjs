// Generates app/theme-tokens.generated.css from lib/theme/palettes.json.
// Run: node scripts/generate-theme-tokens.mjs
// Do not hand-edit the generated CSS — edit palettes.json + this script instead.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const palettes = JSON.parse(readFileSync(join(__dirname, "../lib/theme/palettes.json"), "utf8"));

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex({ r, g, b }) {
  const toHex = (v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mix(hexA, hexB, ratioB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex({
    r: a.r + (b.r - a.r) * ratioB,
    g: a.g + (b.g - a.g) * ratioB,
    b: a.b + (b.b - a.b) * ratioB
  });
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const chan = (v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

function contrastRatio(hexA, hexB) {
  const lA = relativeLuminance(hexA) + 0.05;
  const lB = relativeLuminance(hexB) + 0.05;
  return lA > lB ? lA / lB : lB / lA;
}

// Step 9 (accessibility): if `candidate` doesn't meet `minRatio` against `bg`,
// fall back to whichever of pure black/white contrasts best — preserves each
// palette's chosen text hue when it's already accessible, corrects it when not.
function ensureContrast(candidate, bg, minRatio = 4.5) {
  if (contrastRatio(candidate, bg) >= minRatio) return candidate;
  const black = "#000000";
  const white = "#FFFFFF";
  return contrastRatio(black, bg) >= contrastRatio(white, bg) ? black : white;
}

// Composite a translucent surface hex over its backdrop so contrast is measured
// against what the eye actually sees (surface tokens ship with alpha over bg).
function composite(hex, bgHex, alpha) {
  const a = hexToRgb(hex);
  const b = hexToRgb(bgHex);
  return rgbToHex({
    r: a.r * alpha + b.r * (1 - alpha),
    g: a.g * alpha + b.g * (1 - alpha),
    b: a.b * alpha + b.b * (1 - alpha)
  });
}

// Accessibility (WCAG AA): muted / secondary text tones start as textPrimary mixed
// toward bg. Subtle text still renders on raised surfaces (lower contrast), so pull
// the tone back toward textPrimary until it clears 4.5:1 against every backdrop it
// appears on — keeping it as muted as possible while staying legible.
function accessibleSubtleTone(textPrimary, bg, backdrops, startRatio, minRatio = 4.5) {
  const worst = (tone) => Math.min(...backdrops.map((b) => contrastRatio(tone, b)));
  let ratio = startRatio;
  let tone = mix(textPrimary, bg, ratio);
  while (ratio > 0 && worst(tone) < minRatio) {
    ratio = Math.max(0, ratio - 0.01);
    tone = mix(textPrimary, bg, ratio);
  }
  return tone;
}

// Many components use the raw primary hue as a text/icon color on neutral
// surfaces (labels, stat values, link text) rather than as a button fill.
// Some palettes' primary is too light (or, for "midnight", too dark) to read
// there — nudge toward black/white, preserving hue as long as possible,
// instead of swapping to a different token (which would change the color shown).
function accessibleHueOnSurfaces(hex, backdrops, minRatio = 4.5) {
  const worst = (tone) => Math.min(...backdrops.map((b) => contrastRatio(tone, b)));
  if (worst(hex) >= minRatio) return hex;
  const pole = worst(mix(hex, "#000000", 0.5)) > worst(mix(hex, "#FFFFFF", 0.5)) ? "#000000" : "#FFFFFF";
  let ratio = 0;
  let tone = hex;
  while (ratio < 1 && worst(tone) < minRatio) {
    ratio = Math.min(1, ratio + 0.02);
    tone = mix(hex, pole, ratio);
  }
  return tone;
}

function hexToRgbTriplet(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}

function buildTokens(palette, mode) {
  const { primary, neutral, surface: paletteSurface, text, accent } = palette;
  const isDark = mode === "dark";

  const bg = isDark ? mix(primary, "#000000", 0.9) : mix(neutral, "#FFFFFF", 0.25);
  const surface = isDark ? mix(primary, "#000000", 0.8) : mix(paletteSurface, "#FFFFFF", 0.55);
  const surfaceHover = isDark ? mix(surface, primary, 0.16) : mix(surface, primary, 0.08);
  const sidebar = isDark ? mix(primary, "#000000", 0.86) : mix(neutral, "#FFFFFF", 0.08);
  const navbar = sidebar;
  const card = surface;
  const input = isDark ? surface : mix(paletteSurface, "#FFFFFF", 0.35);
  const modal = isDark ? mix(surface, "#FFFFFF", 0.05) : mix(surface, "#FFFFFF", 0.3);
  const border = isDark ? mix(surface, "#FFFFFF", 0.16) : mix(surface, text, 0.16);
  const scrollbar = isDark ? mix(border, "#FFFFFF", 0.25) : mix(border, text, 0.2);

  const textPrimaryRaw = isDark ? mix(neutral, "#FFFFFF", 0.88) : text;
  const textPrimary = ensureContrast(textPrimaryRaw, bg, 4.5);
  // Backdrops subtle text renders on, composited to their real (post-alpha) color.
  const subtleBackdrops = [
    bg,
    composite(surface, bg, isDark ? 0.92 : 1),
    composite(surfaceHover, bg, isDark ? 0.96 : 1)
  ];
  const textSecondary = accessibleSubtleTone(textPrimary, bg, subtleBackdrops, isDark ? 0.28 : 0.32);
  const muted = accessibleSubtleTone(textPrimary, bg, subtleBackdrops, isDark ? 0.48 : 0.5);

  const primaryHover = isDark ? mix(primary, "#FFFFFF", 0.16) : mix(primary, "#000000", 0.14);
  const secondary = mix(primary, accent, 0.5);
  const onPrimary = ensureContrast("#FFFFFF", primary, 4.5);
  const onAccent = ensureContrast("#FFFFFF", accent, 4.5);
  const primaryText = accessibleHueOnSurfaces(primary, subtleBackdrops, 4.5);

  const successBase = isDark ? "#4ADE80" : "#15803D";
  const warningBase = isDark ? "#FBBF24" : "#B45309";
  const dangerBase = isDark ? "#F87171" : "#B91C1C";
  const infoBase = isDark ? "#38BDF8" : "#0369A1";
  // Text color for solid status-colored surfaces (e.g. a filled danger button).
  // successBase/warningBase/infoBase skew light even in dark mode, so white
  // text on them fails contrast — mirror onPrimary/onAccent's black-or-white fallback.
  const onSuccess = ensureContrast("#FFFFFF", successBase, 4.5);
  const onWarning = ensureContrast("#FFFFFF", warningBase, 4.5);
  const onDanger = ensureContrast("#FFFFFF", dangerBase, 4.5);
  const onInfo = ensureContrast("#FFFFFF", infoBase, 4.5);

  const shadow = isDark ? "rgba(0, 0, 0, 0.45)" : "rgba(15, 23, 42, 0.1)";
  const glass = isDark ? `rgba(${hexToRgbTriplet(surface)}, 0.6)` : `rgba(${hexToRgbTriplet(surface)}, 0.65)`;
  const focusRing = `rgba(${hexToRgbTriplet(accent)}, 0.5)`;
  const selection = `rgba(${hexToRgbTriplet(accent)}, 0.28)`;

  return {
    "ds-bg": bg,
    "ds-deep": bg,
    "ds-surface": `rgba(${hexToRgbTriplet(surface)}, ${isDark ? 0.92 : 1})`,
    "ds-surface-raised": `rgba(${hexToRgbTriplet(surfaceHover)}, ${isDark ? 0.96 : 1})`,
    "ds-surface-hover": surfaceHover,
    "ds-sidebar": sidebar,
    "ds-navbar": navbar,
    "ds-card": card,
    "ds-input": input,
    "ds-modal": modal,
    "ds-border": isDark ? border : mix(border, "#000000", 0.02),
    "ds-border-strong": isDark ? mix(border, "#FFFFFF", 0.3) : mix(border, "#000000", 0.18),
    "ds-scrollbar": scrollbar,
    "ds-text": textPrimary,
    "ds-text-secondary": textSecondary,
    "ds-muted": muted,
    "ds-primary": primary,
    "ds-primary-hover": primaryHover,
    "ds-on-primary": onPrimary,
    "ds-primary-text": primaryText,
    "ds-secondary": secondary,
    "ds-accent": accent,
    "ds-on-accent": onAccent,
    "ds-success": successBase,
    "ds-success-bg": isDark ? "rgba(74, 222, 128, 0.16)" : "rgba(21, 128, 61, 0.12)",
    "ds-on-success": onSuccess,
    "ds-warning": warningBase,
    "ds-warning-bg": isDark ? "rgba(251, 191, 36, 0.16)" : "rgba(180, 83, 9, 0.12)",
    "ds-on-warning": onWarning,
    "ds-danger": dangerBase,
    "ds-danger-bg": isDark ? "rgba(248, 113, 113, 0.16)" : "rgba(185, 28, 28, 0.12)",
    "ds-on-danger": onDanger,
    "ds-info": infoBase,
    "ds-info-bg": isDark ? "rgba(56, 189, 248, 0.16)" : "rgba(3, 105, 161, 0.12)",
    "ds-on-info": onInfo,
    "ds-chart-1": primary,
    "ds-chart-2": accent,
    "ds-chart-3": secondary,
    "ds-chart-4": successBase,
    "ds-chart-5": warningBase,
    "ds-chart-6": infoBase,
    "ds-shadow": shadow,
    "ds-gradient-from": primary,
    "ds-gradient-to": accent,
    "ds-glass": glass,
    "ds-selection": selection,
    "ds-hover": surfaceHover,
    "ds-focus-ring": focusRing,
    "ds-badge-bg": surfaceHover,
    "ds-badge-text": accent
  };
}

function tokensToDeclarations(tokens) {
  return Object.entries(tokens)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join("\n");
}

const blocks = [];

blocks.push(
  `/* AUTO-GENERATED by scripts/generate-theme-tokens.mjs — do not hand-edit. */\n` +
    `/* Source of truth: lib/theme/palettes.json */\n`
);

// Pre-hydration fallback: matches the ocean/dark theme so SSR output and the
// no-flash bootstrap script (see components/theme/theme-script.tsx) agree
// before JS sets data-theme/data-appearance on <html>.
const fallback = buildTokens(palettes.find((p) => p.id === "ocean"), "dark");
blocks.push(`:root {\n${tokensToDeclarations(fallback)}\n}`);

for (const palette of palettes) {
  for (const mode of ["light", "dark"]) {
    const tokens = buildTokens(palette, mode);
    blocks.push(
      `:root[data-theme="${palette.id}"][data-appearance="${mode}"] {\n${tokensToDeclarations(tokens)}\n}`
    );
  }
}

const css = blocks.join("\n\n") + "\n";
writeFileSync(join(__dirname, "../app/theme-tokens.generated.css"), css, "utf8");

console.log(`Generated ${palettes.length * 2} theme blocks -> app/theme-tokens.generated.css`);
