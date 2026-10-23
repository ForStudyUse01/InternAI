"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type TooltipProps = {
  content: string;
  side?: "top" | "bottom" | "right";
  className?: string;
  children: React.ReactNode;
};

export function Tooltip({ content, side = "top", className, children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) setOpen(false);
      }}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      <AnimatePresence>
        {open ? (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, x: side === "right" ? -4 : 0, y: side === "top" ? 4 : side === "bottom" ? -4 : 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: side === "right" ? -4 : 0, y: side === "top" ? 4 : side === "bottom" ? -4 : 0 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "pointer-events-none absolute z-50 w-max max-w-[14rem] rounded-lg border border-[var(--ds-border-strong)] bg-[var(--ds-surface-raised)] px-2.5 py-1.5 text-center text-xs font-medium text-[var(--ds-text)] shadow-xl",
              side === "top" && "bottom-full left-1/2 mb-2 -translate-x-1/2",
              side === "bottom" && "top-full left-1/2 mt-2 -translate-x-1/2",
              side === "right" && "left-full top-1/2 ml-2 -translate-y-1/2"
            )}
          >
            {content}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
