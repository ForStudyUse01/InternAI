"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { BRAND_LOGO_PATH, BRAND_NAME } from "@/lib/brand";

type AnimatedLogoProps = {
  size?: number;
  className?: string;
};

export function AnimatedLogo({ size = 72, className = "" }: AnimatedLogoProps) {
  return (
    <motion.div
      className={`relative inline-flex items-center justify-center ${className}`}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="absolute inset-0 rounded-2xl bg-primary-500/20 blur-xl"
        animate={{ opacity: [0.35, 0.55, 0.35], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Inline width/height (size is a runtime value, not a static Tailwind class) keep both
            axes CSS-governed to match the props — otherwise Tailwind's preflight
            `img { height: auto }` only overrides height, which Next.js flags as a mismatch. */}
        <Image
          src={BRAND_LOGO_PATH}
          alt={BRAND_NAME}
          width={size}
          height={size}
          priority
          className="relative z-10 object-contain"
          style={{ width: size, height: size }}
        />
      </motion.div>
    </motion.div>
  );
}
