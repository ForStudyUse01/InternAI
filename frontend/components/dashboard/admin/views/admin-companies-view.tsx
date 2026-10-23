"use client";

import type { AdminCompany } from "@/lib/admin-portal";
import { fetchAdminCompanies, updateCompanyVerification } from "@/lib/admin-portal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { StatusBadge } from "@/components/icons/status-badge";
import { ReportDownloadButton } from "@/components/reports/report-download-button";
import { DocumentLinks, LoadingRows, formatDate } from "@/components/dashboard/admin/admin-dashboard-shared";
import type { AdminDashboardView } from "@/components/dashboard/admin/admin-dashboard-page";

type AdminCompaniesViewProps = {
  view: AdminDashboardView;
  companySearch: string;
  setCompanySearch: (value: string) => void;
  setCompanyPage: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
  debouncedCompanySearch: string;
  visibleCompanies: AdminCompany[];
  pagedCompanies: AdminCompany[];
  companyPage: number;
  companyTotalPages: number;
  canVerifyCompanies: boolean;
  busyId: string | null;
  setBusyId: React.Dispatch<React.SetStateAction<string | null>>;
  setCompanies: React.Dispatch<React.SetStateAction<AdminCompany[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  rejectingId: string | null;
  setRejectingId: React.Dispatch<React.SetStateAction<string | null>>;
  rejectReason: string;
  setRejectReason: React.Dispatch<React.SetStateAction<string>>;
  handleVerify: (company: AdminCompany, status: "verified" | "rejected" | "suspended" | "pending", reason?: string) => void;
  onSuspend: (company: AdminCompany) => void;
  onUnverify: (company: AdminCompany) => void;
  loadData: (force?: boolean) => void;
};

export function AdminCompaniesView({
  view,
  companySearch,
  setCompanySearch,
  setCompanyPage,
  loading,
  debouncedCompanySearch,
  visibleCompanies,
  pagedCompanies,
  companyPage,
  companyTotalPages,
  canVerifyCompanies,
  busyId,
  setBusyId,
  setCompanies,
  setError,
  rejectingId,
  setRejectingId,
  rejectReason,
  setRejectReason,
  handleVerify,
  onSuspend,
  onUnverify,
  loadData
}: AdminCompaniesViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <SearchInput
          value={companySearch}
          onValueChange={(next) => {
            setCompanySearch(next);
            setCompanyPage(1);
          }}
          loading={loading && Boolean(debouncedCompanySearch)}
          placeholder="Search companies..."
          containerClassName="min-w-[220px] flex-1"
        />
        <Button size="sm" variant="secondary" onClick={() => loadData(true)}>
          Search
        </Button>
      </div>
      {loading ? (
        <LoadingRows />
      ) : visibleCompanies.length === 0 ? (
        <EmptyState
          title={
            companySearch
              ? "No companies match your search"
              : view === "verification"
                ? "No pending companies"
                : "No companies registered"
          }
          hint={
            companySearch
              ? "Try a different company name."
              : view === "verification"
                ? "All companies have been reviewed."
                : undefined
          }
          presetKey="companies"
          action={
            companySearch ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setCompanySearch("");
                  setCompanyPage(1);
                }}
              >
                Clear Search
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {pagedCompanies.map((company) => (
            <Card key={company._id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-base font-bold text-[var(--ds-text)]">{company.companyName}</h3>
                    <StatusBadge status={company.verificationStatus} />
                  </div>
                  <p className="mt-1 text-sm text-[var(--ds-muted)]">{company.companyEmail}</p>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--ds-muted)]">
                    {company.gst && <span>GSTIN: {company.gst}</span>}
                    {company.contactName && <span>Contact: {company.contactName}</span>}
                    {company.phone && <span>Phone: {company.phone}</span>}
                    <span>Registered: {formatDate(company.createdAt)}</span>
                  </div>
                  {company.verificationStatus === "rejected" && company.rejectionReason && (
                    <p className="mt-2 text-xs text-[var(--ds-danger)]">Reason: {company.rejectionReason}</p>
                  )}
                  {company.description && (
                    <p className="mt-2 text-xs text-[var(--ds-text-secondary)]">{company.description}</p>
                  )}
                  <DocumentLinks company={company} />
                </div>

                {canVerifyCompanies && (
                  <div className="flex flex-col items-stretch gap-2">
                    <ReportDownloadButton
                      reportKey="verification"
                      companyId={company._id}
                      label="Verification PDF"
                      size="sm"
                    />
                    {company.verificationStatus !== "verified" && (
                      <Button
                        size="sm"
                        disabled={busyId === company._id}
                        onClick={() => {
                          setBusyId(company._id);
                          updateCompanyVerification(company._id, "verified", "", true)
                            .then(() => fetchAdminCompanies({ status: view === "verification" ? "pending" : undefined, q: companySearch, force: true }))
                            .then((next) => setCompanies(next))
                            .catch((err) => setError((err as Error).message || "Action failed"))
                            .finally(() => setBusyId(null));
                        }}
                      >
                        {busyId === company._id ? "Saving…" : "Verify"}
                      </Button>
                    )}
                    {company.verificationStatus === "verified" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === company._id}
                        onClick={() => onUnverify(company)}
                      >
                        Unverify
                      </Button>
                    )}
                    {company.verificationStatus !== "rejected" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === company._id}
                        onClick={() => {
                          setRejectingId(rejectingId === company._id ? null : company._id);
                          setRejectReason("");
                        }}
                      >
                        Reject
                      </Button>
                    )}
                    {company.verificationStatus !== "suspended" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === company._id}
                        onClick={() => onSuspend(company)}
                      >
                        Suspend
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {canVerifyCompanies && rejectingId === company._id && (
                <div className="mt-4 rounded-xl border border-[var(--ds-border)] p-3">
                  <label htmlFor="admin-company-reject-reason" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ds-muted)]">Rejection reason</label>
                  <textarea
                    id="admin-company-reject-reason"
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-[var(--ds-border)] bg-[var(--ds-input)] px-3 py-2 text-sm text-[var(--ds-text)] outline-none focus:border-[var(--ds-primary)]"
                    placeholder="Explain why this company is being rejected…"
                  />
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      disabled={busyId === company._id}
                      onClick={() => handleVerify(company, "rejected", rejectReason)}
                    >
                      Confirm Rejection
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-[var(--ds-muted)]">
            <span>
              Page {companyPage} of {companyTotalPages} · {visibleCompanies.length} compan{visibleCompanies.length === 1 ? "y" : "ies"}
            </span>
            <Pagination page={companyPage} totalPages={companyTotalPages} onChange={(p) => setCompanyPage(p)} />
          </div>
        </>
      )}
    </div>
  );
}
