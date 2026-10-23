"use client";

import { InternResumePanel } from "@/components/dashboard/intern/intern-resume-panel";
import { DashboardPageHeader } from "@/components/dashboard/shared/dashboard-page-header";

export default function InternResumePage() {
  return (
    <div className="dashboard-stack">
      <DashboardPageHeader eyebrow="My Profile" title="Resume" subtitle="Upload, preview, and review parsed resume data." />
      <InternResumePanel />
    </div>
  );
}
