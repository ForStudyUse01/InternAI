"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ErrorMessageProps = {
  title: string;
  description: string;
  size?: "page" | "inline";
  className?: string;
};

export function ErrorMessage({ title, description, size = "page", className }: ErrorMessageProps) {
  const isPage = size === "page";

  return (
    <motion.div
      className={cn("flex flex-col items-center", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
    >
      <h1 className={cn("font-bold tracking-tight text-[var(--ds-text)]", isPage ? "text-3xl sm:text-4xl" : "text-lg")}>
        {title}
      </h1>
      <p
        className={cn(
          "mx-auto mt-4 max-w-md leading-relaxed text-[var(--ds-muted)]",
          isPage ? "text-sm sm:text-base" : "text-sm"
        )}
      >
        {description}
      </p>
    </motion.div>
  );
}
