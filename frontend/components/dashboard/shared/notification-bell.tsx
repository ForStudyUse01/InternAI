"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { Button } from "@/components/ui/button";
import {
  fetchCompanyNotifications,
  type CompanyNotification
} from "@/lib/company-portal";
import {
  fetchInternNotifications,
  type InAppNotification
} from "@/lib/intern-portal";
import { useChatSocket } from "@/lib/use-chat-socket";
import { cn } from "@/lib/utils";
import { SkeletonList } from "@/components/ui/skeleton";

type NotificationPreview = InAppNotification | CompanyNotification;

type NotificationBellProps = {
  role: "intern" | "company";
  href: string;
  unreadCount: number;
  onUnreadCountChange: (count: number) => void;
};

function resolveOpenLink(item: NotificationPreview, role: "intern" | "company") {
  if (item.link) return item.link;
  if (role === "company" && "metadata" in item && item.metadata?.conversationId) {
    return `/dashboard/company/chat?conversation=${item.metadata.conversationId}`;
  }
  return undefined;
}

export function NotificationBell({ role, href, unreadCount, onUnreadCountChange }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<NotificationPreview[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadPreview = useCallback(
    async (force = false) => {
      setLoadingPreview(true);
      try {
        if (role === "intern") {
          const payload = await fetchInternNotifications(force);
          setPreview(payload.notifications.slice(0, 5));
          onUnreadCountChange(payload.unreadCount);
        } else {
          const payload = await fetchCompanyNotifications(force);
          setPreview(payload.notifications.slice(0, 5));
          onUnreadCountChange(payload.unreadCount);
        }
      } catch {
        setPreview([]);
      } finally {
        setLoadingPreview(false);
      }
    },
    [onUnreadCountChange, role]
  );

  useChatSocket({
    onNotification: () => {
      if (open) void loadPreview(true);
    }
  });

  useEffect(() => {
    if (!open) return;
    void loadPreview(false);
  }, [loadPreview, open]);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const badge = unreadCount > 0 ? (unreadCount > 9 ? "9+" : String(unreadCount)) : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-xl border border-[var(--ds-border)] bg-[var(--ds-card)] p-2 transition hover:bg-[var(--ds-surface-hover)]"
        aria-label={badge ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={open}
      >
        <AppIcon icon={Bell} size="md" />
        {badge ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--ds-primary)] px-1 text-[10px] font-bold text-[var(--ds-on-primary)]">
            {badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div role="region" aria-label="Notifications" className="absolute right-0 z-50 mt-2 w-[min(92vw,22rem)] rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-card)] p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--ds-text)]">Notifications</p>
            <Link
              href={href}
              className="text-xs font-semibold text-[var(--ds-primary-text)] hover:underline"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
          </div>

          {loadingPreview && preview.length === 0 ? (
            <div className="px-1 py-1">
              <SkeletonList rows={3} />
            </div>
          ) : null}

          {!loadingPreview && preview.length === 0 ? (
            <div className="px-1 py-3 text-center">
              <AppIcon icon={Bell} size="sm" className="mx-auto text-[var(--ds-muted)]" />
              <p className="mt-2 text-xs font-medium text-[var(--ds-text)]">No notifications yet</p>
              <p className="mt-0.5 text-[11px] text-[var(--ds-muted)]">You&apos;ll see updates here as they arrive.</p>
            </div>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {preview.map((item) => {
                const itemHref = resolveOpenLink(item, role);
                return (
                  <li
                    key={item._id}
                    className={cn(
                      "rounded-xl border border-[var(--ds-border)] px-3 py-2",
                      item.isRead ? "opacity-75" : "bg-[var(--ds-info-bg)]"
                    )}
                  >
                    <p className="text-sm font-semibold text-[var(--ds-text)]">{item.title}</p>
                    {item.message ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-[var(--ds-text-secondary)]">{item.message}</p>
                    ) : null}
                    {itemHref ? (
                      <Link
                        href={itemHref}
                        className="mt-2 inline-block text-xs font-semibold text-[var(--ds-primary-text)] hover:underline"
                        onClick={() => setOpen(false)}
                      >
                        Open
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-3 border-t border-[var(--ds-border)] pt-2">
            <Button href={href} type="button" size="sm" variant="secondary" className="w-full">
              Open notifications
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
