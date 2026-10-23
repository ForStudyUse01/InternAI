"use client";

import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { SectionPanel } from "@/components/dashboard/shared/section-panel";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { RecommendedInternshipFiltersPanel } from "@/components/dashboard/intern/recommended-internship-filters";

const InternApplicationModal = dynamic(
  () => import("@/components/dashboard/intern/intern-application-modal").then((m) => m.InternApplicationModal),
  { ssr: false }
);
import {
  InternshipListing,
  InternProfile,
  Recommendation,
  fetchInternApplications,
  fetchInternProfile,
  fetchInternRecommendations,
  fetchSavedInternships,
  peekInternProfile,
  saveInternship,
  unsaveInternship
} from "@/lib/intern-portal";
import {
  EMPTY_RECOMMENDED_FILTERS,
  applyRecommendationFilters,
  countActiveRecommendedFilters,
  deriveRecommendationFilterOptions,
  loadPersistedRecommendedFilters,
  persistRecommendedFilters,
  type RecommendedInternshipFilters
} from "@/lib/recommendation-filters";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { SkeletonPage } from "@/components/ui/skeleton";

export default function RecommendedInternshipsPage() {
  const [profile, setProfile] = useState<InternProfile | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [filters, setFilters] = useState<RecommendedInternshipFilters>(EMPTY_RECOMMENDED_FILTERS);
  const [appliedInternshipIds, setAppliedInternshipIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [selectedInternship, setSelectedInternship] = useState<InternshipListing | null>(null);
  const [savedInternshipIds, setSavedInternshipIds] = useState<Set<string>>(new Set());

  const parsedSkills = profile?.resume?.parsed?.skills || [];
  const hasParsedResumeSkills = parsedSkills.length > 0;
  const deferredQuery = useDeferredValue(filters.query);

  useLayoutEffect(() => {
    const cached = peekInternProfile();
    if (cached) {
      setProfile(cached);
      setLoading(false);
    }
    setFilters(loadPersistedRecommendedFilters());
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setError(null);

        const loadedProfile = await fetchInternProfile();
        setProfile(loadedProfile);

        const [loadedApplications, loadedRecommendations, loadedSaved] = await Promise.all([
          fetchInternApplications(),
          loadedProfile.resumeUploaded && (loadedProfile.resume?.parsed?.skills || []).length > 0
            ? fetchInternRecommendations(loadedProfile.resume.parsed?.skills || [], true)
            : Promise.resolve([] as Recommendation[]),
          fetchSavedInternships()
        ]);

        setRecommendations(loadedRecommendations);
        const appliedIds = new Set<string>();
        loadedApplications.forEach((application) => {
          const internshipId = application.internshipId || application.internship?._id;
          if (internshipId) {
            appliedIds.add(String(internshipId));
          }
        });
        setAppliedInternshipIds(appliedIds);
        setSavedInternshipIds(new Set((loadedSaved || []).map((item) => String(item._id))));
      } catch (err) {
        setError((err as Error).message || "Failed to load recommendations.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filterOptions = useMemo(() => deriveRecommendationFilterOptions(recommendations), [recommendations]);

  const filteredRecommendations = useMemo(() => {
    return applyRecommendationFilters(recommendations, {
      ...filters,
      query: deferredQuery
    });
  }, [recommendations, filters, deferredQuery]);

  const activeFilterCount = useMemo(() => countActiveRecommendedFilters(filters), [filters]);

  const updateFilters = useCallback((patch: Partial<RecommendedInternshipFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      persistRecommendedFilters(next);
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_RECOMMENDED_FILTERS);
    persistRecommendedFilters(EMPTY_RECOMMENDED_FILTERS);
  }, []);

  function openApplyModal(item: Recommendation["internship"]) {
    setApplyError(null);
    setApplySuccess(null);
    setSelectedInternship({
      _id: item._id,
      role: item.role,
      description: item.description,
      skillsRequired: item.skillsRequired || [],
      prioritySkills: item.prioritySkills || [],
      stipend: item.stipend,
      duration: item.duration,
      location: item.location,
      mode: item.mode,
      responsibilities: item.responsibilities,
      company: item.company
    });
  }

  async function toggleSave(internship: Recommendation["internship"]) {
    try {
      const internshipId = internship._id;
      const isSaved = savedInternshipIds.has(internshipId);
      if (isSaved) {
        await unsaveInternship(internshipId);
        setSavedInternshipIds((prev) => {
          const next = new Set(prev);
          next.delete(internshipId);
          return next;
        });
        setApplySuccess(`Removed ${internship.role} from saved internships.`);
      } else {
        await saveInternship(internshipId);
        setSavedInternshipIds((prev) => new Set([...prev, internshipId]));
        setApplySuccess(`Saved ${internship.role}.`);
      }
      setApplyError(null);
    } catch (err) {
      setApplyError((err as Error).message || "Failed to update saved internships.");
    }
  }

  return (
    <>
      {loading ? (
        <SkeletonPage />
      ) : (
        <SectionPanel
          title="Recommended Internships"
          subtitle="Transparent recommendation model with separate required, preferred, and overall scoring."
        >
          {error && <p className="text-sm text-[var(--ds-danger)]">{error}</p>}
          {applyError && !error && <p className="text-sm text-[var(--ds-danger)]">{applyError}</p>}
          {applySuccess && !error && <p className="text-sm text-[var(--ds-success)]">{applySuccess}</p>}
          {!error && (!profile?.resumeUploaded || !hasParsedResumeSkills) && (
            <EmptyState
              presetKey="resume"
              title="Upload Your Resume to Get Recommendations"
              description="Our AI matches your skills against live internships once your resume is uploaded and parsed."
              ctaLabel="Upload Resume"
              ctaHref="/dashboard/intern/resume"
              size="sm"
            />
          )}

          {!error && profile?.resumeUploaded && hasParsedResumeSkills && recommendations.length > 0 && (
            <div className="mb-4">
              <RecommendedInternshipFiltersPanel
                filters={filters}
                options={filterOptions}
                activeCount={activeFilterCount}
                resultCount={filteredRecommendations.length}
                totalCount={recommendations.length}
                onChange={updateFilters}
                onReset={resetFilters}
              />
            </div>
          )}

          {!error && profile?.resumeUploaded && hasParsedResumeSkills && recommendations.length === 0 && (
            <EmptyState
              presetKey="internships"
              title="No Matching Internships Yet"
              description="We'll surface new matches here as soon as relevant postings go live."
              ctaLabel="Search All Internships"
              ctaHref="/dashboard/intern/internships/search"
              size="sm"
            />
          )}

          {!error && recommendations.length > 0 && filteredRecommendations.length === 0 && (
            <EmptyState
              presetKey="search"
              title="No Matches for These Filters"
              description="Try clearing filters or broadening your search criteria."
              ctaLabel="Clear Filters"
              onCtaClick={resetFilters}
              size="sm"
            />
          )}

          {!error && filteredRecommendations.length > 0 && (
            <div className="space-y-2.5">
              {filteredRecommendations.map((item) => {
                const internshipId = item.internship._id;
                const alreadyApplied = appliedInternshipIds.has(internshipId);
                const isSaved = savedInternshipIds.has(internshipId);
                return (
                  <div key={internshipId} className="surface-subtle p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--ds-text)]">{item.internship.role}</p>
                        <p className="mt-1 text-xs text-[var(--ds-text-secondary)]">
                          {item.internship.company?.companyName || "Company"}
                        </p>
                        <p className="mt-1 text-xs text-[var(--ds-muted)]">
                          {[item.internship.location, item.internship.mode, item.internship.duration, item.internship.stipend ? `₹${item.internship.stipend}` : ""]
                            .filter(Boolean)
                            .join(" · ") || "Details not specified"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="rounded-full bg-[var(--ds-info-bg)] px-2 py-1 text-xs font-semibold text-[var(--ds-info)]">
                          Overall Score {item.overallRecommendationScore}%
                        </p>
                        <Button type="button" size="sm" variant="secondary" onClick={() => toggleSave(item.internship)}>
                          {isSaved ? "Unsave" : "Save"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={alreadyApplied ? "secondary" : "primary"}
                          disabled={alreadyApplied}
                          onClick={() => openApplyModal(item.internship)}
                        >
                          {alreadyApplied ? "Applied" : "Apply"}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-2 grid gap-2 text-xs text-[var(--ds-text-secondary)] sm:grid-cols-2">
                      <div className="surface-subtle px-2.5 py-2">Required Skill Match: {item.requiredSkillMatchPercent}%</div>
                      {item.preferredSkillMatchPercent !== null && (
                        <div className="surface-subtle px-2.5 py-2">Preferred Skill Match: {item.preferredSkillMatchPercent}%</div>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-[var(--ds-text-secondary)]">
                      Missing required skills: {item.missingRequiredSkills.length > 0 ? item.missingRequiredSkills.join(", ") : "None"}
                    </p>

                    {item.preferredSkillMatchPercent !== null && (
                      <p className="mt-1 text-xs text-[var(--ds-text-secondary)]">
                        Missing preferred skills: {item.missingPreferredSkills.length > 0 ? item.missingPreferredSkills.join(", ") : "None"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionPanel>
      )}
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
