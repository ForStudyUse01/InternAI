"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionPanel } from "@/components/dashboard/shared/section-panel";
import { DashboardPageHeader } from "@/components/dashboard/shared/dashboard-page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { reportCompany, fetchInternApplications, type Application } from "@/lib/intern-portal";

type CompanyOption = { companyId: string; internshipId: string; companyName: string; role: string };

export default function SupportPage() {
  const { pushToast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [companyId, setCompanyId] = useState("");
  const [reportType, setReportType] = useState("fake_internship");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ companyId?: string; reason?: string }>({});

  useEffect(() => {
    let cancelled = false;
    fetchInternApplications()
      .then((apps) => {
        if (!cancelled) setApplications(apps);
      })
      .catch(() => {
        if (!cancelled) pushToast({ variant: "error", title: "Couldn't load your applications", message: "Reason field only — company selection is unavailable right now." });
      })
      .finally(() => {
        if (!cancelled) setLoadingApplications(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const companyOptions = useMemo<CompanyOption[]>(() => {
    const seen = new Map<string, CompanyOption>();
    for (const app of applications) {
      const id = app.companyId || "";
      if (!id || seen.has(id)) continue;
      seen.set(id, {
        companyId: id,
        internshipId: app.internshipId || app.internship?._id || "",
        companyName: app.internship?.company?.companyName || "Unknown company",
        role: app.internship?.role || "Internship"
      });
    }
    return Array.from(seen.values());
  }, [applications]);

  const selectedInternshipId = companyOptions.find((option) => option.companyId === companyId)?.internshipId;

  async function submitReport() {
    const errors: { companyId?: string; reason?: string } = {};
    if (!companyId) errors.companyId = "Select the company you're reporting.";
    if (!reason.trim()) errors.reason = "Tell us what happened.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setSubmitting(true);
      await reportCompany({
        companyId,
        reason: reason.trim(),
        details: details.trim(),
        reportType,
        internshipId: selectedInternshipId || undefined,
        evidenceUrls: evidenceUrls
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      });
      pushToast({ variant: "success", title: "Report submitted", message: "Admin will review your report." });
      setCompanyId("");
      setReason("");
      setDetails("");
      setEvidenceUrls("");
      setFieldErrors({});
    } catch (err) {
      pushToast({ variant: "error", title: "Report failed", message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dashboard-stack">
      <DashboardPageHeader eyebrow="Support" title="Help / Support" subtitle="Report suspicious companies or internships with evidence." />

      <SectionPanel title="Report a Company" subtitle="Submit scam, fake internship, or abusive HR reports for admin review.">
        <div className="form-grid">
          <label className="block w-full">
            <span className="ds-input-label">Company</span>
            <Select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={loadingApplications || companyOptions.length === 0}
            >
              <option value="">
                {loadingApplications ? "Loading your applications..." : companyOptions.length === 0 ? "No applications yet" : "Select a company"}
              </option>
              {companyOptions.map((option) => (
                <option key={option.companyId} value={option.companyId}>
                  {option.companyName} — {option.role}
                </option>
              ))}
            </Select>
            {fieldErrors.companyId && <span className="ds-input-error">{fieldErrors.companyId}</span>}
            {!loadingApplications && companyOptions.length === 0 && (
              <span className="ds-input-error">Apply to an internship first — you can only report companies you&apos;ve applied to.</span>
            )}
          </label>
          <label className="block w-full">
            <span className="ds-input-label">Report Type</span>
            <Select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="fake_internship">Fake Internship</option>
              <option value="scam_company">Scam Company</option>
              <option value="abusive_hr">Abusive HR</option>
              <option value="inappropriate_behavior">Inappropriate Behavior</option>
              <option value="other">Other</option>
            </Select>
          </label>
          <Input
            label="Reason"
            className="sm:col-span-2"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={fieldErrors.reason}
          />
        </div>
        <div className="mt-4">
          <Textarea label="Details" value={details} onChange={(e) => setDetails(e.target.value)} rows={3} />
        </div>
        <div className="mt-4">
          <Input
            label="Evidence URLs (comma separated)"
            value={evidenceUrls}
            onChange={(e) => setEvidenceUrls(e.target.value)}
            placeholder="https://..., https://..."
          />
        </div>
        <div className="mt-4">
          <Button type="button" size="sm" onClick={submitReport} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </SectionPanel>

      <SectionPanel title="Help Resources" subtitle="Quick guidance for common issues.">
        <ul className="space-y-2 text-sm text-[var(--ds-text-secondary)]">
          <li className="surface-subtle px-3 py-2">Upload your latest resume before applying or requesting recommendations.</li>
          <li className="surface-subtle px-3 py-2">Check notifications for interview schedules and recruiter feedback.</li>
          <li className="surface-subtle px-3 py-2">Use Track Progress to monitor your application pipeline stages.</li>
        </ul>
      </SectionPanel>
    </div>
  );
}
