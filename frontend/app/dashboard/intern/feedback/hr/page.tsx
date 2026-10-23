"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { SectionPanel } from "@/components/dashboard/shared/section-panel";
import { DashboardPageHeader } from "@/components/dashboard/shared/dashboard-page-header";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Application, fetchInternApplications, peekInternApplications } from "@/lib/intern-portal";
import { SkeletonList } from "@/components/ui/skeleton";

export default function HrFeedbackPage() {
  const [applications, setApplications] = useState<Application[]>([]);
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
    async function load() {
      try {
        setError(null);
        const loadedApplications = await fetchInternApplications();
        setApplications(loadedApplications);
      } catch (err) {
        setError((err as Error).message || "Failed to load HR feedback.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const feedbackItems = useMemo(
    () =>
      applications.flatMap((app) =>
        (app.hrFeedback || []).map((item) => ({
          internship: app.internship?.role || "Internship",
          company: app.internship?.company?.companyName || "Company",
          status: app.status,
          feedback: item.feedback,
          rating: item.rating,
          category: item.category,
          createdAt: item.createdAt
        }))
      ),
    [applications]
  );

  return (
    <div className="dashboard-stack">
          <DashboardPageHeader
            eyebrow="Feedback"
            title="HR Feedback"
            subtitle="Recruiter feedback, ratings, and improvement notes on your applications."
          />
          {loading ? (
            <SkeletonList rows={3} />
          ) : (
            <SectionPanel title="Feedback History" subtitle="Only candidate-visible feedback is shown here.">
              {error && <p className="text-sm text-[var(--ds-danger)]">{error}</p>}
              {!error && feedbackItems.length === 0 && (
                <EmptyState
                  title="No HR Feedback Yet"
                  description="Feedback and ratings appear here after recruiters review your applications."
                  presetKey="feedback"
                  ctaLabel="View Applications"
                  ctaHref="/dashboard/intern/applications"
                  size="sm"
                />
              )}
              {!error && feedbackItems.length > 0 && (
                <div className="space-y-3">
                  {feedbackItems.map((item, idx) => (
                    <div key={`${item.internship}-${idx}`} className="surface-subtle px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--ds-text)]">
                          {item.internship} · {item.company}
                        </p>
                        {item.rating && (
                          <span className="rounded-full bg-[var(--ds-info-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--ds-primary-text)]">
                            {item.rating}/5
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-[var(--ds-text-secondary)]">{item.feedback}</p>
                      <p className="mt-2 text-xs text-[var(--ds-muted)] capitalize">
                        {item.category || "general"} · {item.status.replace(/_/g, " ")}
                        {item.createdAt ? ` · ${new Date(item.createdAt).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SectionPanel>
          )}
    </div>
  );
}
