"use client";

import { io, type Socket } from "socket.io-client";
import type { ChatConversation, ChatMessage } from "@/lib/chat-portal";
import { resolveApiBaseUrlForSocket } from "@/lib/chat-portal";
import { getAuthSession } from "@/lib/session";
import { FEATURE_FLAGS } from "@/constants/featureFlags";

export type MessageStatusPayload = {
  messageId?: string;
  conversationId?: string;
  status: "sent" | "delivered" | "read";
  deliveredAt?: string | null;
  readAt?: string | null;
  _id?: string;
  conversation?: string;
};

export type ChatSocketHandlers = {
  onMessage?: (message: ChatMessage) => void;
  onConversationUpdated?: (conversation: ChatConversation) => void;
  onUnreadUpdated?: (unreadTotal: number) => void;
  onMessageStatus?: (payload: MessageStatusPayload) => void;
  onNotification?: (notification: Record<string, unknown>) => void;
};

const subscribers = new Map<number, ChatSocketHandlers>();
let nextSubscriberId = 1;
let socket: Socket | null = null;
let connectToken: string | null = null;

function dispatchMessage(message: ChatMessage) {
  subscribers.forEach((handlers) => handlers.onMessage?.(message));
}

function dispatchConversationUpdated(conversation: ChatConversation) {
  subscribers.forEach((handlers) => handlers.onConversationUpdated?.(conversation));
}

function dispatchUnreadUpdated(unreadTotal: number) {
  subscribers.forEach((handlers) => handlers.onUnreadUpdated?.(unreadTotal));
}

function dispatchMessageStatus(payload: MessageStatusPayload) {
  subscribers.forEach((handlers) => handlers.onMessageStatus?.(payload));
}

function dispatchNotification(notification: Record<string, unknown>) {
  subscribers.forEach((handlers) => handlers.onNotification?.(notification));
}

function attachSocketListeners(sock: Socket) {
  sock.removeAllListeners("message:new");
  sock.removeAllListeners("conversation:updated");
  sock.removeAllListeners("unread:updated");
  sock.removeAllListeners("message:status");
  sock.removeAllListeners("notification:new");

  sock.on("message:new", (message: ChatMessage) => dispatchMessage(message));
  sock.on("conversation:updated", (conversation: ChatConversation) => dispatchConversationUpdated(conversation));
  sock.on("unread:updated", (payload: { unreadTotal?: number }) => dispatchUnreadUpdated(payload?.unreadTotal || 0));
  sock.on("message:status", (payload: MessageStatusPayload) => dispatchMessageStatus(payload));
  sock.on("notification:new", (notification: Record<string, unknown>) => dispatchNotification(notification));
}

function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  connectToken = null;
}

function ensureSocket(): Socket | null {
  if (!FEATURE_FLAGS.ENABLE_CHAT) return null;

  const token = getAuthSession()?.token;
  if (!token) {
    disconnectSocket();
    return null;
  }

  if (socket && connectToken !== token) {
    disconnectSocket();
  }

  if (!socket) {
    connectToken = token;
    socket = io(resolveApiBaseUrlForSocket(), {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });
    attachSocketListeners(socket);
  }

  return socket;
}

/** Share one socket connection across all chat subscribers. */
export function subscribeChatSocket(handlers: ChatSocketHandlers): () => void {
  const id = nextSubscriberId++;
  subscribers.set(id, handlers);
  ensureSocket();

  return () => {
    subscribers.delete(id);
    if (subscribers.size === 0) {
      disconnectSocket();
    }
  };
}

export function joinChatConversation(conversationId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = ensureSocket();
    if (!sock) {
      resolve(false);
      return;
    }

    const emitJoin = () => {
      sock.emit("conversation:join", { conversationId }, (response?: { ok?: boolean }) => {
        resolve(Boolean(response?.ok));
      });
    };

    if (sock.connected) {
      emitJoin();
      return;
    }

    sock.once("connect", emitJoin);
    sock.once("connect_error", () => resolve(false));
  });
}

export function sendChatSocketMessage(
  conversationId: string,
  body: string
): Promise<{ ok: boolean; message?: ChatMessage; conversation?: ChatConversation; messageText?: string }> {
  return new Promise((resolve) => {
    const sock = ensureSocket();
    if (!sock?.connected) {
      resolve({ ok: false, messageText: "Socket not connected" });
      return;
    }

    sock.emit(
      "message:send",
      { conversationId, body },
      (response?: { ok?: boolean; message?: ChatMessage | string; conversation?: ChatConversation }) => {
        if (response?.ok && response.message && typeof response.message === "object") {
          resolve({ ok: true, message: response.message, conversation: response.conversation });
          return;
        }
        const errorText = typeof response?.message === "string" ? response.message : "Failed to send message";
        resolve({ ok: false, messageText: errorText });
      }
    );
  });
}

/** Test helper */
export function resetChatSocketManagerForTests() {
  subscribers.clear();
  disconnectSocket();
}
