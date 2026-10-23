"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { InternShell } from "@/components/dashboard/intern/intern-shell";
import { RoleDashboardGuard } from "@/components/ui/role-dashboard-guard";
import { scheduleInitialInternPrefetch } from "@/lib/intern-route-prefetch-scheduler";
import {
  fetchInternProfile,
  peekInternProfile,
  prefetchInternDashboardData,
  checkInterviewReminders,
  PROFILE_UPDATED_EVENT
} from "@/lib/intern-portal";
import { logoutAuthSession } from "@/lib/api-client";

export default function InternDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // Must stay undefined on the first render so SSR and client hydration match.
  // Session/profile data lives in localStorage and is read after mount.
  const [welcomeName, setWelcomeName] = useState<string | undefined>(undefined);

  useLayoutEffect(() => {
    // Deliberately no email-derived fallback here: showing "forstudyuse01"
    // (the local-part of the account email) as a stand-in name would itself
    // be an inconsistent-name bug the instant fetchInternProfile resolves
    // and replaces it with the real fullName. Every other surface in the
    // dashboard treats a not-yet-loaded name as absent (falls back to
    // "Intern"), not as an email guess — this matches that.
    const cached = peekInternProfile();
    if (cached?.fullName) {
      setWelcomeName(cached.fullName);
    }
  }, []);

  useEffect(() => {
    prefetchInternDashboardData();
    scheduleInitialInternPrefetch(router);
    checkInterviewReminders().catch(() => undefined);

    let cancelled = false;
    const syncName = (force = false) => {
      fetchInternProfile(force)
        .then((profile) => {
          if (!cancelled) setWelcomeName(profile.fullName || undefined);
        })
        .catch(() => undefined);
    };

    syncName();

    // This layout stays mounted across every /dashboard/intern/* navigation,
    // so a resume upload or profile edit on another route (which calls
    // invalidateInternCache()) would otherwise never reach this already-set
    // welcomeName state. Re-sync whenever the cache is invalidated, and on
    // login/logout so a stale name from a previous account never lingers.
    const onProfileUpdated = () => syncName(true);
    window.addEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
    window.addEventListener("internai-auth-change", onProfileUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
      window.removeEventListener("internai-auth-change", onProfileUpdated);
    };
  }, [router]);

  const handleLogout = useCallback(async () => {
    await logoutAuthSession();
    router.push("/auth/intern");
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
    <RoleDashboardGuard expectedRole="intern">
      <InternShell welcomeName={welcomeName} onLogout={handleLogout}>
        {children}
      </InternShell>
    </RoleDashboardGuard>
  );
}
