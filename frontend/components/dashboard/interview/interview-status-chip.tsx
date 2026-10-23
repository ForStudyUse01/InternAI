"use client";

import { interviewStatusMeta, type InterviewDisplayStatus } from "@/lib/interview-workflow";
import { cn } from "@/lib/utils";

type InterviewStatusChipProps = {
  status: InterviewDisplayStatus;
  className?: string;
};

export function InterviewStatusChip({ status, className }: InterviewStatusChipProps) {
  const meta = interviewStatusMeta(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        meta.className,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dotClassName)} aria-hidden />
      {meta.label}
    </span>
  );
}
