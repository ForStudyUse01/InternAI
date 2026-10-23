"use client";

import { memo, useMemo } from "react";
import { Building2, GraduationCap, LineChart } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { AppIcon } from "@/components/icons/app-icon";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { TrendAreaChart, type TrendPoint } from "@/components/dashboard/charts/analytics-charts";
import { cn } from "@/lib/utils";
import type { AdminUser, AdminCompany, AdminInternship } from "@/lib/admin-portal";

const cardBase = "ds-card p-6";

function monthKey(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

function buildMonthlyTrend(items: Array<{ createdAt?: string }>, months = 6): TrendPoint[] {
  const now = new Date();
  const buckets = new Map<string, number>();
  const order: string[] = [];

  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    buckets.set(key, 0);
    order.push(key);
  }

  const cutoff = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  items.forEach((item) => {
    if (!item.createdAt) return;
    const d = new Date(item.createdAt);
    if (Number.isNaN(d.getTime()) || d < cutoff) return;
    const key = monthKey(d);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
  });

  return order.map((label) => ({ label, value: buckets.get(label) || 0 }));
}

type ChartSlot = {
  key: string;
  title: string;
  icon: typeof GraduationCap;
  valueLabel: string;
  data: TrendPoint[];
  emptyHint: string;
};

function AdminGrowthChartsInner({
  users,
  companies,
  internships
}: {
  users: AdminUser[];
  companies: AdminCompany[];
  internships: AdminInternship[];
}) {
  const studentGrowth = useMemo(
    () => buildMonthlyTrend(users.filter((u) => u.role === "intern")),
    [users]
  );
  const companyGrowth = useMemo(() => buildMonthlyTrend(companies), [companies]);
  const internshipGrowth = useMemo(() => buildMonthlyTrend(internships), [internships]);

  const slots: ChartSlot[] = [
    {
      key: "students",
      title: "Student Growth",
      icon: GraduationCap,
      valueLabel: "new students",
      data: studentGrowth,
      emptyHint: "New student registrations will appear here."
    },
    {
      key: "companies",
      title: "Company Registrations",
      icon: Building2,
      valueLabel: "new companies",
      data: companyGrowth,
      emptyHint: "New company registrations will appear here."
    },
    {
      key: "internships",
      title: "Internship Growth",
      icon: LineChart,
      valueLabel: "new postings",
      data: internshipGrowth,
      emptyHint: "New internship postings will appear here."
    }
  ];

  const visibleSlots = slots.filter((slot) => slot.data.some((point) => point.value > 0));

  if (visibleSlots.length === 0) {
    return (
      <div className={cardBase}>
        <EmptyState title="Not enough activity yet" hint="Growth charts appear once new students, companies, or internships register." icon={LineChart} />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {visibleSlots.map((slot, index) => (
        <ScrollReveal key={slot.key} variant="fade-up" distance={12} delayMs={index * 60}>
          <div className={cardBase}>
            <div className="mb-4 flex items-center gap-2">
              <AppIcon icon={slot.icon} size="sm" className="text-[var(--ds-primary-text)]" />
              <h3 className="ds-h3">{slot.title}</h3>
            </div>
            <TrendAreaChart data={slot.data} valueLabel={slot.valueLabel} />
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}

export const AdminGrowthCharts = memo(AdminGrowthChartsInner);
