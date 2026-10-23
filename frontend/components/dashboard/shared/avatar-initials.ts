export function initialsFromWords(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "?"
  );
}

export function initialsFirstLast(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const AVATAR_GRADIENTS = [
  "from-[var(--ds-chart-1)] to-[var(--ds-chart-2)]",
  "from-[var(--ds-chart-3)] to-[var(--ds-chart-4)]",
  "from-[var(--ds-chart-5)] to-[var(--ds-chart-6)]",
  "from-[var(--ds-chart-2)] to-[var(--ds-chart-4)]",
  "from-[var(--ds-chart-1)] to-[var(--ds-chart-6)]",
  "from-[var(--ds-chart-3)] to-[var(--ds-chart-5)]"
];

export function gradientForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}
