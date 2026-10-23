"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DashboardPageHeader } from "@/components/dashboard/shared/dashboard-page-header";
import { ScheduledInterviewsPanel } from "@/components/dashboard/intern/scheduled-interviews-panel";
import {
  fetchInternInterviews,
  peekInternApplications,
  type ScheduledInterview
} from "@/lib/intern-portal";
import {
  mapApiInterviewToRecord,
  mapApiInterviewsToRecords,
  type ScheduledInterviewRecord
} from "@/lib/interview-workflow";
import { SkeletonList } from "@/components/ui/skeleton";
import { useChatSocket } from "@/lib/use-chat-socket";

export default function InternInterviewsPage() {
  const [interviewRecords, setInterviewRecords] = useState<ScheduledInterviewRecord[]>([]);
  const [pastInterviewRecords, setPastInterviewRecords] = useState<ScheduledInterviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    const cachedApps = peekInternApplications();
    if (cachedApps?.length) {
      setLoading(false);
    }
  }, []);

  const load = useCallback(async (showSpinner: boolean) => {
    try {
      setError(null);
      if (showSpinner) setLoading(true);
      const interviews: ScheduledInterview[] = await fetchInternInterviews(true);
      const allRecords = interviews.map(mapApiInterviewToRecord);
      setInterviewRecords(mapApiInterviewsToRecords(interviews));
      setPastInterviewRecords(
        allRecords.filter(
          (item) => item.interviewStatus === "completed" || item.interviewStatus === "cancelled"
        )
      );
    } catch (err) {
      setError((err as Error).message || "Failed to load interviews.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  // HR scheduling/rescheduling/cancelling an interview pushes a socket
  // notification; refetch so the card list reflects it without a manual
  // page reload (the notification bell already updates live on its own).
  const refetchTimerRef = useRef<number | null>(null);
  useChatSocket({
    onNotification: (notification) => {
      const type = String((notification as { type?: string })?.type || "");
      if (!type.includes("interview")) return;
      if (refetchTimerRef.current) window.clearTimeout(refetchTimerRef.current);
      refetchTimerRef.current = window.setTimeout(() => void load(false), 400);
    }
  });

  useEffect(() => {
    return () => {
      if (refetchTimerRef.current) window.clearTimeout(refetchTimerRef.current);
    };
  }, []);

  const allApiInterviews = useMemo(() => interviewRecords, [interviewRecords]);

  return (
    <div className="dashboard-stack">
          <DashboardPageHeader
            eyebrow="Intern Portal"
            title="Scheduled Interviews"
            subtitle="Track upcoming interviews and interview room access."
          />

          {error && (
            <div className="rounded-xl border border-[var(--ds-danger)] bg-[var(--ds-danger-bg)] px-4 py-3 text-sm text-[var(--ds-danger)]">
              {error}
            </div>
          )}

          {loading ? (
            <div aria-busy="true" aria-live="polite">
              <SkeletonList rows={3} />
            </div>
          ) : (
            <ScheduledInterviewsPanel interviewRecords={allApiInterviews} pastInterviewRecords={pastInterviewRecords} />
          )}
    </div>
  );
}
