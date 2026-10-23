"use client";

import { useId, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ShieldAlert, ShieldBan, ShieldCheck, ShieldQuestion, Star } from "lucide-react";
import type { CompanyProfile } from "@/lib/company-portal";
import type { BadgeTone } from "@/components/ui/badge";
import { AppIcon } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";

export const field = "ds-input";
export const fieldArea = "ds-textarea";

export function Empty({ text }: { text: string }) {
  return <div className="ds-card border-dashed px-4 py-3 text-sm text-[var(--ds-muted)]">{text}</div>;
}

const NOTE_CLAMP_THRESHOLD = 220;

export function ClampedNote({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > NOTE_CLAMP_THRESHOLD;
  const noteId = useId();

  return (
    <div>
      <p id={noteId} className={cn("ds-body mt-2 leading-relaxed", !expanded && isLong && "line-clamp-3")}>{text}</p>
      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-controls={noteId}
          className="mt-1 text-xs font-semibold text-[var(--ds-accent)] transition hover:underline"
        >
          {expanded ? "View less" : "View more"}
        </button>
      ) : null}
    </div>
  );
}

export function FeedbackRatingStars({ rating }: { rating: number }) {
  const rounded = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <div className="flex items-center gap-1" aria-label={`Rated ${rounded} out of 5`}>
      {Array.from({ length: 5 }).map((_, idx) => (
        <AppIcon
          key={idx}
          icon={Star}
          size="xs"
          className={idx < rounded ? "!text-[var(--ds-warning)]" : "!text-[var(--ds-border-strong)]"}
          style={idx < rounded ? { fill: "currentColor" } : undefined}
        />
      ))}
      <span className="ml-1 text-xs font-semibold text-[var(--ds-muted)]">{rounded}/5</span>
    </div>
  );
}

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export function InfoTile({
  label,
  value,
  icon,
  className
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("company-dashboard-metric-tile", className)}>
      <p className="ds-label flex items-center gap-1.5">
        {icon ? <AppIcon icon={icon} size="xs" className="text-[var(--ds-muted)]" /> : null}
        {label}
      </p>
      <p className="mt-1.5 break-words text-sm font-semibold text-[var(--ds-text)]">{value}</p>
    </div>
  );
}

export function PermissionChip({
  label,
  checked,
  onToggle,
  disabled
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={checked}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none transition-colors duration-150",
        checked
          ? "border-[var(--ds-border-strong)] bg-[var(--ds-surface-raised)] text-[var(--ds-accent)]"
          : "border-[var(--ds-border)] text-[var(--ds-muted)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)]",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      {label}
    </button>
  );
}

export const VERIFICATION_META: Record<CompanyProfile["verificationStatus"], { tone: BadgeTone; icon: LucideIcon; label: string }> = {
  verified: { tone: "success", icon: ShieldCheck, label: "Verified" },
  pending: { tone: "warning", icon: ShieldQuestion, label: "Pending Review" },
  rejected: { tone: "danger", icon: ShieldAlert, label: "Rejected" },
  suspended: { tone: "danger", icon: ShieldBan, label: "Suspended" }
};

export const VERIFICATION_STATUS_VISUAL: Record<string, { fg: string; bg: string }> = {
  success: { fg: "var(--ds-success)", bg: "var(--ds-success-bg)" },
  warning: { fg: "var(--ds-warning)", bg: "var(--ds-warning-bg)" },
  danger: { fg: "var(--ds-danger)", bg: "var(--ds-danger-bg)" }
};

export const VERIFICATION_CTA: Record<CompanyProfile["verificationStatus"], { label: string; href: string }> = {
  verified: { label: "View Company Profile", href: "/dashboard/company/profile" },
  pending: { label: "Review Company Profile", href: "/dashboard/company/profile/edit" },
  rejected: { label: "Update Company Profile", href: "/dashboard/company/profile/edit" },
  suspended: { label: "Update Company Profile", href: "/dashboard/company/profile/edit" }
};

export function fmtDate(value?: string) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("en-IN");
}

export function normalizePipelineStatus(status: string) {
  const value = String(status || "").toLowerCase();
  if (value === "screening") return "reviewed";
  if (value === "offered") return "selected";
  if (value === "technical_round") return "technical_round";
  if (value === "hr_round") return "hr_round";
  if (value === "under_review") return "under_review";
  if (value === "on_hold") return "on_hold";
  return value;
}

export function normalizeApplicantStage(value: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "screening") return "reviewed";
  if (normalized === "interview") return "interview_scheduled";
  if (normalized === "offered") return "selected";
  return normalized;
}
