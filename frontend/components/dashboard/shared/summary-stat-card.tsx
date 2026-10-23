import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { AppIcon } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";

export type StatTone = "blue" | "violet" | "emerald" | "amber" | "rose";

const TONE_CLASSES: Record<StatTone, string> = {
  blue: "bg-gradient-to-br from-[var(--ds-chart-1)]/25 to-[var(--ds-chart-1)]/5 text-[var(--ds-chart-1)] ring-1 ring-inset ring-[var(--ds-chart-1)]/25",
  violet: "bg-gradient-to-br from-[var(--ds-chart-3)]/25 to-[var(--ds-chart-3)]/5 text-[var(--ds-chart-3)] ring-1 ring-inset ring-[var(--ds-chart-3)]/25",
  emerald: "bg-gradient-to-br from-[var(--ds-success)]/25 to-[var(--ds-success)]/5 text-[var(--ds-success)] ring-1 ring-inset ring-[var(--ds-success)]/25",
  amber: "bg-gradient-to-br from-[var(--ds-warning)]/25 to-[var(--ds-warning)]/5 text-[var(--ds-warning)] ring-1 ring-inset ring-[var(--ds-warning)]/25",
  rose: "bg-gradient-to-br from-[var(--ds-danger)]/25 to-[var(--ds-danger)]/5 text-[var(--ds-danger)] ring-1 ring-inset ring-[var(--ds-danger)]/25"
};

type SummaryStatCardProps = {
  title: string;
  value: string | number;
  suffix?: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: StatTone;
  trend?: { direction: "up" | "down"; label: string };
};

export function SummaryStatCard({ title, value, suffix, hint, icon, tone, trend }: SummaryStatCardProps) {
  return (
    <ScrollReveal variant="fade-up" distance={10}>
      <Card className="ds-stat-card group h-full transition-transform duration-200 hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="ds-label">{title}</p>
            <p className="ds-stat-value">
              {value}
              {suffix || ""}
            </p>
            {trend ? (
              <p
                className={cn(
                  "mt-2 inline-flex items-center gap-1 text-xs font-semibold",
                  trend.direction === "up" ? "text-[var(--ds-success)]" : "text-[var(--ds-danger)]"
                )}
              >
                {trend.direction === "up" ? "↑" : "↓"} {trend.label}
              </p>
            ) : hint ? (
              <p className="ds-caption mt-2">{hint}</p>
            ) : null}
          </div>
          {icon ? (
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
                tone ? TONE_CLASSES[tone] : "ds-stat-icon"
              )}
            >
              <AppIcon icon={icon} size="md" className={tone ? "!text-current" : undefined} />
            </span>
          ) : null}
        </div>
      </Card>
    </ScrollReveal>
  );
}
