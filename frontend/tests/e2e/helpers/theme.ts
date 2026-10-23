import type { Page } from "@playwright/test";

// Verbatim from lib/theme/palettes.json -- button accessible name is exactly
// this label (the emoji glyph next to it is aria-hidden).
export const PALETTES = [
  { id: "ocean", label: "Ocean Blue" },
  { id: "olive", label: "Olive Green" },
  { id: "crimson", label: "Crimson Red" },
  { id: "golden", label: "Golden Yellow" },
  { id: "sunset", label: "Sunset Orange" },
  { id: "royal", label: "Royal Purple" },
  { id: "rose", label: "Rose Pink" },
  { id: "modern", label: "Modern White" },
  { id: "midnight", label: "Midnight Black" },
  { id: "earth", label: "Earth Brown" }
] as const;

export const APPEARANCES = ["light", "dark"] as const;

export async function readAppliedTheme(page: Page) {
  return page.evaluate(() => ({
    theme: document.documentElement.getAttribute("data-theme"),
    appearance: document.documentElement.getAttribute("data-appearance"),
    isDarkClass: document.documentElement.classList.contains("dark"),
    storedTheme: window.localStorage.getItem("internai.theme"),
    storedAppearance: window.localStorage.getItem("internai.appearance")
  }));
}

// Reads a resolved CSS custom property (or any computed style property) off
// an element -- proves a `--ds-*` token actually repainted with the theme
// change, rather than just checking the data-theme/data-appearance attribute
// flipped. Defaults to <body> since every page has one.
export async function readComputedStyle(page: Page, selector: string, property: string): Promise<string> {
  return page.evaluate(
    ({ selector, property }) => {
      const el = document.querySelector(selector);
      if (!el) throw new Error(`readComputedStyle: no element matched "${selector}"`);
      return getComputedStyle(el).getPropertyValue(property);
    },
    { selector, property }
  );
}
