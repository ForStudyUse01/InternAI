"use client";

import { forwardRef } from "react";
import { Loader2, Search, X } from "lucide-react";
import { AppIcon, type AppIconSize } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";

type SearchInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value" | "type"
> & {
  value: string;
  onValueChange: (value: string) => void;
  /** Show a spinner in place of the clear button while results load. */
  loading?: boolean;
  /** Class for the outer relative wrapper (width/layout control). */
  containerClassName?: string;
  /** Size of the leading search icon. Defaults to "xs". */
  iconSize?: AppIconSize;
  /** Extra classes for the leading search icon (e.g. stronger colour). */
  iconClassName?: string;
};

/**
 * Shared search field: leading search icon, clear (X) button, optional
 * loading spinner, Escape-to-clear. Styling comes from the ds-input token
 * class; pass className to adjust sizing per context.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    { value, onValueChange, loading = false, containerClassName, className, placeholder, onKeyDown, iconSize = "xs", iconClassName, ...rest },
    ref
  ) {
    const showClear = !loading && value.length > 0;

    return (
      <div className={cn("relative", containerClassName)}>
        <AppIcon
          icon={Search}
          size={iconSize}
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ds-muted)]",
            iconClassName
          )}
        />
        <input
          ref={ref}
          type="text"
          enterKeyHint="search"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && value) {
              event.stopPropagation();
              onValueChange("");
            }
            onKeyDown?.(event);
          }}
          placeholder={placeholder}
          aria-label={rest["aria-label"] || placeholder || "Search"}
          aria-busy={loading || undefined}
          className={cn("ds-input pl-9", (showClear || loading) && "pr-9", className)}
          {...rest}
        />
        {loading ? (
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ds-muted)]"
          >
            <AppIcon icon={Loader2} size="xs" className="animate-spin text-current" />
          </span>
        ) : showClear ? (
          <button
            type="button"
            onClick={() => onValueChange("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--ds-muted)] transition-colors hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ds-focus-ring)]"
          >
            <AppIcon icon={X} size="xs" className="text-current" />
          </button>
        ) : null}
      </div>
    );
  }
);
