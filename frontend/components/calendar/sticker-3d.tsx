"use client";

import { cn } from "@/lib/utils";

type Sticker3DProps = {
  emoji: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  interactive?: boolean;
  title?: string;
};

const sizeClasses = {
  xs: "h-6 w-6 text-sm",
  sm: "h-8 w-8 text-base",
  md: "h-10 w-10 text-lg",
  lg: "h-12 w-12 text-xl"
};

export function Sticker3D({ emoji, size = "sm", className, interactive = true, title }: Sticker3DProps) {
  return (
    <span
      title={title || emoji}
      className={cn(
        "sticker-3d relative inline-flex select-none items-center justify-center rounded-2xl",
        "bg-gradient-to-br from-[var(--ds-surface)] via-[var(--ds-surface)] to-[var(--ds-surface-raised)]",
        "shadow-[0_4px_0_0_rgba(15,23,42,0.12),0_10px_24px_-8px_rgba(59,130,246,0.45)]",
        "ring-1 ring-[var(--ds-border)]",
        interactive &&
          "transition duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_6px_0_0_rgba(15,23,42,0.14),0_16px_28px_-10px_rgba(99,102,241,0.55)] active:translate-y-0 active:scale-100",
        sizeClasses[size],
        className
      )}
      style={{ transformStyle: "preserve-3d" }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--ds-primary)]/20 via-transparent to-[var(--ds-accent)]/15 opacity-80"
      />
      <span className="relative z-[1] drop-shadow-[0_2px_2px_rgba(15,23,42,0.25)]">{emoji}</span>
    </span>
  );
}
