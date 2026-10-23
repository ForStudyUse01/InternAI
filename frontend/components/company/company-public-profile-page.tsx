"use client";

import { useEffect, useState } from "react";
import { safeUrl } from "@/lib/safe-url";
import Image from "next/image";
import { Award, Building2, Calendar, Briefcase, MapPin, Percent, ShieldCheck, ShieldAlert, TrendingUp, Users } from "lucide-react";
import { fetchPublicCompanyProfile, buildAssetUrl, type PublicCompanyProfile } from "@/lib/intern-portal";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppIcon } from "@/components/icons/app-icon";
import type { LucideIcon } from "lucide-react";

type Props = {
  companyId: string;
};

function InfoRow({ icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <AppIcon icon={icon} size="sm" className="mt-0.5 shrink-0 text-[var(--ds-muted)]" />
      <div>
        <p className="ds-label">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-[var(--ds-text)]">{value}</p>
      </div>
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: LucideIcon; label: string; value: string | number }) {
  return (
    <div className="company-dashboard-metric-tile">
      <p className="ds-label flex items-center gap-1.5">
        <AppIcon icon={icon} size="xs" className="text-[var(--ds-muted)]" />
        {label}
      </p>
      <p className="ds-stat-value mt-1">{value}</p>
    </div>
  );
}

export function CompanyPublicProfilePage({ companyId }: Props) {
  const [profile, setProfile] = useState<PublicCompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchPublicCompanyProfile(companyId)
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch((err) => {
        if (active) setError((err as Error).message || "Company not found.");
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
      <div role="status" aria-live="polite" aria-label="Loading company profile" className="mx-auto max-w-4xl space-y-4 px-4 py-10">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div role="alert" className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="ds-h3">Company profile unavailable</p>
        <p className="ds-caption mt-2">{error || "This company could not be found."}</p>
      </div>
    );
  }

  const technologies = profile.technologies || [];
  const openPositions = profile.openPositions || [];

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl space-y-6 px-4 py-10 focus:outline-none">
      <Card className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {profile.logoUrl ? (
            <Image
              src={buildAssetUrl(profile.logoUrl)}
              alt={`${profile.companyName} logo`}
              width={64}
              height={64}
              className="h-16 w-16 shrink-0 rounded-xl object-cover"
              unoptimized
            />
          ) : (
            <div className="ds-stat-icon flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-2xl font-bold">
              {profile.companyName?.charAt(0)?.toUpperCase() || "C"}
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="ds-h3 !text-xl">{profile.companyName}</h1>
              {profile.isVerified ? (
                <Badge tone="success" icon={ShieldCheck}>
                  Verified
                </Badge>
              ) : (
                <Badge tone="warning" icon={ShieldAlert}>
                  Verification pending
                </Badge>
              )}
            </div>
            {profile.industry && <p className="ds-caption mt-1">{profile.industry}</p>}
          </div>
        </div>
        {profile.website ? (
          <a
            href={safeUrl(profile.website)}
            target="_blank"
            rel="noreferrer noopener"
            data-cursor="button"
            className="tilt-3d inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--ds-gradient-from)] to-[var(--ds-gradient-to)] px-4 text-sm font-semibold text-[var(--ds-on-primary)] shadow-glow transition duration-200 hover:-translate-y-0.5"
          >
            Visit official website
          </a>
        ) : null}
      </Card>

      {profile.description && (
        <Card title="About" titleIcon={Building2}>
          <p className="whitespace-pre-line text-sm text-[var(--ds-text)]">{profile.description}</p>
        </Card>
      )}

      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoRow icon={Users} label="Company size" value={profile.companySize || ""} />
          <InfoRow icon={MapPin} label="Headquarters" value={profile.headquarters || profile.address || ""} />
          <InfoRow icon={Calendar} label="Founded" value={profile.foundedYear ? String(profile.foundedYear) : ""} />
          <InfoRow
            icon={Calendar}
            label="Joined InternAI"
            value={profile.joinedAt ? new Date(profile.joinedAt).toLocaleDateString() : ""}
          />
        </div>
      </Card>

      {technologies.length > 0 && (
        <Card title="Technologies used">
          <div className="flex flex-wrap gap-2">
            {technologies.map((tech) => (
              <Badge key={tech} tone="neutral">
                {tech}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <div className="stat-grid">
        <StatTile icon={Briefcase} label="Active openings" value={profile.activeOpenings} />
        <StatTile icon={Award} label="Interns hired" value={profile.totalInternsHired} />
        <StatTile icon={Users} label="Total applications" value={profile.totalApplications} />
        <StatTile icon={Percent} label="Hiring success rate" value={`${profile.hiringSuccessRate}%`} />
      </div>

      {profile.hiringProcessOverview && (
        <Card title="Hiring process" titleIcon={TrendingUp}>
          <p className="whitespace-pre-line text-sm text-[var(--ds-text)]">{profile.hiringProcessOverview}</p>
        </Card>
      )}

      <Card title="Current open positions" titleIcon={Briefcase}>
        {openPositions.length === 0 ? (
          <div className="ds-card border-dashed px-4 py-3 text-sm text-[var(--ds-muted)]">
            No active internship listings right now.
          </div>
        ) : (
          <div className="space-y-2">
            {openPositions.map((pos) => (
              <div key={pos._id} className="company-dashboard-item-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--ds-text)]">{pos.role}</p>
                  {pos.internshipType && <Badge tone="accent">{pos.internshipType}</Badge>}
                </div>
                <p className="ds-caption mt-1">
                  {[pos.department, pos.location, pos.mode, pos.duration].filter(Boolean).join(" · ") || "Details in listing"}
                </p>
                {(pos.skillsRequired?.length || 0) > 0 && (
                  <p className="mt-1 text-xs text-[var(--ds-text)]">Skills: {pos.skillsRequired?.join(", ")}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {!profile.website && <p className="ds-caption text-center">No official website on file for this company yet.</p>}
    </main>
  );
}
