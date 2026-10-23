"use client";

import { safeUrl } from "@/lib/safe-url";
import type { AdminCompany } from "@/lib/admin-portal";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState as SharedErrorState, classifyErrorMessage } from "@/components/errors/error-state";

export function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" aria-label="Loading" className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function DashboardErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <SharedErrorState
      variant={classifyErrorMessage(message)}
      size="inline"
      description={message}
      onRetry={onRetry}
    />
  );
}

export function DocumentLinks({ company }: { company: AdminCompany }) {
  const links = [
    { label: "LinkedIn", url: company.linkedInUrl },
    { label: "HR Identity Proof", url: company.hrIdentityProofUrl },
    { label: "Business Registration", url: company.businessRegistrationProofUrl },
    ...(company.verificationDocuments || []).map((url, index) => ({ label: `Document ${index + 1}`, url }))
  ].filter((item) => item.url);

  if (links.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {links.map((item) => (
        <a
          key={`${item.label}-${item.url}`}
          href={safeUrl(item.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--ds-primary-text)] transition hover:bg-[var(--ds-info-bg)]"
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}
