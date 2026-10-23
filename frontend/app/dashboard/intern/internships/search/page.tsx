"use client";

import { useEffect, useDeferredValue, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SectionPanel } from "@/components/dashboard/shared/section-panel";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import dynamic from "next/dynamic";
import { shouldBlockPageContent, appliedInternshipIdsFromApplications } from "@/lib/instant-load";

const InternApplicationModal = dynamic(
  () => import("@/components/dashboard/intern/intern-application-modal").then((m) => m.InternApplicationModal),
  { ssr: false }
);
import {
  InternshipListing,
  InternProfile,
  fetchActiveInternships,
  fetchInternApplications,
  fetchInternProfile,
  fetchSavedInternships,
  peekActiveInternships,
  peekInternApplications,
  peekInternProfile,
  peekSavedInternships,
  saveInternship,
  unsaveInternship
} from "@/lib/intern-portal";
import { normalizeSkillList, normalizeSkillValue } from "@/lib/skill-normalizer";
import { CompanyPublicCard } from "@/components/dashboard/shared/company-public-card";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";

export default function SearchInternshipsPage() {
  const [profile, setProfile] = useState<InternProfile | null>(null);
  const [internships, setInternships] = useState<InternshipListing[]>([]);
  const [appliedInternshipIds, setAppliedInternshipIds] = useState<Set<string>>(new Set());
  const { pushToast } = useToast();
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [selectedInternship, setSelectedInternship] = useState<InternshipListing | null>(null);
  const [savedInternshipIds, setSavedInternshipIds] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const cachedProfile = peekInternProfile();
    const cachedInternships = peekActiveInternships();
    const cachedApps = peekInternApplications();
    const cachedSaved = peekSavedInternships();
    if (cachedProfile) setProfile(cachedProfile);
    if (cachedInternships?.length) setInternships(cachedInternships);
    if (cachedApps?.length) setAppliedInternshipIds(appliedInternshipIdsFromApplications(cachedApps));
    if (cachedSaved?.length) setSavedInternshipIds(new Set(cachedSaved.map((item) => String(item._id))));
    if (cachedProfile || cachedInternships?.length || cachedApps?.length || cachedSaved?.length) {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setError(null);

        const [loadedProfile, loadedInternships, loadedApplications, loadedSaved] = await Promise.all([
          fetchInternProfile(),
          fetchActiveInternships(),
          fetchInternApplications(),
          fetchSavedInternships()
        ]);

        setProfile(loadedProfile);
        setInternships(loadedInternships);

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
        setError((err as Error).message || "Failed to load internships.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const rawTerm = deferredQuery.trim().toLowerCase();
    const normalizedTerm = normalizeSkillValue(deferredQuery);

    return internships.filter((item) => {
      const modeMatch = filterMode ? String(item.mode || "") === filterMode : true;
      const locationMatch = filterLocation
        ? String(item.location || "").toLowerCase().includes(filterLocation.toLowerCase())
        : true;
      if (!modeMatch || !locationMatch) return false;
      if (!rawTerm) return true;

      const role = String(item.role || "").toLowerCase();
      const company = String(item.company?.companyName || "").toLowerCase();
      const normalizedSkills = normalizeSkillList(item.skillsRequired || []);

      const roleOrCompanyMatch = role.includes(rawTerm) || company.includes(rawTerm);
      const skillMatch = normalizedTerm
        ? normalizedSkills.some((skill) => skill.includes(normalizedTerm))
        : false;

      return roleOrCompanyMatch || skillMatch;
    });
  }, [deferredQuery, internships, filterMode, filterLocation]);

  function openApplyModal(item: InternshipListing) {
    setApplyError(null);
    setApplySuccess(null);
    setSelectedInternship(item);
  }

  async function toggleSave(item: InternshipListing) {
    try {
      const internshipId = item._id;
      const isSaved = savedInternshipIds.has(internshipId);
      if (isSaved) {
        await unsaveInternship(internshipId);
        setSavedInternshipIds((prev) => {
          const next = new Set(prev);
          next.delete(internshipId);
          return next;
        });
        setApplySuccess(`Removed ${item.role} from saved internships.`);
      } else {
        await saveInternship(internshipId);
        setSavedInternshipIds((prev) => new Set([...prev, internshipId]));
        pushToast({ variant: "success", title: "Internship saved", message: item.role });
      }
      setApplyError(null);
    } catch (err) {
      const message = (err as Error).message || "Failed to update saved internships.";
      setApplyError(message);
      pushToast({ variant: "error", title: "Save failed", message });
    }
  }

  return (
    <>
      <SectionPanel title="Search Internships" subtitle="Explore active internships from verified company postings.">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <SearchInput
                ref={searchInputRef}
                value={query}
                onValueChange={setQuery}
                placeholder="Search by role, company, or skill"
                containerClassName="sm:col-span-3"
              />
              <input
                value={filterLocation}
                onChange={(event) => setFilterLocation(event.target.value)}
                placeholder="Filter by location"
                aria-label="Filter by location"
                className="surface-subtle w-full px-3 py-2 text-sm"
              />
              <select
                className="surface-subtle w-full px-3 py-2 text-sm"
                value={filterMode}
                aria-label="Filter by work mode"
                onChange={(event) => setFilterMode(event.target.value)}
              >
                <option value="">All modes</option>
                <option value="remote">Remote</option>
                <option value="on-site">On-site</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            {shouldBlockPageContent(internships) && loading && <SkeletonList rows={4} />}
            {error && <div className="rounded-xl border border-[var(--ds-danger)]/40 bg-[var(--ds-danger-bg)] px-4 py-3 text-sm text-[var(--ds-danger)]">{error}</div>}
            {!error && applyError && <div className="rounded-xl border border-[var(--ds-danger)]/40 bg-[var(--ds-danger-bg)] px-4 py-3 text-sm text-[var(--ds-danger)]">{applyError}</div>}
            {!error && applySuccess && <div className="rounded-xl border border-[var(--ds-success)]/40 bg-[var(--ds-success-bg)] px-4 py-3 text-sm text-[var(--ds-success)]">{applySuccess}</div>}

            {!loading && !error && internships.length === 0 && (
              <EmptyState
                presetKey="internships"
                title="No Internships Posted Yet"
                description="New postings from verified companies will show up here as soon as they go live."
                size="sm"
              />
            )}

            {!error && internships.length > 0 && filtered.length === 0 && (
              <EmptyState
                presetKey="search"
                title="No Results Found"
                description="Try a different keyword, location, or mode filter."
                action={
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      setFilterLocation("");
                      setFilterMode("");
                    }}
                  >
                    Clear Filters
                  </Button>
                }
                secondaryCtaLabel="Try Different Keywords"
                onSecondaryCtaClick={() => {
                  setQuery("");
                  searchInputRef.current?.focus();
                }}
                size="sm"
              />
            )}

            {!error && filtered.length > 0 && (
              <div className="space-y-2">
                {filtered.map((item) => {
                  const internshipId = item._id;
                  const alreadyApplied = appliedInternshipIds.has(internshipId);
                  const isSaved = savedInternshipIds.has(internshipId);
                  return (
                    <div key={internshipId} className="surface-subtle px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--ds-text)]">{item.role}</p>
                            {typeof item.matchPercent === "number" && (
                              <span className="rounded-full bg-[var(--ds-info-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--ds-primary-text)]">
                                {item.matchPercent}% match
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--ds-text-secondary)]">{item.company?.companyName || "Company"}</p>
                          <p className="mt-1 text-xs text-[var(--ds-muted)]">{item.location || "Location not specified"}</p>
                          <p className="mt-1 text-xs text-[var(--ds-text-secondary)]">
                            Required skills: {(item.skillsRequired || []).length > 0 ? item.skillsRequired?.join(", ") : "Not specified"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="secondary" onClick={() => toggleSave(item)}>
                            {isSaved ? "Unsave" : "Save"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={alreadyApplied ? "secondary" : "primary"}
                            disabled={alreadyApplied}
                            onClick={() => openApplyModal(item)}
                          >
                            {alreadyApplied ? "Applied" : "Apply"}
                          </Button>
                        </div>
                      </div>
                      {item.company?._id && <CompanyPublicCard companyId={String(item.company._id)} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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

