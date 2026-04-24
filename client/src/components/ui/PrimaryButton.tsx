import { motion, useReducedMotion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary";
  size?: "md" | "sm";
};

const ease = [0.22, 1, 0.36, 1] as const;

export function PrimaryButton({
  children,
  className = "",
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: PrimaryButtonProps) {
  const reduce = useReducedMotion();

  const sizeCls = size === "sm" ? "min-h-9 px-3 py-2 text-xs" : "min-h-11 px-5 py-2.5 text-sm";
  const variantCls =
    variant === "primary"
      ? "bg-gradient-to-r from-[#00E58D] to-[#12CBE2] text-black shadow-[0_16px_40px_rgba(0,255,136,0.24)]"
      : "border border-white/15 bg-white/5 text-white/85 backdrop-blur-sm hover:border-[#00FF88]/30 hover:bg-white/10";

  return (
    <motion.span
      className="block w-full"
      whileHover={reduce ? undefined : { scale: 1.03 }}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.22, ease }}
    >
      <button
        type={type}
        className={`inline-flex w-full items-center justify-center rounded-xl font-semibold transition-opacity disabled:opacity-50 ${sizeCls} ${variantCls} ${className}`.trim()}
        {...props}
      >
        {children}
      </button>
    </motion.span>
  );
}
