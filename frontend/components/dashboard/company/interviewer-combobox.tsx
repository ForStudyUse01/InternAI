"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, UserRound } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";

type InterviewerComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
  fieldClassName?: string;
  id?: string;
};

/**
 * Searchable, freeform interviewer picker. No interviewer directory exists in the
 * data model (no backend change permitted), so this is a create-or-pick combobox:
 * type any name, or pick from previously-used interviewer names for this company.
 */
export function InterviewerCombobox({
  value,
  onChange,
  suggestions = [],
  placeholder = "Search or type a name…",
  className,
  fieldClassName,
  id
}: InterviewerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const filtered = useMemo(() => {
    const query = value.trim().toLowerCase();
    const pool = query ? suggestions.filter((name) => name.toLowerCase().includes(query)) : suggestions;
    return pool.slice(0, 6);
  }, [value, suggestions]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    setHighlighted(0);
  }, [value, open]);

  function selectOption(name: string) {
    onChange(name);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open || filtered.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((prev) => (prev + 1) % filtered.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectOption(filtered[highlighted]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="relative">
        <AppIcon icon={Search} size="xs" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered[highlighted] ? `${listboxId}-${highlighted}` : undefined}
          value={value}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className={cn(
            "w-full rounded-lg border border-[var(--ds-border)] bg-[var(--ds-input)] py-2 pl-8 pr-3 text-sm text-[var(--ds-text)] shadow-sm outline-none transition focus:border-[var(--ds-primary)] focus:ring-2 focus:ring-[var(--ds-focus-ring)]",
            fieldClassName
          )}
        />
      </div>
      {open && filtered.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[var(--ds-border)] bg-[var(--ds-card)] py-1 shadow-lg"
        >
          {filtered.map((name, index) => (
            <li
              key={name}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={index === highlighted}
              onMouseDown={(event) => {
                event.preventDefault();
                selectOption(name);
              }}
              onMouseEnter={() => setHighlighted(index)}
              className={cn(
                "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-[var(--ds-text-secondary)]",
                index === highlighted && "bg-[var(--ds-info-bg)] text-[var(--ds-primary-text)]"
              )}
            >
              <AppIcon icon={UserRound} size="xs" />
              <span className="truncate">{name}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
