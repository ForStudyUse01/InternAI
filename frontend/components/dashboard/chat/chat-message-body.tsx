"use client";

import Link from "next/link";
import { memo } from "react";
import { ExternalLink } from "lucide-react";
import { parseChatMessageBody } from "@/components/dashboard/chat/chat-utils";
import { AppIcon } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";

type ChatMessageBodyProps = {
  body: string;
  mine?: boolean;
};

export const ChatMessageBody = memo(function ChatMessageBody({ body, mine = false }: ChatMessageBodyProps) {
  const segments = parseChatMessageBody(body);

  return (
    <div className="space-y-2">
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return (
            <p key={`text-${index}`} className="whitespace-pre-wrap break-words text-inherit">
              {segment.value}
            </p>
          );
        }

        const isInternal = segment.href.startsWith("/");
        const className = cn(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
          mine
            ? "bg-white/20 text-[var(--ds-on-primary)] hover:bg-white/30"
            : "bg-[var(--ds-primary)] text-[var(--ds-on-primary)] hover:bg-[var(--ds-primary-hover)]"
        );

        if (isInternal) {
          return (
            <Link key={`cta-${index}`} href={segment.href} className={className}>
              <AppIcon icon={ExternalLink} size="xs" />
              {segment.label}
            </Link>
          );
        }

        return (
          <a
            key={`cta-${index}`}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
          >
            <AppIcon icon={ExternalLink} size="xs" />
            {segment.label}
          </a>
        );
      })}
    </div>
  );
});
