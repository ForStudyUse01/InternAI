"use client";

import { CALENDAR_STICKER_EMOJIS } from "@/lib/calendar-stickers";
import { Sticker3D } from "@/components/calendar/sticker-3d";
import { cn } from "@/lib/utils";

type CalendarEmojiPickerProps = {
  selected?: string | null;
  onSelect: (emoji: string) => void;
  className?: string;
};

export function CalendarEmojiPicker({ selected, onSelect, className }: CalendarEmojiPickerProps) {
  return (
    <div className={cn("rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-3", className)}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">
        Sticker picker
      </p>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
        {CALENDAR_STICKER_EMOJIS.map((emoji) => {
          const isSelected = selected === emoji;
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => onSelect(emoji)}
              className={cn(
                "flex items-center justify-center rounded-xl p-0.5 transition",
                isSelected && "ring-2 ring-[var(--ds-primary-text)] ring-offset-2 ring-offset-[var(--ds-surface)] dark:ring-[var(--ds-primary)]"
              )}
              aria-label={`Add ${emoji} sticker`}
              title={`Add ${emoji}`}
            >
              <Sticker3D emoji={emoji} size="sm" interactive={false} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
