"use client";

import { useCallback, useEffect, useState } from "react";
import { Award, CheckCircle2, Download, Eye, XCircle } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Table, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { formatDate } from "@/components/dashboard/admin/admin-dashboard-shared";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
  CERTIFICATION_STATUS_STYLES,
  CertificationRecord,
  certificationStatusLabel,
  fetchAdminCertificateBlob,
  fetchAdminCertifications,
  reviewAdminCertification
} from "@/lib/certifications-portal";
import { SkeletonTable } from "@/components/ui/skeleton";

export function AdminCertificationReview() {
  const [items, setItems] = useState<CertificationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"pending_verification" | "verified" | "rejected" | "">(
    "pending_verification"
  );
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState("");

  const [reviewTarget, setReviewTarget] = useState<CertificationRecord | null>(null);
  const [remarksText, setRemarksText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminCertifications({
        status: statusFilter || undefined,
        q: debouncedSearch || undefined,
        page,
        limit: 10
      });
      setItems(data.certifications);
      setTotal(data.total);
      setTotalPages(Math.max(1, data.totalPages));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load certification queue");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function openReview(item: CertificationRecord) {
    setReviewTarget(item);
    setRemarksText("");
    setError("");
  }

  function closeReview() {
    if (submitting) return;
    setReviewTarget(null);
    setRemarksText("");
  }

  async function submitReview(status: "verified" | "rejected") {
    if (!reviewTarget) return;
    if (status === "rejected" && !remarksText.trim()) {
      setError("Rejection reason is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (status === "rejected") {
        await reviewAdminCertification(reviewTarget._id, { status: "rejected", rejectionReason: remarksText.trim() });
      } else {
        await reviewAdminCertification(reviewTarget._id, { status: "verified", reviewNotes: remarksText.trim() });
      }
      setReviewTarget(null);
      setRemarksText("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function preview(item: CertificationRecord) {
    try {
      const blob = await fetchAdminCertificateBlob(item._id, false);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewMimeType(item.certificateFile?.mimeType || blob.type);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not preview certificate");
    }
  }

  async function download(item: CertificationRecord) {
    try {
      const blob = await fetchAdminCertificateBlob(item._id, true);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = item.certificateFile?.originalName || `${item.courseName}-certificate`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download certificate");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onValueChange={(next) => {
            setSearch(next);
            setPage(1);
          }}
          loading={loading && Boolean(debouncedSearch)}
          placeholder="Search by course, provider, or category..."
          containerClassName="min-w-[240px] flex-1"
        />
        <Select
          aria-label="Filter certification status"
          wrapperClassName="min-w-[200px]"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as typeof statusFilter);
            setPage(1);
          }}
        >
          <option value="pending_verification">Pending Verification</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </Select>
        <Button type="button" variant="secondary" onClick={() => load()}>
          Refresh
        </Button>
      </div>

      {error ? <Alert type="error" message={error} /> : null}

      {loading ? (
        <SkeletonTable rows={5} columns={7} />
      ) : items.length === 0 ? (
        <EmptyState
          title={debouncedSearch ? "No certifications match your search" : "No certifications in this queue"}
          hint={debouncedSearch ? "Try a different search term." : "New submissions will appear here for review."}
          icon={Award}
        />
      ) : (
        <>
          <Table className="min-w-[900px]">
            <TableHead>
              <TableCell as="th">Student</TableCell>
              <TableCell as="th">Certification</TableCell>
              <TableCell as="th">Provider</TableCell>
              <TableCell as="th">Issued</TableCell>
              <TableCell as="th">Expires</TableCell>
              <TableCell as="th">Uploaded</TableCell>
              <TableCell as="th">Status</TableCell>
              <TableCell as="th">Actions</TableCell>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>
                    <p className="font-medium text-[var(--ds-text)]">{item.internName || "Intern"}</p>
                    <p className="text-xs text-[var(--ds-muted)]">{item.userEmail || "—"}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-[var(--ds-text)]">{item.courseName}</p>
                    <p className="text-xs text-[var(--ds-muted)]">{item.skillCategory}</p>
                  </TableCell>
                  <TableCell className="text-[var(--ds-text-secondary)]">{item.provider}</TableCell>
                  <TableCell className="text-[var(--ds-text-secondary)]">{formatDate(item.completionDate)}</TableCell>
                  <TableCell className="text-[var(--ds-text-secondary)]">
                    {item.expiryDate ? formatDate(item.expiryDate) : "—"}
                  </TableCell>
                  <TableCell className="text-[var(--ds-text-secondary)]">{formatDate(item.uploadTimestamp)}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-block rounded-md border px-2 py-0.5 text-xs font-semibold ${CERTIFICATION_STATUS_STYLES[item.verificationStatus]}`}
                    >
                      {certificationStatusLabel(item.verificationStatus)}
                    </span>
                    {item.verificationStatus === "rejected" && item.rejectionReason ? (
                      <p className="mt-1 max-w-[220px] text-xs text-[var(--ds-danger)]">{item.rejectionReason}</p>
                    ) : null}
                    {item.verificationStatus === "verified" && item.reviewNotes ? (
                      <p className="mt-1 max-w-[220px] text-xs text-[var(--ds-muted)]">{item.reviewNotes}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => preview(item)}
                        aria-label={`Preview ${item.courseName}`}
                      >
                        <AppIcon icon={Eye} size="xs" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => download(item)}
                        aria-label={`Download ${item.courseName}`}
                      >
                        <AppIcon icon={Download} size="xs" />
                      </Button>
                      {item.verificationStatus === "pending_verification" ? (
                        <Button type="button" size="sm" onClick={() => openReview(item)}>
                          Review
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-[var(--ds-muted)]">
            <span>
              Page {page} of {totalPages} · {items.length} of {total} certifications
            </span>
            <Pagination page={page} totalPages={totalPages} onChange={(p) => setPage(p)} />
          </div>
        </>
      )}

      <Modal
        open={previewUrl !== null}
        onClose={() => {
          setPreviewUrl(null);
          setPreviewMimeType("");
        }}
        title="Certificate Preview"
        size="xl"
        bodyClassName={previewMimeType.includes("pdf") || previewMimeType.includes("image") ? "!p-0" : undefined}
      >
        {previewUrl ? (
          previewMimeType.includes("pdf") ? (
            <iframe title="Admin certificate preview" src={previewUrl} className="h-[75vh] w-full" />
          ) : previewMimeType.includes("image") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Certificate preview" className="max-h-[75vh] w-full object-contain" />
          ) : (
            <p className="px-2 py-10 text-center text-sm text-[var(--ds-text-secondary)]">
              Preview not available for this file type. Use Download instead.
            </p>
          )
        ) : null}
      </Modal>

      <Modal
        open={reviewTarget !== null}
        onClose={closeReview}
        title="Review Certification"
        subtitle={reviewTarget?.courseName}
        size="md"
        footer={
          <>
            <Button type="button" size="sm" variant="secondary" onClick={closeReview} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => submitReview("rejected")} disabled={submitting}>
              <AppIcon icon={XCircle} size="xs" /> Reject
            </Button>
            <Button type="button" size="sm" onClick={() => submitReview("verified")} disabled={submitting}>
              <AppIcon icon={CheckCircle2} size="xs" /> Approve
            </Button>
          </>
        }
      >
        {reviewTarget ? (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-[var(--ds-muted)]">Student</dt>
                <dd className="font-medium text-[var(--ds-text)]">{reviewTarget.internName || "Intern"}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--ds-muted)]">Provider</dt>
                <dd className="font-medium text-[var(--ds-text)]">{reviewTarget.provider}</dd>
              </div>
            </dl>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-[var(--ds-text-secondary)]">Remarks / Rejection Reason</span>
              <textarea
                className="ds-input min-h-[88px] w-full"
                placeholder="Required if rejecting. Optional note if approving."
                aria-label="Review remarks"
                value={remarksText}
                onChange={(e) => setRemarksText(e.target.value)}
              />
            </label>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
