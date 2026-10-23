import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
};

function pageWindow(page: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  sorted.forEach((p, idx) => {
    if (idx > 0 && p - sorted[idx - 1] > 1) result.push("ellipsis");
    result.push(p);
  });
  return result;
}

export function Pagination({ page, totalPages, onChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        className="ds-icon-btn disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <AppIcon icon={ChevronLeft} size="sm" className="text-current" />
      </button>

      {pageWindow(page, totalPages).map((p, idx) =>
        p === "ellipsis" ? (
          <span key={`e-${idx}`} className="px-1.5 text-sm text-[var(--ds-muted)]">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "flex h-8 min-w-8 items-center justify-center rounded-[var(--ds-radius-sm)] px-2 text-sm font-semibold transition-colors duration-150",
              p === page
                ? "border border-[var(--ds-border-strong)] bg-[var(--ds-surface-raised)] text-[var(--ds-accent)]"
                : "text-[var(--ds-muted)] hover:bg-[var(--ds-surface)] hover:text-[var(--ds-text)]"
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        className="ds-icon-btn disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        <AppIcon icon={ChevronRight} size="sm" className="text-current" />
      </button>
    </nav>
  );
}
