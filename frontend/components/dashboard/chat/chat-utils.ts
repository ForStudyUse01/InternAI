import type { ChatConversation, ChatMessage } from "@/lib/chat-portal";

export type ChatRole = "intern" | "company";

export type MessageGroup = {
  id: string;
  senderRole: ChatMessage["senderRole"];
  mine: boolean;
  isInterviewEvent: boolean;
  messages: ChatMessage[];
};

const TIME_GROUP_MS = 5 * 60 * 1000;

export function formatChatTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (sameDay) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatListTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60_000) return "Now";
  if (diff < 86_400_000) return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDateSeparator(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric"
  });
}

export function conversationTitle(conversation: ChatConversation, role: ChatRole): string {
  if (role === "intern") return conversation.company?.companyName || "Company";
  return conversation.internProfile?.fullName || "Intern";
}

export function isOwnMessage(message: ChatMessage, role: ChatRole): boolean {
  return (role === "intern" && message.senderRole === "intern") || (role === "company" && message.senderRole === "company");
}

export function groupMessages(messages: ChatMessage[], role: ChatRole): MessageGroup[] {
  const groups: MessageGroup[] = [];

  for (const message of messages) {
    const mine = isOwnMessage(message, role);
    const isInterviewEvent = isInterviewEventMessage(message.body);
    const last = groups[groups.length - 1];
    const lastTime = last ? new Date(last.messages[last.messages.length - 1].createdAt || 0).getTime() : 0;
    const currentTime = new Date(message.createdAt || 0).getTime();
    const sameGroup =
      last &&
      !isInterviewEvent &&
      !last.isInterviewEvent &&
      last.senderRole === message.senderRole &&
      Number.isFinite(lastTime) &&
      Number.isFinite(currentTime) &&
      Math.abs(currentTime - lastTime) <= TIME_GROUP_MS;

    if (sameGroup) {
      last.messages.push(message);
    } else {
      groups.push({
        id: `${message._id}-group`,
        senderRole: message.senderRole,
        mine,
        isInterviewEvent,
        messages: [message]
      });
    }
  }

  return groups;
}

export function createOptimisticMessage(conversationId: string, role: ChatRole, body: string): ChatMessage {
  return {
    _id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    conversation: conversationId,
    body,
    senderRole: role,
    status: "sent",
    createdAt: new Date().toISOString()
  };
}

export function replaceOptimisticMessage(messages: ChatMessage[], tempId: string, real: ChatMessage): ChatMessage[] {
  const exists = messages.some((m) => m._id === real._id);
  if (exists) return messages.filter((m) => m._id !== tempId);
  return messages.map((m) => (m._id === tempId ? real : m));
}

export type ChatBodySegment =
  | { type: "text"; value: string }
  | { type: "interview-cta"; href: string; label: string };

const VIEW_INTERVIEW_DETAILS_RE =
  /(?:\r?\n\s*)?View Interview Details:\s*(https?:\/\/\S+|\/interview\/[^\s]+)/i;

function normalizeInterviewHref(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("/")) return trimmed;
  try {
    const url = new URL(trimmed);
    const path = `${url.pathname}${url.search}${url.hash}`;
    if (path.startsWith("/interview/")) return path;
    return trimmed;
  } catch {
    return trimmed;
  }
}

/** True when a message is a system-generated interview notification (contains a "View Interview Details" link). */
export function isInterviewEventMessage(body: string): boolean {
  return VIEW_INTERVIEW_DETAILS_RE.test(body);
}

export type InterviewEventStatus = "scheduled" | "rescheduled" | "cancelled" | "completed";

/** Derives the interview status from the message text (backend wording: "rescheduled", "cancelled", "completed", else scheduled). */
export function getInterviewEventStatus(body: string): InterviewEventStatus {
  if (/rescheduled/i.test(body)) return "rescheduled";
  if (/cancelled/i.test(body)) return "cancelled";
  if (/completed/i.test(body)) return "completed";
  return "scheduled";
}

/** Split automated interview messages into readable text + CTA link. */
export function parseChatMessageBody(body: string): ChatBodySegment[] {
  const match = body.match(VIEW_INTERVIEW_DETAILS_RE);
  if (!match || match.index === undefined) {
    return [{ type: "text", value: body }];
  }

  const before = body.slice(0, match.index).trimEnd();
  const href = normalizeInterviewHref(match[1]);
  const segments: ChatBodySegment[] = [];
  if (before) segments.push({ type: "text", value: before });
  segments.push({ type: "interview-cta", href, label: "View interview details" });
  return segments;
}
