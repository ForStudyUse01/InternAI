"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/ui/external-link";
import { extractInterviewRoomIdFromLink } from "@/lib/interview-portal";
import { canJoinInterviewRoom, resolveInterviewDisplayStatus } from "@/lib/interview-workflow";
import { SectionPanel } from "@/components/dashboard/shared/section-panel";
import { shouldBlockPageContent } from "@/lib/instant-load";
import {
  Application,
  fetchInternApplications,
  openApplicationResume,
  peekInternApplications,
  withdrawApplication
} from "@/lib/intern-portal";
import { SkillChips } from "@/components/dashboard/shared/skill-chips";
import { ApplicationPipelineStepper } from "@/components/dashboard/intern/application-pipeline-stepper";
import { DashboardPageHeader } from "@/components/dashboard/shared/dashboard-page-header";
import { useToast } from "@/components/ui/toast";
import { ReportDownloadButton } from "@/components/reports/report-download-button";
import { BrandedEmptyState } from "@/components/dashboard/shared/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/icons/status-badge";
import { BRANDED_EMPTY_STATES } from "@/lib/brand";

const WITHDRAW_BLOCKED = new Set(["selected", "offered", "rejected", "withdrawn"]);

export default function InternApplicationsPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    const cached = peekInternApplications();
    if (cached?.length) {
      setApplications(cached);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function loadApplications() {
      try {
        setError(null);
        const loadedApps = await fetchInternApplications();
        setApplications(loadedApps || []);
      } catch (err) {
        setError((err as Error).message || "Failed to load applications.");
      } finally {
        setLoading(false);
      }
    }

    loadApplications();
  }, []);

  return (
    <>
    <div className="dashboard-stack">
          <DashboardPageHeader
            eyebrow="Internships"
            title="My Applications"
            subtitle="Track pipeline stages, interviews, and recruiter feedback."
            actions={
              <>
                <ReportDownloadButton reportKey="application-history" label="Application History PDF" />
                <Button type="button" size="sm" variant="secondary" onClick={() => router.push("/dashboard/intern/track-progress")}>
                  Timeline View
                </Button>
              </>
            }
          />

          {shouldBlockPageContent(applications) && loading && <SkeletonList rows={3} />}
          {error && <div className="rounded-xl border border-[var(--ds-danger)]/30 bg-[var(--ds-danger-bg)] p-4 text-sm text-[var(--ds-danger)]">{error}</div>}

          {!loading && !error && applications.length === 0 && (
            <BrandedEmptyState preset={BRANDED_EMPTY_STATES.applications} presetKey="applications" />
          )}

          {applications.length > 0 && (
            <div className="space-y-4">
              {applications.map((app) => (
                <SectionPanel
                  key={app._id}
                  title={app.internship?.role || "Internship"}
                  subtitle={`${app.internship?.company?.companyName || "Company"}${app.internship?.location ? ` - ${app.internship.location}` : ""}`}
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="surface-subtle px-3 py-2.5">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--ds-muted)]">Current Status</p>
                      <div className="mt-1">
                        <StatusBadge status={app.status} />
                      </div>
                    </div>
                    <div className="surface-subtle px-3 py-2.5">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--ds-muted)]">Applied On</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--ds-text)]">{app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "-"}</p>
                    </div>
                    <div className="surface-subtle px-3 py-2.5">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--ds-muted)]">Relevance Score</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--ds-text)]">{app.relevanceScore ?? app.matchScore ?? 0}%</p>
                    </div>
                    <div className="surface-subtle px-3 py-2.5">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--ds-muted)]">Work Mode / Location</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--ds-text)]">{app.internship?.location || "Not specified"}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <ApplicationPipelineStepper status={app.status} compact />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => setSelectedApplication(app)}>
                      View Details
                    </Button>
                    {!WITHDRAW_BLOCKED.has(app.status) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          try {
                            await withdrawApplication(app._id);
                            const refreshed = await fetchInternApplications(true);
                            setApplications(refreshed);
                            pushToast({ variant: "success", title: "Application withdrawn" });
                          } catch (err) {
                            pushToast({ variant: "error", title: "Withdraw failed", message: (err as Error).message });
                          }
                        }}
                      >
                        Withdraw
                      </Button>
                    )}
                  </div>
                </SectionPanel>
              ))}
            </div>
          )}
        </div>
        {selectedApplication && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/45 p-4" onClick={() => setSelectedApplication(null)}>
            <div className="mx-auto mt-8 max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-modal)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between border-b border-[var(--ds-border)] px-5 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--ds-text)]">{selectedApplication.internship?.role || "Internship"}</h3>
                  <p className="text-sm text-[var(--ds-text-secondary)]">{selectedApplication.internship?.company?.companyName || "Company"}</p>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => setSelectedApplication(null)}>Close</Button>
              </div>
              <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4 text-sm">
                <section className="surface-subtle p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--ds-muted)]">Job Description</p>
                  <p className="mt-1 text-[var(--ds-text-secondary)]">{selectedApplication.internship?.description || "Not specified"}</p>
                </section>
                <section className="surface-subtle p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--ds-muted)]">Roles & Responsibilities</p>
                  <p className="mt-1 text-[var(--ds-text-secondary)]">{selectedApplication.internship?.responsibilities || "Not specified"}</p>
                </section>
                <section className="surface-subtle p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--ds-muted)]">Required Skills</p>
                  <div className="mt-2">
                    <SkillChips skills={selectedApplication.internship?.skillsRequired || []} />
                  </div>
                </section>
                <section className="grid gap-2 sm:grid-cols-2">
                  <div className="surface-subtle px-3 py-2.5"><p className="text-xs text-[var(--ds-muted)]">Stipend</p><p className="text-sm font-semibold text-[var(--ds-text)]">{selectedApplication.internship?.stipend || "Not specified"}</p></div>
                  <div className="surface-subtle px-3 py-2.5"><p className="text-xs text-[var(--ds-muted)]">Location</p><p className="text-sm font-semibold text-[var(--ds-text)]">{selectedApplication.internship?.location || "Not specified"}</p></div>
                  <div className="surface-subtle px-3 py-2.5"><p className="text-xs text-[var(--ds-muted)]">Work Mode</p><p className="text-sm font-semibold text-[var(--ds-text)]">{selectedApplication.internship?.mode || "Not specified"}</p></div>
                  <div className="surface-subtle px-3 py-2.5"><p className="text-xs text-[var(--ds-muted)]">Applied Date</p><p className="text-sm font-semibold text-[var(--ds-text)]">{selectedApplication.appliedAt ? new Date(selectedApplication.appliedAt).toLocaleDateString() : "-"}</p></div>
                  <div className="surface-subtle px-3 py-2.5"><p className="text-xs text-[var(--ds-muted)]">Availability</p><p className="text-sm font-semibold text-[var(--ds-text)]">{selectedApplication.availabilityStatus === "yes" ? "Available immediately" : selectedApplication.availabilityStatus === "no" ? "Not immediately available" : "-"}</p></div>
                  <div className="surface-subtle px-3 py-2.5"><p className="text-xs text-[var(--ds-muted)]">Available From</p><p className="text-sm font-semibold text-[var(--ds-text)]">{selectedApplication.joiningDate ? new Date(selectedApplication.joiningDate).toLocaleDateString() : "-"}</p></div>
                  <div className="surface-subtle px-3 py-2.5"><p className="text-xs text-[var(--ds-muted)]">Current Status</p><p className="text-sm font-semibold capitalize text-[var(--ds-text)]">{selectedApplication.status.replace(/_/g, " ")}</p></div>
                  <div className="surface-subtle px-3 py-2.5"><p className="text-xs text-[var(--ds-muted)]">Relevance Score</p><p className="text-sm font-semibold text-[var(--ds-text)]">{selectedApplication.relevanceScore ?? selectedApplication.matchScore ?? 0}%</p></div>
                </section>
                <section>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">Pipeline Progress</p>
                  <ApplicationPipelineStepper status={selectedApplication.status} />
                </section>
                {(selectedApplication.hrFeedback || []).length > 0 && (
                  <section className="surface-subtle p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">HR Feedback</p>
                    <ul className="mt-2 space-y-2">
                      {selectedApplication.hrFeedback.map((item, idx) => (
                        <li key={idx} className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-card)] px-3 py-2 text-sm">
                          <p className="text-[var(--ds-text-secondary)]">{item.feedback}</p>
                          {item.rating && <p className="mt-1 text-xs text-[var(--ds-primary-text)]">Rating: {item.rating}/5</p>}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {(selectedApplication.interviewRounds || []).length > 0 && (
                  <section className="surface-subtle p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">Interview Rounds</p>
                    <ul className="mt-2 space-y-2 text-sm text-[var(--ds-text-secondary)]">
                      {selectedApplication.interviewRounds?.map((round, idx) => (
                        <li key={round._id || idx} className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-card)] px-3 py-2">
                          <p className="font-semibold capitalize">{round.roundType || "Interview"} · {round.status || "scheduled"}</p>
                          <p className="text-xs text-[var(--ds-muted)]">
                            {round.interviewDate ? new Date(round.interviewDate).toLocaleDateString() : "-"} {round.interviewTime || ""}
                            {round.mode ? ` · ${round.mode}` : ""}
                          </p>
                          {round.meetingLink ? (
                            extractInterviewRoomIdFromLink(round.meetingLink) ? (
                              canJoinInterviewRoom(
                                round.interviewDate,
                                round.interviewTime,
                                resolveInterviewDisplayStatus(round.status, round.interviewDate, round.interviewTime)
                              ) ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => router.push(`/interview/${extractInterviewRoomIdFromLink(round.meetingLink)}`)}
                                >
                                  Join Interview Room
                                </Button>
                              ) : (
                                <p className="mt-2 text-xs text-[var(--ds-muted)]">
                                  Join opens 15 minutes before the scheduled time.
                                </p>
                              )
                            ) : (
                              <ExternalLink href={round.meetingLink} className="mt-1 text-xs">
                                Join meeting
                              </ExternalLink>
                            )
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await openApplicationResume(selectedApplication._id);
                      } catch (err) {
                        pushToast({ variant: "error", title: "Resume unavailable", message: (err as Error).message });
                      }
                    }}
                  >
                    View Submitted Resume
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
