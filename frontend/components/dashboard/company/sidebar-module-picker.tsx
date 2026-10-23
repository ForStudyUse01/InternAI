"use client";

import { useMemo, useState } from "react";
import { SIDEBAR_MODULE_REGISTRY, SIDEBAR_MODULE_DESCRIPTIONS, type SidebarModuleKey } from "@/lib/company-portal";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";

type SidebarModulePickerProps = {
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
};

const GROUP_ORDER = ["Dashboard", "Recruitment", "Interviews", "Messaging", "Analytics", "Company", "Team", "Settings"];

export function SidebarModulePicker({ value, onChange, className }: SidebarModulePickerProps) {
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const byGroup = new Map<string, typeof SIDEBAR_MODULE_REGISTRY>();
    for (const entry of SIDEBAR_MODULE_REGISTRY) {
      if (query && !entry.label.toLowerCase().includes(query)) continue;
      const list = byGroup.get(entry.group) || [];
      list.push(entry);
      byGroup.set(entry.group, list);
    }
    return GROUP_ORDER.map((group) => ({ group, entries: byGroup.get(group) || [] })).filter((g) => g.entries.length > 0);
  }, [search]);

  const selectableKeys = useMemo(
    () => SIDEBAR_MODULE_REGISTRY.filter((entry) => !entry.executiveOnly).map((entry) => entry.key),
    []
  );

  const enabledCount = value.filter((key) => selectableKeys.includes(key as SidebarModuleKey)).length;

  function toggle(key: string) {
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  }

  function selectAll() {
    onChange([...new Set([...value, ...selectableKeys])]);
  }

  function clearAll() {
    onChange(value.filter((key) => !selectableKeys.includes(key as SidebarModuleKey)));
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Search permissions..."
          containerClassName="w-full max-w-xs"
          className="!h-9 text-xs"
        />
        <div className="flex items-center gap-3 text-xs">
          <span className="ds-caption">
            {enabledCount} of {selectableKeys.length} enabled
          </span>
          <button
            type="button"
            onClick={selectAll}
            className="rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] px-2.5 py-1 font-semibold text-[var(--ds-accent)] transition-colors duration-150 hover:bg-[var(--ds-surface-raised)] active:opacity-80"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] px-2.5 py-1 font-semibold text-[var(--ds-muted)] transition-colors duration-150 hover:bg-[var(--ds-surface-raised)] active:opacity-80"
          >
            Clear All
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--ds-border)] px-4 py-6 text-center">
          <p className="text-sm text-[var(--ds-text-secondary)]">No permissions match &quot;{search}&quot;.</p>
          <button
            type="button"
            onClick={() => setSearch("")}
            className="mt-2 text-xs font-semibold text-[var(--ds-accent)] hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map(({ group, entries }) => (
          <div key={group} className="ds-card space-y-2 !p-3">
            <p className="ds-label">{group}</p>
            <div className="space-y-1">
              {entries.map((entry) => {
                const checked = value.includes(entry.key);
                const disabled = Boolean(entry.executiveOnly);
                return (
                  <label
                    key={entry.key}
                    title={SIDEBAR_MODULE_DESCRIPTIONS[entry.key]}
                    className={cn(
                      "flex items-center gap-2 rounded-[var(--ds-radius-sm)] px-2 py-1.5 text-sm transition-colors duration-150",
                      disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-[var(--ds-surface-raised)]"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(entry.key)}
                      className="h-4 w-4 rounded border-[var(--ds-border-strong)] text-[var(--ds-accent)] focus:ring-[var(--ds-focus-ring)]"
                    />
                    <span className="text-[var(--ds-text)]">{entry.label}</span>
                    {disabled && <span className="text-[10px] uppercase tracking-wide text-[var(--ds-muted)]">CEO only</span>}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
