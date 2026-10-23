"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { cn } from "@/lib/utils";

type ModalSize = "sm" | "md" | "lg" | "xl";
type ModalVariant = "dialog" | "drawer";

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl"
};

const DRAWER_WIDTH_CLASSES: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-xl",
  xl: "sm:max-w-2xl"
};

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  size?: ModalSize;
  /** "dialog" (default) centers with fade+scale. "drawer" slides in from the right edge, full height — for browsing lists without stacking a second dialog on top. */
  variant?: ModalVariant;
  footer?: React.ReactNode;
  closeOnBackdrop?: boolean;
  bodyClassName?: string;
  children: React.ReactNode;
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  size = "md",
  variant = "dialog",
  footer,
  closeOnBackdrop = true,
  bodyClassName,
  children
}: ModalProps) {
  const reducedMotion = useReducedMotion();
  const dialogRef = useFocusTrap<HTMLDivElement>(open);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className={cn(
            "fixed inset-0 z-[90] p-0",
            variant === "drawer" ? "flex justify-end" : "flex items-end justify-center sm:items-center sm:p-4"
          )}
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
            onClick={() => closeOnBackdrop && onClose()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            className={cn(
              "ds-card relative z-10 flex w-full flex-col overflow-hidden !p-0 shadow-2xl",
              variant === "drawer"
                ? cn("h-full rounded-none sm:rounded-l-2xl", DRAWER_WIDTH_CLASSES[size])
                : cn("max-h-[92vh] rounded-t-2xl sm:rounded-2xl", SIZE_CLASSES[size])
            )}
            initial={
              variant === "drawer"
                ? { opacity: 0, x: reducedMotion ? 0 : 32 }
                : reducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 16, scale: 0.97 }
            }
            animate={variant === "drawer" ? { opacity: 1, x: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={
              variant === "drawer"
                ? { opacity: 0, x: reducedMotion ? 0 : 32 }
                : reducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 12, scale: 0.98 }
            }
            transition={{ duration: reducedMotion ? 0.12 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {title ? (
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--ds-border)] bg-gradient-to-r from-white/[0.03] via-transparent to-transparent px-5 py-4">
                <div className="flex min-w-0 items-start gap-3">
                  {icon ? (
                    <span className="ds-stat-icon shrink-0">
                      <AppIcon icon={icon} size="sm" className="text-[var(--ds-accent)]" />
                    </span>
                  ) : null}
                  <div className="min-w-0">
                    <h2 id={titleId} className="ds-h3">
                      {title}
                    </h2>
                    {subtitle ? <p className="ds-caption mt-0.5 truncate">{subtitle}</p> : null}
                  </div>
                </div>
                <button type="button" onClick={onClose} className="ds-icon-btn shrink-0" aria-label="Close">
                  <AppIcon icon={X} size="sm" className="text-current" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={onClose} className="ds-icon-btn absolute right-3 top-3 z-10" aria-label="Close">
                <AppIcon icon={X} size="sm" className="text-current" />
              </button>
            )}

            <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", bodyClassName)}>{children}</div>

            {footer ? (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--ds-border)] px-5 py-3.5">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
