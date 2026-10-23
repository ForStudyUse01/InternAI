"use client";

import { safeUrl } from "@/lib/safe-url";
import { Card } from "@/components/ui/card";
import { SkillChips } from "@/components/dashboard/shared/skill-chips";
import { ExternalLink } from "@/components/ui/external-link";
import type { CompanyApplication } from "@/lib/company-portal";

type InternLike = CompanyApplication["intern"];

export function ApplicantParsedResume({ intern }: { intern?: InternLike }) {
  const parsed = intern?.resume?.parsed;
  const projectList = parsed?.projects || [];
  const legacyProjects = !projectList.length ? intern?.projects || [] : [];
  const educationList = parsed?.education || [];
  const certificationList = parsed?.certifications || [];
  const achievementList = parsed?.achievements?.length
    ? parsed.achievements
    : intern?.achievements || [];
  const languages = parsed?.languages || [];
  const experienceList = parsed?.experience || [];
  const linkList = [...(parsed?.links || []), ...(intern?.links || []), intern?.linkedinUrl || ""].filter(Boolean);
  const summaryText = (parsed?.summary || intern?.summary || "").trim();
  const locationText = (parsed?.location || "").trim();
  const interests = intern?.interests || [];
  const legacyEducation = !(parsed?.education || []).length ? intern?.education || [] : [];
  const legacyCerts = !(parsed?.certifications || []).length ? intern?.certifications || [] : [];
  const legacyExperienceLines = !(parsed?.experience || []).length ? intern?.experience || [] : [];

  return (
    <div className="space-y-4">
      <Card title="Summary" subtitle="Professional summary from the parsed resume.">
        {summaryText ? (
          <p className="text-sm leading-relaxed text-[var(--ds-text-secondary)]">{summaryText}</p>
        ) : (
          <p className="text-sm text-[var(--ds-text-secondary)]">No summary extracted.</p>
        )}
      </Card>

      {locationText && (
        <Card title="Location" subtitle="Detected on the resume.">
          <p className="text-sm text-[var(--ds-text-secondary)]">{locationText}</p>
        </Card>
      )}

      <Card title="Skills" subtitle="Extracted and normalized skills from the resume.">
        <SkillChips skills={parsed?.skills?.length ? parsed.skills : intern?.skills || []} />
        {!(parsed?.skills?.length || intern?.skills?.length) && (
          <p className="mt-2 text-sm text-[var(--ds-text-secondary)]">No skills extracted.</p>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Projects" subtitle="Resume project highlights.">
          {projectList.length === 0 && legacyProjects.length === 0 ? (
            <p className="text-sm text-[var(--ds-text-secondary)]">No projects extracted yet.</p>
          ) : projectList.length > 0 ? (
            <div className="space-y-2">
              {projectList.map((project, idx) => (
                <div key={`${project.title || "project"}-${idx}`} className="surface-subtle rounded-lg p-3.5">
                  <p className="text-sm font-semibold text-[var(--ds-text)]">{project.title || "Project"}</p>
                  {project.techStack && project.techStack.length > 0 && (
                    <div className="mt-2">
                      <SkillChips skills={project.techStack} />
                    </div>
                  )}
                  {project.description && <p className="mt-2 text-xs text-[var(--ds-text-secondary)]">{project.description}</p>}
                  {project.demoLink && (
                    <ExternalLink href={project.demoLink} className="mt-2 text-xs">
                      View demo
                    </ExternalLink>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {legacyProjects.map((line, idx) => (
                <li key={`proj-legacy-${idx}`} className="surface-subtle rounded-lg px-3 py-2 text-sm text-[var(--ds-text-secondary)]">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Education" subtitle="Extracted academic details.">
          {educationList.length === 0 && legacyEducation.length === 0 ? (
            <p className="text-sm text-[var(--ds-text-secondary)]">No education entries extracted yet.</p>
          ) : educationList.length > 0 ? (
            <div className="space-y-2">
              {educationList.map((item, idx) => (
                <div key={`${item.degree || "education"}-${idx}`} className="surface-subtle rounded-lg p-3.5">
                  <p className="text-sm font-semibold text-[var(--ds-text)]">{item.degree || "Education"}</p>
                  <p className="text-xs text-[var(--ds-text-secondary)]">{item.institution || item.raw || "-"}</p>
                  {(item.startYear || item.endYear) && (
                    <p className="mt-1 text-xs text-[var(--ds-text-secondary)]">{[item.startYear, item.endYear].filter(Boolean).join(" - ")}</p>
                  )}
                  {item.grade && <p className="mt-1 text-xs text-[var(--ds-text-secondary)]">Grade: {item.grade}</p>}
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {legacyEducation.map((line, idx) => (
                <li key={`edu-legacy-${idx}`} className="surface-subtle rounded-lg px-3 py-2 text-sm text-[var(--ds-text-secondary)]">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Certifications" subtitle="Extracted certification records.">
          {certificationList.length === 0 && legacyCerts.length === 0 ? (
            <p className="text-sm text-[var(--ds-text-secondary)]">No certifications extracted yet.</p>
          ) : certificationList.length > 0 ? (
            <div className="space-y-2">
              {certificationList.map((item, idx) => (
                <div key={`${item.name || "cert"}-${idx}`} className="surface-subtle rounded-lg p-3.5">
                  <p className="text-sm font-semibold text-[var(--ds-text)]">{item.name || item.raw || "Certification"}</p>
                  {(item.issuer || item.year) && (
                    <p className="text-xs text-[var(--ds-text-secondary)]">{[item.issuer, item.year].filter(Boolean).join(" | ")}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {legacyCerts.map((line, idx) => (
                <li key={`cert-legacy-${idx}`} className="surface-subtle rounded-lg px-3 py-2 text-sm text-[var(--ds-text-secondary)]">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Experience" subtitle="Work experience from the parsed resume or profile.">
        {experienceList.length === 0 && legacyExperienceLines.length === 0 ? (
          <p className="text-sm text-[var(--ds-text-secondary)]">No work experience extracted yet.</p>
        ) : experienceList.length > 0 ? (
          <div className="space-y-2">
            {experienceList.map((exp, idx) => (
              <div key={`${exp.role || "exp"}-${idx}`} className="surface-subtle rounded-lg p-3.5">
                <p className="text-sm font-semibold text-[var(--ds-text)]">{exp.role || "Role"}</p>
                <p className="text-xs text-[var(--ds-text-secondary)]">{exp.company || "-"}</p>
                {exp.duration && <p className="mt-1 text-xs text-[var(--ds-text-secondary)]">{exp.duration}</p>}
                {exp.description && <p className="mt-2 text-xs text-[var(--ds-text-secondary)]">{exp.description}</p>}
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {legacyExperienceLines.map((line, idx) => (
              <li key={`exp-legacy-${idx}`} className="surface-subtle rounded-lg px-3 py-2 text-sm text-[var(--ds-text-secondary)]">
                {line}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Achievements" subtitle="Awards and notable accomplishments.">
        {achievementList.length === 0 ? (
          <p className="text-sm text-[var(--ds-text-secondary)]">No achievements extracted yet.</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {achievementList.map((item, idx) => (
              <li key={`ach-${idx}`} className="surface-subtle rounded-lg px-3 py-2.5 text-sm text-[var(--ds-text-secondary)]">
                {item}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Languages" subtitle="Detected from the resume.">
        {languages.length === 0 ? (
          <p className="text-sm text-[var(--ds-text-secondary)]">No languages extracted.</p>
        ) : (
          <SkillChips skills={languages} />
        )}
      </Card>

      <Card title="Links" subtitle="URLs extracted from the resume or profile.">
        {linkList.length === 0 ? (
          <p className="text-sm text-[var(--ds-text-secondary)]">No links extracted.</p>
        ) : (
          <ul className="space-y-1.5">
            {linkList.map((href, idx) => (
              <li key={`${href}-${idx}`}>
                <a href={safeUrl(href)} target="_blank" rel="noreferrer" className="text-sm font-medium text-[var(--ds-primary-text)] hover:underline">
                  {String(href).toLowerCase().includes("linkedin.com") ? "LinkedIn Profile" : href}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {interests.length > 0 && (
        <Card title="Interests" subtitle="From the intern profile.">
          <SkillChips skills={interests} />
        </Card>
      )}
    </div>
  );
}
