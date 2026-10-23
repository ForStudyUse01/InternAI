"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ChatConversation, ChatMessage } from "@/lib/chat-portal";
import {
  joinChatConversation,
  sendChatSocketMessage,
  subscribeChatSocket,
  type ChatSocketHandlers,
  type MessageStatusPayload
} from "@/lib/chat-socket-manager";
import { FEATURE_FLAGS } from "@/constants/featureFlags";

export type { MessageStatusPayload, ChatSocketHandlers };

export function useChatSocket(handlers: ChatSocketHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!FEATURE_FLAGS.ENABLE_CHAT) return undefined;

    return subscribeChatSocket({
      onMessage: (message: ChatMessage) => handlersRef.current.onMessage?.(message),
      onConversationUpdated: (conversation: ChatConversation) => handlersRef.current.onConversationUpdated?.(conversation),
      onUnreadUpdated: (total: number) => handlersRef.current.onUnreadUpdated?.(total),
      onMessageStatus: (payload: MessageStatusPayload) => handlersRef.current.onMessageStatus?.(payload),
      onNotification: (notification: Record<string, unknown>) => handlersRef.current.onNotification?.(notification)
    });
  }, []);

  const joinConversation = useCallback((conversationId: string) => joinChatConversation(conversationId), []);
  const sendMessage = useCallback((conversationId: string, body: string) => sendChatSocketMessage(conversationId, body), []);

  return {
    joinConversation,
    sendMessage
  };
}
