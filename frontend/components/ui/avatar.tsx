import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  xs: "h-6 w-6 text-[0.625rem]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base"
} as const;

const SIZE_PX: Record<keyof typeof SIZE_CLASSES, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48
};

const GRADIENTS = [
  "from-[var(--ds-chart-1)] to-[var(--ds-chart-6)]",
  "from-[var(--ds-accent)] to-[var(--ds-secondary)]",
  "from-[var(--ds-chart-4)] to-[var(--ds-chart-6)]",
  "from-[var(--ds-chart-5)] to-[var(--ds-chart-2)]",
  "from-[var(--ds-danger)] to-[var(--ds-accent)]",
  "from-[var(--ds-chart-3)] to-[var(--ds-chart-1)]"
];

function initialsOf(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function gradientFor(name?: string) {
  const seed = (name || "").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return GRADIENTS[seed % GRADIENTS.length];
}

type AvatarProps = {
  name?: string;
  src?: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
};

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name || "Avatar"}
        width={SIZE_PX[size]}
        height={SIZE_PX[size]}
        unoptimized
        className={cn("shrink-0 rounded-full border border-[var(--ds-border)] object-cover", SIZE_CLASSES[size], className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]",
        gradientFor(name),
        SIZE_CLASSES[size],
        className
      )}
      aria-hidden={!name}
    >
      {initialsOf(name)}
    </span>
  );
}
