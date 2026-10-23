"use client";

import Link from "next/link";
import { useMemo } from "react";
import { getAuthPathForRole, getDashboardPathForRole } from "@/lib/auth-routes";
import { useAuthSession } from "@/lib/use-auth-session";
import type { AuthRole } from "@/lib/session";

type SmartAuthLinkProps = {
  intendedRole: AuthRole;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
};

export function SmartAuthLink({ intendedRole, className, children, onClick }: SmartAuthLinkProps) {
  const { loggedIn, role } = useAuthSession();

  const href = useMemo(() => {
    if (loggedIn && role) {
      if (role === intendedRole) return getDashboardPathForRole(intendedRole);
      return getDashboardPathForRole(role);
    }
    return getAuthPathForRole(intendedRole);
  }, [intendedRole, loggedIn, role]);

  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
