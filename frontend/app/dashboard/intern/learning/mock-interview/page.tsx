"use client";

import { LearningAssessmentPanel } from "@/components/dashboard/intern/learning-assessment-panel";
import { DashboardPageHeader } from "@/components/dashboard/shared/dashboard-page-header";

export default function MockInterviewPage() {
  return (
    <div className="dashboard-stack">
      <DashboardPageHeader eyebrow="Learning" title="Mock Interview" subtitle="Simulated HR and technical interview practice." />
      <LearningAssessmentPanel
        title="Interview Simulations"
        subtitle="Structured mock interviews will be scheduled here."
        emptyTitle="No interview simulations available yet"
        emptyHint="Use HR feedback and skill-gap insights to prepare while simulations are enabled."
        practiceAreas={["Behavioral questions", "Role-fit scenarios", "Technical Q&A", "Communication & clarity"]}
      />
    </div>
  );
}
