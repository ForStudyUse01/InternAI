"use client";

import { useMemo } from "react";
import { Briefcase } from "lucide-react";
import type { CompanyApplication, CompanyInternship } from "@/lib/company-portal";
import { usePagination } from "@/lib/use-pagination";
import {
  CompanyDashboardEmptyState,
  CompanyDashboardItemCard,
  CompanyDashboardSection,
  companyDashboardStyles
} from "@/components/dashboard/company/company-dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { countApplicationsForJob, getActiveInternships } from "./hiring-utils";

const PAGE_SIZE = 6;

type RecruiterOption = {
  _id: string;
  email: string;
  companyAccountType: "hr" | "ceo";
};

type ActiveJobsPanelProps = {
  internships: CompanyInternship[];
  applications: CompanyApplication[];
  onViewApplications: (internshipId: string, role: string) => void;
  canAssign?: boolean;
  canDelete?: boolean;
  saving?: boolean;
  recruiters?: RecruiterOption[];
  selectedRecruiterByInternship?: Record<string, string>;
  onRecruiterChange?: (internshipId: string, recruiterId: string) => void;
  onAssignRecruiter?: (internshipId: string) => void;
  onDeleteInternship?: (internshipId: string) => void;
};

function fmtDate(value?: string) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString();
}

export function ActiveJobsPanel({
  internships,
  applications,
  onViewApplications,
  canAssign = false,
  canDelete = false,
  saving = false,
  recruiters = [],
  selectedRecruiterByInternship = {},
  onRecruiterChange,
  onAssignRecruiter,
  onDeleteInternship
}: ActiveJobsPanelProps) {
  const activeJobs = useMemo(() => getActiveInternships(internships), [internships]);
  const { setPage, totalPages, safePage, pageItems: visibleJobs } = usePagination(activeJobs, PAGE_SIZE);

  return (
    <CompanyDashboardSection
      id="hiring-active-jobs"
      icon={Briefcase}
      title="Active Job Postings"
      description="What roles am I hiring for?"
    >
      {activeJobs.length === 0 ? (
        <CompanyDashboardEmptyState
          title="No active job postings yet"
          description="Publish an internship to start receiving applications."
        />
      ) : (
        <div className={companyDashboardStyles.listStack}>
          {visibleJobs.map((job) => {
            const applicantCount = countApplicationsForJob(applications, job._id);
            return (
              <CompanyDashboardItemCard key={job._id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="ds-h3">{job.role}</h3>
                      <Badge tone="success" dot>
                        Active
                      </Badge>
                    </div>
                    <p className="ds-caption">
                      {applicantCount} application{applicantCount === 1 ? "" : "s"}
                      <span className="mx-1.5 opacity-40">·</span>
                      {job.location || "Location flexible"}
                      {job.mode ? (
                        <>
                          <span className="mx-1.5 opacity-40">·</span>
                          {job.mode}
                        </>
                      ) : null}
                    </p>
                    <p className="ds-caption opacity-80">Posted: {fmtDate(job.createdAt)}</p>
                  </div>

                  <div className={companyDashboardStyles.actionsRow}>
                    {canAssign && recruiters.length > 0 && onRecruiterChange && onAssignRecruiter ? (
                      <>
                        <Select
                          aria-label={`Assign recruiter to ${job.role}`}
                          wrapperClassName="min-w-[10rem]"
                          className="h-9 text-sm"
                          value={selectedRecruiterByInternship[job._id] || ""}
                          onChange={(event) => onRecruiterChange(job._id, event.target.value)}
                        >
                          <option value="">Assign recruiter</option>
                          {recruiters.map((recruiter) => (
                            <option key={recruiter._id} value={recruiter._id}>
                              {recruiter.email} ({recruiter.companyAccountType})
                            </option>
                          ))}
                        </Select>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={saving || !selectedRecruiterByInternship[job._id]}
                          onClick={() => onAssignRecruiter(job._id)}
                        >
                          Assign
                        </Button>
                      </>
                    ) : null}
                    <Button type="button" size="sm" variant="secondary" onClick={() => onViewApplications(job._id, job.role)}>
                      View Applications
                    </Button>
                    {canDelete && onDeleteInternship ? (
                      <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => onDeleteInternship(job._id)}>
                        Delete Internship
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CompanyDashboardItemCard>
            );
          })}

          {totalPages > 1 && (
            <div className={companyDashboardStyles.paginationRow}>
              <p className="ds-caption">
                Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, activeJobs.length)} of {activeJobs.length}
              </p>
              <Pagination page={safePage + 1} totalPages={totalPages} onChange={(next) => setPage(next - 1)} />
            </div>
          )}
        </div>
      )}
    </CompanyDashboardSection>
  );
}
