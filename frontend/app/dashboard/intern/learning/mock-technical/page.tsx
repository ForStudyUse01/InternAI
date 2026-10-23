"use client";

import dynamic from "next/dynamic";
import { DashboardPageHeader } from "@/components/dashboard/shared/dashboard-page-header";
import { SectionPanel } from "@/components/dashboard/shared/section-panel";
import { Skeleton } from "@/components/ui/skeleton";

const MockTechnicalDsaHub = dynamic(
  () => import("@/components/dashboard/intern/mock-technical-dsa-hub").then((mod) => mod.MockTechnicalDsaHub),
  {
    loading: () => <Skeleton className="h-96 w-full rounded-2xl" />,
    ssr: false
  }
);

export default function MockTechnicalPage() {
  return (
    <div className="dashboard-stack">
      <DashboardPageHeader
        eyebrow="Learning"
        title="Mock Technical Test"
        subtitle="550 curated LeetCode problems across 11 DSA topics — solve directly on LeetCode."
      />
      <SectionPanel title="DSA Interview Question Hub">
        <MockTechnicalDsaHub />
      </SectionPanel>
    </div>
  );
}
