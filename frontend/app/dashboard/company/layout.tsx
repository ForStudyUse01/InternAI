"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CompanyShell } from "@/components/dashboard/company/company-shell";
import { RoleDashboardGuard } from "@/components/ui/role-dashboard-guard";
import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import {
  fetchCompanyProfile,
  peekCompanyProfile,
  prefetchCompanyDashboardData,
  type CompanyCurrentUser
} from "@/lib/company-portal";
import { logoutAuthSession } from "@/lib/api-client";
import { getAuthSession } from "@/lib/session";
import { COMPANY_CEO_DASHBOARD_PATH, COMPANY_HR_DASHBOARD_PATH, isExecutiveCompanyAccountType } from "@/lib/auth-routes";

const LEGACY_COMPANY_BASE = "/dashboard/company";

export default function CompanyDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // Must stay undefined on the first render so SSR and client hydration match.
  const [welcomeName, setWelcomeName] = useState<string | undefined>(undefined);
  const [currentUser, setCurrentUser] = useState<CompanyCurrentUser | null>(null);
  const [blockedExecutiveOnly, setBlockedExecutiveOnly] = useState(false);

  useLayoutEffect(() => {
    const cached = peekCompanyProfile();
    if (cached) {
      setWelcomeName(cached.profile?.companyName);
      setCurrentUser(cached.currentUser);
    }
  }, []);

  useEffect(() => {
    prefetchCompanyDashboardData();

    let cancelled = false;
    fetchCompanyProfile()
      .then((companyContext) => {
        if (!cancelled) {
          setWelcomeName(companyContext.profile?.companyName);
          setCurrentUser(companyContext.currentUser);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    const accountType = currentUser?.companyAccountType || getAuthSession().companyAccountType || undefined;
    if (!accountType) return;

    const executive = isExecutiveCompanyAccountType(accountType);
    const targetBase = executive ? COMPANY_CEO_DASHBOARD_PATH : COMPANY_HR_DASHBOARD_PATH;

    if (pathname.startsWith(COMPANY_HR_DASHBOARD_PATH)) {
      setBlockedExecutiveOnly(false);
      if (executive) {
        router.replace(`${COMPANY_CEO_DASHBOARD_PATH}${pathname.slice(COMPANY_HR_DASHBOARD_PATH.length)}`);
      }
      return;
    }

    if (pathname.startsWith(COMPANY_CEO_DASHBOARD_PATH)) {
      setBlockedExecutiveOnly(!executive);
      return;
    }

    setBlockedExecutiveOnly(false);
    if (pathname === LEGACY_COMPANY_BASE || pathname.startsWith(`${LEGACY_COMPANY_BASE}/`)) {
      router.replace(`${targetBase}${pathname.slice(LEGACY_COMPANY_BASE.length)}`);
    }
  }, [pathname, currentUser?.companyAccountType, router]);

  const handleLogout = useCallback(async () => {
    await logoutAuthSession();
    router.push("/auth/company");
  }, [router]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    document.getElementById("main-content")?.focus();
  }, [pathname]);

  return (
    <RoleDashboardGuard expectedRole="company">
      <CompanyShell
        welcomeName={welcomeName}
        companyAccountType={currentUser?.companyAccountType}
        permissions={currentUser?.permissions || []}
        sidebarModules={currentUser?.sidebarModules || []}
        onLogout={handleLogout}
      >
        {blockedExecutiveOnly ? (
          <AccessDenied
            title="Executive dashboard"
            hint="This dashboard is reserved for Company CEO/Admin accounts. Your HR dashboard is available from the sidebar."
          />
        ) : (
          children
        )}
      </CompanyShell>
    </RoleDashboardGuard>
  );
}
