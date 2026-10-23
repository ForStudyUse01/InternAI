"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SectionPanel } from "@/components/dashboard/shared/section-panel";
import { SkillChips } from "@/components/dashboard/shared/skill-chips";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { apiRequest } from "@/lib/api-client";
import { buildAssetUrl, InternProfile, fetchInternProfile, invalidateInternCache } from "@/lib/intern-portal";
import { SectionTabButton } from "@/components/icons/section-tab-button";
import { RESUME_TAB_ICONS } from "@/components/icons/section-tab-icons";
import { Upload } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { ExternalLink } from "@/components/ui/external-link";

type ResumeSectionKey = "skills" | "projects" | "education" | "certifications" | "achievements";

const RESUME_SECTIONS: Array<{ key: ResumeSectionKey; label: string }> = [
  { key: "skills", label: "Skills" },
  { key: "projects", label: "Projects" },
  { key: "education", label: "Education" },
  { key: "certifications", label: "Certifications" },
  { key: "achievements", label: "Achievements" }
];

export function InternResumePanel() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { pushToast } = useToast();
  const [profile, setProfile] = useState<InternProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ResumeSectionKey>("skills");
  const [expandedProjects, setExpandedProjects] = useState<Record<number, boolean>>({});
  const [pendingSummary, setPendingSummary] = useState<string | null>(null);
  const [applyingSummary, setApplyingSummary] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setProfile(await fetchInternProfile(true));
      } catch (err) {
        setError((err as Error).message || "Failed to load resume details.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleUpload(file: File) {
    try {
      setUploading(true);
      setError(null);
      setMessage(null);

      const formData = new FormData();
      formData.append("resume", file);
      const response = await apiRequest<{ profile: InternProfile }>("/api/intern/resume/upload", { method: "POST", body: formData });
      invalidateInternCache();
      setMessage("Resume uploaded successfully.");
      setProfile(response.profile);

      // If the profile already carried a Professional Summary before this
      // upload, the backend leaves it untouched -- `profile.summary` and the
      // freshly-parsed `resume.parsed.summary` will then differ. Ask before
      // replacing rather than silently keeping the old one invisible.
      const currentSummary = (response.profile.summary || "").trim();
      const extractedSummary = (response.profile.resume?.parsed?.summary || "").trim();
      if (currentSummary && extractedSummary && currentSummary.toLowerCase() !== extractedSummary.toLowerCase()) {
        setPendingSummary(extractedSummary);
      }
    } catch (err) {
      setError((err as Error).message || "Resume upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function applyPendingSummary() {
    if (!pendingSummary) return;
    try {
      setApplyingSummary(true);
      const response = await apiRequest<{ profile: InternProfile }>("/api/intern/profile", {
        method: "PUT",
        body: JSON.stringify({
          summary: pendingSummary,
          bio: pendingSummary,
          profileSections: { professionalSummary: pendingSummary }
        })
      });
      invalidateInternCache();
      setProfile(response.profile);
      pushToast({ variant: "success", title: "Summary updated", message: "Professional Summary replaced with the version from your resume." });
    } catch (err) {
      pushToast({ variant: "error", title: "Update failed", message: (err as Error).message || "Could not replace Professional Summary." });
    } finally {
      setApplyingSummary(false);
      setPendingSummary(null);
    }
  }

  const parsed = profile?.resume?.parsed;
  const projects = parsed?.projects || [];
  const resumeUrl = profile?.resume?.filePath ? buildAssetUrl(profile.resume.filePath) : "";
  const education = parsed?.education || [];
  const certifications = parsed?.certifications || [];
  const achievements = parsed?.achievements || profile?.achievements || [];
  const categorizedSkills = parsed?.skillCategories || {};
  const technicalSkills = parsed?.technicalSkills || parsed?.skills || profile?.skills || [];

  const overviewStats = useMemo(
    () => [
      { label: "Resume Name", value: profile?.resume?.filePath ? String(profile.resume.filePath).split(/[\\/]/).pop() || "Uploaded Resume" : "No resume" },
      { label: "Last Updated", value: profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : "-" },
      { label: "Resume Score", value: `${profile?.resume?.score ?? 0}/100` },
      { label: "Skills Count", value: String(technicalSkills.length) },
      { label: "Projects Count", value: String(projects.length) },
      { label: "Education Count", value: String(education.length) }
    ],
    [profile?.resume?.filePath, profile?.updatedAt, profile?.resume?.score, technicalSkills.length, projects.length, education.length]
  );
  // Every bucket the backend parser can produce (resume-structured-parser.service.js
  // SKILL_CATEGORIES) -- must stay in sync so no extracted skill is silently
  // hidden from the student just because its category isn't in this list.
  const categorizedSkillOrder = [
    "programming languages",
    "web development",
    "databases",
    "ai / ml",
    "mobile",
    "cloud & devops",
    "security",
    "design",
    "testing",
    "tools & platforms"
  ];

  function getKeyHighlights(description: string) {
    const text = String(description || "").trim();
    if (!text) return [];
    const parts = text
      .split(/[\n•\-]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => item.length > 20);
    if (parts.length > 0) return parts.slice(0, 3);
    return text
      .split(/[.!?]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-card)] p-5">
        <Skeleton className="h-4 w-52" />
        <Skeleton className="mt-3 h-16 w-full" />
        <Skeleton className="mt-3 h-10 w-40" />
      </div>
    );
  }

  return (
    <div className="dashboard-stack">
      <SectionPanel title="Resume" subtitle="Upload and manage your resume file.">
        {error && <div role="alert" className="mb-3 rounded-lg border border-[var(--ds-danger)] bg-[var(--ds-danger-bg)] px-3 py-2 text-sm text-[var(--ds-danger)]">{error}</div>}
        {message && <div role="status" aria-live="polite" className="mb-3 rounded-lg border border-[var(--ds-success)] bg-[var(--ds-success-bg)] px-3 py-2 text-sm text-[var(--ds-success)]">{message}</div>}

        <div className="grid gap-3 text-sm text-[var(--ds-text-secondary)] sm:grid-cols-2">
          <p>
            Uploaded file: <span className="font-semibold">{profile?.resume?.filePath || "No resume uploaded"}</span>
          </p>
          <p>
            Resume uploaded status: <span className="font-semibold">{profile?.resumeUploaded ? "Yes" : "No"}</span>
          </p>
        </div>

        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <AppIcon icon={Upload} size="sm" />
              {uploading ? "Uploading..." : "Upload Resume"}
            </Button>
            {resumeUrl && (
              <>
                <a className="tilt-3d inline-flex h-9 items-center justify-center rounded-xl border border-[var(--ds-border)] bg-[var(--ds-card)] px-4 text-sm font-semibold text-[var(--ds-text)] shadow-soft transition duration-200 hover:border-[var(--ds-border-strong)] hover:bg-[var(--ds-surface)]" href={resumeUrl} target="_blank" rel="noreferrer">
                  Preview Resume
                </a>
                <a className="tilt-3d inline-flex h-9 items-center justify-center rounded-xl border border-[var(--ds-border)] bg-[var(--ds-card)] px-4 text-sm font-semibold text-[var(--ds-text)] shadow-soft transition duration-200 hover:border-[var(--ds-border-strong)] hover:bg-[var(--ds-surface)]" href={resumeUrl} download>
                  Download Resume
                </a>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
        </div>
      </SectionPanel>

      <SectionPanel title="Resume Overview" subtitle="Structured summary of your parsed resume data.">
        {!profile?.resumeUploaded ? (
          <p className="text-sm text-[var(--ds-text-secondary)]">Upload resume to view parsed details.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {overviewStats.map((item) => (
                <div key={item.label} className="surface-subtle px-3 py-2.5">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--ds-text-secondary)]">{item.label}</p>
                  <p className="mt-1 truncate text-base font-semibold text-[var(--ds-text)]">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="surface-subtle mt-4 rounded-2xl p-2">
              <div className="flex flex-wrap gap-2">
                {RESUME_SECTIONS.map((section) => (
                  <SectionTabButton
                    key={section.key}
                    label={section.label}
                    icon={RESUME_TAB_ICONS[section.key]}
                    active={activeSection === section.key}
                    onClick={() => setActiveSection(section.key)}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4">
              {activeSection === "skills" && (
                <div className="space-y-3">
                  {Object.keys(categorizedSkills).length > 0 ? (
                    categorizedSkillOrder
                      .filter((category) => Array.isArray(categorizedSkills[category]) && categorizedSkills[category].length > 0)
                      .map((category) => (
                        <div key={category}>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-text-secondary)]">{category}</p>
                          <SkillChips skills={(categorizedSkills[category] as string[]) || []} variant="elevated" />
                        </div>
                      ))
                  ) : (
                    <>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-text-secondary)]">Skills</p>
                      <SkillChips skills={technicalSkills} variant="elevated" />
                    </>
                  )}
                </div>
              )}

              {activeSection === "projects" && (
                <div className="space-y-2">
                  {projects.length === 0 ? (
                    <p className="text-sm text-[var(--ds-text-secondary)]">No projects extracted.</p>
                  ) : (
                    projects.map((project: any, idx: number) => {
                      const text = project.description || "";
                      const isLong = text.length > 180;
                      const expanded = Boolean(expandedProjects[idx]);
                      const shown = expanded || !isLong ? text : `${text.slice(0, 180)}...`;
                      return (
                        <div key={`project-${idx}`} className="surface-subtle p-3.5">
                          <p className="text-sm font-semibold text-[var(--ds-text)]">{project.title || `Project ${idx + 1}`}</p>
                          {shown ? <p className="mt-1 text-xs text-[var(--ds-text-secondary)]">{shown}</p> : null}
                          {isLong ? (
                            <button
                              type="button"
                              aria-expanded={expanded}
                              className="mt-1 text-xs font-semibold text-[var(--ds-primary-text)] underline"
                              onClick={() => setExpandedProjects((prev) => ({ ...prev, [idx]: !expanded }))}
                            >
                              {expanded ? "Collapse" : "Read More"}
                            </button>
                          ) : null}
                          <div className="mt-2">
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ds-text-secondary)]">Tech Stack</p>
                            <SkillChips skills={project.techStack || []} variant="elevated" />
                          </div>
                          {getKeyHighlights(text).length > 0 ? (
                            <div className="mt-2">
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ds-text-secondary)]">Key Highlights</p>
                              <ul className="space-y-1">
                                {getKeyHighlights(text).map((highlight: string, hIdx: number) => (
                                  <li key={`project-highlight-${idx}-${hIdx}`} className="text-xs text-[var(--ds-text-secondary)]">
                                    - {highlight}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          <div className="mt-2 space-y-1 text-xs">
                            {project.githubLink ? <ExternalLink href={project.githubLink} className="text-link-block">GitHub Link</ExternalLink> : null}
                            {project.demoLink ? <ExternalLink href={project.demoLink} className="text-link-block">Demo Link</ExternalLink> : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeSection === "education" && (
                <div className="space-y-2">
                  {education.length === 0 ? (
                    <p className="text-sm text-[var(--ds-text-secondary)]">No education extracted.</p>
                  ) : (
                    education.map((edu: any, idx: number) => (
                      <div key={`edu-${idx}`} className="surface-subtle grid gap-2 p-3 text-sm sm:grid-cols-[140px_minmax(0,1fr)]">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-text-secondary)]">Timeline</p>
                        <p className="font-medium text-[var(--ds-text-secondary)]">{[edu.startYear, edu.endYear || edu.graduationYear].filter(Boolean).join(" - ") || "-"}</p>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-text-secondary)]">Degree</p>
                        <p className="text-[var(--ds-text-secondary)]">{edu.degree || "-"}</p>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-text-secondary)]">Institution</p>
                        <p className="text-[var(--ds-text-secondary)]">{edu.institution || "-"}</p>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-text-secondary)]">Branch</p>
                        <p className="text-[var(--ds-text-secondary)]">{edu.branch || "-"}</p>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-text-secondary)]">CGPA / Grade</p>
                        <p className="text-[var(--ds-text-secondary)]">{edu.grade || "-"}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeSection === "certifications" && (
                <div className="space-y-2">
                  {certifications.length === 0 ? (
                    <p className="surface-subtle px-3 py-2 text-sm text-[var(--ds-text-secondary)]">No certifications extracted.</p>
                  ) : (
                    certifications.map((cert: any, idx: number) => (
                      <div key={`cert-${idx}`} className="surface-subtle p-3">
                        <p className="text-sm font-semibold text-[var(--ds-text)]">{cert.name || cert.raw || "Certification"}</p>
                        {(cert.issuer || cert.year) ? <p className="text-xs text-[var(--ds-text-secondary)]">{[cert.issuer, cert.year].filter(Boolean).join(" | ")}</p> : null}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeSection === "achievements" && (
                <div className="space-y-2">
                  {achievements.length === 0 ? (
                    <p className="text-sm text-[var(--ds-text-secondary)]">No achievements extracted.</p>
                  ) : (
                    achievements.map((item: string, idx: number) => (
                      <div key={`achievement-${idx}`} className="surface-subtle px-3 py-2.5 text-sm text-[var(--ds-text-secondary)]">{item}</div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </SectionPanel>

      <ConfirmDialog
        open={Boolean(pendingSummary)}
        title="Replace Professional Summary?"
        description={`Your resume's summary section reads: "${(pendingSummary || "").slice(0, 220)}${(pendingSummary || "").length > 220 ? "…" : ""}" Replace your current Professional Summary with this one?`}
        confirmLabel="Replace"
        cancelLabel="Keep current"
        tone="default"
        busy={applyingSummary}
        onConfirm={applyPendingSummary}
        onCancel={() => setPendingSummary(null)}
      />
    </div>
  );
}