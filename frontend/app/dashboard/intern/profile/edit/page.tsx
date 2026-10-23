"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SectionPanel } from "@/components/dashboard/shared/section-panel";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard/shared/dashboard-page-header";
import { useToast } from "@/components/ui/toast";
import { apiRequest } from "@/lib/api-client";
import { InternProfile, fetchInternProfile, invalidateInternCache, peekInternProfile } from "@/lib/intern-portal";
import { SkillSelector } from "@/components/dashboard/shared/skill-selector";
import { SectionTabButton } from "@/components/icons/section-tab-button";
import { EDIT_TAB_ICONS } from "@/components/icons/section-tab-icons";
import { validateLinkedInUrl } from "@/lib/validation";
import { SkeletonPage } from "@/components/ui/skeleton";

type EditSectionKey = "personal" | "education" | "learning" | "skills";

const EDIT_SECTIONS: Array<{ key: EditSectionKey; label: string }> = [
  { key: "personal", label: "Personal Information" },
  { key: "education", label: "Education" },
  { key: "learning", label: "Courses & Certifications" },
  { key: "skills", label: "Skills" }
];

export default function EditInternProfilePage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [profile, setProfile] = useState<InternProfile | null>(null);
  const [activeSection, setActiveSection] = useState<EditSectionKey>("personal");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [summary, setSummary] = useState("");

  const [college, setCollege] = useState("");
  const [degree, setDegree] = useState("");
  const [branch, setBranch] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [passingYear, setPassingYear] = useState("");

  const [courseName, setCourseName] = useState("");
  const [coursePlatform, setCoursePlatform] = useState("");
  const [courseCompletionDate, setCourseCompletionDate] = useState("");
  const [courseCertificateUrl, setCourseCertificateUrl] = useState("");
  const [courseVerificationLink, setCourseVerificationLink] = useState("");

  const [certName, setCertName] = useState("");
  const [certIssuer, setCertIssuer] = useState("");
  const [certYear, setCertYear] = useState("");
  const [certCertificateUrl, setCertCertificateUrl] = useState("");
  const [certVerificationLink, setCertVerificationLink] = useState("");

  const [skills, setSkills] = useState<string[]>([]);
  const [softSkills, setSoftSkills] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    const cached = peekInternProfile();
    if (cached) {
      setProfile(cached);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const data = await fetchInternProfile(true);
        setProfile(data);

        const parsedSkills = Array.isArray(data.resume?.parsed?.skills) ? data.resume?.parsed?.skills : [];
        const mergedTechnical = Array.from(new Set([...(data.skills || []), ...parsedSkills].map((item) => String(item).trim()).filter(Boolean)));

        const edu = data.educationDetails?.[0];
        const course = data.courseEntries?.[0];
        const cert = data.certificationEntries?.[0];

        setFullName(data.fullName || "");
        setEmail(data.email || "");
        setMobile(data.mobile || "");
        setAddress(data.address || data.profileSections?.personalInformation?.location || "");
        setLinkedinUrl(data.linkedinUrl || "");
        setGithubUrl(data.githubUrl || "");
        setPortfolioUrl(data.portfolioUrl || "");
        setSummary(data.summary || data.bio || data.profileSections?.professionalSummary || "");

        setCollege(edu?.college || "");
        setDegree(edu?.degree || "");
        setBranch(edu?.branch || "");
        setCgpa(edu?.cgpa || "");
        setPassingYear(edu?.passingYear || "");

        setCourseName(course?.courseName || "");
        setCoursePlatform(course?.platform || "");
        setCourseCompletionDate(course?.completionDate || "");
        setCourseCertificateUrl(course?.certificateUrl || "");
        setCourseVerificationLink(course?.verificationLink || "");

        setCertName(cert?.name || "");
        setCertIssuer(cert?.issuer || "");
        setCertYear(cert?.year || "");
        setCertCertificateUrl(cert?.certificateUrl || "");
        setCertVerificationLink(cert?.verificationLink || "");

        setSkills(mergedTechnical);
        setSoftSkills(data.softSkills || []);
      } catch (err) {
        setError((err as Error).message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const completionHint = useMemo(() => {
    const checks = [
      Boolean(fullName),
      Boolean(mobile),
      skills.length > 0,
      Boolean(summary),
      Boolean(college),
      Boolean(courseName || certName)
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [fullName, mobile, skills.length, summary, college, courseName, certName]);

  async function save() {
    try {
      setSaving(true);
      setError(null);

      if (linkedinUrl && !validateLinkedInUrl(linkedinUrl)) {
        setError("Please enter a valid LinkedIn URL.");
        return;
      }

      if (!summary.trim()) {
        setError("Professional Summary is required. Write a short summary of your background and goals.");
        setActiveSection("personal");
        return;
      }

      const response = await apiRequest<{ profile: InternProfile }>("/api/intern/profile", {
        method: "PUT",
        body: JSON.stringify({
          fullName,
          mobile,
          skills,
          softSkills,
          summary,
          bio: summary,
          address,
          linkedinUrl,
          githubUrl,
          portfolioUrl,
          // This form only exposes a single education/course/certification
          // entry for editing (entry [0]) -- entries beyond that (e.g. from
          // resume parsing) must be preserved from the loaded profile rather
          // than replaced wholesale, or saving any unrelated field here would
          // silently delete them.
          // Same guard as courseEntries/certificationEntries below: an
          // all-blank entry [0] means "no education entered", not "save an
          // empty education record" -- without it every save of an
          // education-less profile fabricated a phantom empty entry (and the
          // admin user-details modal then showed a blank academic row instead
          // of its "No academic details on file." empty state).
          educationDetails:
            college || degree || branch || cgpa || passingYear
              ? [{ college, degree, branch, cgpa, passingYear }, ...(profile?.educationDetails?.slice(1) || [])]
              : profile?.educationDetails?.slice(1) || [],
          courseEntries: courseName
            ? [
                {
                  courseName,
                  platform: coursePlatform,
                  completionDate: courseCompletionDate,
                  certificateUrl: courseCertificateUrl,
                  verificationLink: courseVerificationLink
                },
                ...(profile?.courseEntries?.slice(1) || [])
              ]
            : profile?.courseEntries?.slice(1) || [],
          certificationEntries: certName
            ? [
                {
                  name: certName,
                  issuer: certIssuer,
                  year: certYear,
                  certificateUrl: certCertificateUrl,
                  verificationLink: certVerificationLink
                },
                ...(profile?.certificationEntries?.slice(1) || [])
              ]
            : profile?.certificationEntries?.slice(1) || [],
          profileSections: {
            personalInformation: {
              location: address,
              headline: degree ? `${degree}${branch ? ` · ${branch}` : ""}` : ""
            },
            professionalSummary: summary
          }
        })
      });

      invalidateInternCache();
      setProfile(response.profile);
      setSkills(response.profile.skills || skills);
      setSoftSkills(response.profile.softSkills || softSkills);
      pushToast({ variant: "success", title: "Profile updated", message: "Your profile changes were saved." });
    } catch (err) {
      const message = (err as Error).message || "Failed to update profile.";
      setError(message);
      pushToast({ variant: "error", title: "Update failed", message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-stack">
          <DashboardPageHeader
            eyebrow="My Profile"
            title="Edit Profile"
            subtitle="Manage your profile with structured sections for better clarity and recruiter readiness."
            actions={<span className="rounded-full bg-[var(--ds-info-bg)] px-3 py-1 text-xs font-semibold text-[var(--ds-primary-text)]">{completionHint}% complete</span>}
          />

          {loading ? (
            <SkeletonPage />
          ) : (
            <>
              <div className="surface-subtle rounded-2xl p-2">
                <div className="flex flex-wrap gap-2">
                  {EDIT_SECTIONS.map((section) => (
                    <SectionTabButton
                      key={section.key}
                      label={section.label}
                      icon={EDIT_TAB_ICONS[section.key]}
                      active={activeSection === section.key}
                      onClick={() => setActiveSection(section.key)}
                    />
                  ))}
                </div>
              </div>

              {error ? (
                <div className="rounded-lg border border-[var(--ds-danger)]/40 bg-[var(--ds-danger-bg)] px-3 py-2 text-sm text-[var(--ds-danger)]">
                  {error}
                </div>
              ) : null}

              {activeSection === "personal" && (
                <SectionPanel title="Personal Information" subtitle="Contact details, social links, and professional summary.">
                  <div className="form-grid">
                    <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} disabled />
                    <Input label="Phone" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                    <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
                    <Input label="LinkedIn" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
                    <Input label="GitHub" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
                    <Input label="Portfolio" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} />
                  </div>
                  <div className="mt-4">
                    <Textarea
                      label="Professional Summary *"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      rows={5}
                      required
                      placeholder="Write 2-4 sentences in your own words about your background, strengths, and career goals. This is never auto-filled from your resume."
                      error={!summary.trim() && error?.includes("Professional Summary") ? "Professional Summary is required." : undefined}
                    />
                  </div>
                </SectionPanel>
              )}

              {activeSection === "education" && (
                <SectionPanel title="Education" subtitle="Academic background for eligibility and recruiter context.">
                  <div className="form-grid">
                    <Input label="College" value={college} onChange={(e) => setCollege(e.target.value)} />
                    <Input label="Degree" value={degree} onChange={(e) => setDegree(e.target.value)} />
                    <Input label="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
                    <Input label="CGPA" value={cgpa} onChange={(e) => setCgpa(e.target.value)} />
                    <Input label="Graduation Year" value={passingYear} onChange={(e) => setPassingYear(e.target.value)} />
                  </div>
                </SectionPanel>
              )}

              {activeSection === "learning" && (
                <SectionPanel title="Courses & Certifications" subtitle="Learning records, certificate details, and verification links.">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">Courses</p>
                      <Input label="Course Name" value={courseName} onChange={(e) => setCourseName(e.target.value)} />
                      <Input label="Platform" value={coursePlatform} onChange={(e) => setCoursePlatform(e.target.value)} />
                      <Input label="Completion Date" value={courseCompletionDate} onChange={(e) => setCourseCompletionDate(e.target.value)} />
                      <Input label="Certificate URL" value={courseCertificateUrl} onChange={(e) => setCourseCertificateUrl(e.target.value)} />
                      <Input label="Verification Link" value={courseVerificationLink} onChange={(e) => setCourseVerificationLink(e.target.value)} />
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">Certifications</p>
                      <Input label="Certification Name" value={certName} onChange={(e) => setCertName(e.target.value)} />
                      <Input label="Issuer" value={certIssuer} onChange={(e) => setCertIssuer(e.target.value)} />
                      <Input label="Year" value={certYear} onChange={(e) => setCertYear(e.target.value)} />
                      <Input label="Certificate URL" value={certCertificateUrl} onChange={(e) => setCertCertificateUrl(e.target.value)} />
                      <Input label="Verification Link" value={certVerificationLink} onChange={(e) => setCertVerificationLink(e.target.value)} />
                    </div>
                  </div>
                </SectionPanel>
              )}

              {activeSection === "skills" && (
                <SectionPanel title="Skills" subtitle="Manage technical and soft skills separately.">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">Technical Skills</p>
                  <SkillSelector selected={skills} onChange={setSkills} />
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">Soft Skills</p>
                    <SkillSelector selected={softSkills} onChange={setSoftSkills} />
                  </div>
                </SectionPanel>
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={save} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => router.push("/dashboard/intern/profile")}>
                  Cancel
                </Button>
              </div>
            </>
          )}
    </div>
  );
}