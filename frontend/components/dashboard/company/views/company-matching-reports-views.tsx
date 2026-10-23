"use client";

import { Bookmark, Briefcase, FileText, MessageSquare, StickyNote, Users } from "lucide-react";
import type { CandidateSearchResult, CompanyApplication, CompanyInternship } from "@/lib/company-portal";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { SkeletonList } from "@/components/ui/skeleton";
import { AppIcon } from "@/components/icons/app-icon";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { ReportDownloadButton } from "@/components/reports/report-download-button";
import {
  CompanyDashboardItemCard,
  CompanyDashboardPageIntro,
  companyDashboardStyles
} from "@/components/dashboard/company/company-dashboard-layout";
import { ClampedNote, FeedbackRatingStars, InfoTile, fmtDate } from "@/components/dashboard/company/company-dashboard-shared";

const scoreTone = (score: number): BadgeTone => (score >= 80 ? "success" : score >= 60 ? "accent" : "neutral");

type CompanyCandidateSearchViewProps = {
  query: string;
  setQuery: (value: string) => void;
  searchLoading: boolean;
  searchError: string | null;
  debouncedQuery: string;
  searchResults: CandidateSearchResult[];
};

export function CompanyCandidateSearchView({
  query,
  setQuery,
  searchLoading,
  searchError,
  debouncedQuery,
  searchResults
}: CompanyCandidateSearchViewProps) {
  return (
    <div className={companyDashboardStyles.pageStack}>
      <CompanyDashboardPageIntro title="Candidate Search" subtitle="Search the full candidate pool by name or email." />
      <Card>
        <div className="flex flex-col gap-3">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            loading={searchLoading}
            placeholder="Search by name or email"
            iconSize="sm"
            iconClassName="!text-[var(--ds-accent)]"
            className="h-11 !pl-11 text-sm"
          />
          {/* Reserved rail for future filter chips — filter infrastructure is not built yet. */}
          <div className="flex min-h-[1.75rem] flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--ds-muted)]">Filters coming soon</span>
          </div>
        </div>

        <div className="mt-4">
          {searchLoading && <SkeletonList rows={3} />}

          {!searchLoading && searchError && <div role="alert" className="ds-alert ds-alert--error">{searchError}</div>}

          {!searchLoading && !searchError && !debouncedQuery && (
            <EmptyState
              presetKey="candidates"
              title="Search for Candidates"
              description="Type a candidate name or email to search."
              size="sm"
            />
          )}

          {!searchLoading && !searchError && debouncedQuery && searchResults.length === 0 && (
            <EmptyState
              presetKey="candidates"
              title="No Candidates Found"
              description="Try a different name or email address."
              size="sm"
            />
          )}

          {!searchLoading && !searchError && searchResults.length > 0 && (
            <div className="company-dashboard-list-stack">
              {searchResults.map((candidate) => (
                <div key={candidate._id} className="company-dashboard-item-card !flex-row flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={candidate.fullName} size="sm" />
                    <div className="min-w-0">
                      <p className="ds-h3 truncate">{candidate.fullName || "Candidate"}</p>
                      <p className="ds-caption truncate">{candidate.email || "No email"} · {candidate.mobile || "No mobile"}</p>
                    </div>
                  </div>
                  <Badge tone={scoreTone(candidate.resumeScore || 0)}>Resume {candidate.resumeScore || 0}/100</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export function CompanySavedCandidatesView() {
  return (
    <div className={companyDashboardStyles.pageStack}>
      <CompanyDashboardPageIntro title="Saved Candidates" subtitle="Bookmarked shortlist for quick access later." />
      <div className="company-dashboard-empty">
        <span className="ds-stat-icon mx-auto mb-3">
          <AppIcon icon={Bookmark} size="lg" />
        </span>
        <p className="ds-h3">No saved candidates yet.</p>
        <p className="ds-caption mt-1">Bookmark candidates from Matching or Applicants to see them here.</p>
      </div>
    </div>
  );
}

export function CompanyFeedbackView({ apps }: { apps: CompanyApplication[] }) {
  const feedback = apps
    .flatMap((a) =>
      (a.hrFeedback || []).map((f, idx) => ({
        id: `${a._id}-${idx}`,
        name: a.intern?.fullName || "Candidate",
        role: a.internship?.role || "Internship",
        text: f.feedback,
        createdAt: f.createdAt,
        rating: typeof f.rating === "number" && f.rating > 0 ? f.rating : null,
        visibility: f.visibility
      }))
    )
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return (
    <div className={companyDashboardStyles.pageStack}>
      <CompanyDashboardPageIntro title="Feedback" subtitle="Collected HR feedback on applications." />
      {feedback.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No feedback yet" description="HR feedback left on applications will appear here." />
      ) : (
        <div className="company-dashboard-list-stack">
          {feedback.map((f) => (
            <CompanyDashboardItemCard key={f.id} as="div">
              <div className="flex items-start gap-3.5">
                <span className="ds-stat-icon shrink-0">
                  <AppIcon icon={MessageSquare} size="sm" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <p className="ds-h3">{f.name}</p>
                      <p className="ds-caption">{f.role}</p>
                    </div>
                    {f.rating ? <FeedbackRatingStars rating={f.rating} /> : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="ds-caption opacity-80">{fmtDate(f.createdAt)}</p>
                    {f.visibility ? (
                      <Badge tone={f.visibility === "candidate" ? "info" : "neutral"}>
                        {f.visibility === "candidate" ? "Visible to candidate" : "Internal only"}
                      </Badge>
                    ) : null}
                  </div>
                  <ClampedNote text={f.text || ""} />
                </div>
              </div>
            </CompanyDashboardItemCard>
          ))}
        </div>
      )}
    </div>
  );
}

export function CompanyNotesView({ apps }: { apps: CompanyApplication[] }) {
  const notes = apps
    .flatMap((a) =>
      (a.stageHistory || [])
        .filter((h) => h.note?.trim())
        .map((h, idx) => ({
          id: `${a._id}-${idx}`,
          name: a.intern?.fullName || "Candidate",
          role: a.internship?.role || "Internship",
          stage: h.stage,
          note: h.note,
          changedAt: h.changedAt
        }))
    )
    .sort((a, b) => new Date(b.changedAt || 0).getTime() - new Date(a.changedAt || 0).getTime());
  return (
    <div className={companyDashboardStyles.pageStack}>
      <CompanyDashboardPageIntro title="Hiring Notes" subtitle="Stage notes captured in pipeline updates." />
      {notes.length === 0 ? (
        <EmptyState icon={StickyNote} title="No hiring notes yet" description="Notes added during pipeline stage updates will appear here." />
      ) : (
        <div className="company-dashboard-list-stack">
          {notes.map((n) => (
            <CompanyDashboardItemCard key={n.id} as="div">
              <div className="flex items-start gap-3.5">
                <span className="ds-stat-icon shrink-0">
                  <AppIcon icon={StickyNote} size="sm" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="ds-h3">{n.name}</p>
                    <Badge tone="neutral" className="capitalize">
                      {String(n.stage || "").replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="ds-caption mt-0.5 opacity-80">{n.role} · {fmtDate(n.changedAt)}</p>
                  <ClampedNote text={n.note || ""} />
                </div>
              </div>
            </CompanyDashboardItemCard>
          ))}
        </div>
      )}
    </div>
  );
}

type CompanyExportViewProps = {
  isHrScoped: boolean;
  internships: CompanyInternship[];
  apps: CompanyApplication[];
  shortlisted: CompanyApplication[];
  onExportCsv: () => void;
};

export function CompanyExportView({ isHrScoped, internships, apps, shortlisted, onExportCsv }: CompanyExportViewProps) {
  return (
    <div className={companyDashboardStyles.pageStack}>
      <CompanyDashboardPageIntro
        title="Reports / Export"
        subtitle={isHrScoped ? "Export your assigned hiring records." : "Export company hiring reports."}
      />
      <Card title="Export Summary" titleIcon={FileText}>
        <div className="stat-grid">
          <InfoTile icon={Briefcase} label="Internships" value={<span className="ds-stat-value">{internships.length}</span>} />
          <InfoTile icon={Users} label="Applicants" value={<span className="ds-stat-value">{apps.length}</span>} />
          <InfoTile
            icon={Bookmark}
            label="Shortlisted"
            value={<span className="ds-stat-value text-[var(--ds-primary-text)]">{shortlisted.length}</span>}
            className="ring-1 ring-[color-mix(in_srgb,var(--ds-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--ds-primary)_5%,transparent)]"
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <ReportDownloadButton reportKey="hiring" label="Download Hiring Report PDF" />
          <Button type="button" variant="secondary" onClick={onExportCsv} disabled={apps.length === 0}>
            Export Applicants CSV
          </Button>
        </div>
        {apps.length === 0 && (
          <div className="mt-4">
            <EmptyState icon={FileText} title="No applicant data yet" description="CSV export unlocks once applications start coming in." />
          </div>
        )}
      </Card>
    </div>
  );
}
