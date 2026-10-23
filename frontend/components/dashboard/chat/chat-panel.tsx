"use client";

import { memo, useEffect, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CalendarClock, ExternalLink, Info, Loader2 } from "lucide-react";
import { ChatMessageBody } from "@/components/dashboard/chat/chat-message-body";
import { MessageComposer } from "@/components/dashboard/chat/message-composer";
import {
  conversationTitle,
  formatChatTime,
  formatDateSeparator,
  getInterviewEventStatus,
  groupMessages,
  parseChatMessageBody,
  type ChatRole,
  type InterviewEventStatus
} from "@/components/dashboard/chat/chat-utils";
import { MessageStatusIndicator } from "@/components/dashboard/chat/message-status-indicator";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AppIcon } from "@/components/icons/app-icon";
import { Button } from "@/components/ui/button";
import type { ChatCompanyContact, ChatConversation, ChatInternContact, ChatMessage } from "@/lib/chat-portal";
import { cn } from "@/lib/utils";

type Props = {
  role: ChatRole;
  conversation: ChatConversation | null;
  contact?: ChatInternContact | ChatCompanyContact | null;
  messages: ChatMessage[];
  draft: string;
  sending: boolean;
  loadingMessages: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  onOpenDetails?: () => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onLoadMore: () => void;
  className?: string;
};

/* ------------------------------- ChatHeader ------------------------------- */
/* Fixed-height row: Company name / Recruiter / Internship + Details button. */

function ChatHeader({
  role,
  conversation,
  contact,
  showBackButton,
  onBack,
  onOpenDetails
}: {
  role: ChatRole;
  conversation: ChatConversation;
  contact?: ChatInternContact | ChatCompanyContact | null;
  showBackButton?: boolean;
  onBack?: () => void;
  onOpenDetails?: () => void;
}) {
  const internshipRole = contact && "internshipRole" in contact ? contact.internshipRole : undefined;
  const subtitle =
    role === "intern"
      ? internshipRole
        ? `HR · ${internshipRole}`
        : "HR · Company conversation"
      : conversation.internProfile?.email || "Candidate conversation";

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-[var(--ds-border)] px-4">
      {showBackButton ? (
        <Button type="button" size="sm" variant="ghost" onClick={onBack} aria-label="Back to conversations" className="shrink-0 px-2 lg:hidden">
          <AppIcon icon={ArrowLeft} size="sm" />
        </Button>
      ) : null}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-[var(--ds-text)]">
          {conversationTitle(conversation, role)}
        </h3>
        <p className="truncate text-[11px] text-[var(--ds-muted)]">{subtitle}</p>
      </div>
      {onOpenDetails ? (
        <Button type="button" size="sm" variant="secondary" onClick={onOpenDetails} className="shrink-0 gap-1.5">
          <AppIcon icon={Info} size="xs" className="text-current" />
          Details
        </Button>
      ) : null}
    </header>
  );
}

/* ------------------------------ InterviewEventCard ------------------------------ */
/* Compact system card — not a chat bubble. Left accent border communicates
   status; entire card stays dark-surfaced and readable on the dark theme. */

const INTERVIEW_STATUS_STYLES: Record<InterviewEventStatus, { label: string; border: string }> = {
  scheduled: { label: "Interview Scheduled", border: "border-l-[var(--ds-info)]" },
  rescheduled: { label: "Interview Rescheduled", border: "border-l-[var(--ds-warning)]" },
  cancelled: { label: "Interview Cancelled", border: "border-l-[var(--ds-danger)]" },
  completed: { label: "Interview Completed", border: "border-l-[var(--ds-success)]" }
};

function InterviewEventCard({ message }: { message: ChatMessage }) {
  const segments = parseChatMessageBody(message.body);
  const text = segments.find((s) => s.type === "text");
  const cta = segments.find((s) => s.type === "interview-cta");
  const status = getInterviewEventStatus(message.body);
  const { label, border } = INTERVIEW_STATUS_STYLES[status];

  return (
    <div
      className={cn(
        "flex max-w-md items-start gap-3 rounded-2xl border border-[var(--ds-border)] border-l-[3px] bg-[var(--ds-surface-raised)] px-3.5 py-3 shadow-sm transition-[box-shadow,transform] duration-150 hover:-translate-y-px hover:shadow-md",
        border
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ds-info-bg)]">
        <AppIcon icon={CalendarClock} size="xs" className="text-[var(--ds-info)]" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--ds-muted)]">Interview Update</p>
        <p className="mt-0.5 text-sm font-semibold text-[var(--ds-text)]">{label}</p>
        {text?.type === "text" ? (
          <p className="mt-0.5 text-sm leading-snug text-[var(--ds-text)]">{text.value}</p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {cta?.type === "interview-cta" ? (
            <Link
              href={cta.href}
              className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-lg border border-[var(--ds-border-strong)] px-2.5 py-1 text-xs font-semibold text-[var(--ds-text)] transition-colors hover:border-[var(--ds-accent)] hover:bg-[var(--ds-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
            >
              <AppIcon icon={ExternalLink} size="xs" className="text-current" />
              View details
            </Link>
          ) : null}
          <span className="text-[11px] text-[var(--ds-muted)]">{formatChatTime(message.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="my-1 flex items-center justify-center py-2" aria-hidden>
      <span className="rounded-full bg-[var(--ds-surface-raised)] px-3 py-1 text-[11px] font-medium text-[var(--ds-muted)]">
        {label}
      </span>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-1 flex-col justify-end gap-4 px-1" aria-hidden>
      <div className="flex justify-start">
        <Skeleton className="h-10 w-2/5 rounded-2xl" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-1/3 rounded-2xl" />
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-16 w-1/2 rounded-2xl" />
      </div>
    </div>
  );
}

/* -------------------------------- MessageList -------------------------------- */
/* flex:1, scrolls independently. Header and composer never scroll with it. */

const MessageList = memo(function MessageList({
  role,
  conversationId,
  messages,
  loadingMessages,
  loadingMore,
  hasMore,
  onLoadMore
}: {
  role: ChatRole;
  conversationId: string;
  messages: ChatMessage[];
  loadingMessages: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);
  const prevConversationRef = useRef<string | null>(null);

  useEffect(() => {
    const conversationChanged = conversationId !== prevConversationRef.current;
    prevConversationRef.current = conversationId;

    const grew = messages.length > prevLengthRef.current;
    prevLengthRef.current = messages.length;

    if (!scrollRef.current) return;
    if (conversationChanged || grew) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationId, messages.length, messages]);

  const groups = groupMessages(messages, role);
  let lastDateKey = "";
  const groupsWithDates = groups.map((group) => {
    const first = group.messages[0];
    const dateKey = first?.createdAt ? new Date(first.createdAt).toDateString() : "";
    const showSeparator = Boolean(dateKey) && dateKey !== lastDateKey;
    lastDateKey = dateKey;
    return { group, showSeparator, dateLabel: formatDateSeparator(first?.createdAt) };
  });

  return (
    <div
      ref={scrollRef}
      data-chat-messages
      role="log"
      aria-label="Conversation messages"
      aria-live="polite"
      aria-relevant="additions"
      className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-3 sm:px-4"
    >
      {hasMore ? (
        <div className="mb-3 flex shrink-0 justify-center">
          <Button type="button" size="sm" variant="secondary" disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? (
              <>
                <AppIcon icon={Loader2} size="xs" className="animate-spin" />
                Loading…
              </>
            ) : (
              "Load older messages"
            )}
          </Button>
        </div>
      ) : null}

      {loadingMessages ? (
        <>
          <span className="sr-only" role="status">Loading messages…</span>
          <ListSkeleton />
        </>
      ) : messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-8">
          <EmptyState
            presetKey="chat"
            title="No Messages Yet"
            description="Say hello to start the conversation."
            size="sm"
            className="border-none bg-transparent shadow-none"
          />
        </div>
      ) : (
        <div className="mt-auto w-full space-y-3 pb-1">
          <AnimatePresence initial={false}>
            {groupsWithDates.map(({ group, showSeparator, dateLabel }) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {showSeparator && dateLabel ? <DateSeparator label={dateLabel} /> : null}
                {group.isInterviewEvent ? (
                  <InterviewEventCard message={group.messages[0]} />
                ) : (
                  <div className={cn("flex", group.mine ? "justify-end" : "justify-start")}>
                    <div className={cn("flex w-fit max-w-[88%] flex-col gap-1 sm:max-w-[65%]", group.mine ? "items-end" : "items-start")}>
                      {group.messages.map((message, index) => (
                        <div
                          key={message._id}
                          className={cn(
                            "w-fit rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                            group.mine
                              ? "chat-bubble-mine bg-[var(--ds-primary)] text-[var(--ds-on-primary)]"
                              : "chat-bubble-theirs border border-[var(--ds-border)] bg-[var(--ds-surface-raised)] text-[var(--ds-text)]",
                            index === 0 ? "" : group.mine ? "rounded-tr-md" : "rounded-tl-md"
                          )}
                        >
                          <ChatMessageBody body={message.body} mine={group.mine} />
                        </div>
                      ))}
                      <div className="flex items-center gap-1 px-1 text-[10px] text-[var(--ds-muted)]">
                        <span>{formatChatTime(group.messages[group.messages.length - 1].createdAt)}</span>
                        {group.mine ? (
                          <MessageStatusIndicator
                            status={group.messages[group.messages.length - 1].status || "sent"}
                            className="text-[var(--ds-muted)]"
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
});

/* --------------------------------- ChatPanel --------------------------------- */
/* <ChatPanel> = <ChatHeader/> + <MessageList/> + <MessageComposer/>, stacked
   vertically via CSS grid rows (auto / 1fr / auto). The composer is a grid
   row inside this same element — never a sibling column. */

export function ChatPanel({
  role,
  conversation,
  contact,
  messages,
  draft,
  sending,
  loadingMessages,
  loadingMore,
  hasMore,
  showBackButton,
  onBack,
  onOpenDetails,
  onDraftChange,
  onSend,
  onLoadMore,
  className
}: Props) {
  if (!conversation) {
    return (
      <section className={cn("flex h-full min-h-[480px] items-center justify-center rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)]", className)}>
        <EmptyState title="Select a conversation" hint="Choose a thread or start a new chat." presetKey="chat" />
      </section>
    );
  }

  return (
    <section
      className={cn(
        "grid h-full min-h-0 grid-rows-[4rem_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-sm",
        className
      )}
    >
      <ChatHeader
        role={role}
        conversation={conversation}
        contact={contact}
        showBackButton={showBackButton}
        onBack={onBack}
        onOpenDetails={onOpenDetails}
      />

      <MessageList
        role={role}
        conversationId={conversation._id}
        messages={messages}
        loadingMessages={loadingMessages}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
      />

      <MessageComposer
        value={draft}
        onChange={onDraftChange}
        onSend={onSend}
        sending={sending}
        className="shrink-0 rounded-b-2xl border-t border-[var(--ds-border)] bg-[var(--ds-deep)] shadow-[0_-4px_12px_rgba(0,0,0,0.2)]"
      />
    </section>
  );
}
