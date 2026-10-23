import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/icons/app-icon";
import { EMPTY_STATE_ICONS } from "@/components/icons/empty-state-icons";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  hint?: string;
  description?: string;
  action?: React.ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  onSecondaryCtaClick?: () => void;
  secondaryAction?: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
  presetKey?: keyof typeof EMPTY_STATE_ICONS;
  size?: "sm" | "md" | "lg";
};

export function EmptyState({
  title,
  hint,
  description,
  action,
  ctaLabel,
  ctaHref,
  onCtaClick,
  secondaryCtaLabel,
  secondaryCtaHref,
  onSecondaryCtaClick,
  secondaryAction,
  className,
  icon,
  presetKey,
  size = "md"
}: EmptyStateProps) {
  const IconComponent = icon || (presetKey ? EMPTY_STATE_ICONS[presetKey] : Inbox);
  const body = description ?? hint;

  const paddingBySize = {
    sm: "px-5 py-7",
    md: "px-6 py-10",
    lg: "px-8 py-14"
  }[size];

  return (
    <ScrollReveal variant="fade-up" distance={8}>
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "ds-card relative overflow-hidden border-dashed text-center",
          paddingBySize,
          className
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, var(--ds-primary), transparent 60%)"
          }}
        />

        <motion.div
          className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, var(--ds-primary)/15, var(--ds-accent)/10)",
            backgroundColor: "var(--ds-primary-bg, var(--ds-surface-raised))"
          }}
          initial={{ opacity: 0, scale: 0.85, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <AppIcon icon={IconComponent} size="lg" className="text-[var(--ds-primary-text)]" />
        </motion.div>

        <p className="relative text-sm font-semibold text-[var(--ds-text)]">{title}</p>
        {body && (
          <p className="relative mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--ds-muted)]">
            {body}
          </p>
        )}

        {(action || ctaLabel || secondaryAction || secondaryCtaLabel) && (
          <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {action ? (
              action
            ) : ctaLabel ? (
              <Button
                href={ctaHref}
                onClick={onCtaClick}
                size="sm"
                variant="primary"
              >
                {ctaLabel}
              </Button>
            ) : null}

            {secondaryAction ? (
              secondaryAction
            ) : secondaryCtaLabel ? (
              <Button
                href={secondaryCtaHref}
                onClick={onSecondaryCtaClick}
                size="sm"
                variant="secondary"
              >
                {secondaryCtaLabel}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </ScrollReveal>
  );
}

export function BrandedEmptyState({
  preset,
  presetKey,
  action,
  className
}: {
  preset: { title: string; hint: string; ctaLabel?: string; ctaHref?: string };
  presetKey?: keyof typeof EMPTY_STATE_ICONS;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <EmptyState
      title={preset.title}
      hint={preset.hint}
      ctaLabel={preset.ctaLabel}
      ctaHref={preset.ctaHref}
      action={action}
      className={className}
      presetKey={presetKey}
    />
  );
}
