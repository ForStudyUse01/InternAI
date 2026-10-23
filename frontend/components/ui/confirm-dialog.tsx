"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { Button } from "@/components/ui/button";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const reducedMotion = useReducedMotion();
  const dialogRef = useFocusTrap<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, busy, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" role="presentation">
          <motion.button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px]"
            onClick={() => !busy && onCancel()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby={description ? "confirm-dialog-description" : undefined}
            className="relative z-[101] w-full max-w-sm rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-modal)] p-6 shadow-2xl"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reducedMotion ? 0.12 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  tone === "danger"
                    ? "bg-[var(--ds-danger-bg)] text-[var(--ds-danger)]"
                    : "bg-[var(--ds-info-bg)] text-[var(--ds-info)]"
                )}
              >
                <AppIcon icon={AlertTriangle} size="sm" className="text-current" />
              </span>
              <div className="min-w-0">
                <h2 id="confirm-dialog-title" className="text-base font-bold text-[var(--ds-text)]">
                  {title}
                </h2>
                {description ? (
                  <p id="confirm-dialog-description" className="mt-1.5 text-sm text-[var(--ds-text-secondary)]">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={onConfirm}
                className={
                  tone === "danger"
                    ? "bg-[var(--ds-danger)] shadow-none hover:brightness-110"
                    : undefined
                }
              >
                {busy ? "Working…" : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
