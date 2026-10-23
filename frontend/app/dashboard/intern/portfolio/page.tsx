"use client";

import { PortfolioBuilderHub } from "@/components/portfolio/portfolio-builder-hub";
import { FEATURE_FLAGS } from "@/constants/featureFlags";
import { EmptyState } from "@/components/dashboard/shared/empty-state";

export default function InternPortfolioPage() {
  if (!FEATURE_FLAGS.ENABLE_3D_PORTFOLIO) {
    return (
      <EmptyState
        title="3D Portfolio disabled"
        hint="Set NEXT_PUBLIC_ENABLE_3D_PORTFOLIO=true to use the portfolio builder."
      />
    );
  }

  return <PortfolioBuilderHub />;
}
