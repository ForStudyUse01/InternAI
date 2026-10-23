"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Award,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  Flag,
  LayoutGrid,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";
import { AnimatedBackground } from "@/components/dashboard/shared/AnimatedBackground";
import { PortalBrandHeader } from "@/components/brand/portal-brand-header";
import { DashboardShellHeader } from "@/components/dashboard/shared/dashboard-shell-header";
import { DashboardSidebarNav } from "@/components/dashboard/shared/dashboard-sidebar-nav";
import { SidebarCollapseToggle } from "@/components/dashboard/shared/sidebar-collapse-toggle";
import { ROLE_WELCOME_LABEL, ROLE_WELCOME_TAGLINE } from "@/lib/auth-routes";
import { AppIcon } from "@/components/icons/app-icon";
import { ADMIN_PERMISSIONS, hasAdminPermission } from "@/constants/admin-permissions";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { useIsDesktopViewport, useSidebarCollapsed } from "@/lib/use-sidebar-collapsed";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/lib/session";

type SidebarItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission?: string;
};

type SidebarSection = {
  title: string;
  items: SidebarItem[];
};

type AdminShellProps = {
  welcomeName?: string;
  adminRole?: AdminRole | null;
  permissions?: string[];
  onLogout: () => void;
  children: React.ReactNode;
};

function buildSections(permissions: string[]): SidebarSection[] {
  const can = (perm: string) => hasAdminPermission(permissions, perm as (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS]);

  const sections: SidebarSection[] = [
    {
      title: "Main",
      items: [{ label: "Dashboard Overview", href: "/dashboard/admin", icon: <AppIcon icon={LayoutGrid} /> }]
    },
    {
      title: "Management",
      items: [
        ...(can(ADMIN_PERMISSIONS.USER_VIEW)
          ? [{ label: "Users", href: "/dashboard/admin/users", icon: <AppIcon icon={Users} />, permission: ADMIN_PERMISSIONS.USER_VIEW }]
          : []),
        ...(can(ADMIN_PERMISSIONS.COMPANY_VERIFY)
          ? [
              { label: "Companies", href: "/dashboard/admin/companies", icon: <AppIcon icon={Building2} />, permission: ADMIN_PERMISSIONS.COMPANY_VERIFY },
              {
                label: "Verification Queue",
                href: "/dashboard/admin/verification",
                icon: <AppIcon icon={ShieldCheck} />,
                permission: ADMIN_PERMISSIONS.COMPANY_VERIFY
              }
            ]
          : []),
        { label: "Internships", href: "/dashboard/admin/internships", icon: <AppIcon icon={ClipboardList} /> },
        ...(can(ADMIN_PERMISSIONS.CERTIFICATION_REVIEW)
          ? [{
              label: "Certification Review",
              href: "/dashboard/admin/certification-review",
              icon: <AppIcon icon={Award} />,
              permission: ADMIN_PERMISSIONS.CERTIFICATION_REVIEW
            }]
          : [])
      ]
    },
    {
      title: "Moderation",
      items: [
        ...(can(ADMIN_PERMISSIONS.REPORT_REVIEW)
          ? [{ label: "Reported Companies", href: "/dashboard/admin/reports", icon: <AppIcon icon={Flag} />, permission: ADMIN_PERMISSIONS.REPORT_REVIEW }]
          : []),
        ...(can(ADMIN_PERMISSIONS.ACTIVITY_VIEW)
          ? [{ label: "Activity Logs", href: "/dashboard/admin/activity-logs", icon: <AppIcon icon={Activity} />, permission: ADMIN_PERMISSIONS.ACTIVITY_VIEW }]
          : [])
      ]
    },
    {
      title: "Secondary",
      items: [
        { label: "Platform Statistics", href: "/dashboard/admin/analytics", icon: <AppIcon icon={BarChart3} /> },
        { label: "Notifications", href: "/dashboard/admin/notifications", icon: <AppIcon icon={Bell} /> },
        ...(can(ADMIN_PERMISSIONS.MANAGE)
          ? [{ label: "AI Hiring Scoring", href: "/dashboard/admin/hiring-scoring", icon: <AppIcon icon={BarChart3} /> }]
          : []),
        { label: "Settings", href: "/dashboard/admin/settings", icon: <AppIcon icon={Settings} /> }
      ]
    }
  ];

  return sections.filter((section) => section.items.length > 0);
}

function isItemActive(pathname: string, href: string) {
  if (href === "/dashboard/admin") return pathname === "/dashboard/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ welcomeName, adminRole, permissions = [], onLogout, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed, toggle: toggleCollapsed } = useSidebarCollapsed();
  const isDesktop = useIsDesktopViewport();
  const railCollapsed = collapsed && isDesktop;
  const sections = useMemo(() => buildSections(permissions), [permissions]);
  const roleLabel = adminRole ? adminRole.replace(/_/g, " ") : "administrator";
  // Same background-blocking overlay as Modal -- same Escape/scroll-lock/
  // focus-trap treatment. Gated on isDesktop too: mobileOpen can stay
  // stale-true if the viewport is widened without closing the drawer first,
  // and the aside is always visible on lg regardless of mobileOpen there.
  const mobileDrawerActive = mobileOpen && !isDesktop;
  const dialogRef = useFocusTrap<HTMLElement>(mobileDrawerActive);

  useEffect(() => {
    if (!mobileDrawerActive) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileDrawerActive]);

  return (
    <div className="min-h-screen bg-[var(--ds-bg)] transition-colors duration-300">
      <div className="mx-auto flex max-w-[1600px]">
        <aside
          ref={dialogRef}
          className={cn(
            "sidebar-surface sidebar-shell fixed inset-y-0 left-0 z-40 w-72 p-5 shadow-[0_12px_36px_rgba(15,23,42,0.12)] transition-[width,transform] duration-300 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 dark:shadow-[0_16px_44px_rgba(2,6,23,0.55)]",
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            collapsed ? "lg:w-20 lg:p-3" : "lg:w-72"
          )}
        >
          <div className="shrink-0">
            <PortalBrandHeader portalLabel="Admin Portal" collapsed={railCollapsed} />
            <div className={cn("mb-4 hidden lg:flex", collapsed ? "justify-center" : "justify-start")}>
              <SidebarCollapseToggle collapsed={collapsed} onToggle={toggleCollapsed} />
            </div>
          </div>

          <DashboardSidebarNav
            sections={sections}
            isItemActive={isItemActive}
            onNavigate={() => setMobileOpen(false)}
            collapsed={railCollapsed}
          />
        </aside>

        {mobileOpen && <button aria-label="Close menu" className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setMobileOpen(false)} />}

        <div className="relative min-w-0 flex-1 overflow-hidden">
          <AnimatedBackground className="opacity-75" />
          <DashboardShellHeader
            welcomeLabel={ROLE_WELCOME_LABEL.admin}
            welcomeTagline={ROLE_WELCOME_TAGLINE.admin}
            welcomeName={welcomeName || "Administrator"}
            meta={roleLabel}
            mobileMenuOpen={mobileOpen}
            onOpenMenu={() => setMobileOpen(true)}
            onLogout={onLogout}
          />

          <main id="main-content" tabIndex={-1} className="relative z-10 mx-auto w-full max-w-[1240px] p-4 lg:p-5 focus:outline-none">{children}</main>
        </div>
      </div>
    </div>
  );
}
