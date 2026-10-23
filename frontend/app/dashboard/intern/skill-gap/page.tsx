"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SkillGapAnalysisPanel } from "@/components/dashboard/intern/skill-gap-analysis-panel";
import { InternshipPicker } from "@/components/dashboard/intern/internship-picker";
import { InternProfile, InternshipListing, fetchInternProfileWithScore, peekInternProfile } from "@/lib/intern-portal";
import { FEATURE_FLAGS } from "@/constants/featureFlags";
import { ReportDownloadButton } from "@/components/reports/report-download-button";
import { apiRequest } from "@/lib/api-client";
import { SkeletonPage } from "@/components/ui/skeleton";

export default function InternSkillGapPage() {
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

  const loadProfile = useCallback(async (targetRole?: string) => {
    try {
      setError(null);
      if (targetRole) {
        setLoadingRole(true);
        const scoreResp = await apiRequest<{
          score: number;
          analysis?: InternProfile["resume"]["analysis"];
        }>(`/api/intern/resume/score?targetRole=${encodeURIComponent(targetRole)}`);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                resume: {
                  ...prev.resume,
                  score: scoreResp.score,
                  analysis: scoreResp.analysis || prev.resume.analysis
                }
              }
            : prev
        );
      } else {
        setProfile(await fetchInternProfileWithScore());
      }
    } catch (err) {
      setError((err as Error).message || "Failed to load skill analysis.");
    } finally {
      setLoading(false);
      setLoadingRole(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleInternshipChange = useCallback(
    (id: string, selected: InternshipListing | null) => {
      setInternshipId(id);
      setInternship(selected);
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("internshipId", id);
      else params.delete("internshipId");
      router.replace(`/dashboard/intern/skill-gap${params.toString() ? `?${params.toString()}` : ""}`);
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
              <div className="rounded-xl border border-[var(--ds-danger)]/40 bg-[var(--ds-danger-bg)] px-4 py-3 text-sm text-[var(--ds-danger)]">
                {error}
              </div>
            )}

            {!FEATURE_FLAGS.ENABLE_AI ? (
              <div className="surface-subtle px-4 py-3 text-sm text-[var(--ds-text-secondary)]">AI features are currently disabled.</div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <InternshipPicker value={internshipId} onChange={handleInternshipChange} />
                  <ReportDownloadButton reportKey="skill-gap" label="Download Skill Gap PDF" disabled={!profile?.resumeUploaded} />
                </div>

                <SkillGapAnalysisPanel
                  profile={profile}
                  analysis={profile?.resume?.analysis}
                  loadingRole={loadingRole}
                  onTargetRoleChange={(roleKey) => loadProfile(roleKey)}
                  internship={internship}
                />
              </>
            )}
          </div>
      )}
    </>
  );
}
