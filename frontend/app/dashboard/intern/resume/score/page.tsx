"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ResumeIntelligenceDashboard } from "@/components/dashboard/intern/resume-intelligence-dashboard";
import { InternshipPicker } from "@/components/dashboard/intern/internship-picker";
import { InternProfile, InternshipListing, fetchInternProfileWithScore, peekInternProfile } from "@/lib/intern-portal";
import { ReportDownloadButton } from "@/components/reports/report-download-button";
import { apiRequest } from "@/lib/api-client";
import { SkeletonPage } from "@/components/ui/skeleton";

export default function InternResumeScorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<InternProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRole, setLoadingRole] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internshipId, setInternshipId] = useState(searchParams.get("internshipId") || "");
  const [internship, setInternship] = useState<InternshipListing | null>(null);

  useLayoutEffect(() => {
    const cached = peekInternProfile();
    if (cached) {
      setProfile(cached);
      setLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async (targetRole?: string, internshipIdOverride?: string) => {
    try {
      setError(null);
      const scopedInternshipId = internshipIdOverride !== undefined ? internshipIdOverride : internshipId;

      if (targetRole || scopedInternshipId) {
        setLoadingRole(true);
        const params = new URLSearchParams();
        if (targetRole) params.set("targetRole", targetRole);
        if (scopedInternshipId) params.set("internshipId", scopedInternshipId);
        const scoreResp = await apiRequest<{
          score: number;
          analysis?: InternProfile["resume"]["analysis"];
          scoreSource?: string;
        }>(`/api/intern/resume/score?${params.toString()}`);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                resume: {
                  ...prev.resume,
                  score: scoreResp.score,
                  scoreSource: scoreResp.scoreSource,
                  analysis: scoreResp.analysis || prev.resume.analysis
                }
              }
            : prev
        );
      } else {
        setProfile(await fetchInternProfileWithScore());
      }
    } catch (err) {
      setError((err as Error).message || "Failed to load resume intelligence.");
    } finally {
      setLoading(false);
      setLoadingRole(false);
    }
  }, [internshipId]);

  useEffect(() => {
    loadProfile(undefined, internshipId);
    // Only re-run on mount / when the internship selection changes — targetRole changes are handled via the explicit callback below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internshipId]);

  const handleInternshipChange = useCallback(
    (id: string, selected: InternshipListing | null) => {
      setInternshipId(id);
      setInternship(selected);
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("internshipId", id);
      else params.delete("internshipId");
      router.replace(`/dashboard/intern/resume/score${params.toString() ? `?${params.toString()}` : ""}`);
    },
    [router, searchParams]
  );

  return (
    <>
      {loading ? (
          <SkeletonPage />
        ) : (
          <div className="space-y-5">
            {error && (
              <div className="rounded-xl border border-[var(--ds-danger)] bg-[var(--ds-danger-bg)] px-4 py-3 text-sm text-[var(--ds-danger)]">
                {error}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <InternshipPicker value={internshipId} onChange={handleInternshipChange} />
              <ReportDownloadButton reportKey="resume-analysis" label="Download Resume Analysis PDF" disabled={!profile?.resumeUploaded} />
            </div>

            <ResumeIntelligenceDashboard
              profile={profile}
              analysis={profile?.resume?.analysis}
              loadingRole={loadingRole}
              onTargetRoleChange={(roleKey) => loadProfile(roleKey, internshipId)}
              internship={internship}
            />
          </div>
      )}
    </>
  );
}
