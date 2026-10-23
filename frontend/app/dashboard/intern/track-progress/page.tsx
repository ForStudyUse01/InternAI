"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { DashboardPageHeader } from "@/components/dashboard/shared/dashboard-page-header";
import { ErrorState, classifyErrorMessage } from "@/components/errors/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { shouldBlockPageContent } from "@/lib/instant-load";
import {
  Application,
  InternProfile,
  fetchInternApplications,
  fetchInternInterviews,
  fetchInternProfile,
  peekInternApplications,
  peekInternProfile
} from "@/lib/intern-portal";
import { mapApiInterviewsToRecords, type ScheduledInterviewRecord } from "@/lib/interview-workflow";
import { getProgressHistory, recordProgressHistory, type ProgressHistoryPoint } from "@/lib/weekly-progress-tracker";
import { getAptitudeHistory, type AptitudeHistoryRecord } from "@/lib/aptitude-progress";
import { fetchMyCertifications, type CertificationStats } from "@/lib/certifications-portal";
import { getPlacementReadiness } from "@/components/dashboard/intern/dashboard-overview-cards";
import { PriorityRoadmapSection, AchievementsSection } from "@/components/dashboard/intern/career-coach-dashboard";
import {
  ActivityHeatmapsRow,
  MockTestHistorySection,
  SkillAndCertificationRow,
  StatusBreakdownRow,
  TimelinesRow,
  TrendChartsGrid
} from "@/components/dashboard/intern/analytics-center-sections";

export default function AnalyticsCenterPage() {
  const [profile, setProfile] = useState<InternProfile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [interviewRecords, setInterviewRecords] = useState<ScheduledInterviewRecord[]>([]);
  const [certStats, setCertStats] = useState<CertificationStats | null>(null);
  const [aptitudeRecords, setAptitudeRecords] = useState<AptitudeHistoryRecord[]>([]);
  const [progressHistory, setProgressHistory] = useState<ProgressHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    const cachedProfile = peekInternProfile();
    const cachedApps = peekInternApplications();
    if (cachedProfile) setProfile(cachedProfile);
    if (cachedApps?.length) setApplications(cachedApps);
    if (cachedProfile || cachedApps?.length) setLoading(false);
    setAptitudeRecords(getAptitudeHistory());
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      setError(null);
      const loadedProfile = await fetchInternProfile();
      setProfile(loadedProfile);

      const [apps, interviews, certifications] = await Promise.all([
        fetchInternApplications(),
        fetchInternInterviews().catch(() => []),
        fetchMyCertifications().catch(() => ({ certifications: [], stats: null }))
      ]);

      setApplications(apps || []);
      setInterviewRecords(mapApiInterviewsToRecords(interviews || []));
      setCertStats(certifications.stats || null);
      setProgressHistory(getProgressHistory(loadedProfile._id || "anon"));
    } catch (err) {
      setError((err as Error).message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const profileCompletion = useMemo(() => {
    if (!profile) return 0;
    const checks = [
      Boolean(profile.fullName),
      Boolean(profile.mobile),
      (profile.skills || []).length > 0,
      Boolean(profile.summary),
      profile.resumeUploaded
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile]);

  const readiness = useMemo(
    () => getPlacementReadiness(profile?.resume?.analysis, profile?.resume?.score ?? 0),
    [profile]
  );

  const resumeScore = Math.round(profile?.resume?.analysis?.overallScore ?? profile?.resume?.score ?? 0);
  const atsScore = Math.round(
    profile?.resume?.analysis?.categoryScores?.ats ?? profile?.resume?.analysis?.compositeScores?.ats ?? 0
  );

  useEffect(() => {
    if (!profile) return;
    const updated = recordProgressHistory(profile._id || "anon", {
      resumeScore,
      atsScore,
      applications: applications.length,
      interviews: interviewRecords.length,
      profileCompletion,
      readiness: readiness.score
    });
    setProgressHistory(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?._id, resumeScore, atsScore, applications.length, interviewRecords.length, profileCompletion, readiness.score]);

  return (
    <div className="dashboard-stack">
      <DashboardPageHeader
        eyebrow="Intern Portal"
        title="Student Analytics Center"
        subtitle="Every trend, timeline, and breakdown behind your placement prep, drawn from data already tracked across the platform."
      />

      {error && <ErrorState variant={classifyErrorMessage(error)} size="inline" description={error} onRetry={loadAnalytics} />}

      {shouldBlockPageContent(profile, applications) && loading ? (
        <div className="stat-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <TrendChartsGrid progressHistory={progressHistory} aptitudeRecords={aptitudeRecords} />

          <SkillAndCertificationRow analysis={profile?.resume?.analysis} certStats={certStats} />

          <PriorityRoadmapSection profile={profile} analysis={profile?.resume?.analysis} />

          <StatusBreakdownRow applications={applications} interviewRecords={interviewRecords} />

          <TimelinesRow applications={applications} interviewRecords={interviewRecords} />

          <ActivityHeatmapsRow applications={applications} interviewRecords={interviewRecords} />

          <MockTestHistorySection aptitudeRecords={aptitudeRecords} />

          <AchievementsSection
            profile={profile}
            applications={applications}
            interviewCount={interviewRecords.length}
            profileCompletion={profileCompletion}
          />
        </>
      )}
    </div>
  );
}
