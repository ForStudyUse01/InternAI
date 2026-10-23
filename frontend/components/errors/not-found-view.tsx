"use client";

import { useEffect, useState } from "react";
import { ErrorPageShell } from "@/components/errors/error-page-shell";
import { ErrorState } from "@/components/errors/error-state";
import { getAuthSession } from "@/lib/session";
import { getDashboardPathForRole } from "@/lib/auth-routes";

export function NotFoundView() {
  const [dashboardHref, setDashboardHref] = useState<string | null>(null);

  useEffect(() => {
    const session = getAuthSession();
    if (session.loggedIn && session.role) setDashboardHref(getDashboardPathForRole(session.role));
  }, []);

  return (
    <ErrorPageShell>
      <ErrorState
        variant="404"
        size="page"
        primaryCta={
          dashboardHref
            ? { label: "Go to My Dashboard", href: dashboardHref }
            : { label: "Go to Homepage", href: "/" }
        }
        secondaryCta={dashboardHref ? { label: "Go to Homepage", href: "/" } : undefined}
        showBack
      />
    </ErrorPageShell>
  );
}
