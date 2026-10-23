"use client";

import dynamic from "next/dynamic";
import { DashboardPageHeader } from "@/components/dashboard/shared/dashboard-page-header";
import { SectionPanel } from "@/components/dashboard/shared/section-panel";
import { Skeleton } from "@/components/ui/skeleton";

const MockAptitudeHub = dynamic(
  () => import("@/components/dashboard/intern/mock-aptitude-hub").then((mod) => mod.MockAptitudeHub),
  {
    loading: () => <Skeleton className="h-96 w-full rounded-2xl" />,
    ssr: false
  }
);

export default function MockAptitudePage() {
  return (
    <div className="dashboard-stack">
      <DashboardPageHeader
        eyebrow="Learning"
        title="Mock Aptitude Test"
        subtitle="AMCAT-style timed practice with scoring, mentor feedback, and progress tracking."
      />
      <SectionPanel title="Aptitude Test Engine">
        <MockAptitudeHub />
      </SectionPanel>
    </div>
  );
}
