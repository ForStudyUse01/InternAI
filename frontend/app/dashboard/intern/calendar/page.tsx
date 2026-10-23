"use client";

import { DashboardPageHeader } from "@/components/dashboard/shared/dashboard-page-header";
import { InterviewCalendar } from "@/components/dashboard/intern/interview-calendar";

export default function InternCalendarPage() {
  return (
    <div className="dashboard-stack">
      <DashboardPageHeader
        eyebrow="Intern Portal"
        title="My Calendar"
        subtitle="Decorate dates with emoji stickers and notes, and view your interview schedule."
      />
      <InterviewCalendar />
    </div>
  );
}
