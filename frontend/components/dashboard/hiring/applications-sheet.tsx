"use client";

import { useEffect, useMemo } from "react";
import { Users } from "lucide-react";
import type { CompanyApplication } from "@/lib/company-portal";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/lib/use-pagination";
import { normalizeToPipelineStage, PIPELINE_STAGE_TONE, type HiringPipelineStageKey } from "./hiring-utils";
import { CandidateCompareToggle } from "@/components/dashboard/company/candidate-compare-toggle";

const PAGE_SIZE = 12;

type ApplicationsSheetProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  applications: CompanyApplication[];
  filterStage?: HiringPipelineStageKey | null;
  onClose: () => void;
  onViewProfile: (applicationId: string) => void;
};

export function ApplicationsSheet({
  open,
  title,
  subtitle,
  applications,
  filterStage = null,
  onClose,
  onViewProfile
}: ApplicationsSheetProps) {
  const filtered = useMemo(() => {
    if (!filterStage) return applications;
    return applications.filter((application) => normalizeToPipelineStage(application.status) === filterStage);
  }, [applications, filterStage]);

  const { setPage, totalPages, safePage, pageItems: visible } = usePagination(filtered, PAGE_SIZE);

  useEffect(() => {
    if (open) setPage(0);
  }, [open, title, filterStage]);

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} icon={Users} size="lg" variant="drawer">
      {filtered.length === 0 ? (
        <p className="ds-caption py-8 text-center">No applications in this view.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((application) => {
            const stage = normalizeToPipelineStage(application.status);
            return (
              <div
                key={application._id}
                className="company-dashboard-item-card flex flex-col gap-3 !p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--ds-text)]">
                    {application.intern?.fullName || "Candidate"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-xs text-[var(--ds-muted)]">{application.internship?.role || "Role"}</p>
                    <Badge tone={PIPELINE_STAGE_TONE[stage] || "neutral"} className="capitalize">
                      {stage.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <CandidateCompareToggle applicationId={application._id} />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      onViewProfile(application._id);
                      onClose();
                    }}
                  >
                    View Profile
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between border-t border-[var(--ds-border)] pt-4">
          <p className="ds-caption">
            Page {safePage + 1} of {totalPages}
          </p>
          <Pagination page={safePage + 1} totalPages={totalPages} onChange={(next) => setPage(next - 1)} />
        </div>
      )}
    </Modal>
  );
}
