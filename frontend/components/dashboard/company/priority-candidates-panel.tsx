"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarCheck2, ClipboardList, Sparkles, Star } from "lucide-react";
import type { CompanyApplication, CompanyInternship, CompanyMatchedCandidate } from "@/lib/company-portal";
import { hiringAIEngine } from "@/lib/ai-hiring";
import {
  CompanyDashboardEmptyState,
  CompanyDashboardItemCard,
  CompanyDashboardSection,
  companyDashboardStyles
} from "./company-dashboard-layout";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/icons/app-icon";
import { normalizeToPipelineStage } from "@/components/dashboard/hiring/hiring-utils";
import { useTablistKeyboard } from "@/lib/use-tablist-keyboard";
import { cn } from "@/lib/utils";
import { CandidateCompareToggle } from "./candidate-compare-toggle";

type Bucket = "top-matches" | "recently-applied" | "recently-shortlisted" | "recently-interviewed";

const BUCKETS: Array<{ key: Bucket; label: string; icon: typeof Star }> = [
  { key: "top-matches", label: "Top ATS Matches", icon: Star },
  { key: "recently-applied", label: "Recently Applied", icon: ClipboardList },
  { key: "recently-shortlisted", label: "Recently Shortlisted", icon: Sparkles },
  { key: "recently-interviewed", label: "Recently Interviewed", icon: CalendarCheck2 }
];

type CandidateRow = { applicationId: string; name: string; role: string; meta: string };

function timeOf(value?: string) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function latestStageChangeTo(application: CompanyApplication, stage: "shortlisted") {
  const entries = (application.stageHistory || []).filter(
    (entry) => normalizeToPipelineStage(entry.stage) === stage
  );
  if (entries.length === 0) return timeOf(application.updatedAt);
  return Math.max(...entries.map((entry) => timeOf(entry.changedAt)));
}

function latestInterviewTime(application: CompanyApplication) {
  const rounds = application.interviewRounds || [];
  if (rounds.length === 0) return 0;
  return Math.max(...rounds.map((round) => timeOf(round.updatedAt || round.interviewDate)));
}

type PriorityCandidatesPanelProps = {
  matches: CompanyMatchedCandidate[];
  applications: CompanyApplication[];
  internships: CompanyInternship[];
  onOpenProfile: (applicationId: string) => void;
};

export function PriorityCandidatesPanel({ matches, applications, internships, onOpenProfile }: PriorityCandidatesPanelProps) {
  const [bucket, setBucket] = useState<Bucket>("top-matches");
  const tablistRef = useRef<HTMLDivElement>(null);
  useTablistKeyboard(tablistRef);

  const rankedInput = useMemo(() => ({ matches, applications, internships }), [matches, applications, internships]);
  const ranked = useMemo(() => hiringAIEngine.rankAllCandidates(rankedInput), [rankedInput]);

  const rows = useMemo<CandidateRow[]>(() => {
    if (bucket === "top-matches") {
      return ranked
        .filter((item) => item.applicationId && item.application)
        .slice(0, 5)
        .map((item) => ({
          applicationId: item.applicationId as string,
          name: item.application?.intern?.fullName || "Candidate",
          role: item.application?.internship?.role || item.internshipId,
          meta: `${Math.round(item.evaluation?.overallScore ?? item.matchScore ?? 0)}% match`
        }));
    }
    if (bucket === "recently-applied") {
      return [...applications]
        .sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt))
        .slice(0, 5)
        .map((application) => ({
          applicationId: application._id,
          name: application.intern?.fullName || "Candidate",
          role: application.internship?.role || "Role",
          meta: application.createdAt ? new Date(application.createdAt).toLocaleDateString() : "—"
        }));
    }
    if (bucket === "recently-shortlisted") {
      return applications
        .filter((application) => normalizeToPipelineStage(application.status) === "shortlisted")
        .sort((a, b) => latestStageChangeTo(b, "shortlisted") - latestStageChangeTo(a, "shortlisted"))
        .slice(0, 5)
        .map((application) => ({
          applicationId: application._id,
          name: application.intern?.fullName || "Candidate",
          role: application.internship?.role || "Role",
          meta: "Shortlisted"
        }));
    }
    return applications
      .filter((application) => (application.interviewRounds || []).length > 0)
      .sort((a, b) => latestInterviewTime(b) - latestInterviewTime(a))
      .slice(0, 5)
      .map((application) => ({
        applicationId: application._id,
        name: application.intern?.fullName || "Candidate",
        role: application.internship?.role || "Role",
        meta: `${(application.interviewRounds || []).length} round${(application.interviewRounds || []).length === 1 ? "" : "s"}`
      }));
  }, [bucket, ranked, applications]);

  return (
    <CompanyDashboardSection
      id="dashboard-priority-candidates"
      icon={Star}
      title="Priority Candidates"
      description="The candidates most worth your attention right now."
      actions={
        <div ref={tablistRef} className="flex flex-wrap gap-1.5" role="tablist" aria-label="Priority candidate view">
          {BUCKETS.map((item) => {
            const active = bucket === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="priority-candidates-results"
                onClick={() => setBucket(item.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]",
                  active
                    ? "bg-[var(--ds-primary)] text-[var(--ds-on-primary)]"
                    : "border border-[var(--ds-border)] text-[var(--ds-muted)] hover:bg-[var(--ds-surface-raised)]"
                )}
              >
                <AppIcon icon={item.icon} size="xs" className="text-current" />
                {item.label}
              </button>
            );
          })}
        </div>
      }
    >
      {rows.length === 0 ? (
        <CompanyDashboardEmptyState title="Nothing here yet" description="This list fills in as candidates move through your pipeline." icon={Star} />
      ) : (
        <div id="priority-candidates-results" role="tabpanel" className={companyDashboardStyles.listStack}>
          {rows.map((row) => (
            <CompanyDashboardItemCard key={row.applicationId} className="flex flex-row items-center justify-between gap-3 !p-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--ds-text)]">{row.name}</p>
                <p className="truncate text-xs text-[var(--ds-muted)]">
                  {row.role} · {row.meta}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <CandidateCompareToggle applicationId={row.applicationId} />
                <Button type="button" size="sm" variant="secondary" onClick={() => onOpenProfile(row.applicationId)}>
                  View Profile
                </Button>
              </div>
            </CompanyDashboardItemCard>
          ))}
        </div>
      )}
    </CompanyDashboardSection>
  );
}
