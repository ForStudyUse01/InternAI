"use client";

import { useMemo } from "react";
import { safeUrl } from "@/lib/safe-url";
import Link from "next/link";
import {
  Award,
  Briefcase,
  Code2,
  Download,
  ExternalLink,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Trophy
} from "lucide-react";
import type { PortfolioContent, PortfolioSkill, PortfolioTheme } from "@/lib/portfolio-types";
import { buildAssetUrl } from "@/lib/intern-portal";
import { cn } from "@/lib/utils";
import "@/app/portfolio/portfolio.css";

type Portfolio3DViewerProps = {
  content: PortfolioContent;
  theme?: PortfolioTheme;
  slug: string;
  showResumeDownload?: boolean;
  compact?: boolean;
};

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="portfolio-section-header">
      <h2 className="portfolio-section-title">{title}</h2>
      <span className="portfolio-section-line" aria-hidden />
      {typeof count === "number" ? <span className="portfolio-section-count">{count}</span> : null}
    </div>
  );
}

function FloatingCard({
  children,
  className,
  staticHover = false
}: {
  children: React.ReactNode;
  className?: string;
  staticHover?: boolean;
}) {
  return (
    <div className={cn("portfolio-float-card", staticHover && "portfolio-card-static", className)}>
      {children}
    </div>
  );
}

function groupSkills(skills: PortfolioSkill[]) {
  const groups = new Map<string, PortfolioSkill[]>();
  for (const skill of skills) {
    const key = skill.category?.trim() || "Core Skills";
    const list = groups.get(key) || [];
    list.push(skill);
    groups.set(key, list);
  }
  return Array.from(groups.entries());
}

const PREVIEW_GRADIENTS = ["portfolio-preview-0", "portfolio-preview-1", "portfolio-preview-2", "portfolio-preview-3", "portfolio-preview-4", "portfolio-preview-5"];

export function Portfolio3DViewer({ content, theme = "midnight", slug, showResumeDownload = true, compact = false }: Portfolio3DViewerProps) {
  const resumeHref = content.resumeFilePath ? buildAssetUrl(content.resumeFilePath) : null;
  const skillGroups = useMemo(() => groupSkills(content.skills), [content.skills]);

  const stats = useMemo(
    () => [
      { value: content.projects.length, label: "Projects" },
      { value: content.skills.length, label: "Skills" },
      { value: content.certifications.length, label: "Certs" },
      { value: content.achievements.length, label: "Wins" }
    ],
    [content.projects.length, content.skills.length, content.certifications.length, content.achievements.length]
  );

  return (
    <div className={cn("portfolio-root min-h-screen", `portfolio-theme-${theme}`)}>
      <div className={cn("portfolio-scene mx-auto w-full max-w-6xl px-4 sm:px-6", compact ? "py-6" : "py-12 lg:py-16")}>
        {/* Hero */}
        <section className={cn("portfolio-reveal mb-14 lg:mb-16", !compact && "lg:mb-20")}>
          <div className="relative">
            <div className="portfolio-parallax-bg" aria-hidden />
            <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr] lg:items-stretch lg:gap-6">
              <FloatingCard className={cn("portfolio-hero-glow portfolio-hero-card border-0 p-0", compact && "portfolio-hero-card")}>
                <div className="p-7 sm:p-9 lg:p-10">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-7">
                    <div
                      className={cn(
                        "portfolio-hero-avatar shrink-0 text-white",
                        compact ? "h-16 w-16 text-2xl" : "h-[4.5rem] w-[4.5rem] text-2xl sm:h-20 sm:w-20 sm:text-3xl"
                      )}
                    >
                      {content.hero.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--pf-accent)]">
                        Portfolio
                      </p>
                      <h1 className="portfolio-hero-name">{content.hero.name}</h1>
                      <p className="portfolio-hero-headline mt-3">{content.hero.headline}</p>
                      <p className="portfolio-hero-tagline mt-3">{content.hero.tagline}</p>
                    </div>
                  </div>

                  {!compact ? (
                    <div className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
                      {stats.map((stat) => (
                        <div key={stat.label} className="portfolio-stat-pill">
                          <span className="portfolio-stat-value">{stat.value}</span>
                          <span className="portfolio-stat-label">{stat.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-7 flex flex-wrap gap-2">
                    {content.contact.email ? (
                      <a href={`mailto:${content.contact.email}`} className="portfolio-chip portfolio-chip-primary rounded-full px-4 py-2 text-xs font-semibold sm:text-sm">
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </a>
                    ) : null}
                    {content.contact.mobile ? (
                      <span className="portfolio-chip rounded-full px-4 py-2 text-xs font-medium sm:text-sm">
                        <Phone className="h-3.5 w-3.5" />
                        {content.contact.mobile}
                      </span>
                    ) : null}
                    {content.contact.location ? (
                      <span className="portfolio-chip rounded-full px-4 py-2 text-xs font-medium sm:text-sm">
                        <MapPin className="h-3.5 w-3.5" />
                        {content.contact.location}
                      </span>
                    ) : null}
                    {showResumeDownload && resumeHref ? (
                      <a
                        href={resumeHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="portfolio-chip portfolio-chip-primary rounded-full px-4 py-2 text-xs font-semibold sm:text-sm"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download Resume
                      </a>
                    ) : null}
                  </div>
                </div>
              </FloatingCard>

              {!compact ? (
                <FloatingCard staticHover className="flex flex-col p-6 sm:p-7">
                  <SectionHeader title="Connect" />
                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                      {content.socialLinks.map((link) => (
                        <a
                          key={link.url}
                          href={safeUrl(link.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="portfolio-chip rounded-xl px-3.5 py-2.5 text-sm font-medium"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
                          {link.platform}
                        </a>
                      ))}
                      {content.socialLinks.length === 0 ? (
                        <p className="text-sm leading-relaxed text-[var(--pf-muted)]">No social links added yet.</p>
                      ) : null}
                    </div>
                    <div className="mt-auto rounded-xl border border-[var(--pf-border)] bg-black/10 px-3.5 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pf-muted)]">Public URL</p>
                      <p className="mt-1 truncate font-mono text-xs text-[var(--pf-text)]">portfolio/{slug}</p>
                    </div>
                  </div>
                </FloatingCard>
              ) : null}
            </div>
          </div>
        </section>

        {/* About */}
        <section className="portfolio-reveal portfolio-reveal-delay-1 mb-12 lg:mb-14">
          <SectionHeader title="About Me" />
          <FloatingCard staticHover className="p-6 sm:p-8">
            <p className="portfolio-about-text whitespace-pre-wrap">{content.about}</p>
          </FloatingCard>
        </section>

        {/* Skills */}
        {content.skills.length > 0 ? (
          <section className="portfolio-reveal portfolio-reveal-delay-2 mb-12 lg:mb-14">
            <SectionHeader title="Skills" count={content.skills.length} />
            <div className="space-y-6">
              {skillGroups.map(([category, skills]) => (
                <div key={category}>
                  {skillGroups.length > 1 ? <p className="portfolio-skill-group-label">{category}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span key={skill.name} className="portfolio-skill-badge">
                        <Sparkles className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                        {skill.name}
                        {skill.level ? <span className="portfolio-skill-level">· {skill.level}</span> : null}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Projects */}
        {content.projects.length > 0 ? (
          <section className="portfolio-reveal portfolio-reveal-delay-3 mb-12 lg:mb-14">
            <SectionHeader title="Projects" count={content.projects.length} />
            <div className="grid gap-5 md:grid-cols-2">
              {content.projects.map((project, index) => {
                const techCount = project.techStack?.length ?? 0;
                const linkCount = [project.demoLink, project.githubLink].filter(Boolean).length;
                return (
                  <FloatingCard key={project.title} staticHover className="portfolio-project-card">
                    <div className={cn("portfolio-project-preview", PREVIEW_GRADIENTS[index % PREVIEW_GRADIENTS.length])}>
                      <div className="portfolio-project-preview-glow" aria-hidden />
                      <div className="portfolio-project-preview-inner">
                        <span className="portfolio-project-preview-title">{project.title}</span>
                      </div>
                    </div>
                    <div className="portfolio-project-body">
                      <h3 className="portfolio-project-title">{project.title}</h3>
                      {project.description ? <p className="portfolio-project-desc">{project.description}</p> : null}
                      {project.techStack?.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {project.techStack.map((tech) => (
                            <span key={tech} className="portfolio-tech-pill">
                              {tech}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="portfolio-project-meta">
                        <span className="portfolio-project-stat">
                          <strong>{techCount}</strong> tech
                        </span>
                        {linkCount > 0 ? (
                          <span className="portfolio-project-stat">
                            <strong>{linkCount}</strong> link{linkCount !== 1 ? "s" : ""}
                          </span>
                        ) : null}
                        <div className="ml-auto flex flex-wrap gap-2">
                          {project.demoLink ? (
                            <a href={safeUrl(project.demoLink)} target="_blank" rel="noopener noreferrer" className="portfolio-cta">
                              <ExternalLink className="h-3 w-3" />
                              Live Demo
                            </a>
                          ) : null}
                          {project.githubLink ? (
                            <a href={safeUrl(project.githubLink)} target="_blank" rel="noopener noreferrer" className="portfolio-cta">
                              <Code2 className="h-3 w-3" />
                              Source
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </FloatingCard>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Experience & Education */}
        <div className="portfolio-reveal portfolio-reveal-delay-4 mb-12 grid gap-10 lg:mb-14 lg:grid-cols-2 lg:gap-8">
          {content.experience.length > 0 ? (
            <section>
              <SectionHeader title="Experience" count={content.experience.length} />
              <div className="portfolio-timeline">
                {content.experience.map((item, index) => (
                  <div key={`${item.role}-${index}`} className="portfolio-timeline-item">
                    <span className="portfolio-timeline-dot" aria-hidden />
                    <FloatingCard staticHover className="portfolio-timeline-card">
                      <div className="flex items-start gap-2.5">
                        <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pf-accent)] opacity-80" aria-hidden />
                        <div className="min-w-0">
                          <p className="portfolio-timeline-role">{item.role}</p>
                          <p className="portfolio-timeline-meta">
                            {item.company}
                            {item.duration ? ` · ${item.duration}` : ""}
                          </p>
                          {item.description ? <p className="portfolio-timeline-desc">{item.description}</p> : null}
                        </div>
                      </div>
                    </FloatingCard>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {content.education.length > 0 ? (
            <section>
              <SectionHeader title="Education" count={content.education.length} />
              <div className="portfolio-timeline">
                {content.education.map((item, index) => (
                  <div key={`${item.degree}-${index}`} className="portfolio-timeline-item">
                    <span className="portfolio-timeline-dot" aria-hidden />
                    <FloatingCard staticHover className="portfolio-timeline-card">
                      <div className="flex items-start gap-2.5">
                        <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pf-accent)] opacity-80" aria-hidden />
                        <div className="min-w-0">
                          <p className="portfolio-timeline-role">{item.degree}</p>
                          <p className="portfolio-timeline-meta">{item.institution}</p>
                          <p className="portfolio-timeline-meta mt-1">
                            {[item.startYear, item.endYear].filter(Boolean).join(" – ")}
                            {item.grade ? ` · ${item.grade}` : ""}
                          </p>
                        </div>
                      </div>
                    </FloatingCard>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* Certifications & Achievements */}
        <div className="mb-12 grid gap-10 lg:mb-14 lg:grid-cols-2 lg:gap-8">
          {content.certifications.length > 0 ? (
            <section>
              <SectionHeader title="Certifications" count={content.certifications.length} />
              <div className="space-y-3">
                {content.certifications.map((cert, index) => (
                  <FloatingCard key={`${cert.name}-${index}`} staticHover className="portfolio-cert-card">
                    <div className="portfolio-cert-icon">
                      <Award className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="portfolio-timeline-role">{cert.name}</p>
                      <p className="portfolio-timeline-meta">
                        {cert.issuer}
                        {cert.year ? ` · ${cert.year}` : ""}
                      </p>
                    </div>
                  </FloatingCard>
                ))}
              </div>
            </section>
          ) : null}

          {content.achievements.length > 0 ? (
            <section>
              <SectionHeader title="Achievements" count={content.achievements.length} />
              <FloatingCard staticHover className="p-5 sm:p-6">
                <div className="mb-3 flex items-center gap-2 text-[var(--pf-accent)]">
                  <Trophy className="h-4 w-4" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-[0.12em]">Highlights</span>
                </div>
                <div className="portfolio-achievement-list">
                  {content.achievements.map((item, index) => (
                    <div key={item} className="portfolio-achievement-item">
                      <span className="portfolio-achievement-marker" aria-hidden>
                        {index + 1}
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </FloatingCard>
            </section>
          ) : null}
        </div>

        {/* Contact */}
        <section className="mb-4">
          <SectionHeader title="Contact" />
          <FloatingCard staticHover className="portfolio-contact-bar">
            {content.contact.email ? (
              <Link href={`mailto:${content.contact.email}`} className="portfolio-chip portfolio-chip-primary rounded-xl px-4 py-2.5 text-sm font-medium">
                <Mail className="h-3.5 w-3.5" />
                {content.contact.email}
              </Link>
            ) : null}
            {content.socialLinks.map((link) => (
              <a
                key={link.url}
                href={safeUrl(link.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="portfolio-chip rounded-xl px-4 py-2.5 text-sm font-medium"
              >
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                {link.platform}
              </a>
            ))}
          </FloatingCard>
        </section>

        {!compact ? <p className="portfolio-footer-note">Built with InternAI · portfolio/{slug}</p> : null}
      </div>
    </div>
  );
}
