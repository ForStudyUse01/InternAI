"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchCompanyNotifications,
  peekCompanyNotifications
} from "@/lib/company-portal";
import {
  fetchInternNotifications,
  peekInternNotifications
} from "@/lib/intern-portal";
import { useChatSocket } from "@/lib/use-chat-socket";

export function useNotificationUnread(role: "intern" | "company") {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async (force = false) => {
    try {
      if (role === "intern") {
        const payload = await fetchInternNotifications(force);
        setUnreadCount(payload.unreadCount);
        return payload.unreadCount;
      }
      const payload = await fetchCompanyNotifications(force);
      setUnreadCount(payload.unreadCount);
      return payload.unreadCount;
    } catch {
      setUnreadCount(0);
      return 0;
    }
  }, [role]);

  useEffect(() => {
    const cached = role === "intern" ? peekInternNotifications() : peekCompanyNotifications();
    if (cached) {
      setUnreadCount(cached.unreadCount);
    }
    void refresh(false);
  }, [refresh, role]);

  useEffect(() => {
    function onFocus() {
      void refresh(true);
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  useChatSocket({
    onNotification: () => {
      void refresh(true);
    }
  });

  useEffect(() => {
    function onUpdated() {
      void refresh(true);
    }
    window.addEventListener("notifications:updated", onUpdated);
    return () => window.removeEventListener("notifications:updated", onUpdated);
  }, [refresh]);

  return { unreadCount, setUnreadCount, refreshNotifications: refresh };
}
