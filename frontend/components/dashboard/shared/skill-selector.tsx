"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createCustomSkill, searchSkills, SkillOption } from "@/lib/intern-portal";
import { SearchInput } from "@/components/ui/search-input";
import { useDebouncedValue } from "@/lib/use-debounced-value";

type SkillSelectorProps = {
  selected: string[];
  onChange: (skills: string[]) => void;
};

const chipClass =
  "inline-flex items-center gap-1 rounded-full border border-[var(--ds-border-strong)] bg-[var(--ds-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--ds-text)]";

export function SkillSelector({ selected, onChange }: SkillSelectorProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SkillOption[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebouncedValue(query);

  useEffect(() => {
    let active = true;
    if (!debouncedQuery.trim()) {
      setOptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    searchSkills(debouncedQuery.trim())
      .then((items) => {
        if (active) setOptions(items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  const lowerSelected = useMemo(() => new Set(selected.map((item) => item.toLowerCase())), [selected]);

  const addSkill = useCallback(
    (name: string) => {
      const normalized = String(name || "").trim();
      if (!normalized) return;
      if (lowerSelected.has(normalized.toLowerCase())) return;
      onChange([...selected, normalized]);
      setQuery("");
      setOptions([]);
    },
    [lowerSelected, onChange, selected]
  );

  async function addCustom() {
    const normalized = query.trim();
    if (!normalized) return;
    const created = await createCustomSkill(normalized);
    addSkill(created?.name || normalized);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <SearchInput
          value={query}
          onValueChange={setQuery}
          loading={loading}
          placeholder="Search and add skills"
          containerClassName="flex-1"
        />
        <button
          type="button"
          className="rounded-lg border border-[var(--ds-border-strong)] bg-[var(--ds-input)] px-3 py-2 text-xs font-semibold text-[var(--ds-text)] transition hover:bg-[var(--ds-surface-hover)]"
          onClick={addCustom}
        >
          Add
        </button>
      </div>
      {loading ? <p role="status" className="text-xs text-[var(--ds-text-secondary)]">Searching...</p> : null}
      {!loading && options.length > 0 ? (
        <div role="status" aria-live="polite" className="sr-only">
          {options.length} skill{options.length === 1 ? "" : "s"} found
        </div>
      ) : null}
      {!loading && options.length > 0 ? (
        <div className="max-h-36 overflow-auto rounded-lg border border-[var(--ds-border)] bg-[var(--ds-card)]">
          {options.map((option) => (
            <button
              key={option._id}
              type="button"
              className="block w-full border-b border-[var(--ds-border)] px-3 py-2 text-left text-sm text-[var(--ds-text)] hover:bg-[var(--ds-surface-hover)]"
              onClick={() => addSkill(option.name)}
            >
              {option.name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {selected.map((skill) => (
          <span key={skill} className={chipClass}>
            {skill}
            <button
              type="button"
              className="text-[var(--ds-text-secondary)] hover:text-[var(--ds-text)]"
              aria-label={`Remove ${skill}`}
              onClick={() => onChange(selected.filter((entry) => entry.toLowerCase() !== skill.toLowerCase()))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
