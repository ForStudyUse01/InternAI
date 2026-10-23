"use client";

import { useState, useCallback, useEffect } from "react";
import { ExternalLink, Bookmark, BookmarkCheck } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { isCourseSaved, toggleSavedCourse } from "@/lib/saved-courses";
import type { CourseRecommendation } from "@/lib/skill-course-recommendations";
import { cn } from "@/lib/utils";

const PROVIDER_ACCENT: Record<string, string> = {
  "Kaggle Learn":        "bg-[var(--ds-chart-1)]/10 text-[var(--ds-chart-1)]",
  "freeCodeCamp":        "bg-[var(--ds-chart-2)]/10 text-[var(--ds-chart-2)]",
  "NPTEL":               "bg-[var(--ds-chart-3)]/10 text-[var(--ds-chart-3)]",
  "Microsoft Learn":     "bg-[var(--ds-chart-4)]/10 text-[var(--ds-chart-4)]",
  "Google Learn":        "bg-[var(--ds-chart-5)]/10 text-[var(--ds-chart-5)]",
  "DeepLearning.AI":     "bg-[var(--ds-chart-6)]/10 text-[var(--ds-chart-6)]",
  "Coursera":            "bg-[var(--ds-chart-1)]/10 text-[var(--ds-chart-1)]",
  "MIT OpenCourseWare":  "bg-[var(--ds-chart-2)]/10 text-[var(--ds-chart-2)]",
  "Harvard Online Learning": "bg-[var(--ds-chart-3)]/10 text-[var(--ds-chart-3)]",
  "Cisco Skills For All":"bg-[var(--ds-chart-4)]/10 text-[var(--ds-chart-4)]",
};

const LEVEL_DOT: Record<string, string> = {
  Beginner:     "bg-[var(--ds-success)]",
  Intermediate: "bg-[var(--ds-warning)]",
  Advanced:     "bg-[var(--ds-danger)]",
};

type Props = {
  course: CourseRecommendation & { skill: string };
  showSkillTag?: boolean;
};

export function CourseCard({ course, showSkillTag = true }: Props) {
  const [saved, setSaved] = useState(false);

  // read from localStorage after mount
  useEffect(() => {
    setSaved(isCourseSaved(course.url));
  }, [course.url]);

  const handleSave = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const next = toggleSavedCourse(course);
      setSaved(next);
    },
    [course]
  );

  const providerClass =
    PROVIDER_ACCENT[course.provider] ??
    "bg-[var(--ds-surface)] text-[var(--ds-text-secondary)]";

  const levelDot = LEVEL_DOT[course.level] ?? "bg-[var(--ds-muted)]";

  return (
    <article className="group flex flex-col rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-card)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--ds-border-strong)] hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.22)]">
      {/* Card body */}
      <div className="flex flex-1 flex-col p-5">
        {/* Provider + free badge */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", providerClass)}>
            {course.provider}
          </span>
          {course.free && (
            <span className="rounded-full bg-[var(--ds-success-bg)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--ds-success)]">
              Free
            </span>
          )}
        </div>

        {/* Title */}
        <h4 className="mt-3 text-sm font-bold leading-snug text-[var(--ds-text)]">
          {course.title}
        </h4>

        {/* Skill tag */}
        {showSkillTag && (
          <span className="mt-2 inline-block w-fit rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-2 py-0.5 text-[11px] font-medium capitalize text-[var(--ds-text-secondary)]">
            {course.skill}
          </span>
        )}

        {/* Description */}
        {course.description && (
          <p className="mt-2.5 text-xs leading-relaxed text-[var(--ds-muted)] line-clamp-2">
            {course.description}
          </p>
        )}

        {/* Level + duration */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-md bg-[var(--ds-surface-hover)] px-2 py-0.5 text-[11px] text-[var(--ds-muted)]">
            <span className={cn("h-1.5 w-1.5 rounded-full", levelDot)} />
            {course.level}
          </span>
          <span className="rounded-md bg-[var(--ds-surface-hover)] px-2 py-0.5 text-[11px] text-[var(--ds-muted)]">
            {course.duration}
          </span>
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 border-t border-[var(--ds-border)] px-5 py-3">
        {/* Open Course — primary action */}
        <a
          href={course.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--ds-primary)] px-3 py-2 text-xs font-semibold text-[var(--ds-on-primary)] transition hover:bg-[var(--ds-primary-hover)] active:scale-[0.97]"
          onClick={(e) => e.stopPropagation()}
        >
          Open Course
          <AppIcon icon={ExternalLink} size="xs" className="opacity-80" />
        </a>

        {/* Save for later */}
        <button
          type="button"
          onClick={handleSave}
          aria-label={saved ? "Remove from saved" : "Save for later"}
          title={saved ? "Remove from saved" : "Save for later"}
          className={cn(
            "flex items-center justify-center rounded-xl border p-2 text-xs transition active:scale-[0.97]",
            saved
              ? "border-[var(--ds-primary)] bg-[var(--ds-info-bg)] text-[var(--ds-primary-text)]"
              : "border-[var(--ds-border)] bg-[var(--ds-card)] text-[var(--ds-muted)] hover:border-[var(--ds-primary)] hover:bg-[var(--ds-info-bg)] hover:text-[var(--ds-primary-text)]"
          )}
        >
          <AppIcon icon={saved ? BookmarkCheck : Bookmark} size="xs" />
        </button>
      </div>
    </article>
  );
}
