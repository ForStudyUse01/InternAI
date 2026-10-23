"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Download, Eye, X } from "lucide-react";
import { SectionPanel } from "@/components/dashboard/shared/section-panel";
import { SkillChips } from "@/components/dashboard/shared/skill-chips";
import { ExternalLink } from "@/components/ui/external-link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppIcon } from "@/components/icons/app-icon";
import { InternProfile, fetchInternProfile, peekInternProfile } from "@/lib/intern-portal";
import { CertificationRecord, fetchCertificateBlob, fetchMyCertifications } from "@/lib/certifications-portal";
import { SectionTabButton } from "@/components/icons/section-tab-button";
import { PROFILE_TAB_ICONS } from "@/components/icons/section-tab-icons";
import { ThemeSettingsPanel } from "@/components/theme/theme-settings-panel";

type ProfileSectionKey = "overview" | "skills" | "education" | "projects" | "achievements" | "learning" | "theme";

function formatCertDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const PROFILE_SECTIONS: Array<{ key: ProfileSectionKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "skills", label: "Skills" },
  { key: "education", label: "Education" },
  { key: "projects", label: "Projects" },
  { key: "achievements", label: "Achievements" },
  { key: "learning", label: "Learning" },
  { key: "theme", label: "Theme" }
];

export default function InternProfilePage() {
  const [profile, setProfile] = useState<InternProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ProfileSectionKey>("overview");
  const [verifiedCertifications, setVerifiedCertifications] = useState<CertificationRecord[]>([]);
  const [certLoading, setCertLoading] = useState(true);
  const [certError, setCertError] = useState("");
  const [certPreview, setCertPreview] = useState<{
    certificationId: string;
    courseName: string;
    mimeType: string;
    objectUrl: string;
  } | null>(null);

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
        setProfile(await fetchInternProfile());
      } catch (err) {
        setError((err as Error).message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    async function loadCertifications() {
      try {
        const data = await fetchMyCertifications();
        setVerifiedCertifications(data.certifications.filter((item) => item.verificationStatus === "verified"));
      } catch (err) {
        setCertError((err as Error).message || "Failed to load certifications.");
      } finally {
        setCertLoading(false);
      }
    }
    loadCertifications();
  }, []);

  useEffect(() => {
    return () => {
      if (certPreview?.objectUrl) URL.revokeObjectURL(certPreview.objectUrl);
    };
  }, [certPreview]);

  async function openCertPreview(item: CertificationRecord) {
    try {
      const blob = await fetchCertificateBlob(item._id, false);
      if (certPreview?.objectUrl) URL.revokeObjectURL(certPreview.objectUrl);
      setCertError("");
      setCertPreview({
        certificationId: item._id,
        courseName: item.courseName,
        mimeType: item.certificateFile?.mimeType || blob.type,
        objectUrl: URL.createObjectURL(blob)
      });
    } catch (err) {
      setCertError((err as Error).message || "Could not preview certificate");
    }
  }

  async function downloadCertFile(item: CertificationRecord) {
    try {
      const blob = await fetchCertificateBlob(item._id, true);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = item.certificateFile?.originalName || `${item.courseName}-certificate`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setCertError((err as Error).message || "Could not download certificate");
    }
  }

  const parsed = profile?.resume?.parsed;
  // `profileSections.projects` is the durable, cross-upload synced list;
  // `resume.parsed.projects` is only this one latest resume's extraction and
  // can legitimately be an empty array (e.g. a follow-up resume upload with
  // no Projects section) -- `||` alone would treat that empty array as
  // "present" and incorrectly hide the synced data, so check length instead.
  const syncedProjects = profile?.profileSections?.projects || [];
  const projectList = syncedProjects.length > 0 ? syncedProjects : parsed?.projects || [];
  const educationList =
    (profile?.educationDetails || []).length > 0
      ? (profile?.educationDetails || []).map((item) => ({
          degree: item.degree,
          institution: item.college,
          startYear: "",
          endYear: item.passingYear,
          grade: item.cgpa
        }))
      : parsed?.education || [];
  const certificationList = profile?.verifiedCertificationEntries || [];
  const verifiedCertificationCount =
    profile?.verifiedCertificationCount ?? profile?.certificationStats?.verified ?? certificationList.length;
  const courseList = profile?.courseEntries || [];
  // Same empty-array pitfall as projectList above: profile.achievements is
  // the synced, cross-upload list and must win over an empty per-resume parse.
  const syncedAchievements = profile?.achievements || [];
  const achievementList = syncedAchievements.length > 0 ? syncedAchievements : parsed?.achievements || [];
  // Same pattern: profile.languages is the synced, cross-upload list.
  const syncedLanguages = profile?.languages || [];
  const languages = syncedLanguages.length > 0 ? syncedLanguages : parsed?.languages || [];
  const skillCategories = Array.from(new Set((profile?.skillDetails || []).map((item) => item.category).filter(Boolean) as string[]));
  const technicalSkills = Array.from(new Set((profile?.skills || parsed?.skills || []).map((skill) => String(skill).trim()).filter(Boolean)));
  const skillTags = Array.from(new Set((technicalSkills || []).map((skill) => String(skill).trim()).filter(Boolean))).slice(0, 20);
  const missingSkillHints = useMemo(() => {
    // profile.skills is the accumulated union across every resume ever
    // uploaded (see profile-sync.service.js), so it must take precedence
    // over one resume's parsed list or this hint could wrongly flag a skill
    // as "missing" that the student already has from an earlier upload.
    const listed = new Set((profile?.skills?.length ? profile.skills : parsed?.skills || []).map((skill) => String(skill).toLowerCase()));
    const commonTargets = ["react", "node.js", "sql", "docker", "communication", "problem solving"];
    return commonTargets.filter((skill) => !listed.has(skill.toLowerCase())).slice(0, 5);
  }, [parsed?.skills, profile?.skills]);
  const initials = (profile?.fullName || "I")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const learningProgress = useMemo(() => {
    const totalItems = Math.max(1, courseList.length + Math.max(verifiedCertificationCount, 1));
    const completed = (profile?.completedCourses || []).length + verifiedCertificationCount;
    return Math.min(100, Math.round((completed / totalItems) * 100));
  }, [courseList.length, verifiedCertificationCount, profile?.completedCourses]);

  return (
    <>
      {loading ? (
          <div className="rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-card)] p-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-3 h-20 w-full" />
            <Skeleton className="mt-3 h-10 w-56" />
          </div>
        ) : (
          <div className="intern-profile-page space-y-5">
            {error ? <p className="rounded-xl border border-[var(--ds-danger)]/40 bg-[var(--ds-danger-bg)] px-4 py-3 text-sm text-[var(--ds-danger)]">{error}</p> : null}

            <div className="surface-subtle rounded-2xl p-2">
              <div className="flex flex-wrap gap-2">
                {PROFILE_SECTIONS.map((section) => (
                  <SectionTabButton
                    key={section.key}
                    label={section.label}
                    icon={PROFILE_TAB_ICONS[section.key]}
                    active={activeSection === section.key}
                    onClick={() => setActiveSection(section.key)}
                  />
                ))}
              </div>
            </div>

            {activeSection === "overview" && (
              <SectionPanel title="Overview" subtitle="Personal information, professional summary, and social links.">
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">Personal Information</p>
                    <div className="surface-muted p-5">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--ds-primary)] text-lg font-semibold text-[var(--ds-on-primary)]">{initials || "I"}</div>
                        <div className="min-w-0 flex-1 break-words">
                          <p className="text-lg font-semibold leading-snug text-[var(--ds-text)]">{profile?.fullName || "Intern"}</p>
                          <p className="mt-0.5 break-words text-sm leading-relaxed text-[var(--ds-text-secondary)]">{profile?.email || "-"}</p>
                          <p className="break-words text-sm leading-relaxed text-[var(--ds-text-secondary)]">{profile?.mobile || "-"}</p>
                          {profile?.address && <p className="break-words text-sm leading-relaxed text-[var(--ds-text-secondary)]">{profile.address}</p>}
                          {parsed?.location && <p className="break-words text-sm leading-relaxed text-[var(--ds-text-secondary)]">{parsed.location}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">Professional Summary</p>
                    <p className="surface-subtle break-words px-4 py-3 text-sm leading-relaxed text-[var(--ds-text-secondary)]">
                      {profile?.summary || "Required: add your Professional Summary in Edit Profile before applying to internships."}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">Social Links</p>
                    <div className="surface-subtle space-y-2 break-words px-4 py-3 text-sm">
                      {profile?.linkedinUrl ? <ExternalLink href={profile.linkedinUrl} className="text-link-block">LinkedIn</ExternalLink> : null}
                      {profile?.githubUrl ? <ExternalLink href={profile.githubUrl} className="text-link-block">GitHub</ExternalLink> : null}
                      {profile?.portfolioUrl ? <ExternalLink href={profile.portfolioUrl} className="text-link-block">Portfolio</ExternalLink> : null}
                      {(profile?.links || []).slice(0, 5).map((link) => (
                        <ExternalLink key={link} href={link} className="text-link-block max-w-full break-all">
                          {link}
                        </ExternalLink>
                      ))}
                      {!profile?.linkedinUrl && !profile?.githubUrl && !profile?.portfolioUrl && (profile?.links || []).length === 0 ? (
                        <p className="text-[var(--ds-text-secondary)]">No social links added yet.</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </SectionPanel>
            )}

            {activeSection === "skills" && (
              <SectionPanel title="Skills" subtitle="Technical capabilities, soft skills, categories, and recruiter tags.">
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">Technical Skills</p>
                    <SkillChips skills={technicalSkills} variant="elevated" />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">Soft Skills</p>
                    <SkillChips skills={profile?.softSkills || []} variant="elevated" />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">Skill Categories</p>
                    {skillCategories.length > 0 ? <SkillChips skills={skillCategories} variant="elevated" /> : <p className="text-sm text-[var(--ds-text-secondary)]">No skill categories added yet.</p>}
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">Skill Tags</p>
                    {skillTags.length > 0 ? <SkillChips skills={skillTags} variant="elevated" /> : <p className="text-sm text-[var(--ds-text-secondary)]">No skill tags available yet.</p>}
                  </div>
                </div>
              </SectionPanel>
            )}

            {activeSection === "education" && (
              <SectionPanel title="Education" subtitle="Academic profile and graduation details.">
                {educationList.length === 0 ? (
                  <p className="text-sm text-[var(--ds-text-secondary)]">No education entries available yet.</p>
                ) : (
                  <div className="space-y-2">
                    {educationList.map((item, idx) => (
                      <div key={`${item.degree || "education"}-${idx}`} className="surface-subtle grid gap-2 break-words p-3.5 text-sm leading-relaxed text-[var(--ds-text-secondary)] sm:grid-cols-2">
                        <p className="break-words"><span className="font-semibold text-[var(--ds-text)]">College:</span> {item.institution || "-"}</p>
                        <p className="break-words"><span className="font-semibold text-[var(--ds-text)]">Degree:</span> {item.degree || "-"}</p>
                        <p className="break-words"><span className="font-semibold text-[var(--ds-text)]">Branch:</span> {(profile?.educationDetails || [])[idx]?.branch || "-"}</p>
                        <p className="break-words"><span className="font-semibold text-[var(--ds-text)]">CGPA:</span> {(profile?.educationDetails || [])[idx]?.cgpa || item.grade || "-"}</p>
                        <p className="break-words sm:col-span-2">
                          <span className="font-semibold text-[var(--ds-text)]">Graduation Details:</span>{" "}
                          {[item.startYear, item.endYear || (profile?.educationDetails || [])[idx]?.passingYear].filter(Boolean).join(" - ") || "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </SectionPanel>
            )}

            {activeSection === "projects" && (
              <SectionPanel title="Projects" subtitle="Project portfolio with technologies and links.">
                {projectList.length === 0 ? (
                  <p className="text-sm text-[var(--ds-text-secondary)]">No projects extracted yet.</p>
                ) : (
                  <div className="space-y-2">
                    {projectList.map((project, idx) => (
                      <div key={`${project.title || "project"}-${idx}`} className="surface-subtle break-words p-3.5">
                        <p className="text-sm font-semibold leading-snug text-[var(--ds-text)]">{project.title || `Project ${idx + 1}`}</p>
                        {project.description ? <p className="mt-1 break-words text-xs leading-relaxed text-[var(--ds-text-secondary)]">{project.description}</p> : null}
                        <div className="mt-2">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ds-muted)]">Technologies</p>
                          <SkillChips skills={project.techStack || []} variant="elevated" />
                        </div>
                        <div className="mt-2 space-y-1 text-xs">
                          {project.demoLink ? (
                            <ExternalLink href={project.demoLink} className="text-link-block">
                              Live Demo Link
                            </ExternalLink>
                          ) : null}
                          {project.demoLink ? null : <p className="text-[var(--ds-muted)]">No Live Demo link added.</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionPanel>
            )}

            {activeSection === "achievements" && (
              <SectionPanel title="Achievements" subtitle="Awards, recognitions, and accomplishments.">
                {achievementList.length === 0 ? (
                  <p className="text-sm text-[var(--ds-text-secondary)]">No achievements listed yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {achievementList.map((item, idx) => (
                      <li key={`ach-${idx}`} className="surface-subtle break-words px-3 py-2.5 text-sm leading-relaxed text-[var(--ds-text-secondary)]">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </SectionPanel>
            )}

            {activeSection === "learning" && (
              <SectionPanel title="Learning" subtitle="Courses, certifications, and profile learning progress.">
                <div className="space-y-4">
                  <div className="surface-subtle px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">Learning Progress</p>
                    <p className="mt-1 text-base font-semibold text-[var(--ds-text)]">{learningProgress}%</p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">Courses</p>
                    {courseList.length === 0 && (profile?.completedCourses || []).length === 0 ? (
                      <p className="text-sm text-[var(--ds-text-secondary)]">No courses added yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {courseList.map((course, idx) => (
                          <li key={`course-${idx}`} className="surface-subtle break-words px-3 py-2 text-sm leading-relaxed text-[var(--ds-text-secondary)]">
                            {course.courseName || "Course"} {course.platform ? `· ${course.platform}` : ""}
                          </li>
                        ))}
                        {(profile?.completedCourses || []).map((course, idx) => (
                          <li key={`completed-${idx}`} className="surface-subtle break-words px-3 py-2 text-sm leading-relaxed text-[var(--ds-text-secondary)]">
                            {course}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">Verified Certificates</p>
                    {certError ? <p className="mb-2 text-sm text-[var(--ds-danger)]">{certError}</p> : null}
                    {certLoading ? (
                      <Skeleton className="h-20 w-full" />
                    ) : verifiedCertifications.length === 0 ? (
                      <p className="text-sm text-[var(--ds-text-secondary)]">
                        No verified certifications yet. Submit course proof in Certifications after completion.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {verifiedCertifications.map((item) => (
                          <div key={item._id} className="surface-subtle break-words p-3.5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold leading-snug text-[var(--ds-text)]">
                                  {item.courseName}
                                  <span className="ml-2 rounded bg-[var(--ds-success-bg)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--ds-success)]">
                                    Verified
                                  </span>
                                </p>
                                <p className="mt-0.5 text-xs leading-relaxed text-[var(--ds-text-secondary)]">{item.provider}</p>
                                <p className="mt-1 text-xs leading-relaxed text-[var(--ds-muted)]">
                                  Issued {formatCertDate(item.completionDate)}
                                  {item.expiryDate ? ` · Expires ${formatCertDate(item.expiryDate)}` : ""}
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-1.5">
                                <Button type="button" size="sm" variant="secondary" onClick={() => openCertPreview(item)}>
                                  <AppIcon icon={Eye} size="xs" /> View
                                </Button>
                                <Button type="button" size="sm" variant="secondary" onClick={() => downloadCertFile(item)}>
                                  <AppIcon icon={Download} size="xs" /> Download
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {certPreview ? (
                      <div className="surface-subtle mt-3 space-y-2 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-[var(--ds-text)]">Preview: {certPreview.courseName}</p>
                          <button
                            type="button"
                            onClick={() => {
                              URL.revokeObjectURL(certPreview.objectUrl);
                              setCertPreview(null);
                            }}
                            aria-label="Close preview"
                            className="rounded-md p-1 text-[var(--ds-muted)] transition-colors hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)]"
                          >
                            <AppIcon icon={X} size="sm" className="text-current" />
                          </button>
                        </div>
                        {certPreview.mimeType.includes("pdf") ? (
                          <iframe title="Certificate preview" src={certPreview.objectUrl} className="h-[360px] w-full rounded-lg border border-[var(--ds-border)]" />
                        ) : certPreview.mimeType.includes("image") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={certPreview.objectUrl} alt="Certificate preview" className="max-h-[360px] w-full rounded-lg object-contain" />
                        ) : (
                          <p className="rounded-lg border border-[var(--ds-border)] px-4 py-6 text-center text-sm text-[var(--ds-text-secondary)]">
                            Preview not available for this file type. Use Download instead.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {languages.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">Languages</p>
                      <SkillChips skills={languages} variant="elevated" />
                    </div>
                  )}

                  {missingSkillHints.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-muted)]">Suggested Missing Skills</p>
                      <SkillChips skills={missingSkillHints} variant="elevated" />
                    </div>
                  )}
                </div>
              </SectionPanel>
            )}

            {activeSection === "theme" && <ThemeSettingsPanel />}
          </div>
      )}
    </>
  );
}




