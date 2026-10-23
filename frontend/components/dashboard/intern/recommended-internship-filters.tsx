"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { RecommendationFilterOptions, RecommendedInternshipFilters } from "@/lib/recommendation-filters";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { AppIcon } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";

type RecommendedInternshipFiltersProps = {
  filters: RecommendedInternshipFilters;
  options: RecommendationFilterOptions;
  activeCount: number;
  resultCount: number;
  totalCount: number;
  onChange: (patch: Partial<RecommendedInternshipFilters>) => void;
  onReset: () => void;
  className?: string;
};

const MODE_OPTIONS = ["remote", "hybrid", "on-site"] as const;

const MODE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  "on-site": "On-site"
};

function FilterSelect({
  label,
  value,
  onChange,
  children
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ds-muted)]">
        {label}
      </span>
      <select
        className="surface-subtle w-full px-3 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

export function RecommendedInternshipFiltersPanel({
  filters,
  options,
  activeCount,
  resultCount,
  totalCount,
  onChange,
  onReset,
  className
}: RecommendedInternshipFiltersProps) {
  return (
    <div className={cn("space-y-4 rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AppIcon icon={SlidersHorizontal} size="sm" className="text-[var(--ds-primary-text)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--ds-text)]">Filter Recommendations</p>
            <p className="text-xs text-[var(--ds-muted)]">
              Showing {resultCount} of {totalCount}
              {activeCount > 0 ? ` · ${activeCount} filter${activeCount === 1 ? "" : "s"} active` : ""}
            </p>
          </div>
        </div>
        {activeCount > 0 ? (
          <Button type="button" size="sm" variant="secondary" onClick={onReset}>
            <AppIcon icon={X} size="xs" className="text-current" />
            Clear all
          </Button>
        ) : null}
      </div>

      <SearchInput
        value={filters.query}
        onValueChange={(query) => onChange({ query })}
        placeholder="Search role, company, skill, or description"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="block space-y-1 sm:col-span-2 xl:col-span-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ds-muted)]">
            Location
          </span>
          <input
            list="recommended-location-options"
            value={filters.location}
            onChange={(event) => onChange({ location: event.target.value })}
            placeholder="Filter by location"
            className="surface-subtle w-full px-3 py-2 text-sm"
          />
          <datalist id="recommended-location-options">
            {options.locations.map((location) => (
              <option key={location} value={location} />
            ))}
          </datalist>
        </label>

        <FilterSelect label="Work mode" value={filters.mode} onChange={(mode) => onChange({ mode })}>
          <option value="">All modes</option>
          {(options.modes.length > 0 ? options.modes : MODE_OPTIONS).map((mode) => (
            <option key={mode} value={mode}>
              {MODE_LABELS[mode] || mode}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Internship type"
          value={filters.internshipType}
          onChange={(internshipType) => onChange({ internshipType })}
        >
          <option value="">All types</option>
          {options.internshipTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Duration" value={filters.duration} onChange={(duration) => onChange({ duration })}>
          <option value="">All durations</option>
          {options.durations.map((duration) => (
            <option key={duration} value={duration}>
              {duration}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Company" value={filters.company} onChange={(company) => onChange({ company })}>
          <option value="">All companies</option>
          {options.companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Domain" value={filters.domain} onChange={(domain) => onChange({ domain })}>
          <option value="">All domains</option>
          {options.domains.map((domain) => (
            <option key={domain} value={domain}>
              {domain}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Skill" value={filters.skill} onChange={(skill) => onChange({ skill })}>
          <option value="">All skills</option>
          {options.skills.map((skill) => (
            <option key={skill} value={skill}>
              {skill}
            </option>
          ))}
        </FilterSelect>

        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ds-muted)]">
            Min stipend (₹)
          </span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={filters.minStipend}
            onChange={(event) => onChange({ minStipend: event.target.value })}
            placeholder="e.g. 15000"
            className="surface-subtle w-full px-3 py-2 text-sm"
          />
        </label>
      </div>
    </div>
  );
}
