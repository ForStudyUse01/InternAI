import { cn } from "@/lib/utils";

const PIPELINE_STEPS = [
  { key: "applied", label: "Applied" },
  { key: "under_review", label: "Under Review" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview_scheduled", label: "Interview" },
  { key: "technical_round", label: "Technical" },
  { key: "hr_round", label: "HR Round" },
  { key: "selected", label: "Selected" }
] as const;

function normalizeStatus(status: string) {
  const value = String(status || "").toLowerCase();
  if (value === "screening" || value === "reviewed") return "under_review";
  if (value === "interview" || value === "interview_completed") return "interview_scheduled";
  if (value === "offered") return "selected";
  return value;
}

type ApplicationPipelineStepperProps = {
  status: string;
  compact?: boolean;
};

export function ApplicationPipelineStepper({ status, compact = false }: ApplicationPipelineStepperProps) {
  const normalized = normalizeStatus(status);
  const isRejected = normalized === "rejected" || normalized === "withdrawn";
  const activeIdx = PIPELINE_STEPS.findIndex((step) => step.key === normalized);
  const resolvedIdx = activeIdx >= 0 ? activeIdx : 0;

  if (isRejected) {
    return (
      <div className="rounded-lg border border-[var(--ds-danger)] bg-[var(--ds-danger-bg)] px-3 py-2 text-center text-xs font-semibold text-[var(--ds-danger)]">
        {normalized === "withdrawn" ? "Application Withdrawn" : "Application Rejected"}
      </div>
    );
  }

  // "on_hold" has no PIPELINE_STEPS entry (it's a pause, not a stage), and
  // this component only receives the current status -- not stageHistory --
  // so there's no reliable prior stage to resume the grid at. Showing a
  // banner (like the rejected/withdrawn cases above) avoids the alternative
  // of silently resetting the visible progress to just "Applied".
  if (normalized === "on_hold") {
    return (
      <div className="rounded-lg border border-[var(--ds-warning)] bg-[var(--ds-warning-bg)] px-3 py-2 text-center text-xs font-semibold text-[var(--ds-warning)]">
        Application On Hold
      </div>
    );
  }

  return (
    <div role="list" aria-label="Application pipeline progress" className={cn("grid gap-2", compact ? "grid-cols-4 sm:grid-cols-7" : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-7")}>
      {PIPELINE_STEPS.map((step, idx) => {
        const done = idx <= resolvedIdx;
        const isCurrent = idx === resolvedIdx;
        return (
          <div
            key={step.key}
            role="listitem"
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "rounded-lg border px-2 py-2 text-center text-[11px] font-medium leading-tight",
              done
                ? "border-[var(--ds-success)] bg-[var(--ds-success-bg)] text-[var(--ds-success)]"
                : "border-[var(--ds-border)] bg-[var(--ds-card)] text-[var(--ds-muted)]"
            )}
          >
            {step.label}
            <span className="sr-only">{done ? " (completed)" : ""}</span>
          </div>
        );
      })}
    </div>
  );
}
