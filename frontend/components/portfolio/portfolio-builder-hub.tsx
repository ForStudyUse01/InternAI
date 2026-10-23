"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Copy, ExternalLink, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/shared/dashboard-page-header";
import { SectionPanel } from "@/components/dashboard/shared/section-panel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  fetchMyPortfolio,
  fetchPortfolioThemes,
  generateMyPortfolio,
  portfolioAbsoluteUrl,
  portfolioPublicPath,
  updatePortfolioSettings
} from "@/lib/portfolio-portal";
import type { InternPortfolioRecord, PortfolioTheme } from "@/lib/portfolio-types";
import { cn } from "@/lib/utils";
import { SkeletonText, SkeletonPage } from "@/components/ui/skeleton";

// Only mounts once generated content exists (see render below) — never needed
// for a first-time visitor who hasn't generated a portfolio yet.
const Portfolio3DViewer = dynamic(
  () => import("@/components/portfolio/portfolio-3d-viewer").then((m) => m.Portfolio3DViewer),
  { ssr: false, loading: () => <SkeletonPage /> }
);

export function PortfolioBuilderHub() {
  const { pushToast } = useToast();
  const [portfolio, setPortfolio] = useState<InternPortfolioRecord | null>(null);
  const [themes, setThemes] = useState<PortfolioTheme[]>(["midnight", "aurora", "slate"]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [mine, themeList] = await Promise.all([fetchMyPortfolio(true), fetchPortfolioThemes()]);
      setPortfolio(mine);
      if (themeList.length) setThemes(themeList);
    } catch (error) {
      pushToast({ title: "Portfolio load failed", message: (error as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(key: string, action: () => Promise<void>) {
    setBusy(key);
    try {
      await action();
    } catch (error) {
      pushToast({ title: "Portfolio action failed", message: (error as Error).message, variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  const publicPath = portfolio?.slug ? portfolioPublicPath(portfolio.slug) : null;

  return (
    <div className="dashboard-stack">
      <DashboardPageHeader
        eyebrow="Portfolio"
        title="Generate My 3D Portfolio"
        subtitle="Build a professional portfolio from your profile, resume, skills, and projects in one click."
      />

      <SectionPanel title="Portfolio controls" subtitle="Generate, publish, and share your portfolio." titleIcon={Sparkles}>
        {loading ? (
          <SkeletonText lines={3} />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={Boolean(busy)}
                onClick={() =>
                  runAction("generate", async () => {
                    const next = await generateMyPortfolio({ theme: portfolio?.theme || "midnight", useAi: true });
                    setPortfolio(next);
                    pushToast({ title: "Portfolio generated", variant: "success" });
                  })
                }
              >
                {busy === "generate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate My Portfolio
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={Boolean(busy) || !portfolio?.content}
                onClick={() =>
                  runAction("regenerate", async () => {
                    const next = await generateMyPortfolio({ theme: portfolio?.theme, useAi: true });
                    setPortfolio(next);
                    pushToast({ title: "Portfolio regenerated", variant: "success" });
                  })
                }
              >
                {busy === "regenerate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Regenerate
              </Button>
              {publicPath ? (
                <Link href={publicPath} target="_blank" rel="noopener noreferrer" className="inline-flex">
                  <Button type="button" variant="secondary">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open live portfolio
                  </Button>
                </Link>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-muted)]">
                Theme
                <select
                  className="mt-1 block w-full rounded-xl border border-[var(--ds-border)] bg-[var(--ds-card)] px-3 py-2 text-sm"
                  value={portfolio?.theme || "midnight"}
                  disabled={Boolean(busy) || !portfolio}
                  onChange={(event) =>
                    runAction("theme", async () => {
                      const next = await updatePortfolioSettings({ theme: event.target.value as PortfolioTheme });
                      setPortfolio(next);
                    })
                  }
                >
                  {themes.map((theme) => (
                    <option key={theme} value={theme}>
                      {theme}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-muted)]">
                Visibility
                <select
                  className="mt-1 block w-full rounded-xl border border-[var(--ds-border)] bg-[var(--ds-card)] px-3 py-2 text-sm"
                  value={portfolio?.status || "draft"}
                  disabled={Boolean(busy) || !portfolio}
                  onChange={(event) =>
                    runAction("status", async () => {
                      const next = await updatePortfolioSettings({
                        status: event.target.value as InternPortfolioRecord["status"]
                      });
                      setPortfolio(next);
                      pushToast({ title: "Portfolio visibility updated", variant: "success" });
                    })
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>

              <label className="flex items-end gap-2 text-sm text-[var(--ds-text)]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--ds-border)]"
                  checked={portfolio?.autoSync ?? true}
                  disabled={Boolean(busy) || !portfolio}
                  onChange={(event) =>
                    runAction("autosync", async () => {
                      const next = await updatePortfolioSettings({ autoSync: event.target.checked });
                      setPortfolio(next);
                    })
                  }
                />
                Auto-sync when profile changes
              </label>

              <div className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2 text-xs">
                <p className="font-semibold text-[var(--ds-text)]">Status</p>
                <p className="mt-1 capitalize text-[var(--ds-text-secondary)]">{portfolio?.status || "Not generated"}</p>
                {portfolio?.lastGeneratedAt ? (
                  <p className="mt-1 text-[var(--ds-muted)]">Updated {new Date(portfolio.lastGeneratedAt).toLocaleString()}</p>
                ) : null}
              </div>
            </div>

            {portfolio?.slug ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--ds-primary)]/30 bg-[var(--ds-info-bg)] px-3 py-2 text-sm">
                <span className="font-medium text-[var(--ds-primary-text)]">{portfolioAbsoluteUrl(portfolio.slug)}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Copy portfolio link"
                  onClick={() => {
                    void navigator.clipboard.writeText(portfolioAbsoluteUrl(portfolio.slug));
                    pushToast({ title: "Portfolio link copied", variant: "success" });
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </SectionPanel>

      {portfolio?.content ? (
        <SectionPanel title="Live preview" subtitle="This is how recruiters will see your portfolio.">
          <div className={cn("overflow-hidden rounded-2xl border border-[var(--ds-border)] shadow-xl shadow-[var(--ds-shadow)] ring-1 ring-[var(--ds-border)]")}>
            <Portfolio3DViewer content={portfolio.content} theme={portfolio.theme} slug={portfolio.slug} />
          </div>
        </SectionPanel>
      ) : (
        <SectionPanel title="Preview" subtitle="Generate your portfolio to see the 3D preview here.">
          <p className="text-sm text-[var(--ds-muted)]">Your 3D portfolio preview will appear here after generation.</p>
        </SectionPanel>
      )}
    </div>
  );
}
