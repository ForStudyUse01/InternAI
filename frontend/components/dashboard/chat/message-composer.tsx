"use client";

import { useCallback, useEffect, useRef } from "react";
import { Paperclip, SendHorizontal } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export function MessageComposer({
  value,
  onChange,
  onSend,
  sending = false,
  disabled = false,
  placeholder = "Write a message…",
  className
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <div data-chat-composer className={cn("p-3", className)}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled
          title="Attachments coming soon"
          className="hidden shrink-0 rounded-lg p-2 text-[var(--ds-muted)] sm:inline-flex"
          aria-label="Attach file"
        >
          <AppIcon icon={Paperclip} size="sm" />
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label="Message"
          rows={1}
          disabled={disabled || sending}
          className={cn(
            "max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-raised)] px-3 py-2.5 text-sm leading-5",
            "text-[var(--ds-text)] placeholder:text-[var(--ds-muted)] focus:border-[var(--ds-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-focus-ring)]"
          )}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (value.trim() && !sending) onSend();
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          onClick={onSend}
          disabled={disabled || sending || !value.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl p-0"
          aria-label="Send message"
        >
          <AppIcon icon={SendHorizontal} size="sm" />
        </Button>
      </div>
      <p className="mt-1.5 hidden text-[11px] text-[var(--ds-muted)] sm:block">Enter to send · Shift+Enter for new line</p>
    </div>
  );
}
