"use client";

import { useState } from "react";
import type { CompanyApplication, CompanyInternship, CompanyMatchedCandidate } from "@/lib/company-portal";
import type { InterviewScheduleSlot } from "@/lib/ai-hiring";
import { InterviewScheduleModal } from "./interview-schedule-modal";
import { MatchedCandidatesPanel } from "./matched-candidates-panel";

type MatchedCandidatesViewProps = {
  matches: CompanyMatchedCandidate[];
  applications: CompanyApplication[];
  internships: CompanyInternship[];
  saving?: boolean;
  defaultLimit?: number;
  showViewAllLink?: boolean;
  isHrScoped?: boolean;
  hideTitle?: boolean;
  onOpenProfile: (applicationId: string) => void;
  onMessage: (match: CompanyMatchedCandidate, applicationId: string) => void;
  onShortlist: (applicationId: string) => void;
  onViewResume: (applicationId: string) => void;
  onScheduleInterview: (applicationId: string, slot: InterviewScheduleSlot, roundId?: string) => Promise<void>;
};

export function MatchedCandidatesView({
  matches,
  applications,
  internships,
  saving = false,
  defaultLimit = 0,
  showViewAllLink = false,
  isHrScoped = false,
  hideTitle = false,
  onOpenProfile,
  onMessage,
  onShortlist,
  onViewResume,
  onScheduleInterview
}: MatchedCandidatesViewProps) {
  const [scheduleTarget, setScheduleTarget] = useState<{ applicationId: string; candidateName: string } | null>(null);

  return (
    <>
      <MatchedCandidatesPanel
        matches={matches}
        applications={applications}
        internships={internships}
        defaultLimit={defaultLimit}
        showViewAllLink={showViewAllLink}
        saving={saving}
        isHrScoped={isHrScoped}
        hideTitle={hideTitle}
        onOpenProfile={onOpenProfile}
        onMessage={onMessage}
        onShortlist={onShortlist}
        onViewResume={onViewResume}
        onScheduleInterview={(applicationId, candidateName) => setScheduleTarget({ applicationId, candidateName })}
      />
      <InterviewScheduleModal
        open={Boolean(scheduleTarget)}
        candidateName={scheduleTarget?.candidateName}
        saving={saving}
        onClose={() => setScheduleTarget(null)}
        onConfirm={async (slot) => {
          if (!scheduleTarget) return;
          await onScheduleInterview(scheduleTarget.applicationId, slot);
          setScheduleTarget(null);
        }}
      />
    </>
  );
}
