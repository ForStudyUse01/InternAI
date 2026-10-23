import Link from "next/link";
import { SectionPanel } from "@/components/dashboard/shared/section-panel";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Button } from "@/components/ui/button";

type LearningAssessmentPanelProps = {
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyHint: string;
  practiceAreas: string[];
};

export function LearningAssessmentPanel({ title, subtitle, emptyTitle, emptyHint, practiceAreas }: LearningAssessmentPanelProps) {
  return (
    <div className="dashboard-stack">
      <SectionPanel title={title} subtitle={subtitle}>
        <EmptyState
          title={emptyTitle}
          hint={emptyHint}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button href="/dashboard/intern/learning/courses" type="button" size="sm" variant="secondary">
                Browse Courses
              </Button>
              <Button href="/dashboard/intern/skill-gap" type="button" size="sm">
                Review Skill Gap
              </Button>
            </div>
          }
        />
      </SectionPanel>

      <SectionPanel title="Practice Focus Areas" subtitle="Prepare while assessments are being assigned to your account.">
        <ul className="grid gap-3 sm:grid-cols-2">
          {practiceAreas.map((area) => (
            <li key={area} className="surface-subtle px-4 py-3 text-sm text-[var(--ds-text-secondary)]">
              {area}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-[var(--ds-muted)]">
          Need help? Visit{" "}
          <Link href="/dashboard/intern/support" className="font-semibold text-[var(--ds-primary-text)] hover:underline">
            Help / Support
          </Link>
          .
        </p>
      </SectionPanel>
    </div>
  );
}
