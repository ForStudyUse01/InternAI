"use client";

import Link from "next/link";
import { ExternalLink, Sparkles } from "lucide-react";
import type { PortfolioSummary } from "@/lib/portfolio-types";
import { portfolioPublicPath } from "@/lib/portfolio-portal";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/icons/app-icon";

type ApplicantPortfolioCardProps = {
  portfolio?: PortfolioSummary | null;
  internName?: string;
  compact?: boolean;
};

export function ApplicantPortfolioCard({ portfolio, internName, compact = false }: ApplicantPortfolioCardProps) {
  if (!portfolio?.slug) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface)] px-4 py-5 text-sm text-[var(--ds-muted)]">
        {internName || "Candidate"} has not published a 3D portfolio yet.
      </div>
    );
  }

  const href = portfolio.portfolioUrl || portfolioPublicPath(portfolio.slug);

  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--ds-border)] bg-gradient-to-br from-[var(--ds-deep)] to-[var(--ds-bg)] px-4 py-4 shadow-lg shadow-[var(--ds-shadow)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_0%_0%,rgba(59,130,246,0.18),transparent_55%)]" aria-hidden />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ds-primary-text)]">
            <AppIcon icon={Sparkles} size="xs" className="text-current" />
            3D Portfolio
          </p>
          <p className="mt-1.5 text-sm font-semibold tracking-tight text-[var(--ds-text)]">
            {internName ? `${internName}'s portfolio` : "Candidate portfolio"}
          </p>
          {!compact ? (
            <p className="mt-1.5 text-xs text-[var(--ds-muted)]">
              Theme: {portfolio.theme || "midnight"}
              {portfolio.lastGeneratedAt ? ` · Updated ${new Date(portfolio.lastGeneratedAt).toLocaleDateString()}` : ""}
              {typeof portfolio.viewCount === "number" ? ` · ${portfolio.viewCount} views` : ""}
            </p>
          ) : null}
        </div>
        <Link href={href} target="_blank" rel="noopener noreferrer" className="shrink-0">
          <Button type="button" size="sm" className="border-[var(--ds-border)] bg-[var(--ds-surface-hover)] text-[var(--ds-text)] hover:bg-[var(--ds-surface-raised)]">
            <AppIcon icon={ExternalLink} size="xs" className="mr-1.5 text-current" />
            View Portfolio
          </Button>
        </Link>
      </div>
    </div>
  );
}
