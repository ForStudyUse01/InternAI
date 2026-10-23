"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useState } from "react";
import { DashboardPageHeader } from "@/components/dashboard/shared/dashboard-page-header";
import { BrandedEmptyState } from "@/components/dashboard/shared/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { BRANDED_EMPTY_STATES } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { shouldBlockPageContent } from "@/lib/instant-load";
import {
  InAppNotification,
  fetchInternNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  peekInternNotifications
} from "@/lib/intern-portal";
import { useChatSocket } from "@/lib/use-chat-socket";

export default function InternNotificationsPage() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    const cached = peekInternNotifications();
    if (cached) {
      setNotifications(cached.notifications);
      setUnreadCount(cached.unreadCount);
      setLoading(false);
    }
  }, []);

  async function load(force = false) {
    try {
      setError(null);
      const payload = await fetchInternNotifications(force);
      setNotifications(payload.notifications);
      setUnreadCount(payload.unreadCount);
    } catch (err) {
      setError((err as Error).message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useChatSocket({
    onNotification: () => void load(true)
  });

  useEffect(() => {
    load(false);
  }, []);

  function openLink(item: InAppNotification) {
    if (item.link) return item.link;
    return undefined;
  }

  async function handleMarkRead(notificationId: string) {
    setNotifications((current) =>
      current.map((item) => (item._id === notificationId ? { ...item, isRead: true } : item))
    );
    setUnreadCount((count) => Math.max(0, count - 1));
    try {
      await markNotificationRead(notificationId);
    } catch (err) {
      await load(true);
      setError((err as Error).message || "Failed to mark notification as read.");
    }
  }

  async function handleMarkAllRead() {
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch (err) {
      await load(true);
      setError((err as Error).message || "Failed to mark notifications as read.");
    }
  }

  return (
    <div className="dashboard-stack">
          <DashboardPageHeader
            eyebrow="Updates"
            title="Notifications"
            subtitle="Application updates, interview reminders, and recruiter feedback alerts."
            actions={
              unreadCount > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleMarkAllRead}
                >
                  Mark all read
                </Button>
              ) : undefined
            }
          />

          {shouldBlockPageContent(notifications) && loading && <SkeletonList rows={4} />}
          {error && <div className="rounded-xl border border-[var(--ds-danger)]/40 bg-[var(--ds-danger-bg)] px-4 py-3 text-sm text-[var(--ds-danger)]">{error}</div>}

          {!loading && !error && notifications.length === 0 && (
            <BrandedEmptyState preset={BRANDED_EMPTY_STATES.notifications} presetKey="notifications" />
          )}

          {notifications.length > 0 && (
            <ul className="space-y-2">
              {notifications.map((item) => (
                <li
                  key={item._id}
                  className={`surface-subtle flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${item.isRead ? "opacity-80" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--ds-text)]">{item.title}</p>
                    {item.message && <p className="mt-1 text-xs text-[var(--ds-text-secondary)]">{item.message}</p>}
                    <p className="mt-1 text-[11px] text-[var(--ds-muted)]">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {openLink(item) && (
                      <Button href={openLink(item)!} type="button" size="sm" variant="secondary">
                        Open
                      </Button>
                    )}
                    {!item.isRead && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleMarkRead(item._id)}
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-[var(--ds-muted)]">
            Prefer the full tracker? Visit{" "}
            <Link href="/dashboard/intern/track-progress" className="font-semibold text-[var(--ds-primary-text)] hover:underline">
              Track Progress
            </Link>
            .
          </p>
    </div>
  );
}
