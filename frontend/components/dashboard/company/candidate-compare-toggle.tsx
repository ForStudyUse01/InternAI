"use client";

import { Check, GitCompare } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";
import { useCandidateCompare } from "./candidate-comparison-context";

type CandidateCompareToggleProps = {
  applicationId?: string | null;
  className?: string;
};

export function CandidateCompareToggle({ applicationId, className }: CandidateCompareToggleProps) {
  const { isSelected, toggle, canSelectMore } = useCandidateCompare();

  if (!applicationId) return null;

  const selected = isSelected(applicationId);
  const disabled = !selected && !canSelectMore;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        toggle(applicationId);
      }}
      title={disabled ? "Compare list is full (max 4)" : selected ? "Remove from comparison" : "Add to comparison"}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
        selected
          ? "border-[var(--ds-accent)] bg-[var(--ds-accent)]/15 text-[var(--ds-accent)]"
          : "border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-muted)] hover:text-[var(--ds-text)]",
        className
      )}
    >
      <AppIcon icon={selected ? Check : GitCompare} size="xs" className="text-current" />
      {selected ? "Comparing" : "Compare"}
    </button>
  );
}
