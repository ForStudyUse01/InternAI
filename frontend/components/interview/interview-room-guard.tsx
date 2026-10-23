"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { buildAuthRedirectUrl, getAuthPathForRole, getDashboardPathForRole, isInterviewPath } from "@/lib/auth-routes";
import { getAuthSession, type AuthRole } from "@/lib/session";

type InterviewRoomGuardProps = {
  children: React.ReactNode;
};

const ALLOWED_ROLES: AuthRole[] = ["intern", "company"];

export function InterviewRoomGuard({ children }: InterviewRoomGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Checking session...");

  const applyAccess = useCallback(() => {
    const session = getAuthSession();

    if (!session.loggedIn || !session.token || !session.role) {
      setStatusMessage("Redirecting to sign in...");
      const redirectRole = session.role && ALLOWED_ROLES.includes(session.role) ? session.role : "intern";
      router.replace(buildAuthRedirectUrl(redirectRole, pathname));
      setAllowed(false);
      return;
    }

    if (!ALLOWED_ROLES.includes(session.role)) {
      setStatusMessage("Access denied. Redirecting...");
      router.replace(getDashboardPathForRole(session.role));
      setAllowed(false);
      return;
    }

    if (!isInterviewPath(pathname)) {
      router.replace(getDashboardPathForRole(session.role));
      setAllowed(false);
      return;
    }

    setAllowed(true);
  }, [pathname, router]);

  useLayoutEffect(() => {
    applyAccess();
  }, [applyAccess]);

  useEffect(() => {
    window.addEventListener("internai-auth-change", applyAccess);
    window.addEventListener("storage", applyAccess);
    return () => {
      window.removeEventListener("internai-auth-change", applyAccess);
      window.removeEventListener("storage", applyAccess);
    };
  }, [applyAccess]);

  if (!allowed) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen items-center justify-center bg-[var(--ds-bg)] text-sm text-[var(--ds-text-secondary)]"
      >
        {statusMessage}
      </div>
    );
  }

  return <>{children}</>;
}

export function resolveInterviewAuthRedirect(role: AuthRole | null, returnPath: string): string {
  const safeRole = role && ALLOWED_ROLES.includes(role) ? role : "intern";
  return buildAuthRedirectUrl(safeRole, returnPath);
}

export function getInterviewAuthPath(role: AuthRole | null): string {
  const safeRole = role && ALLOWED_ROLES.includes(role) ? role : "intern";
  return getAuthPathForRole(safeRole);
}
