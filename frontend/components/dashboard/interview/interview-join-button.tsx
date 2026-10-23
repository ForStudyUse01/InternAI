"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/icons/app-icon";
import type { ScheduledInterviewRecord } from "@/lib/interview-workflow";
import { getInterviewJoinAvailability, formatInterviewJoinHint } from "@/lib/interview-join";
import { safeUrl } from "@/lib/safe-url";

type InterviewJoinButtonProps = {
  interview: ScheduledInterviewRecord;
  size?: "sm" | "md";
  className?: string;
};

export function InterviewJoinButton({ interview, size = "sm", className }: InterviewJoinButtonProps) {
  const { joinHref, canJoin, isExternalLink } = getInterviewJoinAvailability(interview);
  const hint = formatInterviewJoinHint(interview);

  if (!joinHref) return null;

  if (!canJoin) {
    if (!hint) return null;
    return <p className={`text-xs text-[var(--ds-muted)] ${className || ""}`}>{hint}</p>;
  }

  if (isExternalLink) {
    return (
      <a
        href={safeUrl(joinHref)}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--ds-gradient-from),var(--ds-gradient-to))] px-4 py-2 text-sm font-semibold text-[var(--ds-on-primary)] shadow-glow transition hover:brightness-110 ${className || ""}`}
      >
        <AppIcon icon={ExternalLink} size="xs" />
        Join Interview
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    );
  }

  return (
    <Button type="button" size={size} href={joinHref} className={className}>
      <AppIcon icon={ExternalLink} size="xs" />
      Join Interview
    </Button>
  );
}
