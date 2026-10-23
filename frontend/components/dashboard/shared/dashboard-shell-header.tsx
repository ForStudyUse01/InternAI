"use client";

import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/icons/app-icon";
import { NotificationBell } from "@/components/dashboard/shared/notification-bell";
import { cn } from "@/lib/utils";

type DashboardShellHeaderProps = {
  welcomeLabel?: string;
  welcomeTagline?: string;
  welcomeName?: string;
  meta?: string;
  compact?: boolean;
  /** Whether the mobile off-canvas drawer this button opens is currently open. */
  mobileMenuOpen?: boolean;
  onOpenMenu: () => void;
  onLogout: () => void;
  notificationHref?: string;
  notificationRole?: "intern" | "company";
  notificationUnreadCount?: number;
  onNotificationUnreadCountChange?: (count: number) => void;
};

export function DashboardShellHeader({
  welcomeLabel = "Welcome",
  welcomeTagline,
  welcomeName,
  meta,
  compact = false,
  mobileMenuOpen = false,
  onOpenMenu,
  onLogout,
  notificationHref,
  notificationRole = "intern",
  notificationUnreadCount = 0,
  onNotificationUnreadCountChange
}: DashboardShellHeaderProps) {
  const bell =
    notificationHref && onNotificationUnreadCountChange ? (
      <NotificationBell
        role={notificationRole}
        href={notificationHref}
        unreadCount={notificationUnreadCount}
        onUnreadCountChange={onNotificationUnreadCountChange}
      />
    ) : null;

  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b border-[var(--ds-border)] bg-[var(--ds-navbar)] backdrop-blur-xl transition-colors duration-300",
        compact ? "px-4 py-2.5 lg:px-6" : "px-4 py-3.5 lg:px-6"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenMenu}
            className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-2 py-1 text-[var(--ds-muted)] transition hover:bg-[var(--ds-surface-raised)] lg:hidden"
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
          >
            <AppIcon icon={Menu} size="md" />
          </button>
          {compact ? null : (
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-accent)]">{welcomeLabel}</p>
              <h1 className="truncate text-base font-bold leading-snug text-[var(--ds-text)] sm:text-lg">
                {welcomeTagline || welcomeName || "User"}
              </h1>
              {welcomeTagline && welcomeName ? (
                <p className="truncate text-sm text-[var(--ds-text-secondary)]">Hi, {welcomeName}</p>
              ) : null}
              {meta && <p className="truncate text-xs capitalize text-[var(--ds-muted)]">{meta}</p>}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {bell}
          <Button type="button" variant="secondary" size="sm" onClick={onLogout}>
            <AppIcon icon={LogOut} size="xs" className="text-current" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
