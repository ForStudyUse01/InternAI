const SKILL_ALIASES: Record<string, string> = {
  js: "javascript",
  ml: "machine learning",
};

export function normalizeSkillArray(skills: unknown): string[] {
  if (!Array.isArray(skills)) {
    return [];
  }

  const normalized = skills
    .map((item) => {
      if (typeof item !== "string") {
        return "";
      }

      const base = item.trim().toLowerCase();
      return SKILL_ALIASES[base] ?? base;
    })
    .filter((item) => item.length > 0);

  return Array.from(new Set(normalized));
}
