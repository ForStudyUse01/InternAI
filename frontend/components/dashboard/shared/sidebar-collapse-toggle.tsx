"use client";

import { Menu } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SidebarCollapseToggleProps = {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
};

/**
 * Desktop-only rail toggle, shared by every dashboard shell's sidebar.
 * Renders below the brand logo card, above the first nav section -- a
 * fixed hamburger glyph (state doesn't swap the icon) since that's the
 * universally recognized menu/collapse affordance; only the tooltip and
 * `aria-pressed` communicate the current state.
 */
export function SidebarCollapseToggle({ collapsed, onToggle, className }: SidebarCollapseToggleProps) {
  const label = collapsed ? "Expand Sidebar" : "Collapse Sidebar";

  return (
    <Tooltip content={label} side="right" className={cn("hidden lg:inline-flex", className)}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        aria-pressed={collapsed}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-muted)] transition-colors duration-150 hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] active:scale-[0.96]"
      >
        <AppIcon icon={Menu} size="md" className="!text-current" />
      </button>
    </Tooltip>
  );
}
