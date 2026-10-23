"use client";

import { useEffect, useState } from "react";
import { fetchActiveInternships, fetchInternApplications, type InternshipListing } from "@/lib/intern-portal";

type Props = {
  value: string;
  onChange: (internshipId: string, internship: InternshipListing | null) => void;
  disabled?: boolean;
};

/** Combines active listings + applied internships into one deduped picker so students can score against a specific real posting instead of a generic role preset. */
export function InternshipPicker({ value, onChange, disabled }: Props) {
  const [options, setOptions] = useState<InternshipListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [active, applications] = await Promise.all([fetchActiveInternships(), fetchInternApplications()]);
        if (cancelled) return;
        const byId = new Map<string, InternshipListing>();
        for (const item of active) {
          if (item?._id) byId.set(item._id, item);
        }
        for (const app of applications) {
          const internship = app.internship;
          if (internship?._id && !byId.has(internship._id)) {
            byId.set(internship._id, {
              _id: internship._id,
              role: internship.role,
              skillsRequired: internship.skillsRequired,
              prioritySkills: internship.prioritySkills,
              description: internship.description,
              responsibilities: internship.responsibilities,
              stipend: internship.stipend,
              mode: internship.mode,
              company: internship.company
            });
          }
        }
        const resolved = [...byId.values()];
        setOptions(resolved);
        // Sync the parent with the resolved internship object for an initial
        // ?internshipId= from the URL, since the parent only has the raw id.
        if (value) {
          const match = resolved.find((o) => o._id === value);
          if (match) onChange(value, match);
        }
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <select
      aria-label="Score against internship"
      className="ds-input ds-select h-10 max-w-xs text-base disabled:opacity-60"
      value={value}
      disabled={disabled || loading}
      onChange={(e) => {
        const id = e.target.value;
        const internship = options.find((o) => o._id === id) || null;
        onChange(id, internship);
      }}
    >
      <option value="">Generic role comparison</option>
      {options.map((opt) => (
        <option key={opt._id} value={opt._id}>
          {opt.role}
          {opt.company?.companyName ? ` — ${opt.company.companyName}` : ""}
        </option>
      ))}
    </select>
  );
}
