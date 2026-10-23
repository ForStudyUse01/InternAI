"use client";

import { memo, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import type { CompanyApplication } from "@/lib/company-portal";
import { TrendAreaChart } from "@/components/dashboard/charts/analytics-charts";
import {
  CompanyDashboardEmptyState,
  CompanyDashboardPanelCard,
  CompanyDashboardSection
} from "./company-dashboard-layout";

const WEEKS_SHOWN = 8;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function startOfWeek(date: Date) {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  const day = clone.getDay();
  clone.setDate(clone.getDate() - day);
  return clone;
}

function buildWeeklyBuckets(applications: CompanyApplication[]) {
  const now = startOfWeek(new Date());
  const buckets = Array.from({ length: WEEKS_SHOWN }, (_, index) => {
    const weekStart = new Date(now.getTime() - (WEEKS_SHOWN - 1 - index) * MS_PER_WEEK);
    return { weekStart, count: 0 };
  });

  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

  applications.forEach((application) => {
    if (!application.createdAt) return;
    const createdAt = new Date(application.createdAt);
    if (Number.isNaN(createdAt.getTime())) return;
    const weekStart = startOfWeek(createdAt).getTime();
    const bucket = buckets.find((item) => item.weekStart.getTime() === weekStart);
    if (bucket) bucket.count += 1;
  });

  return buckets.map((bucket) => ({
    label: formatter.format(bucket.weekStart),
    value: bucket.count
  }));
}

function ApplicationsOverTimePanelInner({ applications }: { applications: CompanyApplication[] }) {
  const points = useMemo(() => buildWeeklyBuckets(applications), [applications]);
  const hasEnoughData = applications.length >= 2 && points.some((point) => point.value > 0);

  return (
    <CompanyDashboardSection
      id="applications-over-time"
      icon={TrendingUp}
      title="Applications Over Time"
      description="Weekly application volume across the last 8 weeks."
    >
      {!hasEnoughData ? (
        <CompanyDashboardEmptyState
          title="Application trends appear once you start receiving applications."
          description="Post an internship and this chart will fill in automatically."
          icon={TrendingUp}
        />
      ) : (
        <CompanyDashboardPanelCard>
          <TrendAreaChart data={points} valueLabel="applications" />
        </CompanyDashboardPanelCard>
      )}
    </CompanyDashboardSection>
  );
}

export const ApplicationsOverTimePanel = memo(ApplicationsOverTimePanelInner);
