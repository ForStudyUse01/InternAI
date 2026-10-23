"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { fetchApplicationAiInsights } from "@/lib/intern-portal";
import { Skeleton } from "@/components/ui/skeleton";
import { AppIcon } from "@/components/icons/app-icon";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { cn } from "@/lib/utils";

type AiInsightsModalProps = {
  open: boolean;
  internshipId: string | null;
  role?: string;
  companyName?: string;
  onClose: () => void;
};

export function AiInsightsModal({ open, internshipId, role, companyName, onClose }: AiInsightsModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [bullets, setBullets] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const dialogRef = useFocusTrap<HTMLDivElement>(open);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !internshipId) return;

    let cancelled = false;
    setStatus("loading");
    setErrorMessage("");

    fetchApplicationAiInsights(internshipId)
      .then((result) => {
        if (cancelled) return;
        setBullets(result.bullets || []);
        setStatus("ready");
      })
      .catch((e) => {
        if (cancelled) return;
        setErrorMessage((e as Error).message || "Insights are not available right now.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [open, internshipId]);

  if (!isMounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1100] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/65"
            onClick={onClose}
            aria-label="Close AI insights dialog"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-insights-title"
            className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[var(--ds-border)] bg-[var(--ds-modal)] shadow-2xl sm:rounded-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--ds-border)] bg-gradient-to-r from-[var(--ds-primary)]/10 via-[var(--ds-accent)]/10 to-transparent px-5 py-4">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ds-primary)]/10">
                  <AppIcon icon={Sparkles} size="md" className="text-[var(--ds-primary-text)]" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 id="ai-insights-title" className="truncate text-base font-semibold text-[var(--ds-text)]">
                    AI Insights
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-[var(--ds-muted)]">
                    {role ? role : "Internship"}
                    {companyName ? ` · ${companyName}` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg p-1.5 text-[var(--ds-muted)] transition hover:bg-[var(--ds-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
                aria-label="Close"
              >
                <AppIcon icon={X} size="sm" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {status === "loading" ? (
                <div role="status" aria-live="polite" aria-label="Loading AI insights" className="space-y-3">
                  {["w-[88%]", "w-[72%]", "w-[80%]", "w-[65%]"].map((width, idx) => (
                    <div key={idx} className="flex gap-2.5 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] px-4 py-3">
                      <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded-full" />
                      <Skeleton className={cn("h-4", width)} />
                    </div>
                  ))}
                </div>
              ) : null}

              {status === "error" ? (
                <p role="alert" className="text-sm text-[var(--ds-text-secondary)]">{errorMessage}</p>
              ) : null}

              {status === "ready" ? (
                <ul className="space-y-3">
                  {bullets.map((bullet, idx) => (
                    <li key={idx} className="flex gap-2.5 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] px-4 py-3 text-sm leading-relaxed text-[var(--ds-text-secondary)]">
                      <AppIcon icon={Sparkles} size="sm" className="mt-0.5 text-[var(--ds-primary-text)]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
