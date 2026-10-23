"use client";

import { useEffect, useState } from "react";
import { AnimatedLogo } from "@/components/brand/animated-logo";
import { BRAND_NAME, LOADING_MESSAGES } from "@/lib/brand";

type InternAILoaderProps = {
  message?: string;
  rotateMessages?: boolean;
  className?: string;
  compact?: boolean;
};

export function InternAILoader({
  message,
  rotateMessages = true,
  className = "",
  compact = false
}: InternAILoaderProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!rotateMessages || message) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2400);
    return () => clearInterval(timer);
  }, [rotateMessages, message]);

  const displayMessage = message || LOADING_MESSAGES[index];

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? "gap-3 py-6" : "gap-4 py-12"} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={displayMessage}
    >
      <AnimatedLogo size={compact ? 52 : 72} />
      <div>
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{BRAND_NAME}</p>
        <p className="mt-1 text-xs text-slate-500 transition-opacity duration-300 dark:text-slate-400">{displayMessage}</p>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-500"
            style={{ animationDelay: `${dot * 180}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
