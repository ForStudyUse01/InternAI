"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resolvePostLoginRedirect } from "@/lib/auth-routes";
import { getAuthSession, type AuthRole } from "@/lib/session";

type AuthSessionRedirectProps = {
  expectedRole: AuthRole;
  children: React.ReactNode;
};

export function AuthSessionRedirect({ expectedRole, children }: AuthSessionRedirectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getAuthSession();
    if (session.loggedIn && session.role) {
      const next = searchParams.get("next");
      router.replace(resolvePostLoginRedirect(session.role, next, session.companyAccountType));
      return;
    }
    setReady(true);
  }, [expectedRole, router, searchParams]);

  if (!ready) {
    return (
      <section className="container-shell py-12">
        <div role="status" aria-live="polite" className="ds-card p-6 text-sm text-[var(--ds-muted)]">Loading...</div>
      </section>
    );
  }

  return <>{children}</>;
}
