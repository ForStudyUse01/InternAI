"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GitCompare, X } from "lucide-react";
import type { CompanyApplication } from "@/lib/company-portal";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/icons/app-icon";
import { MAX_COMPARE_CANDIDATES, useCandidateCompare } from "./candidate-comparison-context";
import { initialsFirstLast as initialsFor } from "@/components/dashboard/shared/avatar-initials";

const subscribeNoop = () => () => undefined;

type CandidateCompareBarProps = {
  applications: CompanyApplication[];
};

export function CandidateCompareBar({ applications }: CandidateCompareBarProps) {
  const { selectedIds, remove, clear, openWorkspace, workspaceOpen } = useCandidateCompare();
  const reducedMotion = useReducedMotion();
  // false on the server and during hydration, true on the client; avoids a portal hydration mismatch.
  const canPortal = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const selected = selectedIds
    .map((id) => applications.find((application) => application._id === id))
    .filter((application): application is CompanyApplication => Boolean(application));

  if (!canPortal) return null;

  // Portal to <body>: <main> is its own stacking context (z-10), so an in-tree tray can never rise above
  // the z-[90] modals (applications sheet) where candidates are picked.
  return createPortal(
    <AnimatePresence>
      {selected.length > 0 && !workspaceOpen ? (
        <motion.div
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: reducedMotion ? 0.12 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-4 z-[95] mx-auto flex w-[min(94vw,640px)] flex-wrap items-center gap-3 rounded-2xl border border-[var(--ds-border-strong)] bg-[var(--ds-surface-raised)] px-4 py-3 shadow-2xl backdrop-blur-md sm:flex-nowrap"
          role="region"
          aria-label="Candidate comparison tray"
          aria-live="polite"
        >
          <div className="flex -space-x-2">
            {selected.map((application) => {
              const name = application.intern?.fullName || "Candidate";
              return (
                <span
                  key={application._id}
                  className="group relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--ds-gradient-from)] to-[var(--ds-gradient-to)] text-[11px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)] ring-2 ring-[var(--ds-surface-raised)]"
                  title={name}
                >
                  {initialsFor(name)}
                  <button
                    type="button"
                    onClick={() => remove(application._id)}
                    aria-label={`Remove ${name} from comparison`}
                    className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-[var(--ds-danger)] text-[var(--ds-on-danger)] group-hover:flex group-focus-within:flex focus:flex"
                  >
                    <AppIcon icon={X} size="xs" className="text-current" />
                  </button>
                </span>
              );
            })}
          </div>

          <p className="ds-caption min-w-0 flex-1 truncate">
            {selected.length} of {MAX_COMPARE_CANDIDATES} candidates selected
          </p>

          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={clear}>
              Clear
            </Button>
            <Button type="button" size="sm" disabled={selected.length < 2} onClick={openWorkspace}>
              <AppIcon icon={GitCompare} size="xs" />
              Compare
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
