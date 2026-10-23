"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, UserCheck } from "lucide-react";
import type { CompanyApplication, CompanyInternship, CompanyMatchedCandidate } from "@/lib/company-portal";
import { hiringAIEngine } from "@/lib/ai-hiring";
import {
  CompanyDashboardEmptyState,
  CompanyDashboardItemCard,
  CompanyDashboardSection,
  companyDashboardStyles
} from "@/components/dashboard/company/company-dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { AppIcon } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";
import { getMatchScore, getShortlistedCandidates, getSkillPreview } from "./hiring-utils";
import { CandidateCompareToggle } from "@/components/dashboard/company/candidate-compare-toggle";

const INITIAL_VISIBLE = 6;
const LOAD_BATCH = 2;
const MAX_VISIBLE = 12;

type ShortlistPanelProps = {
  applications: CompanyApplication[];
  matches?: CompanyMatchedCandidate[];
  internships?: CompanyInternship[];
  saving?: boolean;
  onViewProfile: (applicationId: string) => void;
  onMessage: (application: CompanyApplication) => void;
  onViewResume: (applicationId: string) => void;
  onScheduleInterview: (applicationId: string, candidateName: string) => void;
};

function recommendationTone(level?: string): BadgeTone {
  const normalized = String(level || "").toLowerCase();
  if (normalized.includes("strong")) return "success";
  if (normalized.includes("good")) return "info";
  if (normalized.includes("moderate")) return "warning";
  return "neutral";
}

export function ShortlistPanel({
  applications,
  matches = [],
  internships = [],
  saving = false,
  onViewProfile,
  onMessage,
  onViewResume,
  onScheduleInterview
}: ShortlistPanelProps) {
  const shortlisted = useMemo(() => getShortlistedCandidates(applications, MAX_VISIBLE), [applications]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  const rankedByApplicationId = useMemo(() => {
    if (!matches.length || !internships.length) return new Map<string, ReturnType<typeof hiringAIEngine.rankAllCandidates>[number]>();
    const ranked = hiringAIEngine.rankAllCandidates({ matches, applications, internships });
    return new Map(ranked.filter((item) => item.applicationId).map((item) => [item.applicationId as string, item]));
  }, [matches, applications, internships]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [applications]);

  const visible = shortlisted.slice(0, visibleCount);
  const canLoadMore = visibleCount < shortlisted.length;

  return (
    <CompanyDashboardSection
      id="hiring-shortlist"
      data-feature="company_dashboard_shortlist_interview_workflow_v2"
      icon={UserCheck}
      title="Shortlisted Candidates"
      description="Candidates ready for the next hiring stage. Schedule interviews to move them forward."
    >
      {shortlisted.length === 0 ? (
        <CompanyDashboardEmptyState title="Shortlisted candidates will appear here once you move applicants into the shortlist stage." />
      ) : (
        <div className={companyDashboardStyles.cardGridTwo}>
          {visible.map((application) => {
            const matchScore = getMatchScore(application);
            const skills = getSkillPreview(application, 5);
            const ranked = rankedByApplicationId.get(application._id);
            const evaluation = ranked?.evaluation;
            const aiSummary =
              ranked?.strengths?.[0] ||
              application.intern?.summary ||
              "Strong profile alignment for this role based on skills and application fit.";
            const candidateName = application.intern?.fullName || "Candidate";

            return (
              <CompanyDashboardItemCard key={application._id} highlighted className="flex h-full flex-col">
                <div className="flex flex-1 flex-col gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="ds-h3">{candidateName}</h3>
                        {matchScore !== null && <Badge tone="accent">{matchScore}% match</Badge>}
                        {evaluation?.recommendationLevel ? (
                          <Badge tone={recommendationTone(evaluation.recommendationLevel)}>{evaluation.recommendationLevel}</Badge>
                        ) : null}
                      </div>
                      <p className="ds-caption">{application.internship?.role || "Role"}</p>
                    </div>
                    {evaluation ? (
                      <div className="text-right">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--ds-gradient-from)]/20 to-[var(--ds-gradient-to)]/20 text-sm font-bold text-[var(--ds-primary-text)] ring-1 ring-[var(--ds-primary)]/30">
                          {evaluation.overallScore}
                        </div>
                        <p className="mt-1 text-[10px] text-[var(--ds-muted)]">Conf. {evaluation.confidenceScore}%</p>
                      </div>
                    ) : null}
                  </div>

                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((skill) => (
                        <span
                          key={`${application._id}-${skill}`}
                          className="rounded-md bg-[var(--ds-surface-hover)] px-2 py-0.5 text-xs font-medium text-[var(--ds-muted)]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="line-clamp-2 text-xs leading-relaxed text-[var(--ds-text-secondary)]">{aiSummary}</p>
                </div>

                <div className={cn(companyDashboardStyles.actionsFooter, "mt-auto")}>
                  <CandidateCompareToggle applicationId={application._id} />
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving}
                    className="bg-gradient-to-r from-[var(--ds-gradient-from)] to-[var(--ds-gradient-to)] text-[var(--ds-on-primary)] shadow-sm hover:opacity-90"
                    onClick={() => onScheduleInterview(application._id, candidateName)}
                  >
                    <AppIcon icon={CalendarClock} size="xs" />
                    Schedule Interview
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => onViewProfile(application._id)}>
                    View Profile
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => onMessage(application)}>
                    Message
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => onViewResume(application._id)}>
                    View Resume
                  </Button>
                </div>
              </CompanyDashboardItemCard>
            );
          })}

          {canLoadMore && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="w-full sm:col-span-2"
              onClick={() => setVisibleCount((count) => Math.min(MAX_VISIBLE, count + LOAD_BATCH))}
            >
              Show more candidates
            </Button>
          )}
        </div>
      )}
    </CompanyDashboardSection>
  );
}
