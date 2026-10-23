import type { LucideIcon } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";

type SectionTabButtonProps = {
  label: string;
  active: boolean;
  icon?: LucideIcon;
  onClick: () => void;
};

export function SectionTabButton({ label, active, icon, onClick }: SectionTabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-[var(--ds-primary)]/10 font-semibold text-[var(--ds-primary-text)]"
          : "text-[var(--ds-muted)] hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)]"
      )}
    >
      {icon ? <AppIcon icon={icon} size="xs" className={active ? "text-[var(--ds-primary-text)]" : undefined} /> : null}
      {label}
    </button>
  );
}
