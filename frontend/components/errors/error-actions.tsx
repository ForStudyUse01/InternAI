"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { AppIcon } from "@/components/icons/app-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ErrorAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  icon?: LucideIcon;
};

type ErrorActionsProps = {
  actions: ErrorAction[];
  size?: "page" | "inline";
  className?: string;
};

export function ErrorActions({ actions, size = "page", className }: ErrorActionsProps) {
  if (actions.length === 0) return null;
  const isPage = size === "page";

  return (
    <motion.div
      className={cn("flex flex-wrap items-center justify-center gap-3", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
    >
      {actions.map((action) => (
        <Button
          key={action.label}
          href={action.href}
          onClick={action.onClick}
          size={isPage ? "md" : "sm"}
          variant={action.variant || "secondary"}
        >
          {action.icon ? <AppIcon icon={action.icon} size="xs" /> : null}
          {action.label}
        </Button>
      ))}
    </motion.div>
  );
}
