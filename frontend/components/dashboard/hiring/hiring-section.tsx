"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CompanyApplication, CompanyInternship, CompanyMatchedCandidate } from "@/lib/company-portal";
import type { InterviewScheduleSlot } from "@/lib/ai-hiring";
import {
  CompanyDashboardMainGrid,
  CompanyDashboardPageIntro,
  companyDashboardStyles
} from "@/components/dashboard/company/company-dashboard-layout";
import { InterviewScheduleModal } from "@/components/dashboard/company/interview-schedule-modal";
import { ActiveJobsPanel } from "./active-jobs-panel";
import { ApplicationsSheet } from "./applications-sheet";
import { HiringPipelineKanban } from "./hiring-pipeline-kanban";
import { PipelineOverview } from "./pipeline-overview";
import { QuickActionsPanel } from "./quick-actions-panel";
import { ShortlistPanel } from "./shortlist-panel";

export type HiringSectionFocus = "jobs" | "pipeline" | "shortlist" | "applications";

type RecruiterOption = {
  _id: string;
  email: string;
  companyAccountType: "hr" | "ceo";
};

type SheetState =
  | { mode: "closed" }
  | { mode: "all" }
  | { mode: "job"; internshipId: string; role: string }
  | { mode: "interviews" };

type ScheduleTarget = {
  applicationId: string;
  candidateName: string;
};

type HiringSectionProps = {
  internships: CompanyInternship[];
  applications: CompanyApplication[];
  matches?: CompanyMatchedCandidate[];
  focus?: HiringSectionFocus;
  isHrScoped: boolean;
  saving?: boolean;
  canAssign?: boolean;
  recruiters?: RecruiterOption[];
  selectedRecruiterByInternship?: Record<string, string>;
  onRecruiterChange?: (internshipId: string, recruiterId: string) => void;
  onAssignInternship?: (internshipId: string) => void;
  onDeleteInternship?: (internshipId: string) => void;
  onViewProfile: (applicationId: string) => void;
  onViewResume?: (applicationId: string) => void;
  onScheduleInterview?: (applicationId: string, slot: InterviewScheduleSlot) => Promise<void>;
  onMoveStage?: (applicationId: string, status: string, note?: string) => Promise<void>;
};

export function HiringSection({
  internships,
  applications,
  matches = [],
  focus = "jobs",
  isHrScoped,
  saving = false,
  canAssign = false,
  recruiters = [],
  selectedRecruiterByInternship = {},
  onRecruiterChange,
  onAssignInternship,
  onDeleteInternship,
  onViewProfile,
  onViewResume,
  onScheduleInterview,
  onMoveStage
}: HiringSectionProps) {
  const router = useRouter();
  const [sheet, setSheet] = useState<SheetState>({ mode: "closed" });
  const [scheduleTarget, setScheduleTarget] = useState<ScheduleTarget | null>(null);

  useEffect(() => {
    const sectionId =
      focus === "pipeline"
        ? "hiring-pipeline-extended"
        : focus === "shortlist"
          ? "hiring-shortlist"
          : focus === "applications"
            ? "hiring-actions"
            : "hiring-active-jobs";
    const node = document.getElementById(sectionId);
    if (node) {
      window.requestAnimationFrame(() => node.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
    if (focus === "applications") {
      setSheet({ mode: "all" });
    }
  }, [focus]);

  const sheetApplications = useMemo(() => {
    if (sheet.mode === "job") {
      return applications.filter((application) => application.internship?._id === sheet.internshipId);
    }
    return applications;
  }, [applications, sheet]);

  const sheetTitle =
    sheet.mode === "job"
      ? `Applications · ${sheet.role}`
      : sheet.mode === "interviews"
        ? "Schedule Interviews"
        : "All Applications";

  const sheetSubtitle =
    sheet.mode === "interviews"
      ? "Candidates currently in the interview stage."
      : sheet.mode === "all"
        ? "Browse every application across active roles."
        : undefined;

  return (
    <>
      <div className={companyDashboardStyles.pageStack}>
        <CompanyDashboardPageIntro
          title="Hiring"
          subtitle={
            isHrScoped ? "Your assigned recruitment workspace." : "Manage roles, pipeline, and shortlisted talent."
          }
        />

        <CompanyDashboardMainGrid
          main={
            <>
              <ActiveJobsPanel
                internships={internships}
                applications={applications}
                canAssign={canAssign}
                canDelete={!isHrScoped}
                saving={saving}
                recruiters={recruiters}
                selectedRecruiterByInternship={selectedRecruiterByInternship}
                onRecruiterChange={onRecruiterChange}
                onAssignRecruiter={onAssignInternship}
                onDeleteInternship={onDeleteInternship}
                onViewApplications={(internshipId, role) => setSheet({ mode: "job", internshipId, role })}
              />
              {focus === "pipeline" && onMoveStage ? (
                <HiringPipelineKanban
                  applications={applications}
                  matches={matches}
                  internships={internships}
                  saving={saving}
                  onMoveStage={onMoveStage}
                  onOpenProfile={onViewProfile}
                  onViewResume={(applicationId) => onViewResume?.(applicationId)}
                  onScheduleInterview={(applicationId, candidateName) =>
                    setScheduleTarget({ applicationId, candidateName })
                  }
                />
              ) : (
                <PipelineOverview applications={applications} variant="extended" />
              )}
              <ShortlistPanel
                applications={applications}
                matches={matches}
                internships={internships}
                saving={saving}
                onViewProfile={onViewProfile}
                onMessage={(application) => router.push("/dashboard/company/chat")}
                onViewResume={(applicationId) => onViewResume?.(applicationId)}
                onScheduleInterview={(applicationId, candidateName) =>
                  setScheduleTarget({ applicationId, candidateName })
                }
              />
            </>
          }
          sidebar={
            <QuickActionsPanel
              canPostJob={!isHrScoped}
              isExecutive={!isHrScoped}
              onViewAllApplications={() => setSheet({ mode: "all" })}
              onScheduleInterviews={() => setSheet({ mode: "interviews" })}
            />
          }
        />
      </div>

      <ApplicationsSheet
        open={sheet.mode !== "closed"}
        title={sheetTitle}
        subtitle={sheetSubtitle}
        applications={sheetApplications}
        filterStage={sheet.mode === "interviews" ? "interview" : null}
        onClose={() => setSheet({ mode: "closed" })}
        onViewProfile={onViewProfile}
      />

      <InterviewScheduleModal
        open={Boolean(scheduleTarget)}
        candidateName={scheduleTarget?.candidateName}
        saving={saving}
        onClose={() => setScheduleTarget(null)}
        onConfirm={async (slot) => {
          if (!scheduleTarget || !onScheduleInterview) return;
          await onScheduleInterview(scheduleTarget.applicationId, slot);
          setScheduleTarget(null);
        }}
      />
    </>
  );
}
