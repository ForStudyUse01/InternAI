import { describe, test, expect } from "vitest";
import {
  isOwnMessage,
  groupMessages,
  isInterviewEventMessage,
  getInterviewEventStatus,
  parseChatMessageBody,
  createOptimisticMessage,
  replaceOptimisticMessage
} from "@/components/dashboard/chat/chat-utils";
import type { ChatMessage } from "@/lib/chat-portal";

function msg(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    _id: "m1",
    conversation: "c1",
    body: "hello",
    senderRole: "intern",
    status: "sent",
    createdAt: "2026-01-01T10:00:00.000Z",
    ...overrides
  } as ChatMessage;
}

describe("isOwnMessage", () => {
  test("intern viewing their own message is true", () => {
    expect(isOwnMessage(msg({ senderRole: "intern" }), "intern")).toBe(true);
  });
  test("intern viewing a company message is false", () => {
    expect(isOwnMessage(msg({ senderRole: "company" }), "intern")).toBe(false);
  });
});

describe("groupMessages", () => {
  test("groups consecutive same-sender messages within the time window", () => {
    const messages = [
      msg({ _id: "1", senderRole: "intern", createdAt: "2026-01-01T10:00:00.000Z" }),
      msg({ _id: "2", senderRole: "intern", createdAt: "2026-01-01T10:01:00.000Z" })
    ];
    const groups = groupMessages(messages, "intern");
    expect(groups).toHaveLength(1);
    expect(groups[0].messages).toHaveLength(2);
  });

  test("splits into separate groups when sender changes", () => {
    const messages = [
      msg({ _id: "1", senderRole: "intern" }),
      msg({ _id: "2", senderRole: "company", createdAt: "2026-01-01T10:01:00.000Z" })
    ];
    const groups = groupMessages(messages, "intern");
    expect(groups).toHaveLength(2);
  });

  test("splits into separate groups when the time gap exceeds 5 minutes", () => {
    const messages = [
      msg({ _id: "1", senderRole: "intern", createdAt: "2026-01-01T10:00:00.000Z" }),
      msg({ _id: "2", senderRole: "intern", createdAt: "2026-01-01T10:07:00.000Z" })
    ];
    const groups = groupMessages(messages, "intern");
    expect(groups).toHaveLength(2);
  });

  test("an interview event message never merges into a surrounding group", () => {
    const messages = [
      msg({ _id: "1", senderRole: "company", body: "Hi there" }),
      msg({
        _id: "2",
        senderRole: "company",
        body: "Interview scheduled.\nView Interview Details: https://app.example.com/interview/abc123",
        createdAt: "2026-01-01T10:00:30.000Z"
      })
    ];
    const groups = groupMessages(messages, "intern");
    expect(groups).toHaveLength(2);
    expect(groups[1].isInterviewEvent).toBe(true);
  });

  test("empty message list returns empty groups", () => {
    expect(groupMessages([], "intern")).toEqual([]);
  });
});

describe("isInterviewEventMessage / getInterviewEventStatus", () => {
  test("detects a system interview notification", () => {
    const body = "Interview scheduled.\nView Interview Details: https://app.example.com/interview/abc123";
    expect(isInterviewEventMessage(body)).toBe(true);
  });

  test("a normal chat message is not an interview event", () => {
    expect(isInterviewEventMessage("Hey, are you free tomorrow?")).toBe(false);
  });

  test("defaults to scheduled status", () => {
    expect(getInterviewEventStatus("Interview scheduled with the team.")).toBe("scheduled");
  });

  test("detects rescheduled/cancelled/completed keywords", () => {
    expect(getInterviewEventStatus("Your interview was rescheduled")).toBe("rescheduled");
    expect(getInterviewEventStatus("Your interview was cancelled")).toBe("cancelled");
    expect(getInterviewEventStatus("Your interview was completed")).toBe("completed");
  });
});

describe("parseChatMessageBody", () => {
  test("splits leading text and the interview CTA into separate segments", () => {
    const body = "Interview scheduled for Friday.\nView Interview Details: https://app.example.com/interview/room42";
    const segments = parseChatMessageBody(body);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({ type: "text", value: "Interview scheduled for Friday." });
    expect(segments[1].type).toBe("interview-cta");
    if (segments[1].type === "interview-cta") {
      expect(segments[1].href).toBe("/interview/room42");
    }
  });

  test("a plain message with no CTA returns a single text segment", () => {
    const segments = parseChatMessageBody("just a normal message");
    expect(segments).toEqual([{ type: "text", value: "just a normal message" }]);
  });
});

describe("createOptimisticMessage / replaceOptimisticMessage", () => {
  test("creates an optimistic message with a unique temp id", () => {
    const optimistic = createOptimisticMessage("c1", "intern", "hi");
    expect(optimistic._id).toMatch(/^optimistic-/);
    expect(optimistic.body).toBe("hi");
    expect(optimistic.senderRole).toBe("intern");
  });

  test("replaces the optimistic message with the real one from the server", () => {
    const optimistic = createOptimisticMessage("c1", "intern", "hi");
    const real = msg({ _id: "server-real-id", body: "hi" });
    const result = replaceOptimisticMessage([optimistic], optimistic._id, real);
    expect(result).toEqual([real]);
  });

  test("if the real message already exists (duplicate delivery), drops the optimistic one instead of duplicating", () => {
    const optimistic = createOptimisticMessage("c1", "intern", "hi");
    const real = msg({ _id: "server-real-id", body: "hi" });
    const result = replaceOptimisticMessage([optimistic, real], optimistic._id, real);
    expect(result).toEqual([real]);
  });
});
