"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicCompanyProfile, fetchPublicCompanyProfile } from "@/lib/intern-portal";
import { ExternalLink } from "@/components/ui/external-link";
import { Skeleton } from "@/components/ui/skeleton";

type CompanyPublicCardProps = {
  companyId: string;
};

export function CompanyPublicCard({ companyId }: CompanyPublicCardProps) {
  const [profile, setProfile] = useState<PublicCompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPublicCompanyProfile(companyId)
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch(() => {
        if (active) setProfile(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [companyId]);

  if (loading) {
    return (
      <div role="status" aria-live="polite" aria-label="Loading company profile" className="surface-subtle mt-3 grid gap-2 px-3 py-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 w-3/4" />
        ))}
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="surface-subtle mt-3 grid gap-2 px-3 py-3 text-xs text-[var(--ds-text-secondary)] sm:grid-cols-2">
      <p>
        <span className="font-semibold text-[var(--ds-text)]">Joined:</span>{" "}
        {profile.joinedAt ? new Date(profile.joinedAt).toLocaleDateString() : "—"}
      </p>
      <p>
        <span className="font-semibold text-[var(--ds-text)]">Verified:</span>{" "}
        {profile.isVerified ? "Yes" : "Pending"}
      </p>
      <p>
        <span className="font-semibold text-[var(--ds-text)]">Active openings:</span> {profile.activeOpenings}
      </p>
      <p>
        <span className="font-semibold text-[var(--ds-text)]">Interns hired:</span> {profile.totalInternsHired}
      </p>
      <p>
        <span className="font-semibold text-[var(--ds-text)]">Hiring success rate:</span> {profile.hiringSuccessRate}%
      </p>
      {profile.website && (
        <p>
          <ExternalLink href={profile.website}>Company website</ExternalLink>
        </p>
      )}
      <p>
        <Link href={`/company/${companyId}`} className="text-link" target="_blank" rel="noreferrer noopener">
          View full company profile
          <span className="sr-only"> (opens in new tab)</span>
        </Link>
      </p>
    </div>
  );
}
