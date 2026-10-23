"use client";

import {
  buildAuthRedirectUrl,
  getDashboardPathForRole,
  isPathAllowedForRole
} from "@/lib/auth-routes";
import { getAuthSession, type AuthRole } from "@/lib/session";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";

type RoleDashboardGuardProps = {
  expectedRole: AuthRole;
  children: React.ReactNode;
};

function evaluateAccess(expectedRole: AuthRole, pathname: string) {
  const session = getAuthSession();

  if (!session.loggedIn || !session.token || !session.role) {
    return { allowed: false as const, redirect: buildAuthRedirectUrl(expectedRole, pathname) };
  }

  if (session.role !== expectedRole) {
    if (expectedRole === "admin") {
      return {
        allowed: false as const,
        redirect: session.loggedIn ? "/access-denied" : buildAuthRedirectUrl("admin", pathname)
      };
    }
    return { allowed: false as const, redirect: getDashboardPathForRole(session.role) };
  }

  if (!isPathAllowedForRole(pathname, expectedRole)) {
    return { allowed: false as const, redirect: getDashboardPathForRole(expectedRole) };
  }

  return { allowed: true as const, redirect: null };
}

export function RoleDashboardGuard({ expectedRole, children }: RoleDashboardGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  const applyAccess = useCallback(() => {
    const access = evaluateAccess(expectedRole, pathname);
    if (access.redirect) {
      router.replace(access.redirect);
      setAllowed(false);
      return;
    }
    setAllowed(access.allowed);
  }, [expectedRole, pathname, router]);

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

  if (!allowed) return null;

  return <>{children}</>;
}
