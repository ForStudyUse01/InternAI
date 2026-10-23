"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "warning" | "info" | "loading";

type ToastContent = {
  title: string;
  message?: string;
};

type ToastItem = ToastContent & {
  id: string;
  variant: ToastVariant;
  /** Auto-dismiss delay in ms; null = stays until dismissed (loading). */
  duration: number | null;
};

type PushToastInput = ToastContent & {
  variant: ToastVariant;
  duration?: number | null;
};

type PromiseToastMessages<T> = {
  loading: ToastContent;
  success: ToastContent | ((value: T) => ToastContent);
  error: ToastContent | ((error: unknown) => ToastContent);
};

type ToastContextValue = {
  pushToast: (toast: PushToastInput) => string;
  dismissToast: (id: string) => void;
  updateToast: (id: string, patch: Partial<Omit<ToastItem, "id">>) => void;
  promiseToast: <T>(promise: Promise<T>, messages: PromiseToastMessages<T>) => Promise<T>;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION: Record<ToastVariant, number | null> = {
  success: 4200,
  info: 4200,
  warning: 5200,
  error: 6000,
  loading: null
};

const VARIANT_META: Record<ToastVariant, { icon: LucideIcon; accentClass: string; iconClass: string }> = {
  success: { icon: CheckCircle2, accentClass: "bg-[var(--ds-success)]", iconClass: "text-[var(--ds-success)]" },
  error: { icon: XCircle, accentClass: "bg-[var(--ds-danger)]", iconClass: "text-[var(--ds-danger)]" },
  warning: { icon: AlertTriangle, accentClass: "bg-[var(--ds-warning)]", iconClass: "text-[var(--ds-warning)]" },
  info: { icon: Info, accentClass: "bg-[var(--ds-info)]", iconClass: "text-[var(--ds-info)]" },
  loading: {
    icon: Loader2,
    accentClass: "bg-[var(--ds-primary-text)] dark:bg-[var(--ds-primary)]",
    iconClass: "text-[var(--ds-primary-text)] animate-spin"
  }
};

const MAX_VISIBLE_TOASTS = 4;

function resolveContent<T>(content: ToastContent | ((input: T) => ToastContent), input: T): ToastContent {
  return typeof content === "function" ? content(input) : content;
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(toast.duration ?? 0);
  const startedAtRef = useRef(0);
  const meta = VARIANT_META[toast.variant];
  const isAlert = toast.variant === "error" || toast.variant === "warning";

  useEffect(() => {
    remainingRef.current = toast.duration ?? 0;
  }, [toast.duration, toast.variant]);

  useEffect(() => {
    if (toast.duration == null || paused) return;
    startedAtRef.current = Date.now();
    const timer = window.setTimeout(() => onDismiss(toast.id), Math.max(remainingRef.current, 0));
    return () => {
      window.clearTimeout(timer);
      remainingRef.current -= Date.now() - startedAtRef.current;
    };
  }, [paused, toast.duration, toast.variant, toast.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.16, ease: "easeIn" } }}
      transition={{ duration: 0.26, ease: "easeOut" }}
      className="pointer-events-auto relative overflow-hidden rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-glass)] shadow-[0_12px_32px_-8px_var(--ds-shadow)] backdrop-blur-md"
      role={isAlert ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", meta.accentClass)} />
      <div className="flex items-start gap-3 py-3 pl-4 pr-9">
        <AppIcon icon={meta.icon} size="md" className={cn("mt-0.5", meta.iconClass)} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--ds-text)]">{toast.title}</p>
          {toast.message ? <p className="mt-0.5 text-xs text-[var(--ds-text-secondary)]">{toast.message}</p> : null}
        </div>
      </div>
      {toast.variant !== "loading" ? (
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="absolute right-2 top-2 rounded-lg p-1 text-[var(--ds-muted)] transition-colors hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ds-focus-ring)]"
        >
          <AppIcon icon={X} size="xs" className="text-current" />
        </button>
      ) : null}
      {toast.duration != null ? (
        <span
          key={`${toast.variant}-${toast.duration}`}
          aria-hidden
          className={cn("toast-progress absolute bottom-0 left-0 h-0.5 w-full origin-left motion-reduce:hidden", meta.accentClass)}
          style={{
            animationDuration: `${toast.duration}ms`,
            animationPlayState: paused ? "paused" : "running"
          }}
        />
      ) : null}
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback((toast: PushToastInput) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const duration = toast.duration === undefined ? DEFAULT_DURATION[toast.variant] : toast.duration;
    setToasts((current) => [...current, { ...toast, id, duration }].slice(-MAX_VISIBLE_TOASTS));
    return id;
  }, []);

  const updateToast = useCallback((id: string, patch: Partial<Omit<ToastItem, "id">>) => {
    setToasts((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const promiseToast = useCallback(
    <T,>(promise: Promise<T>, messages: PromiseToastMessages<T>) => {
      const id = pushToast({ ...messages.loading, variant: "loading" });
      promise.then(
        (value) => {
          updateToast(id, {
            ...resolveContent(messages.success, value),
            variant: "success",
            duration: DEFAULT_DURATION.success
          });
        },
        (error) => {
          updateToast(id, {
            ...resolveContent(messages.error, error),
            variant: "error",
            duration: DEFAULT_DURATION.error
          });
        }
      );
      return promise;
    },
    [pushToast, updateToast]
  );

  const value = useMemo(
    () => ({ pushToast, dismissToast, updateToast, promiseToast }),
    [pushToast, dismissToast, updateToast, promiseToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
