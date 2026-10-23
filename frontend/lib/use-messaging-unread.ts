"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchChatUnreadCount } from "@/lib/chat-portal";
import { useChatSocket } from "@/lib/use-chat-socket";
import { FEATURE_FLAGS } from "@/constants/featureFlags";

const POLL_MS = 30000;

export function useMessagingUnread() {
  const [messageUnread, setMessageUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!FEATURE_FLAGS.ENABLE_CHAT) {
      setMessageUnread(0);
      return;
    }
    try {
      setMessageUnread(await fetchChatUnreadCount());
    } catch {
      setMessageUnread(0);
    }
  }, []);

  useChatSocket({
    onUnreadUpdated: (total) => setMessageUnread(total)
  });

  useEffect(() => {
    if (!FEATURE_FLAGS.ENABLE_CHAT) return undefined;

    const runRefresh = () => void refresh();
    let idleId: number | undefined;
    let startTimer: ReturnType<typeof setTimeout> | undefined;

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(runRefresh, { timeout: 2000 });
    } else {
      startTimer = setTimeout(runRefresh, 0);
    }

    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => {
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (startTimer !== undefined) clearTimeout(startTimer);
      clearInterval(timer);
    };
  }, [refresh]);

  return { messageUnread, refreshMessageUnread: refresh };
}
