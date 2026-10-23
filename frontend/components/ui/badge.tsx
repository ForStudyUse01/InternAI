import type { LucideIcon } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "emerald" | "purple";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "border-[var(--ds-border)] bg-[var(--ds-surface-raised)] text-[var(--ds-muted)]",
  accent: "border-[var(--ds-border-strong)] bg-[var(--ds-surface-raised)] text-[var(--ds-accent)]",
  success: "border-[var(--ds-success)] bg-[var(--ds-success-bg)] text-[var(--ds-success)]",
  warning: "border-[var(--ds-warning)] bg-[var(--ds-warning-bg)] text-[var(--ds-warning)]",
  danger: "border-[var(--ds-danger)] bg-[var(--ds-danger-bg)] text-[var(--ds-danger)]",
  info: "border-[var(--ds-info)] bg-[var(--ds-info-bg)] text-[var(--ds-info)]",
  emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-400",
  purple: "border-purple-500/40 bg-purple-500/10 text-purple-600 dark:border-purple-400/40 dark:bg-purple-400/10 dark:text-purple-400"
};

type BadgeProps = {
  tone?: BadgeTone;
  icon?: LucideIcon;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function Badge({ tone = "neutral", icon, dot, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none",
        TONE_CLASSES[tone],
        className
      )}
    >
      {dot ? <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full bg-current")} /> : null}
      {icon ? <AppIcon icon={icon} size="xs" className="text-current" /> : null}
      {children}
    </span>
  );
}
