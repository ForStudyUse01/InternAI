import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Ban,
  CircleDashed,
  Clock,
  Flag,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserX,
  Video
} from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";

type StatusConfig = {
  className: string;
  icon: LucideIcon;
};

const STATUS_MAP: Record<string, StatusConfig> = {
  applied: { className: "bg-[var(--ds-surface-raised)] text-[var(--ds-muted)]", icon: CircleDashed },
  under_review: { className: "bg-[var(--ds-info-bg)] text-[var(--ds-info)]", icon: Clock },
  shortlisted: { className: "bg-[var(--ds-secondary)]/12 text-[var(--ds-secondary)]", icon: Sparkles },
  interview_scheduled: { className: "bg-[var(--ds-accent)]/12 text-[var(--ds-accent)]", icon: Video },
  technical_round: { className: "bg-[var(--ds-secondary)]/12 text-[var(--ds-secondary)]", icon: MessageSquare },
  hr_round: { className: "bg-[var(--ds-accent)]/12 text-[var(--ds-accent)]", icon: UserCheck },
  selected: { className: "bg-[var(--ds-success-bg)] text-[var(--ds-success)]", icon: BadgeCheck },
  offered: { className: "bg-[var(--ds-success-bg)] text-[var(--ds-success)]", icon: BadgeCheck },
  rejected: { className: "bg-[var(--ds-danger-bg)] text-[var(--ds-danger)]", icon: UserX },
  withdrawn: { className: "bg-[var(--ds-surface-raised)] text-[var(--ds-muted)]", icon: Ban },
  on_hold: { className: "bg-[var(--ds-warning-bg)] text-[var(--ds-warning)]", icon: Clock },
  verified: { className: "bg-[var(--ds-success-bg)] text-[var(--ds-success)]", icon: ShieldCheck },
  pending: { className: "bg-[var(--ds-warning-bg)] text-[var(--ds-warning)]", icon: Clock },
  suspended: { className: "bg-[var(--ds-warning-bg)] text-[var(--ds-warning)]", icon: Ban },
  open: { className: "bg-[var(--ds-warning-bg)] text-[var(--ds-warning)]", icon: Flag },
  in_review: { className: "bg-[var(--ds-info-bg)] text-[var(--ds-info)]", icon: Clock },
  escalated: { className: "bg-[var(--ds-secondary)]/12 text-[var(--ds-secondary)]", icon: Flag },
  resolved: { className: "bg-[var(--ds-success-bg)] text-[var(--ds-success)]", icon: BadgeCheck },
  dismissed: { className: "bg-[var(--ds-surface-raised)] text-[var(--ds-muted)]", icon: Ban },
  admin: { className: "bg-[var(--ds-primary)]/10 text-[var(--ds-primary-text)]", icon: ShieldCheck },
  company: { className: "bg-[var(--ds-info-bg)] text-[var(--ds-info)]", icon: ShieldCheck },
  intern: { className: "bg-[var(--ds-surface-raised)] text-[var(--ds-muted)]", icon: UserCheck },
  reported: { className: "bg-[var(--ds-danger-bg)] text-[var(--ds-danger)]", icon: Flag }
};

type StatusBadgeProps = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = (status || "").toLowerCase().replace(/\s+/g, "_");
  const config = STATUS_MAP[normalized] || {
    className: "bg-[var(--ds-surface-raised)] text-[var(--ds-muted)]",
    icon: CircleDashed
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        config.className,
        className
      )}
    >
      <AppIcon icon={config.icon} size="xs" className="text-current" />
      {status.replace(/_/g, " ")}
    </span>
  );
}
