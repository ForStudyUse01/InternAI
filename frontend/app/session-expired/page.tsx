"use client";

import { useEffect, useState } from "react";
import { ErrorPageShell } from "@/components/errors/error-page-shell";
import { ErrorState } from "@/components/errors/error-state";
import { getAuthSession } from "@/lib/session";
import { getAuthPathForRole } from "@/lib/auth-routes";

export default function SessionExpiredPage() {
  const [signInHref, setSignInHref] = useState("/auth/intern");

  useEffect(() => {
    const session = getAuthSession();
    if (session.role) setSignInHref(getAuthPathForRole(session.role));
  }, []);

  return (
    <ErrorPageShell>
      <ErrorState
        variant="session-expired"
        size="page"
        primaryCta={{ label: "Sign In Again", href: signInHref }}
        secondaryCta={{ label: "Go to Homepage", href: "/" }}
      />
    </ErrorPageShell>
  );
}
