"use client";

import { BrandedEmptyState } from "@/components/dashboard/shared/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { BRANDED_EMPTY_STATES } from "@/lib/brand";
import { SectionPanel } from "@/components/dashboard/shared/section-panel";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useState } from "react";

const InternApplicationModal = dynamic(
  () => import("@/components/dashboard/intern/intern-application-modal").then((m) => m.InternApplicationModal),
  { ssr: false }
);
import { shouldBlockPageContent, appliedInternshipIdsFromApplications } from "@/lib/instant-load";
import {
  InternshipListing,
  InternProfile,
  fetchInternApplications,
  fetchInternProfile,
  fetchSavedInternships,
  peekInternApplications,
  peekSavedInternships,
  unsaveInternship
} from "@/lib/intern-portal";

export default function SavedInternshipsPage() {
  const [profile, setProfile] = useState<InternProfile | null>(null);
  const [saved, setSaved] = useState<InternshipListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [selectedInternship, setSelectedInternship] = useState<InternshipListing | null>(null);
  const [appliedInternshipIds, setAppliedInternshipIds] = useState<Set<string>>(new Set());

  useLayoutEffect(() => {
    const cachedSaved = peekSavedInternships();
    const cachedApps = peekInternApplications();
    if (cachedSaved?.length) setSaved(cachedSaved);
    if (cachedApps?.length) setAppliedInternshipIds(appliedInternshipIdsFromApplications(cachedApps));
    if (cachedSaved?.length || cachedApps?.length) setLoading(false);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const [loadedProfile, loadedSaved, loadedApplications] = await Promise.all([fetchInternProfile(), fetchSavedInternships(), fetchInternApplications()]);
        setProfile(loadedProfile);
        setSaved(loadedSaved);
        const appliedIds = new Set<string>();
        loadedApplications.forEach((app) => {
          const internshipId = app.internshipId || app.internship?._id;
          if (internshipId) appliedIds.add(String(internshipId));
        });
        setAppliedInternshipIds(appliedIds);
      } catch (e) {
        setError((e as Error).message || "Failed to load saved internships.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <>
      <SectionPanel title="Saved Internships" subtitle="Track opportunities you want to revisit.">
          {shouldBlockPageContent(saved) && loading && <SkeletonList rows={3} />}
          {error && <div className="rounded-xl border border-[var(--ds-danger)]/40 bg-[var(--ds-danger-bg)] px-4 py-3 text-sm text-[var(--ds-danger)]">{error}</div>}
          {!error && applySuccess && <div className="rounded-xl border border-[var(--ds-success)]/40 bg-[var(--ds-success-bg)] px-4 py-3 text-sm text-[var(--ds-success)]">{applySuccess}</div>}
          {!loading && !error && saved.length === 0 && (
            <BrandedEmptyState preset={BRANDED_EMPTY_STATES.savedInternships} presetKey="savedInternships" />
          )}
          {saved.length > 0 && (
            <div className="space-y-3">
              {saved.map((item) => (
                <div key={item._id} className="surface-subtle flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ds-text)]">{item.role}</p>
                    <p className="text-xs text-[var(--ds-text-secondary)]">{item.company?.companyName || "Company"}</p>
                    <p className="text-xs text-[var(--ds-muted)]">{item.location || "Location not specified"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setError(null);
                        setApplySuccess(null);
                        setSelectedInternship(item);
                      }}
                    >
                      View Details
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        try {
                          await unsaveInternship(item._id);
                          setSaved((prev) => prev.filter((savedItem) => savedItem._id !== item._id));
                        } catch (e) {
                          setError((e as Error).message || "Failed to unsave internship.");
                        }
                      }}
                    >
                      Unsave
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={appliedInternshipIds.has(item._id) ? "secondary" : "primary"}
                      disabled={appliedInternshipIds.has(item._id)}
                      onClick={() => {
                        setError(null);
                        setApplySuccess(null);
                        setSelectedInternship(item);
                      }}
                    >
                      {appliedInternshipIds.has(item._id) ? "Applied" : "Apply"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionPanel>
        {selectedInternship && (
          <InternApplicationModal
            internship={selectedInternship}
            resumePath={profile?.resume?.filePath || ""}
            onClose={() => setSelectedInternship(null)}
            onSuccess={() => {
              setAppliedInternshipIds((prev) => new Set([...prev, selectedInternship._id]));
              setApplySuccess(`Application submitted for ${selectedInternship.role}.`);
              setSelectedInternship(null);
            }}
          />
      )}
    </>
  );
}
