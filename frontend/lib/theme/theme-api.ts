import { apiRequest } from "@/lib/api-client";
import type { Appearance, ThemeId } from "./theme-config";

type MeResponse = {
  data: {
    user: {
      themePreference?: string | null;
      appearanceMode?: Appearance | null;
    };
  };
};

export async function fetchServerThemePreference(): Promise<{
  theme: string | null;
  appearance: Appearance | null;
}> {
  const response = await apiRequest<MeResponse>("/auth/me", { method: "GET" });
  return {
    theme: response.data.user.themePreference || null,
    appearance: response.data.user.appearanceMode || null
  };
}

export async function persistThemePreference(theme: ThemeId, appearance: Appearance): Promise<void> {
  await apiRequest("/auth/theme", {
    method: "PATCH",
    body: JSON.stringify({ theme, appearance })
  });
}
