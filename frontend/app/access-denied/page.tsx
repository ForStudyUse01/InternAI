"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorPageShell } from "@/components/errors/error-page-shell";
import { ErrorState } from "@/components/errors/error-state";
import { logoutAuthSession } from "@/lib/api-client";
import { getAuthSession } from "@/lib/session";
import { getAuthPathForRole, getDashboardPathForRole } from "@/lib/auth-routes";

export default function AccessDeniedPage() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<ReturnType<typeof getAuthSession>["role"]>(null);

  useEffect(() => {
    const session = getAuthSession();
    setLoggedIn(session.loggedIn);
    setRole(session.role);
  }, []);

  const dashboardHref = role ? getDashboardPathForRole(role) : "/";
  const loginHref = role ? getAuthPathForRole(role) : "/auth/intern";

  return (
    <ErrorPageShell>
      <ErrorState
        variant="403"
        size="page"
        description="You don't have permission to view this page. Sign in with the correct account or return to your dashboard."
        primaryCta={
          loggedIn && role
            ? { label: "Go to My Dashboard", href: dashboardHref }
            : { label: "Sign In", href: loginHref }
        }
        secondaryCta={{
          label: "Sign Out & Go Home",
          onClick: async () => {
            await logoutAuthSession();
            router.push("/");
          }
        }}
      />
      <p className="ds-caption -mt-6 text-center">
        <Link href="/" className="font-semibold text-[var(--ds-accent)] hover:text-[var(--ds-text)]">
          Back to homepage
        </Link>
      </p>
    </ErrorPageShell>
  );
}
