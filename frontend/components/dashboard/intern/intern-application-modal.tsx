"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { SkillChips } from "@/components/dashboard/shared/skill-chips";
import { ExternalLink } from "@/components/ui/external-link";
import { Button } from "@/components/ui/button";
import { AiInsightsModal } from "@/components/dashboard/intern/ai-insights-modal";
import { InternshipListing, applyToInternship, buildAssetUrl } from "@/lib/intern-portal";

type Props = {
  internship: InternshipListing;
  resumePath: string;
  onClose: () => void;
  onSuccess: () => void;
};

function getResumeName(pathValue: string) {
  const parts = String(pathValue || "").split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || "resume";
}

export function InternApplicationModal({ internship, resumePath, onClose, onSuccess }: Props) {
  const [availabilityStatus, setAvailabilityStatus] = useState<"yes" | "no">("yes");
  const [joiningDate, setJoiningDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  const attachedResumeUrl = useMemo(() => buildAssetUrl(resumePath), [resumePath]);
  const attachedResumeName = useMemo(() => getResumeName(resumePath), [resumePath]);
  const requiredSkills = internship.skillsRequired || [];

  useEffect(() => {
    setIsMounted(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  async function submitApplication() {
    try {
      setError(null);
      if (!resumePath) {
        setError("Please upload your resume in profile before applying.");
        return;
      }
      if (availabilityStatus === "no" && !joiningDate) {
        setError("Please select when you can join.");
        return;
      }

      setSubmitting(true);
      await applyToInternship(internship._id, {
        availabilityStatus,
        joiningDate: availabilityStatus === "no" ? joiningDate : null
      });
      onSuccess();
    } catch (err) {
      setError((err as Error).message || "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isMounted) return null;

  return createPortal(
    <>
    <div className="fixed inset-0 z-[1000] bg-slate-950/50" onClick={onClose}>
      <div className="flex h-full w-full items-start justify-center overflow-hidden px-4 pb-6 pt-6 md:pt-8">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="intern-application-modal-title"
          className="pointer-events-auto flex w-full max-w-[900px] flex-col overflow-hidden rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-card)] shadow-[0_24px_60px_rgba(15,23,42,0.2)] "
          style={{ maxHeight: "88vh" }}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="flex items-start justify-between gap-4 border-b border-[var(--ds-border)] px-5 py-4 md:px-6">
            <div className="min-w-0">
              <h3 id="intern-application-modal-title" className="text-xl font-semibold text-[var(--ds-text)]">Apply for Internship</h3>
              <p className="mt-1 truncate text-sm text-[var(--ds-muted)]">
                {internship.role} • {internship.company?.companyName || "Company"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close modal"
              onClick={onClose}
              className="rounded-md border border-[var(--ds-border)] px-2.5 py-1 text-[var(--ds-muted)] transition hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)] active:scale-95"
            >
              ×
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6">
            <div className="space-y-5 text-sm">
              <section className="space-y-3 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-4">
                <p className="text-sm font-semibold text-[var(--ds-text)]">Internship Overview</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="surface-subtle px-3 py-2.5">
                    <p className="text-xs text-[var(--ds-muted)]">Job Title</p>
                    <p className="text-sm font-semibold text-[var(--ds-text)]">{internship.role}</p>
                  </div>
                  <div className="surface-subtle px-3 py-2.5">
                    <p className="text-xs text-[var(--ds-muted)]">Company Name</p>
                    <p className="text-sm font-semibold text-[var(--ds-text)]">{internship.company?.companyName || "Not specified"}</p>
                  </div>
                  <div className="surface-subtle px-3 py-2.5">
                    <p className="text-xs text-[var(--ds-muted)]">Stipend</p>
                    <p className="text-sm font-semibold text-[var(--ds-text)]">{internship.stipend || "Not specified"}</p>
                  </div>
                  <div className="surface-subtle px-3 py-2.5">
                    <p className="text-xs text-[var(--ds-muted)]">Location</p>
                    <p className="text-sm font-semibold text-[var(--ds-text)]">{internship.location || "Not specified"}</p>
                  </div>
                  <div className="surface-subtle px-3 py-2.5">
                    <p className="text-xs text-[var(--ds-muted)]">Work Mode</p>
                    <p className="text-sm font-semibold text-[var(--ds-text)]">{internship.mode || "Not specified"}</p>
                  </div>
                  <div className="surface-subtle px-3 py-2.5">
                    <p className="text-xs text-[var(--ds-muted)]">Duration</p>
                    <p className="text-sm font-semibold text-[var(--ds-text)]">{internship.duration || "Not specified"}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-4">
                <p className="text-sm font-semibold text-[var(--ds-text)]">Job Description</p>
                <p className="mt-2 text-[var(--ds-text-secondary)]">{internship.description || "Not specified"}</p>
              </section>

              <section className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-4">
                <p className="text-sm font-semibold text-[var(--ds-text)]">Roles & Responsibilities</p>
                <p className="mt-2 text-[var(--ds-text-secondary)]">{internship.responsibilities || "No prior experience required"}</p>
              </section>

              <section className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-4">
                <p className="text-sm font-semibold text-[var(--ds-text)]">Required Skills</p>
                <div className="mt-2">
                  <SkillChips skills={requiredSkills} />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  <Link href={`/dashboard/intern/skill-gap?internshipId=${internship._id}`} className="text-link text-sm">
                    Check my skill gap for this role
                  </Link>
                  <Link href={`/dashboard/intern/resume/score?internshipId=${internship._id}`} className="text-link text-sm">
                    Check my ATS score for this role
                  </Link>
                </div>
              </section>

              <section className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-4">
                <p className="text-sm font-semibold text-[var(--ds-text)]">Location & Work Mode</p>
                <p className="mt-2 text-[var(--ds-text-secondary)]">
                  {internship.location || "Not specified"} • {internship.mode || "Not specified"}
                </p>
              </section>

              <section className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-4">
                <p className="text-sm font-semibold text-[var(--ds-text)]">Company Information</p>
                <p className="mt-2 text-[var(--ds-text-secondary)]">{internship.company?.description || "Not specified"}</p>
                <p className="mt-2 text-xs text-[var(--ds-muted)]">
                  {internship.company?.website || "Website not specified"} | {internship.company?.address || "Address not specified"}
                </p>
              </section>

              <section className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-4">
                <p className="text-sm font-semibold text-[var(--ds-text)]">Attached Resume</p>
                {resumePath ? (
                  <p className="mt-2 text-[var(--ds-text-secondary)]">
                    {attachedResumeUrl ? (
                      <ExternalLink href={attachedResumeUrl} className="text-sm">
                        {attachedResumeName}
                      </ExternalLink>
                    ) : (
                      attachedResumeName
                    )}
                  </p>
                ) : (
                  <p className="mt-1.5 text-[var(--ds-danger)]">Please upload your resume in profile before applying.</p>
                )}
                <p className="mt-2 text-xs text-[var(--ds-muted)]">Your resume from your profile will be submitted with this application.</p>
              </section>

              <section className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-4">
                <p className="text-sm font-semibold text-[var(--ds-text)]">Availability</p>
                <p className="mt-2 text-[var(--ds-text-secondary)]">Are you available to join immediately?</p>
                <div className="mt-3 flex flex-wrap gap-5 text-sm text-[var(--ds-text-secondary)]">
                  <label className="inline-flex cursor-pointer items-center gap-2 select-none">
                    <input type="radio" name="availability" checked={availabilityStatus === "yes"} onChange={() => setAvailabilityStatus("yes")} />
                    Yes
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 select-none">
                    <input type="radio" name="availability" checked={availabilityStatus === "no"} onChange={() => setAvailabilityStatus("no")} />
                    No
                  </label>
                </div>

                <div className={`grid transition-all duration-300 ease-out ${availabilityStatus === "no" ? "mt-4 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <label className="text-sm font-medium text-[var(--ds-text)]" htmlFor="joiningDate">
                      Available From
                    </label>
                    <input
                      id="joiningDate"
                      type="date"
                      value={joiningDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(event) => setJoiningDate(event.target.value)}
                      className="mt-1.5 w-full cursor-pointer rounded-lg border border-[var(--ds-border)] bg-[var(--ds-input)] px-3 py-2 text-sm text-[var(--ds-text-secondary)] outline-none transition focus:border-[var(--ds-primary)] focus:ring-2 focus:ring-[var(--ds-focus-ring)]"
                    />
                  </div>
                </div>
              </section>

              {error && <p role="alert" className="text-sm text-[var(--ds-danger)]">{error}</p>}
            </div>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-[var(--ds-border)] bg-[var(--ds-card)] px-5 py-4 md:px-6 ">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting} className="transition hover:-translate-y-0.5 active:translate-y-0">
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowInsights(true)}
                className="gap-2 transition hover:-translate-y-0.5 active:translate-y-0"
              >
                <AppIcon icon={Sparkles} size="sm" className="text-current" />
                AI Insights
              </Button>
              <Button type="button" onClick={submitApplication} disabled={submitting} className="transition hover:-translate-y-0.5 active:translate-y-0">
                {submitting ? "Applying..." : "Apply Now"}
              </Button>
            </div>
          </footer>
        </div>
      </div>
    </div>
    <AiInsightsModal
      open={showInsights}
      internshipId={internship._id}
      role={internship.role}
      companyName={internship.company?.companyName}
      onClose={() => setShowInsights(false)}
    />
    </>,
    document.body
  );
}
