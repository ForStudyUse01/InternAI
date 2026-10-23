"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { AppIcon } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";

type ErrorIllustrationProps = {
  code: string | null;
  icon: LucideIcon;
  size?: "page" | "inline";
  iconClassName?: string;
  className?: string;
};

export function ErrorIllustration({ code, icon, size = "page", iconClassName, className }: ErrorIllustrationProps) {
  const isPage = size === "page";

  return (
    <motion.div
      className={cn("relative flex flex-col items-center justify-center", className)}
      initial={{ opacity: 0, scale: 0.94, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--ds-primary)] opacity-[0.09] blur-3xl",
          isPage ? "h-52 w-52" : "h-24 w-24"
        )}
      />
      <span
        className={cn(
          "relative z-10 flex items-center justify-center rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface-raised)] shadow-[0_16px_40px_-12px_var(--ds-shadow)]",
          isPage ? "h-24 w-24" : "h-14 w-14",
          // Negative margins offset the watermark font's line-box dead space so the
          // painted gap between tile and digit tops stays ~16-24px (digits never covered).
          code && (isPage ? "-mb-1.5 sm:-mb-3" : "mb-3")
        )}
      >
        <AppIcon icon={icon} size={isPage ? "lg" : "md"} className={cn("text-[var(--ds-danger)]", iconClassName)} />
      </span>
      {code ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none select-none bg-[linear-gradient(135deg,var(--ds-gradient-from,#1f6fff),var(--ds-gradient-to,#22d3ee))] bg-clip-text font-black leading-none tracking-tight text-transparent",
            isPage ? "text-[9.5rem] opacity-25 sm:text-[13rem]" : "text-6xl opacity-30"
          )}
        >
          {code}
        </span>
      ) : null}
    </motion.div>
  );
}
