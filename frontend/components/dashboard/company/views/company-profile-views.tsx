"use client";

import { ArrowRight, BadgeCheck, Briefcase, Building2, Calendar, FileText, Globe, Layers, Link2, Mail, MapPin, Phone, ShieldCheck, ShieldQuestion, UserCircle, Users } from "lucide-react";
import type { CompanyPersonalProfile, CompanyProfile } from "@/lib/company-portal";
import { resolveCompanyLogoUrl } from "@/lib/company-portal";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppIcon } from "@/components/icons/app-icon";
import { ThemeSettingsPanel } from "@/components/theme/theme-settings-panel";
import { CompanyDashboardPageIntro, companyDashboardStyles } from "@/components/dashboard/company/company-dashboard-layout";
import {
  Empty,
  InfoTile,
  VERIFICATION_CTA,
  VERIFICATION_META,
  VERIFICATION_STATUS_VISUAL,
  field,
  fieldArea,
  fmtDate
} from "@/components/dashboard/company/company-dashboard-shared";
import { CompanyLogoUploadField } from "@/components/dashboard/company/company-logo-upload-field";
import { PersonalPhotoUploadField } from "@/components/dashboard/company/personal-photo-upload-field";
import { TechnologiesInput } from "@/components/dashboard/company/technologies-input";

export type CompanyProfileFormState = {
  companyName: string;
  contactName: string;
  phone: string;
  website: string;
  address: string;
  description: string;
  industry: string;
  companySize: string;
  headquarters: string;
  foundedYear: string;
  technologies: string[];
  hiringProcessOverview: string;
};

export type CompanyPersonalProfileFormState = {
  displayName: string;
  phone: string;
  designation: string;
  linkedInUrl: string;
  personalWebsite: string;
  bio: string;
};

export function CompanyProfileView({ profile, landline }: { profile: CompanyProfile | null; landline: string }) {
  const verMeta = profile ? VERIFICATION_META[profile.verificationStatus] : null;
  return (
    <div className={companyDashboardStyles.pageStack}>
      <CompanyDashboardPageIntro title="Company Profile" subtitle="Public-facing company information shown to candidates." />
      {!profile ? (
        <Empty text="Company profile not available." />
      ) : (
        <div className="space-y-4">
          <Card className="!p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ds-border)] px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={profile.companyName} src={resolveCompanyLogoUrl(profile.logoUrl) || undefined} size="lg" />
                <div className="min-w-0">
                  <h2 className="ds-h3 truncate">{profile.companyName || "Company"}</h2>
                  <p className="ds-caption truncate">{profile.industry || "Industry not set"}</p>
                </div>
              </div>
              {verMeta ? (
                <Badge tone={verMeta.tone} icon={verMeta.icon}>
                  {verMeta.label}
                </Badge>
              ) : null}
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <InfoTile icon={Mail} label="Email" value={profile.companyEmail || "-"} />
              <InfoTile icon={Phone} label="Phone" value={profile.phone || "-"} />
              <InfoTile icon={Phone} label="Landline" value={landline || "-"} />
              <InfoTile icon={Users} label="Contact" value={profile.contactName || "-"} />
              <InfoTile icon={Building2} label="GST" value={profile.gst || "-"} />
              <InfoTile icon={Globe} label="Website" value={profile.website || "-"} />
              <InfoTile icon={MapPin} label="Headquarters" value={profile.headquarters || "-"} />
              <InfoTile icon={Users} label="Company Size" value={profile.companySize || "-"} />
              <InfoTile icon={Calendar} label="Founded" value={profile.foundedYear || "-"} />
            </div>
          </Card>

          <Card title="Location & Overview" titleIcon={MapPin}>
            <div className="grid gap-3">
              <InfoTile label="Address" value={profile.address || "-"} />
              <InfoTile label="Description" value={profile.description || "-"} />
              <InfoTile label="Hiring Process Overview" value={profile.hiringProcessOverview || "-"} />
            </div>
          </Card>

          <Card title="Technology Stack" titleIcon={Layers}>
            {(profile.technologies || []).length === 0 ? (
              <p className="ds-caption">No technologies listed.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {profile.technologies!.map((tech) => (
                  <Badge key={tech} tone="neutral">
                    {tech}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

type CompanyProfileEditViewProps = {
  profile: CompanyProfile | null;
  isHrScoped: boolean;
  saveProfile: (event: React.FormEvent<HTMLFormElement>) => void;
  logoUploading: boolean;
  logoError: string | null;
  handleLogoSelect: (file: File) => void;
  profileForm: CompanyProfileFormState;
  setProfileForm: React.Dispatch<React.SetStateAction<CompanyProfileFormState>>;
  landline: string;
  setLandline: (value: string) => void;
  technologiesError: string | null;
  setTechnologiesError: (value: string | null) => void;
  saving: boolean;
};

export function CompanyProfileEditView({
  profile,
  isHrScoped,
  saveProfile,
  logoUploading,
  logoError,
  handleLogoSelect,
  profileForm,
  setProfileForm,
  landline,
  setLandline,
  technologiesError,
  setTechnologiesError,
  saving
}: CompanyProfileEditViewProps) {
  return (
    <div className={companyDashboardStyles.pageStack}>
      <CompanyDashboardPageIntro
        title="Edit Company Profile"
        subtitle="Update profile information. Shown publicly to students on your company profile page."
      />
      {isHrScoped ? (
        <Empty text="Editing the company profile is restricted to CEO / Company Admin." />
      ) : (
        <form className="space-y-6" onSubmit={saveProfile}>
          <Card title="Company Logo" titleIcon={Building2}>
            <CompanyLogoUploadField
              logoUrl={profile?.logoUrl}
              companyName={profile?.companyName}
              uploading={logoUploading}
              error={logoError}
              onSelect={handleLogoSelect}
            />
          </Card>

          <Card title="Company Details" titleIcon={Building2}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input aria-label="Company Name" className={field} placeholder="Company Name" value={profileForm.companyName} onChange={(e) => setProfileForm((p) => ({ ...p, companyName: e.target.value }))} />
              <input aria-label="Contact Name" className={field} placeholder="Contact Name" value={profileForm.contactName} onChange={(e) => setProfileForm((p) => ({ ...p, contactName: e.target.value }))} />
              <input aria-label="Phone" className={field} placeholder="Phone" value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} />
              <input aria-label="Landline" className={field} placeholder="Landline" value={landline} onChange={(e) => setLandline(e.target.value)} />
              <input aria-label="Website" className={field} placeholder="Website" value={profileForm.website} onChange={(e) => setProfileForm((p) => ({ ...p, website: e.target.value }))} />
              <input aria-label="Industry" className={field} placeholder="Industry" value={profileForm.industry} onChange={(e) => setProfileForm((p) => ({ ...p, industry: e.target.value }))} />
            </div>
          </Card>

          <Card title="Size & Location" titleIcon={MapPin}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input aria-label="Company Size" className={field} placeholder="Company Size (e.g. 51-200 employees)" value={profileForm.companySize} onChange={(e) => setProfileForm((p) => ({ ...p, companySize: e.target.value }))} />
              <input aria-label="Headquarters" className={field} placeholder="Headquarters (city, country)" value={profileForm.headquarters} onChange={(e) => setProfileForm((p) => ({ ...p, headquarters: e.target.value }))} />
              <input aria-label="Founded Year" type="number" className={field} placeholder="Founded Year" value={profileForm.foundedYear} onChange={(e) => setProfileForm((p) => ({ ...p, foundedYear: e.target.value }))} />
              <input aria-label="Address" className={`${field} sm:col-span-2 lg:col-span-3`} placeholder="Address" value={profileForm.address} onChange={(e) => setProfileForm((p) => ({ ...p, address: e.target.value }))} />
            </div>
          </Card>

          <Card title="About & Hiring" titleIcon={Layers}>
            <div className="grid gap-3">
              <div>
                <p className="ds-label mb-1.5" id="company-technologies-label">
                  Technologies <span className="text-[var(--ds-danger)]">*</span>
                </p>
                <TechnologiesInput
                  value={profileForm.technologies}
                  onChange={(next) => {
                    setProfileForm((p) => ({ ...p, technologies: next }));
                    if (next.length > 0) setTechnologiesError(null);
                  }}
                  error={technologiesError}
                  disabled={saving}
                  labelledBy="company-technologies-label"
                />
              </div>
              <textarea aria-label="Description" className={`${fieldArea} min-h-28`} placeholder="Description" value={profileForm.description} onChange={(e) => setProfileForm((p) => ({ ...p, description: e.target.value }))} />
              <textarea
                aria-label="Hiring Process Overview"
                className={`${fieldArea} min-h-20`}
                placeholder="Hiring Process Overview (e.g. Application -> Screening -> Technical round -> Offer)"
                value={profileForm.hiringProcessOverview}
                onChange={(e) => setProfileForm((p) => ({ ...p, hiringProcessOverview: e.target.value }))}
              />
            </div>
          </Card>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      )}
    </div>
  );
}

export function CompanyPersonalProfileView({
  isCeoOrOwner,
  personalProfile
}: {
  isCeoOrOwner: boolean;
  personalProfile: CompanyPersonalProfile | null;
}) {
  return (
    <div className={companyDashboardStyles.pageStack}>
      <CompanyDashboardPageIntro title="Personal Information" subtitle="Your own details as the account holder. Not shown on the company's public profile." />
      {!isCeoOrOwner ? (
        <Empty text="Personal Information is available to CEO / Company Admin only." />
      ) : !personalProfile ? (
        <Empty text="Personal information not available." />
      ) : (
        <div className="space-y-4">
          <Card className="!p-0 overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--ds-border)] px-5 py-4">
              <Avatar name={personalProfile.displayName || personalProfile.email} src={resolveCompanyLogoUrl(personalProfile.photoUrl) || undefined} size="lg" />
              <div className="min-w-0">
                <h2 className="ds-h3 truncate">{personalProfile.displayName || "Unnamed"}</h2>
                <p className="ds-caption truncate">{personalProfile.designation || "Designation not set"}</p>
              </div>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <InfoTile icon={Mail} label="Email" value={personalProfile.email || "-"} />
              <InfoTile icon={Phone} label="Phone" value={personalProfile.phone || "-"} />
              <InfoTile icon={Briefcase} label="Designation" value={personalProfile.designation || "-"} />
              <InfoTile icon={Link2} label="LinkedIn" value={personalProfile.linkedInUrl || "-"} />
              <InfoTile icon={Globe} label="Personal Website" value={personalProfile.personalWebsite || "-"} />
            </div>
          </Card>
          <Card title="Bio" titleIcon={FileText}>
            <p className="ds-body">{personalProfile.bio || "-"}</p>
          </Card>
        </div>
      )}
      <ThemeSettingsPanel />
    </div>
  );
}

type CompanyPersonalProfileEditViewProps = {
  isCeoOrOwner: boolean;
  savePersonalProfile: (event: React.FormEvent<HTMLFormElement>) => void;
  personalProfile: CompanyPersonalProfile | null;
  personalPhotoUploading: boolean;
  personalPhotoError: string | null;
  handlePersonalPhotoSelect: (file: File) => void;
  personalProfileForm: CompanyPersonalProfileFormState;
  setPersonalProfileForm: React.Dispatch<React.SetStateAction<CompanyPersonalProfileFormState>>;
  personalSaving: boolean;
};

export function CompanyPersonalProfileEditView({
  isCeoOrOwner,
  savePersonalProfile,
  personalProfile,
  personalPhotoUploading,
  personalPhotoError,
  handlePersonalPhotoSelect,
  personalProfileForm,
  setPersonalProfileForm,
  personalSaving
}: CompanyPersonalProfileEditViewProps) {
  return (
    <div className={companyDashboardStyles.pageStack}>
      <CompanyDashboardPageIntro title="Edit Personal Information" subtitle="Update your own name, contact details, and bio. Kept separate from the company's public profile." />
      {!isCeoOrOwner ? (
        <Empty text="Personal Information is available to CEO / Company Admin only." />
      ) : (
        <form className="space-y-6" onSubmit={savePersonalProfile}>
          <Card title="Profile Photo" titleIcon={UserCircle}>
            <PersonalPhotoUploadField
              photoUrl={personalProfile?.photoUrl}
              displayName={personalProfile?.displayName}
              uploading={personalPhotoUploading}
              error={personalPhotoError}
              onSelect={handlePersonalPhotoSelect}
            />
          </Card>

          <Card title="Personal Details" titleIcon={UserCircle}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input aria-label="Full Name" className={field} placeholder="Full Name" value={personalProfileForm.displayName} onChange={(e) => setPersonalProfileForm((p) => ({ ...p, displayName: e.target.value }))} />
              <input aria-label="Phone" className={field} placeholder="Phone" value={personalProfileForm.phone} onChange={(e) => setPersonalProfileForm((p) => ({ ...p, phone: e.target.value }))} />
              <input aria-label="Designation" className={field} placeholder="Designation (e.g. Founder & CEO)" value={personalProfileForm.designation} onChange={(e) => setPersonalProfileForm((p) => ({ ...p, designation: e.target.value }))} />
              <input aria-label="LinkedIn URL" className={field} placeholder="LinkedIn URL" value={personalProfileForm.linkedInUrl} onChange={(e) => setPersonalProfileForm((p) => ({ ...p, linkedInUrl: e.target.value }))} />
              <input aria-label="Personal Website" className={field} placeholder="Personal Website" value={personalProfileForm.personalWebsite} onChange={(e) => setPersonalProfileForm((p) => ({ ...p, personalWebsite: e.target.value }))} />
            </div>
          </Card>

          <Card title="Bio" titleIcon={FileText}>
            <textarea aria-label="Bio" className={`${fieldArea} min-h-28`} placeholder="A short bio about yourself" value={personalProfileForm.bio} onChange={(e) => setPersonalProfileForm((p) => ({ ...p, bio: e.target.value }))} />
          </Card>

          <Button type="submit" disabled={personalSaving}>
            {personalSaving ? "Saving..." : "Save Personal Information"}
          </Button>
        </form>
      )}
    </div>
  );
}

export function CompanyVerificationView({
  profile,
  verificationStatus
}: {
  profile: CompanyProfile | null;
  verificationStatus: CompanyProfile["verificationStatus"];
}) {
  const status = verificationStatus;
  const verMeta = VERIFICATION_META[status] || VERIFICATION_META.pending;
  const visual = VERIFICATION_STATUS_VISUAL[verMeta.tone] || VERIFICATION_STATUS_VISUAL.warning;
  const cta = VERIFICATION_CTA[status] || VERIFICATION_CTA.pending;
  const VERIFICATION_COPY: Record<CompanyProfile["verificationStatus"], string> = {
    verified: "Your company is verified. Candidates can see the verified badge on your listings and profile.",
    pending: "Your company is awaiting review by the InternAI team. This usually takes 1-2 business days.",
    rejected: "Your verification request was rejected. Update your company profile details and contact support.",
    suspended: "Your company account has been suspended. Contact support to resolve this."
  };
  const documentChecklist = [
    { label: "Business Registration Proof", present: Boolean(profile?.businessRegistrationProofUrl) },
    { label: "HR Identity Proof", present: Boolean(profile?.hrIdentityProofUrl) },
    { label: "Additional Verification Documents", present: Boolean(profile?.verificationDocuments?.length) }
  ];
  return (
    <div className={cn(companyDashboardStyles.pageStack, "flex min-h-[calc(100dvh-13rem)] flex-col")}>
      <CompanyDashboardPageIntro title="Verification Status" subtitle="Current verification state of your company account." />
      {!profile ? (
        <Empty text="Company profile not available." />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-7 py-8 text-center">
          <span
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: visual.bg, boxShadow: `0 0 0 6px color-mix(in srgb, ${visual.bg} 55%, transparent)` }}
          >
            <AppIcon icon={verMeta.icon} size="lg" style={{ color: visual.fg }} />
          </span>

          <div className="max-w-lg space-y-2.5">
            <Badge tone={verMeta.tone} icon={verMeta.icon} className="!text-sm px-3 py-1.5">
              {verMeta.label}
            </Badge>
            <h2 className="ds-h1">{profile.companyName || "Company"}</h2>
            <p className="ds-body mx-auto max-w-md">{VERIFICATION_COPY[status] || VERIFICATION_COPY.pending}</p>
            {status === "rejected" && profile.rejectionReason ? (
              <p className="ds-caption mx-auto max-w-md text-[var(--ds-danger)]">{profile.rejectionReason}</p>
            ) : null}
          </div>

          <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-3">
            <InfoTile icon={ShieldCheck} label="Verification Level" value={status === "verified" ? "Verified Business" : "Standard"} />
            <InfoTile icon={Calendar} label="Verified On" value={profile.verifiedBadgeIssuedAt ? fmtDate(profile.verifiedBadgeIssuedAt) : "-"} />
            <InfoTile icon={Building2} label="GST" value={profile.gst || "-"} />
          </div>

          <Card title="Verification Checklist" titleIcon={BadgeCheck} className="w-full max-w-2xl text-left">
            <div className="flex flex-wrap items-center gap-3 pb-4">
              <Avatar name={profile.companyName} src={resolveCompanyLogoUrl(profile.logoUrl) || undefined} size="md" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--ds-text)] truncate">{profile.companyName || "Company"}</p>
                <p className="ds-caption truncate">{profile.industry || "Industry not set"}</p>
              </div>
            </div>
            <div className="grid gap-2.5 border-t border-[var(--ds-border)] pt-4 sm:grid-cols-3">
              {documentChecklist.map((item) => (
                <div key={item.label} className="flex items-center gap-2 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] px-3 py-2.5">
                  <AppIcon
                    icon={item.present ? ShieldCheck : ShieldQuestion}
                    size="sm"
                    className={item.present ? "text-[var(--ds-success)]" : "text-[var(--ds-muted)]"}
                  />
                  <span className="text-sm text-[var(--ds-text)]">{item.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Button href={cta.href} size="lg" className="mt-1">
            {cta.label}
            <AppIcon icon={ArrowRight} size="sm" />
          </Button>
        </div>
      )}
    </div>
  );
}
