import { apiRequest } from "@/lib/api-client";
import { getAuthSession } from "@/lib/session";

export type ChatSender = {
  _id: string;
  email?: string;
  role?: string;
  displayName?: string;
};

export type ChatMessage = {
  _id: string;
  conversation: string;
  body: string;
  senderRole: "intern" | "company";
  sender?: ChatSender;
  status?: "sent" | "delivered" | "read";
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type ChatConversation = {
  _id: string;
  internProfile?: { _id: string; fullName?: string; email?: string };
  company?: { _id: string; companyName?: string; companyEmail?: string; verificationStatus?: string };
  lastMessageText?: string;
  lastMessageAt?: string | null;
  lastSenderRole?: string;
  unreadCount?: number;
  unreadIntern?: number;
  unreadCompany?: number;
};

export type ChatInternContact = {
  companyId: string;
  companyName: string;
  internshipRole?: string;
  applicationId?: string;
};

export type ChatCompanyContact = {
  internProfileId: string;
  internName: string;
  internEmail?: string;
  internshipRole?: string;
  applicationId?: string;
};

function authToken(): string | undefined {
  return getAuthSession()?.token || undefined;
}

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
};

async function chatRequest<T>(path: string, options: { method?: string; body?: string; token?: string } = {}) {
  const response = await apiRequest<ApiEnvelope<T>>(path, {
    ...options,
    token: options.token || authToken()
  });
  if (response?.data === undefined) {
    throw new Error("Unexpected chat API response");
  }
  return response.data;
}

export async function fetchChatConversations() {
  return chatRequest<{ conversations: ChatConversation[]; unreadTotal: number }>("/chat/conversations");
}

export async function fetchChatUnreadCount() {
  const payload = await chatRequest<{ unreadTotal: number }>("/chat/unread-count");
  return payload.unreadTotal || 0;
}

export async function fetchChatContacts() {
  const payload = await chatRequest<{ contacts: Array<ChatInternContact | ChatCompanyContact> }>("/chat/contacts");
  return payload.contacts || [];
}

export async function openChatConversation(payload: { companyId?: string; internProfileId?: string }) {
  const result = await chatRequest<{ conversation: ChatConversation }>("/chat/conversations", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return result.conversation;
}

export async function fetchChatMessages(conversationId: string, options?: { before?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (options?.before) params.set("before", options.before);
  if (options?.limit) params.set("limit", String(options.limit));
  const query = params.toString();
  return chatRequest<{ conversation: ChatConversation; messages: ChatMessage[] }>(
    `/chat/conversations/${conversationId}/messages${query ? `?${query}` : ""}`
  );
}

export async function sendChatMessage(conversationId: string, body: string) {
  return chatRequest<{ message: ChatMessage; conversation: ChatConversation }>(`/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body })
  });
}

export async function markChatConversationRead(conversationId: string) {
  return chatRequest<{ conversation: ChatConversation; unreadTotal: number }>(`/chat/conversations/${conversationId}/read`, {
    method: "PATCH"
  });
}

export function resolveApiBaseUrlForSocket(): string {
  const configured = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");
  if (typeof window === "undefined") return configured;

  try {
    const parsed = new URL(configured);
    const browserHost = window.location.hostname;
    const configuredIsLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const browserIsLocal = browserHost === "localhost" || browserHost === "127.0.0.1";
    if (configuredIsLocal && !browserIsLocal) {
      const port = parsed.port || "5000";
      return `${window.location.protocol}//${browserHost}:${port}`;
    }
  } catch {
    // fall through
  }
  return configured;
}
