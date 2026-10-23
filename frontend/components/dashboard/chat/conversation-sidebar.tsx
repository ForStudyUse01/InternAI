"use client";

import { memo, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SearchX } from "lucide-react";
import type { ChatCompanyContact, ChatConversation, ChatInternContact } from "@/lib/chat-portal";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { conversationTitle, formatListTime, type ChatRole } from "@/components/dashboard/chat/chat-utils";
import { initialsFromWords as initialsFor } from "@/components/dashboard/shared/avatar-initials";
import { cn } from "@/lib/utils";

type Props = {
  role: ChatRole;
  conversations: ChatConversation[];
  selectedId: string | null;
  contacts: Array<ChatInternContact | ChatCompanyContact>;
  showNewChat: boolean;
  loading?: boolean;
  unreadTotal?: number;
  onToggleNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onStartChat: (contact: ChatInternContact | ChatCompanyContact) => void;
  className?: string;
};

const AVATAR_TONES = [
  "bg-[var(--ds-chart-1)]",
  "bg-[var(--ds-chart-2)]",
  "bg-[var(--ds-chart-3)]",
  "bg-[var(--ds-chart-4)]",
  "bg-[var(--ds-chart-5)]",
  "bg-[var(--ds-chart-6)]"
];

function toneForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function contactForConversation(
  conversation: ChatConversation,
  contacts: Array<ChatInternContact | ChatCompanyContact>,
  role: ChatRole
) {
  if (role === "intern") {
    return contacts.find((c) => (c as ChatInternContact).companyId === conversation.company?._id) ?? null;
  }
  return contacts.find((c) => (c as ChatCompanyContact).internProfileId === conversation.internProfile?._id) ?? null;
}

function ListSkeleton() {
  return (
    <div className="space-y-2 p-2" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3 rounded" />
            <Skeleton className="h-3 w-4/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export const ConversationSidebar = memo(function ConversationSidebar({
  role,
  conversations,
  selectedId,
  contacts,
  showNewChat,
  loading = false,
  unreadTotal = 0,
  onToggleNewChat,
  onSelectConversation,
  onStartChat,
  className
}: Props) {
  const [query, setQuery] = useState("");

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((conversation) => {
      const title = conversationTitle(conversation, role).toLowerCase();
      const contact = contactForConversation(conversation, contacts, role);
      const roleLabel = contact?.internshipRole?.toLowerCase() || "";
      return title.includes(q) || roleLabel.includes(q);
    });
  }, [conversations, contacts, role, query]);

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--ds-border)] px-4 py-3.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[var(--ds-text)]">Conversations</p>
          {unreadTotal > 0 ? (
            <span
              className="rounded-full bg-[var(--ds-primary)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ds-on-primary)]"
              aria-label={`${unreadTotal} unread conversation${unreadTotal === 1 ? "" : "s"}`}
            >
              {unreadTotal}
            </span>
          ) : null}
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={onToggleNewChat}>
          {showNewChat ? "Close" : "New"}
        </Button>
      </div>

      <div className="border-b border-[var(--ds-border)] px-3 py-2.5">
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search conversations…"
          aria-label="Search conversations"
          className="pl-8"
        />
      </div>

      {showNewChat ? (
        <div className="max-h-44 space-y-0.5 overflow-y-auto border-b border-[var(--ds-border)] p-2">
          {contacts.length === 0 ? (
            <p className="px-2 py-2 text-xs text-[var(--ds-muted)]">
              Apply to an internship to unlock messaging.
            </p>
          ) : null}
          {contacts.map((contact) => {
            const key =
              role === "intern"
                ? (contact as ChatInternContact).companyId
                : (contact as ChatCompanyContact).internProfileId;
            const label =
              role === "intern"
                ? (contact as ChatInternContact).companyName
                : (contact as ChatCompanyContact).internName;
            const subtitle = contact.internshipRole;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onStartChat(contact)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--ds-surface-raised)]"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]",
                    toneForName(label)
                  )}
                >
                  {initialsFor(label)}
                </span>
                <span className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--ds-text)]">{label}</p>
                  {subtitle ? <p className="truncate text-[11px] text-[var(--ds-muted)]">{subtitle}</p> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {loading && conversations.length === 0 ? (
          <ListSkeleton />
        ) : conversations.length === 0 ? (
          <li>
            <EmptyState
              title="No conversations yet"
              hint={
                role === "intern"
                  ? "Apply to internships to start hearing from recruiters here."
                  : "Message candidates from your hiring pipeline."
              }
              presetKey="chat"
            />
          </li>
        ) : filteredConversations.length === 0 ? (
          <li>
            <EmptyState
              icon={SearchX}
              title="No matching conversations"
              description={`Nothing matches "${query}". Try a different name or role.`}
              ctaLabel="Clear Search"
              onCtaClick={() => setQuery("")}
              size="sm"
              className="border-0"
            />
          </li>
        ) : (
          filteredConversations.map((conversation) => {
            const active = conversation._id === selectedId;
            const unread = conversation.unreadCount || 0;
            const title = conversationTitle(conversation, role);
            const contact = contactForConversation(conversation, contacts, role);
            const roleLabel = contact?.internshipRole;

            return (
              <li key={conversation._id} className="relative">
                {active ? (
                  <motion.div
                    layoutId="chat-active-pill"
                    className="absolute inset-0 rounded-xl bg-[var(--ds-primary)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <motion.button
                  type="button"
                  onClick={() => onSelectConversation(conversation._id)}
                  aria-current={active ? "true" : undefined}
                  whileHover={active ? undefined : { x: 2 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    active
                      ? "text-[var(--ds-on-primary)]"
                      : unread > 0
                        ? "bg-[var(--ds-surface-raised)] hover:bg-[var(--ds-hover)]"
                        : "hover:bg-[var(--ds-surface-raised)]"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]",
                      toneForName(title)
                    )}
                  >
                    {initialsFor(title)}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          "truncate text-sm font-semibold",
                          active ? "text-[var(--ds-on-primary)]" : "text-[var(--ds-text)]"
                        )}
                      >
                        {title}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-[10px]",
                          active ? "text-[var(--ds-on-primary)] opacity-80" : "text-[var(--ds-muted)]"
                        )}
                      >
                        {formatListTime(conversation.lastMessageAt)}
                      </span>
                    </span>
                    {roleLabel ? (
                      <span
                        className={cn(
                          "block truncate text-[11px]",
                          active ? "text-[var(--ds-on-primary)] opacity-90" : "text-[var(--ds-muted)]"
                        )}
                      >
                        {roleLabel}
                      </span>
                    ) : null}
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "line-clamp-1 text-xs",
                          active ? "text-[var(--ds-on-primary)] opacity-90" : "text-[var(--ds-muted)]"
                        )}
                      >
                        {conversation.lastMessageText || "No messages yet"}
                      </span>
                      {unread > 0 ? (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                            active ? "bg-white/25 text-[var(--ds-on-primary)]" : "bg-[var(--ds-primary)] text-[var(--ds-on-primary)]"
                          )}
                        >
                          {unread > 9 ? "9+" : unread}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </motion.button>
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
});
