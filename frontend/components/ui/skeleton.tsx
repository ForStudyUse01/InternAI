import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-[var(--ds-surface-raised)]",
        className
      )}
    />
  );
}

function shimmerVariants(delay = 0) {
  return {
    initial: { opacity: 0.5 },
    animate: { opacity: [0.5, 0.9, 0.5] },
    transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" as const, delay }
  };
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label="Loading" className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          className="h-3 rounded-full bg-[var(--ds-surface-raised)]"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
          {...shimmerVariants(i * 0.1)}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label="Loading" className={cn("ds-card space-y-4", className)}>
      <div className="flex items-center gap-3">
        <motion.div className="h-10 w-10 shrink-0 rounded-xl bg-[var(--ds-surface-raised)]" {...shimmerVariants()} />
        <div className="flex-1 space-y-2">
          <motion.div className="h-3 w-2/3 rounded-full bg-[var(--ds-surface-raised)]" {...shimmerVariants(0.05)} />
          <motion.div className="h-2.5 w-1/3 rounded-full bg-[var(--ds-surface-raised)]" {...shimmerVariants(0.1)} />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonList({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label="Loading" className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-[var(--ds-border)] p-3">
          <motion.div className="h-9 w-9 shrink-0 rounded-full bg-[var(--ds-surface-raised)]" {...shimmerVariants(i * 0.06)} />
          <div className="flex-1 space-y-1.5">
            <motion.div className="h-2.5 w-1/2 rounded-full bg-[var(--ds-surface-raised)]" {...shimmerVariants(i * 0.06 + 0.03)} />
            <motion.div className="h-2 w-1/3 rounded-full bg-[var(--ds-surface-raised)]" {...shimmerVariants(i * 0.06 + 0.06)} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonChat({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label="Loading messages" className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => {
        const mine = i % 3 === 1;
        return (
          <div key={i} className={cn("flex", mine ? "justify-end" : "justify-start")}>
            <motion.div
              className="h-9 rounded-2xl bg-[var(--ds-surface-raised)]"
              style={{ width: `${40 + ((i * 13) % 35)}%` }}
              {...shimmerVariants(i * 0.08)}
            />
          </div>
        );
      })}
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label="Loading table" className={cn("overflow-hidden rounded-xl border border-[var(--ds-border)]", className)}>
      <div className="flex gap-4 border-b border-[var(--ds-border)] bg-[var(--ds-surface-raised)] px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-2.5 flex-1 rounded-full bg-[var(--ds-border)]" />
        ))}
      </div>
      <div className="divide-y divide-[var(--ds-border)]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 px-4 py-3.5">
            {Array.from({ length: columns }).map((_, c) => (
              <motion.div
                key={c}
                className="h-2.5 flex-1 rounded-full bg-[var(--ds-surface-raised)]"
                {...shimmerVariants((r * columns + c) * 0.03)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonPage({ className }: { className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label="Loading page" className={cn("space-y-4", className)}>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <SkeletonList rows={4} />
    </div>
  );
}
