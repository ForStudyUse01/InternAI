"use client";

import { useEffect, useState } from "react";
import { ErrorPageShell } from "@/components/errors/error-page-shell";
import { ErrorState } from "@/components/errors/error-state";
import { getAuthSession } from "@/lib/session";
import { getDashboardPathForRole } from "@/lib/auth-routes";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [fallbackCta, setFallbackCta] = useState({ label: "Go Home", href: "/" });

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  useEffect(() => {
    const session = getAuthSession();
    if (session.loggedIn && session.role) {
      setFallbackCta({ label: "Back to Dashboard", href: getDashboardPathForRole(session.role) });
    }
  }, []);

  return (
    <ErrorPageShell>
      <ErrorState variant="500" size="page" onRetry={reset} secondaryCta={fallbackCta} />
    </ErrorPageShell>
  );
}
