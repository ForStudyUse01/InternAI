"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Filter, KanbanSquare, Search, X } from "lucide-react";
import type { CompanyApplication, CompanyInternship, CompanyMatchedCandidate } from "@/lib/company-portal";
import { hiringAIEngine, type RankedCandidate } from "@/lib/ai-hiring";
import {
  CompanyDashboardEmptyState,
  CompanyDashboardPanelCard,
  CompanyDashboardSection,
  companyDashboardStyles
} from "@/components/dashboard/company/company-dashboard-layout";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/icons/app-icon";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  HIRING_PIPELINE_STAGES,
  computeAcceptanceRate,
  computeInterviewRate,
  computePipelineStageCounts,
  normalizeToPipelineStage,
  type HiringPipelineStageKey
} from "./hiring-utils";
import { KanbanCandidateCard } from "./kanban-candidate-card";

/**
 * Column key -> the exact status string sent to the existing PATCH /stage API.
 * Values chosen so the backend pipeline.service.js transition graph accepts the
 * common forward moves; the server remains the single authority on validity.
 */
const PIPELINE_TARGET_STATUS: Record<HiringPipelineStageKey, string> = {
  applied: "applied",
  reviewed: "under_review",
  shortlisted: "shortlisted",
  interview: "interview_scheduled",
  selected: "selected",
  rejected: "rejected"
};

/** UI hint only — mirrors backend TERMINAL_STATUSES so cards in closed stages don't offer a drag. Server still validates. */
const TERMINAL_STAGES: HiringPipelineStageKey[] = ["rejected", "selected"];

const STAGE_ACCENT: Record<HiringPipelineStageKey, string> = {
  applied: "bg-[var(--ds-muted)]",
  reviewed: "bg-[var(--ds-chart-1)]",
  shortlisted: "bg-[var(--ds-chart-2)]",
  interview: "bg-[var(--ds-chart-3)]",
  selected: "bg-[var(--ds-success)]",
  rejected: "bg-[var(--ds-danger)]"
};

type InterviewFilter = "any" | "none" | "scheduled" | "completed";
type DateFilter = "all" | "7d" | "30d";

type KanbanFilters = {
  search: string;
  role: string;
  hasExperience: boolean;
  minAts: number;
  minAiMatch: number;
  skill: string;
  interview: InterviewFilter;
  date: DateFilter;
};

const DEFAULT_FILTERS: KanbanFilters = {
  search: "",
  role: "all",
  hasExperience: false,
  minAts: 0,
  minAiMatch: 0,
  skill: "",
  interview: "any",
  date: "all"
};

function latestInterviewState(application: CompanyApplication): InterviewFilter {
  const rounds = application.interviewRounds || [];
  if (rounds.length === 0) return "none";
  const anyCompleted = rounds.some((round) => ["completed", "cleared"].includes(round.status || ""));
  return anyCompleted ? "completed" : "scheduled";
}

function withinDateFilter(application: CompanyApplication, filter: DateFilter) {
  if (filter === "all") return true;
  if (!application.createdAt) return false;
  const created = new Date(application.createdAt).getTime();
  const days = filter === "7d" ? 7 : 30;
  return Date.now() - created <= days * 24 * 60 * 60 * 1000;
}

function toCsvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

type HiringPipelineKanbanProps = {
  applications: CompanyApplication[];
  matches: CompanyMatchedCandidate[];
  internships: CompanyInternship[];
  saving?: boolean;
  onMoveStage: (applicationId: string, status: string, note?: string) => Promise<void>;
  onOpenProfile: (applicationId: string) => void;
  onViewResume: (applicationId: string) => void;
  onScheduleInterview: (applicationId: string, candidateName: string) => void;
};

export function HiringPipelineKanban({
  applications,
  matches,
  internships,
  saving = false,
  onMoveStage,
  onOpenProfile,
  onViewResume,
  onScheduleInterview
}: HiringPipelineKanbanProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [filters, setFilters] = useState<KanbanFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dragOverStage, setDragOverStage] = useState<HiringPipelineStageKey | null>(null);
  const [movingIds, setMovingIds] = useState<string[]>([]);
  const [bulkStage, setBulkStage] = useState<HiringPipelineStageKey | "">("");

  const rankedByApplicationId = useMemo(() => {
    const ranked = hiringAIEngine.rankAllCandidates({ matches, applications, internships });
    return new Map<string, RankedCandidate>(
      ranked.filter((item) => item.applicationId).map((item) => [item.applicationId as string, item])
    );
  }, [matches, applications, internships]);

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const skill = filters.skill.trim().toLowerCase();
    return applications.filter((application) => {
      if (search && !(application.intern?.fullName || "").toLowerCase().includes(search)) return false;
      if (filters.role !== "all" && application.internship?._id !== filters.role) return false;
      if (filters.hasExperience && (application.intern?.experience || []).length === 0) return false;
      if (filters.minAts > 0) {
        const ats = application.intern?.resume?.analysis?.categoryScores?.ats;
        if (typeof ats !== "number" || ats < filters.minAts) return false;
      }
      if (filters.minAiMatch > 0) {
        const score = rankedByApplicationId.get(application._id)?.evaluation.overallScore;
        if (typeof score !== "number" || score < filters.minAiMatch) return false;
      }
      if (skill && !(application.intern?.skills || []).some((item) => item.toLowerCase().includes(skill))) return false;
      if (filters.interview !== "any" && latestInterviewState(application) !== filters.interview) return false;
      if (!withinDateFilter(application, filters.date)) return false;
      return true;
    });
  }, [applications, filters, rankedByApplicationId]);

  const columns = useMemo(() => {
    const byStage = new Map<HiringPipelineStageKey, CompanyApplication[]>(
      HIRING_PIPELINE_STAGES.map((stage) => [stage.key, []])
    );
    filtered.forEach((application) => {
      byStage.get(normalizeToPipelineStage(application.status))?.push(application);
    });
    byStage.forEach((list) =>
      list.sort(
        (a, b) =>
          (rankedByApplicationId.get(b._id)?.evaluation.overallScore ?? 0) -
          (rankedByApplicationId.get(a._id)?.evaluation.overallScore ?? 0)
      )
    );
    return byStage;
  }, [filtered, rankedByApplicationId]);

  const analytics = useMemo(() => {
    const atsScores = filtered
      .map((application) => application.intern?.resume?.analysis?.categoryScores?.ats)
      .filter((value): value is number => typeof value === "number");
    const aiScores = filtered
      .map((application) => rankedByApplicationId.get(application._id)?.evaluation.overallScore)
      .filter((value): value is number => typeof value === "number");
    const counts = computePipelineStageCounts(filtered);
    const total = filtered.length;
    return {
      total,
      avgAts: atsScores.length ? Math.round(atsScores.reduce((sum, value) => sum + value, 0) / atsScores.length) : null,
      avgAi: aiScores.length ? Math.round(aiScores.reduce((sum, value) => sum + value, 0) / aiScores.length) : null,
      conversionRate: total ? Math.round((counts.selected / total) * 100) : 0,
      interviewRate: computeInterviewRate(filtered),
      offerRate: computeAcceptanceRate(filtered),
      counts
    };
  }, [filtered, rankedByApplicationId]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search.trim()) count += 1;
    if (filters.role !== "all") count += 1;
    if (filters.hasExperience) count += 1;
    if (filters.minAts > 0) count += 1;
    if (filters.minAiMatch > 0) count += 1;
    if (filters.skill.trim()) count += 1;
    if (filters.interview !== "any") count += 1;
    if (filters.date !== "all") count += 1;
    return count;
  }, [filters]);

  function toggleSelect(applicationId: string) {
    setSelectedIds((prev) =>
      prev.includes(applicationId) ? prev.filter((id) => id !== applicationId) : [...prev, applicationId]
    );
  }

  async function moveOne(applicationId: string, stage: HiringPipelineStageKey, note: string) {
    const application = applications.find((item) => item._id === applicationId);
    if (!application) return;
    if (normalizeToPipelineStage(application.status) === stage) return;
    const name = application.intern?.fullName || "Candidate";
    const stageLabel = HIRING_PIPELINE_STAGES.find((item) => item.key === stage)?.label || stage;
    setMovingIds((prev) => [...prev, applicationId]);
    try {
      await onMoveStage(applicationId, PIPELINE_TARGET_STATUS[stage], note);
      pushToast({ title: "Candidate moved", message: `${name} moved to ${stageLabel}.`, variant: "success" });
    } catch (error) {
      pushToast({
        title: "Move failed",
        message: error instanceof Error ? error.message : `Couldn't move ${name} to ${stageLabel}.`,
        variant: "error"
      });
    } finally {
      setMovingIds((prev) => prev.filter((id) => id !== applicationId));
    }
  }

  function handleDrop(event: React.DragEvent, stage: HiringPipelineStageKey) {
    event.preventDefault();
    setDragOverStage(null);
    const applicationId = event.dataTransfer.getData("text/internai-application");
    if (!applicationId) return;
    void moveOne(applicationId, stage, "Moved via pipeline board");
  }

  async function runBulk(stage: HiringPipelineStageKey, note: string) {
    const ids = [...selectedIds];
    for (const id of ids) {
      // Sequential on purpose: applyStage refetches the applications list after
      // each PATCH; parallel calls would race that shared refresh.
      await moveOne(id, stage, note);
    }
    setSelectedIds([]);
  }

  function exportSelected() {
    const rows = (selectedIds.length ? filtered.filter((item) => selectedIds.includes(item._id)) : filtered).map(
      (application) => {
        const ranked = rankedByApplicationId.get(application._id);
        return [
          application.intern?.fullName || "Candidate",
          application.internship?.role || "",
          normalizeToPipelineStage(application.status),
          application.intern?.resume?.analysis?.categoryScores?.ats ?? "",
          application.intern?.resume?.score ?? "",
          ranked?.evaluation.overallScore ?? "",
          application.createdAt ? new Date(application.createdAt).toLocaleDateString() : ""
        ].map(toCsvCell);
      }
    );
    const header = ["Candidate", "Role", "Stage", "ATS Score", "Resume Score", "AI Match", "Applied"].join(",");
    const csv = [header, ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pipeline-candidates-${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    pushToast({ title: "Export ready", message: `${rows.length} candidate(s) exported to CSV.`, variant: "success" });
  }

  const filterField =
    "h-9 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-2.5 text-xs text-[var(--ds-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-focus-ring)]";

  return (
    <CompanyDashboardSection
      id="hiring-pipeline-extended"
      icon={KanbanSquare}
      title="Hiring Pipeline Board"
      description="Drag candidates between stages, or select several for bulk actions. Stage rules are enforced by the pipeline."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={exportSelected}>
            <AppIcon icon={Download} size="xs" />
            Export
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setFiltersOpen((open) => !open)}>
            <AppIcon icon={Filter} size="xs" />
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Button>
        </div>
      }
    >
      {/* Analytics strip */}
      <CompanyDashboardPanelCard className="mb-4">
        <div className={companyDashboardStyles.metricGridFive}>
          <MetricMini label="Total Candidates" value={analytics.total} />
          <MetricMini label="Avg ATS" value={analytics.avgAts !== null ? `${analytics.avgAts}%` : "—"} />
          <MetricMini label="Avg AI Match" value={analytics.avgAi !== null ? `${analytics.avgAi}%` : "—"} />
          <MetricMini label="Interview Rate" value={`${analytics.interviewRate}%`} />
          <MetricMini label="Conversion" value={`${analytics.conversionRate}%`} hint={`Offer acceptance ${analytics.offerRate}%`} />
        </div>
        {analytics.total > 0 ? (
          <div
            className="mt-3 flex h-2 w-full gap-0.5 overflow-hidden rounded-full"
            role="img"
            aria-label={`Funnel: ${HIRING_PIPELINE_STAGES.map((stage) => `${stage.label} ${analytics.counts[stage.key]}`).join(", ")}`}
          >
            {HIRING_PIPELINE_STAGES.map((stage) => {
              const count = analytics.counts[stage.key];
              if (count === 0) return null;
              return (
                <div
                  key={stage.key}
                  className={cn("h-full", STAGE_ACCENT[stage.key])}
                  style={{ width: `${(count / analytics.total) * 100}%` }}
                  title={`${stage.label}: ${count}`}
                />
              );
            })}
          </div>
        ) : null}
      </CompanyDashboardPanelCard>

      {/* Filters */}
      {filtersOpen ? (
        <CompanyDashboardPanelCard className="mb-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="ds-label text-[10px]">Search Candidate</span>
              <div className="relative">
                <AppIcon icon={Search} size="xs" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ds-muted)]" />
                <input
                  type="search"
                  value={filters.search}
                  onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                  placeholder="Name"
                  className={cn(filterField, "w-full !pl-8")}
                />
              </div>
            </label>
            <label className="flex flex-col gap-1">
              <span className="ds-label text-[10px]">Role</span>
              <select
                value={filters.role}
                onChange={(event) => setFilters((prev) => ({ ...prev, role: event.target.value }))}
                className={filterField}
              >
                <option value="all">All roles</option>
                {internships.map((internship) => (
                  <option key={internship._id} value={internship._id}>
                    {internship.role}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="ds-label text-[10px]">Skill</span>
              <input
                type="text"
                value={filters.skill}
                onChange={(event) => setFilters((prev) => ({ ...prev, skill: event.target.value }))}
                placeholder="e.g. React"
                className={filterField}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="ds-label text-[10px]">Interview Status</span>
              <select
                value={filters.interview}
                onChange={(event) => setFilters((prev) => ({ ...prev, interview: event.target.value as InterviewFilter }))}
                className={filterField}
              >
                <option value="any">Any</option>
                <option value="none">No interview yet</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="ds-label text-[10px]">Min ATS: {filters.minAts || "Any"}</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={filters.minAts}
                onChange={(event) => setFilters((prev) => ({ ...prev, minAts: Number(event.target.value) }))}
                className="accent-[var(--ds-accent)]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="ds-label text-[10px]">Min AI Match: {filters.minAiMatch || "Any"}</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={filters.minAiMatch}
                onChange={(event) => setFilters((prev) => ({ ...prev, minAiMatch: Number(event.target.value) }))}
                className="accent-[var(--ds-accent)]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="ds-label text-[10px]">Applied Within</span>
              <select
                value={filters.date}
                onChange={(event) => setFilters((prev) => ({ ...prev, date: event.target.value as DateFilter }))}
                className={filterField}
              >
                <option value="all">All time</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </label>
            <div className="flex items-end justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-[var(--ds-text)]">
                <input
                  type="checkbox"
                  checked={filters.hasExperience}
                  onChange={(event) => setFilters((prev) => ({ ...prev, hasExperience: event.target.checked }))}
                  className="h-4 w-4 accent-[var(--ds-accent)]"
                />
                Has experience
              </label>
              {activeFilterCount > 0 ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => setFilters(DEFAULT_FILTERS)}>
                  <AppIcon icon={X} size="xs" />
                  Reset
                </Button>
              ) : null}
            </div>
          </div>
        </CompanyDashboardPanelCard>
      ) : null}

      {/* Bulk action bar */}
      {selectedIds.length > 0 ? (
        <CompanyDashboardPanelCard className="mb-4 !py-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="ds-caption mr-1 font-semibold text-[var(--ds-text)]">{selectedIds.length} selected</p>
            <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => void runBulk("shortlisted", "Bulk shortlisted from pipeline board")}>
              Shortlist
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={saving}
              className="text-[var(--ds-danger)]"
              onClick={() => void runBulk("rejected", "Bulk rejected from pipeline board")}
            >
              Reject
            </Button>
            <label className="flex items-center gap-1.5">
              <span className="sr-only">Move selected candidates to stage</span>
              <select
                value={bulkStage}
                onChange={(event) => setBulkStage(event.target.value as HiringPipelineStageKey | "")}
                className={filterField}
              >
                <option value="">Move to…</option>
                {HIRING_PIPELINE_STAGES.map((stage) => (
                  <option key={stage.key} value={stage.key}>
                    {stage.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={saving || !bulkStage}
                onClick={() => {
                  if (bulkStage) void runBulk(bulkStage, "Bulk stage move from pipeline board");
                  setBulkStage("");
                }}
              >
                Move
              </Button>
            </label>
            <Button type="button" size="sm" variant="ghost" onClick={() => router.push("/dashboard/company/chat")}>
              Message
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={exportSelected}>
              Export
            </Button>
            <Button type="button" size="sm" variant="ghost" className="ml-auto" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </div>
        </CompanyDashboardPanelCard>
      ) : null}

      {/* Board */}
      {filtered.length === 0 ? (
        <CompanyDashboardEmptyState
          title={activeFilterCount > 0 ? "No candidates match these filters" : "No candidates in the pipeline yet"}
          description={activeFilterCount > 0 ? "Loosen or reset the filters above." : "Applications will appear here as candidates apply."}
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-3" role="list" aria-label="Hiring pipeline stages">
          {HIRING_PIPELINE_STAGES.map((stage) => {
            const items = columns.get(stage.key) || [];
            const isOver = dragOverStage === stage.key;
            return (
              <div
                key={stage.key}
                role="listitem"
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverStage(stage.key);
                }}
                onDragLeave={() => setDragOverStage((current) => (current === stage.key ? null : current))}
                onDrop={(event) => handleDrop(event, stage.key)}
                className={cn(
                  "flex w-64 shrink-0 flex-col overflow-hidden rounded-xl border bg-[var(--ds-surface)] shadow-[0_1px_2px_var(--ds-shadow)] transition-colors sm:w-72",
                  isOver ? "border-[var(--ds-accent)] bg-[var(--ds-surface-raised)]" : "border-[var(--ds-border)]"
                )}
              >
                {/* Per-stage accent bar for clearer visual hierarchy across columns */}
                <span className={cn("h-1 w-full shrink-0", STAGE_ACCENT[stage.key])} aria-hidden />
                <div className="flex items-center gap-2 border-b border-[var(--ds-border)] px-3.5 py-3">
                  <span className={cn("h-2 w-2 rounded-full", STAGE_ACCENT[stage.key])} />
                  <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--ds-text)]">{stage.label}</h3>
                  <span className="ml-auto rounded-full bg-[var(--ds-surface-raised)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--ds-muted)]">
                    {items.length}
                  </span>
                </div>
                <div className="flex min-h-[140px] flex-1 flex-col gap-2.5 p-2.5">
                  {items.length === 0 ? (
                    <p className="ds-caption py-6 text-center text-xs">{isOver ? "Drop here" : "Empty"}</p>
                  ) : (
                    items.map((application) => (
                      <KanbanCandidateCard
                        key={application._id}
                        application={application}
                        ranked={rankedByApplicationId.get(application._id)}
                        selected={selectedIds.includes(application._id)}
                        saving={saving || movingIds.includes(application._id)}
                        draggable={!TERMINAL_STAGES.includes(stage.key)}
                        stages={HIRING_PIPELINE_STAGES}
                        currentStage={stage.key}
                        onMoveToStage={(applicationId, target) => void moveOne(applicationId, target, "Moved via stage selector")}
                        onToggleSelect={toggleSelect}
                        onDragStart={(event, applicationId) => {
                          event.dataTransfer.setData("text/internai-application", applicationId);
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        onOpenProfile={onOpenProfile}
                        onViewResume={onViewResume}
                        onMessage={() => router.push("/dashboard/company/chat")}
                        onScheduleInterview={onScheduleInterview}
                        onShortlist={(applicationId) => void moveOne(applicationId, "shortlisted", "Shortlisted from pipeline board")}
                        onReject={(applicationId) => void moveOne(applicationId, "rejected", "Rejected from pipeline board")}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CompanyDashboardSection>
  );
}

function MetricMini({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className={companyDashboardStyles.metricTile}>
      <p className="ds-label">{label}</p>
      <p className="ds-stat-value mt-1 tabular-nums">{value}</p>
      {hint ? <p className="ds-caption mt-1">{hint}</p> : null}
    </div>
  );
}
