import palettesData from "./palettes.json";

export type Appearance = "light" | "dark";

export type ThemePalette = {
  id: string;
  label: string;
  emoji: string;
  primary: string;
  neutral: string;
  surface: string;
  text: string;
  accent: string;
};

export const THEMES: ThemePalette[] = palettesData;
export type ThemeId = (typeof THEMES)[number]["id"];

export const THEME_IDS: ThemeId[] = THEMES.map((t) => t.id);
export const DEFAULT_THEME: ThemeId = "ocean";
export const DEFAULT_APPEARANCE: Appearance = "dark";

export const THEME_STORAGE_KEY = "internai.theme";
export const APPEARANCE_STORAGE_KEY = "internai.appearance";

export function isValidThemeId(value: string | null | undefined): value is ThemeId {
  return !!value && THEME_IDS.includes(value as ThemeId);
}

export function isValidAppearance(value: string | null | undefined): value is Appearance {
  return value === "light" || value === "dark";
}

export function getThemeById(id: string): ThemePalette {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}
