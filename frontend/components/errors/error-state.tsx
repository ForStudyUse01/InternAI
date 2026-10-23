"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  KeyRound,
  RotateCw,
  SearchX,
  ServerCrash,
  ShieldAlert,
  TimerReset,
  WifiOff,
  ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ErrorIllustration } from "@/components/errors/error-illustration";
import { ErrorMessage } from "@/components/errors/error-message";
import { ErrorActions, type ErrorAction } from "@/components/errors/error-actions";
import { cn } from "@/lib/utils";

export type ErrorVariant =
  | "404"
  | "403"
  | "401"
  | "500"
  | "network"
  | "api"
  | "session-expired";

type VariantConfig = {
  code: string | null;
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  description: string;
  retryLabel: string;
  showRetryByDefault: boolean;
};

const VARIANTS: Record<ErrorVariant, VariantConfig> = {
  "404": {
    code: "404",
    icon: SearchX,
    iconClassName: "text-[var(--ds-accent)]",
    title: "Page Not Found",
    description: "The page you're looking for doesn't exist or may have been moved.",
    retryLabel: "Try Again",
    showRetryByDefault: false
  },
  "403": {
    code: "403",
    icon: ShieldAlert,
    iconClassName: "text-[var(--ds-danger)]",
    title: "Access Forbidden",
    description: "You don't have permission to view this page. Contact your admin if you think this is a mistake.",
    retryLabel: "Try Again",
    showRetryByDefault: false
  },
  "401": {
    code: "401",
    icon: KeyRound,
    iconClassName: "text-[var(--ds-warning)]",
    title: "Authentication Required",
    description: "You need to sign in to access this page.",
    retryLabel: "Try Again",
    showRetryByDefault: false
  },
  "500": {
    code: "500",
    icon: ServerCrash,
    iconClassName: "text-[var(--ds-danger)]",
    title: "Something Went Wrong",
    description: "An unexpected error occurred on our end. Please try again, and contact support if the problem persists.",
    retryLabel: "Try Again",
    showRetryByDefault: true
  },
  network: {
    code: null,
    icon: WifiOff,
    iconClassName: "text-[var(--ds-warning)]",
    title: "Network Error",
    description: "Can't reach InternAI servers. Check your internet connection and try again.",
    retryLabel: "Retry",
    showRetryByDefault: true
  },
  api: {
    code: null,
    icon: AlertTriangle,
    iconClassName: "text-[var(--ds-danger)]",
    title: "Request Failed",
    description: "Something went wrong while talking to our servers. Please try again in a moment.",
    retryLabel: "Retry",
    showRetryByDefault: true
  },
  "session-expired": {
    code: null,
    icon: TimerReset,
    iconClassName: "text-[var(--ds-warning)]",
    title: "Session Expired",
    description: "Your session has expired for security reasons. Please sign in again to continue.",
    retryLabel: "Try Again",
    showRetryByDefault: false
  }
};

type ErrorStateProps = {
  variant: ErrorVariant;
  title?: string;
  description?: string;
  size?: "page" | "inline";
  onRetry?: () => void;
  retryLabel?: string;
  onBack?: () => void;
  backLabel?: string;
  backHref?: string;
  primaryCta?: { label: string; href?: string; onClick?: () => void };
  secondaryCta?: { label: string; href?: string; onClick?: () => void };
  /** Always append a ghost "Go Back" action, even when secondaryCta is set. */
  showBack?: boolean;
  className?: string;
};

export function ErrorState({
  variant,
  title,
  description,
  size = "page",
  onRetry,
  retryLabel,
  onBack,
  backLabel = "Go Back",
  backHref,
  primaryCta,
  secondaryCta,
  showBack,
  className
}: ErrorStateProps) {
  const router = useRouter();
  const config = VARIANTS[variant];
  const showRetry = Boolean(onRetry) || (config.showRetryByDefault && !primaryCta);

  function handleBack() {
    if (onBack) return onBack();
    if (backHref) return router.push(backHref);
    router.back();
  }

  const isPage = size === "page";

  const actions: ErrorAction[] = [];
  if (primaryCta) {
    actions.push({ ...primaryCta, variant: "primary" });
  } else if (showRetry) {
    actions.push({
      label: retryLabel || config.retryLabel,
      onClick: onRetry ?? (() => router.refresh()),
      variant: "primary",
      icon: RotateCw
    });
  }
  if (secondaryCta) {
    actions.push({ ...secondaryCta, variant: "secondary" });
    if (showBack) actions.push({ label: backLabel, onClick: handleBack, variant: "ghost", icon: ArrowLeft });
  } else {
    actions.push({ label: backLabel, onClick: handleBack, variant: "secondary", icon: ArrowLeft });
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center text-center",
        isPage ? "min-h-[50vh] justify-center px-6 py-8 sm:py-10" : "ds-card border-dashed px-6 py-10",
        className
      )}
    >
      <ErrorIllustration
        code={config.code}
        icon={config.icon}
        size={size}
        iconClassName={config.iconClassName}
        className={isPage ? "-mb-2 sm:-mb-4" : "mb-4"}
      />
      <ErrorMessage title={title || config.title} description={description || config.description} size={size} />
      <ErrorActions actions={actions} size={size} className="mt-7" />
    </div>
  );
}

export function classifyErrorMessage(message: string | null | undefined): ErrorVariant {
  const value = (message || "").toLowerCase();
  if (value.includes("cannot reach backend") || value.includes("network")) return "network";
  if (value.includes("session expired")) return "session-expired";
  if (value.includes("unauthorized") || value.includes("log in again") || value.includes("401")) return "401";
  if (value.includes("permission") || value.includes("forbidden") || value.includes("403")) return "403";
  if (value.includes("(50") || value.includes("server error")) return "500";
  return "api";
}
