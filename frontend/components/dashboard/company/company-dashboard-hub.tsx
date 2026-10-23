"use client";

import { useMemo, useState } from "react";
import { Activity, BarChart3, CalendarClock, Sparkles } from "lucide-react";
import type { CompanyApplication, CompanyInternship, CompanyMatchedCandidate, CompanyCurrentUser } from "@/lib/company-portal";
import { hasSidebarModule, SIDEBAR_MODULE_KEYS } from "@/lib/company-portal";
import type { InterviewScheduleSlot } from "@/lib/ai-hiring";
import { RecentMessagesWidget } from "@/components/dashboard/chat/recent-messages-widget";
import { ApplicationsSheet } from "@/components/dashboard/hiring/applications-sheet";
import { QuickActionsPanel } from "@/components/dashboard/hiring/quick-actions-panel";
import { PipelineOverview } from "@/components/dashboard/hiring/pipeline-overview";
import { countInterviewStageCandidates, type HiringPipelineStageKey } from "@/components/dashboard/hiring/hiring-utils";
import { extractScheduledInterviews, getInterviewerSuggestions, type ScheduledInterviewRecord } from "@/lib/interview-workflow";
import {
  CompanyDashboardMainGrid,
  CompanyDashboardPageIntro,
  companyDashboardStyles
} from "./company-dashboard-layout";
import { DashboardTabs, type DashboardTabItem } from "@/components/dashboard/shared/dashboard-tabs";
import { DashboardOverviewStats } from "./dashboard-overview-stats";
import { ApplicationsOverTimePanel } from "./applications-over-time-panel";
import { InternshipPerformancePanel } from "./internship-performance-panel";
import { HiringFunnelAnalyticsPanel } from "./hiring-funnel-analytics-panel";
import { InterviewScheduleModal } from "./interview-schedule-modal";
import { InterviewSchedulingPanel, type InterviewScheduleTarget } from "./interview-scheduling-panel";
import { MatchedCandidatesPanel } from "./matched-candidates-panel";
import { RoleHiringIntelligencePanel } from "./role-hiring-intelligence-panel";
import { TodayHiringActivityPanel } from "./today-hiring-activity-panel";
import { TodaysInterviewsPanel } from "./todays-interviews-panel";
import { PriorityCandidatesPanel } from "./priority-candidates-panel";
import { HiringInsightsSummary } from "./hiring-insights-summary";
import { RecentActivityTimeline } from "./recent-activity-timeline";

type SheetState =
  | { mode: "closed" }
  | { mode: "all" }
  | { mode: "interviews" }
  | { mode: "stage"; stage: HiringPipelineStageKey };

type ScheduleTarget = InterviewScheduleTarget;

type CompanyDashboardHubProps = {
  internships: CompanyInternship[];
  applications: CompanyApplication[];
  matches: CompanyMatchedCandidate[];
  shortlistedCount: number;
  isHrScoped: boolean;
  currentUser?: CompanyCurrentUser | null;
  saving: boolean;
  onOpenProfile: (applicationId: string) => void;
  onMessage: (match: CompanyMatchedCandidate, applicationId: string) => void;
  onShortlist: (applicationId: string) => void;
  onViewResume: (applicationId: string) => void;
  onScheduleInterview: (applicationId: string, slot: InterviewScheduleSlot, roundId?: string) => Promise<void>;
  onCancelInterview?: (item: ScheduledInterviewRecord) => Promise<void>;
  onUpdateInterviewRoundStatus?: (item: ScheduledInterviewRecord, status: "completed" | "cancelled" | "no_show") => Promise<void>;
};

export function CompanyDashboardHub({
  internships,
  applications,
  matches,
  shortlistedCount,
  isHrScoped,
  currentUser,
  saving,
  onOpenProfile,
  onMessage,
  onShortlist,
  onViewResume,
  onScheduleInterview,
  onCancelInterview,
  onUpdateInterviewRoundStatus
}: CompanyDashboardHubProps) {
  const [sheet, setSheet] = useState<SheetState>({ mode: "closed" });
  const [scheduleTarget, setScheduleTarget] = useState<ScheduleTarget | null>(null);

  const activeJobsCount = useMemo(() => internships.filter((item) => item.isActive).length, [internships]);
  const interviewCount = useMemo(() => countInterviewStageCandidates(applications), [applications]);
  const interviewerSuggestions = useMemo(
    () => getInterviewerSuggestions(extractScheduledInterviews(applications)),
    [applications]
  );

  const showInterviewScheduling = hasSidebarModule(currentUser, SIDEBAR_MODULE_KEYS.INTERVIEW_SCHEDULING);

  const tabs = useMemo(() => {
    const items: DashboardTabItem[] = [
      {
        key: "activity",
        label: "Activity",
        icon: Activity,
        content: (
          <>
            <ApplicationsOverTimePanel applications={applications} />
            <RecentActivityTimeline applications={applications} />
          </>
        )
      },
      {
        key: "matches",
        label: "AI Matches",
        icon: Sparkles,
        content: (
          <MatchedCandidatesPanel
            matches={matches}
            applications={applications}
            internships={internships}
            defaultLimit={10}
            showViewAllLink
            saving={saving}
            isHrScoped={isHrScoped}
            onOpenProfile={onOpenProfile}
            onMessage={onMessage}
            onShortlist={onShortlist}
            onViewResume={onViewResume}
            onScheduleInterview={(applicationId, candidateName) => setScheduleTarget({ applicationId, candidateName })}
          />
        )
      }
    ];

    if (showInterviewScheduling) {
      items.push({
        key: "interviews",
        label: "Interviews",
        icon: CalendarClock,
        content: (
          <InterviewSchedulingPanel
            applications={applications}
            saving={saving}
            onViewProfile={onOpenProfile}
            onScheduleInterview={setScheduleTarget}
            onCancelInterview={onCancelInterview}
            onUpdateRoundStatus={onUpdateInterviewRoundStatus}
          />
        )
      });
    }

    const insightsTab: DashboardTabItem = {
      key: "insights",
      label: "Insights",
      icon: BarChart3,
      content: (
        <>
          <HiringInsightsSummary applications={applications} shortlistedCount={shortlistedCount} />
          <RoleHiringIntelligencePanel
            matches={matches}
            applications={applications}
            internships={internships}
            onOpenProfile={onOpenProfile}
          />
          <HiringFunnelAnalyticsPanel
            applications={applications}
            visibleStageKeys={isHrScoped ? undefined : ["shortlisted", "rejected"]}
          />
          <InternshipPerformancePanel internships={internships} applications={applications} />
        </>
      )
    };

    if (isHrScoped) {
      items.push(insightsTab);
      return items;
    }

    // Executives see strategic insights first — daily task tabs follow.
    return [insightsTab, ...items];
  }, [
    applications,
    internships,
    matches,
    saving,
    isHrScoped,
    shortlistedCount,
    onOpenProfile,
    onMessage,
    onShortlist,
    onViewResume,
    onCancelInterview,
    showInterviewScheduling
  ]);

  return (
    <>
      <div className={companyDashboardStyles.pageStack}>
        <CompanyDashboardPageIntro
          title={
            isHrScoped
              ? "Company HR Dashboard"
              : currentUser?.companyAccountType === "ceo"
                ? "Company CEO Dashboard"
                : "Company Dashboard"
          }
          subtitle={
            isHrScoped
              ? "Your assigned recruitment workspace."
              : "AI hiring intelligence for roles, pipeline, and interviews."
          }
        />

        <CompanyDashboardMainGrid
          main={
            <>
              <TodayHiringActivityPanel applications={applications} />

              <DashboardOverviewStats activeJobs={activeJobsCount} interviews={interviewCount} />

              <PipelineOverview
                applications={applications}
                variant="pipeline"
                onStageClick={(stage) => setSheet({ mode: "stage", stage })}
              />

              <TodaysInterviewsPanel
                applications={applications}
                onViewProfile={onOpenProfile}
                onScheduleInterview={(target) => setScheduleTarget(target)}
              />

              <PriorityCandidatesPanel
                matches={matches}
                applications={applications}
                internships={internships}
                onOpenProfile={onOpenProfile}
              />

              <DashboardTabs tabs={tabs} />
            </>
          }
          sidebar={
            <>
              <QuickActionsPanel
                canPostJob={!isHrScoped}
                isExecutive={!isHrScoped}
                onViewAllApplications={() => setSheet({ mode: "all" })}
                onScheduleInterviews={() => setSheet({ mode: "interviews" })}
              />
              <RecentMessagesWidget role="company" chatHref="/dashboard/company/chat" />
            </>
          }
        />
      </div>

      <ApplicationsSheet
        open={sheet.mode !== "closed"}
        title={
          sheet.mode === "interviews"
            ? "Schedule Interviews"
            : sheet.mode === "stage"
              ? `Pipeline · ${sheet.stage.charAt(0).toUpperCase()}${sheet.stage.slice(1)}`
              : "All Applications"
        }
        subtitle={
          sheet.mode === "interviews"
            ? "Candidates currently in the interview stage."
            : sheet.mode === "stage"
              ? "Candidates currently in this pipeline stage."
              : sheet.mode === "all"
                ? "Browse every application across active roles."
                : undefined
        }
        applications={applications}
        filterStage={sheet.mode === "interviews" ? "interview" : sheet.mode === "stage" ? sheet.stage : null}
        onClose={() => setSheet({ mode: "closed" })}
        onViewProfile={onOpenProfile}
      />

      <InterviewScheduleModal
        open={Boolean(scheduleTarget)}
        candidateName={scheduleTarget?.candidateName}
        mode={scheduleTarget?.roundId ? "reschedule" : "schedule"}
        initialSlot={scheduleTarget?.initialSlot}
        interviewerSuggestions={interviewerSuggestions}
        saving={saving}
        onClose={() => setScheduleTarget(null)}
        onConfirm={async (slot) => {
          if (!scheduleTarget) return;
          await onScheduleInterview(scheduleTarget.applicationId, slot, scheduleTarget.roundId);
          setScheduleTarget(null);
        }}
      />
    </>
  );
}
