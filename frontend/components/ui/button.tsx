import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  href?: string;
};

const baseClasses =
  "tilt-3d inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring,rgba(59,130,246,0.45))] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.99]";

const variants = {
  primary:
    "bg-[linear-gradient(135deg,var(--ds-gradient-from,#1f6fff),var(--ds-gradient-to,#22d3ee))] text-[var(--ds-on-primary,#fff)] shadow-glow hover:brightness-110 hover:-translate-y-0.5",
  secondary:
    "border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)] shadow-soft hover:border-[var(--ds-border-strong)] hover:bg-[var(--ds-surface-raised)]",
  ghost: "bg-transparent text-[var(--ds-muted)] hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)]"
};

const sizes = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base"
};

export function Button({ className, variant = "primary", size = "md", href, children, ...props }: ButtonProps) {
  const finalClassName = cn(baseClasses, variants[variant], sizes[size], className);

  if (href) {
    return (
      <Link href={href} prefetch className={finalClassName} data-cursor="button">
        {children}
      </Link>
    );
  }

  return (
    <button className={finalClassName} data-cursor="button" {...props}>
      {children}
    </button>
  );
}
