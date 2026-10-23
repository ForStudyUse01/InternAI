"use client";

import { useEffect, useState } from "react";
import { Portfolio3DViewer } from "@/components/portfolio/portfolio-3d-viewer";
import { fetchPublicPortfolio } from "@/lib/portfolio-portal";
import type { PortfolioContent, PortfolioTheme } from "@/lib/portfolio-types";

type Props = {
  slug: string;
};

export function PortfolioPublicPageClient({ slug }: Props) {
  const [content, setContent] = useState<PortfolioContent | null>(null);
  const [theme, setTheme] = useState<PortfolioTheme>("midnight");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchPublicPortfolio(slug)
      .then((portfolio) => {
        if (cancelled) return;
        setContent(portfolio.content || null);
        setTheme(portfolio.theme || "midnight");
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message || "Portfolio not found");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center bg-[#050810] text-sm text-slate-400">
        <span className="animate-pulse tracking-wide">Loading portfolio…</span>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div role="alert" className="flex min-h-screen items-center justify-center bg-[#050810] px-4 text-center">
        <div className="max-w-sm">
          <p className="text-lg font-semibold tracking-tight text-slate-100">Portfolio unavailable</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{error || "This portfolio is not published."}</p>
        </div>
      </div>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      <Portfolio3DViewer content={content} theme={theme} slug={slug} />
    </main>
  );
}
