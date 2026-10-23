import { cn } from "@/lib/utils";

type AnimatedBackgroundProps = {
  className?: string;
};

export function AnimatedBackground({ className }: AnimatedBackgroundProps) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      {/* Premium top-center ambient glow — the Linear/Vercel/Stripe signature cue. Static (no animation cost). */}
      <div className="absolute inset-x-0 -top-24 h-[420px] bg-[radial-gradient(ellipse_720px_360px_at_50%_0%,color-mix(in_srgb,var(--ds-primary)_12%,transparent),transparent_72%)]" />

      <div className="absolute -top-32 left-[8%] h-72 w-72 rounded-full bg-[var(--ds-chart-1)]/10 blur-3xl animate-pulse-slow" />
      <div className="absolute right-[6%] top-24 h-64 w-64 rounded-full bg-[var(--ds-chart-3)]/10 blur-3xl animate-pulse-slow [animation-delay:1.2s]" />
      <div className="absolute bottom-4 left-1/3 h-56 w-56 rounded-full bg-[var(--ds-chart-2)]/10 blur-3xl animate-pulse-slow [animation-delay:2.2s]" />

      <div className="absolute inset-0 bg-[linear-gradient(color-mix(in_srgb,var(--ds-text)_6%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--ds-text)_6%,transparent)_1px,transparent_1px)] bg-[size:34px_34px]" />

      <div className="absolute -left-10 top-1/4 h-px w-64 bg-gradient-to-r from-transparent via-[var(--ds-chart-1)]/45 to-transparent animate-signal-slide" />
      <div className="absolute right-0 top-[58%] h-px w-72 bg-gradient-to-r from-transparent via-[var(--ds-chart-2)]/45 to-transparent animate-signal-slide [animation-delay:1.35s]" />
    </div>
  );
}

