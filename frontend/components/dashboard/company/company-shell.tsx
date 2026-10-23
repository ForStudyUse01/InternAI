"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  Bookmark,
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Download,
  FilePlus2,
  GitBranch,
  Landmark,
  LayoutGrid,
  MessageSquare,
  Pencil,
  Search,
  ShieldCheck,
  Sparkles,
  UserCircle,
  Users
} from "lucide-react";
import { AnimatedBackground } from "@/components/dashboard/shared/AnimatedBackground";
import { PortalBrandHeader } from "@/components/brand/portal-brand-header";
import { DashboardShellHeader } from "@/components/dashboard/shared/dashboard-shell-header";
import { DashboardSidebarNav, type DashboardSidebarSection } from "@/components/dashboard/shared/dashboard-sidebar-nav";
import { SidebarCollapseToggle } from "@/components/dashboard/shared/sidebar-collapse-toggle";
import { ROLE_WELCOME_LABEL, ROLE_WELCOME_TAGLINE, getCompanyDashboardPath } from "@/lib/auth-routes";
import { hasSidebarModule, SIDEBAR_MODULE_KEYS, type SidebarModuleKey } from "@/lib/company-portal";
import { AppIcon } from "@/components/icons/app-icon";
import { FEATURE_FLAGS } from "@/constants/featureFlags";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { useMessagingUnread } from "@/lib/use-messaging-unread";
import { useNotificationUnread } from "@/lib/use-notification-unread";
import { useIsDesktopViewport, useSidebarCollapsed } from "@/lib/use-sidebar-collapsed";
import { cn } from "@/lib/utils";

type SidebarSection = DashboardSidebarSection;

type CompanyShellProps = {
  welcomeName?: string;
  companyAccountType?: "owner" | "hr" | "ceo";
  permissions?: string[];
  sidebarModules?: string[];
  onLogout: () => void;
  children: React.ReactNode;
};

function buildSections({
  companyAccountType,
  permissions,
  sidebarModules,
  chatUnread = 0
}: {
  companyAccountType?: "owner" | "hr" | "ceo";
  permissions?: string[];
  sidebarModules?: string[];
  chatUnread?: number;
}): SidebarSection[] {
  const canViewSalary =
    (permissions || []).includes("company:analytics:salary") || companyAccountType === "owner" || companyAccountType === "ceo";
  const canCreateInternships = companyAccountType !== "hr";
  const isCeoOrOwner = companyAccountType === "owner" || companyAccountType === "ceo";
  const has = (moduleKey: SidebarModuleKey) => hasSidebarModule({ companyAccountType, sidebarModules }, moduleKey);
  const base = getCompanyDashboardPath(companyAccountType);

  return [
    {
      title: "Main",
      items: has(SIDEBAR_MODULE_KEYS.DASHBOARD)
        ? [{ label: "Dashboard Overview", href: base, icon: <AppIcon icon={LayoutGrid} /> }]
        : []
    },
    {
      title: "Company Profile",
      collapsible: true,
      collapsibleIcon: Building2,
      items: has(SIDEBAR_MODULE_KEYS.COMPANY_PROFILE)
        ? [
            { label: "Company Profile", href: `${base}/profile`, icon: <AppIcon icon={Landmark} /> },
            { label: "Edit Company Profile", href: `${base}/profile/edit`, icon: <AppIcon icon={Pencil} /> },
            ...(isCeoOrOwner
              ? [
                  { label: "Personal Information", href: `${base}/profile/personal`, icon: <AppIcon icon={UserCircle} /> },
                  { label: "Edit Personal Information", href: `${base}/profile/personal/edit`, icon: <AppIcon icon={Pencil} /> }
                ]
              : []),
            ...(has(SIDEBAR_MODULE_KEYS.VERIFICATION_STATUS)
              ? [{ label: "Verification Status", href: `${base}/profile/verification`, icon: <AppIcon icon={ShieldCheck} /> }]
              : [])
          ]
        : [
            ...(isCeoOrOwner
              ? [
                  { label: "Personal Information", href: `${base}/profile/personal`, icon: <AppIcon icon={UserCircle} /> },
                  { label: "Edit Personal Information", href: `${base}/profile/personal/edit`, icon: <AppIcon icon={Pencil} /> }
                ]
              : []),
            ...(has(SIDEBAR_MODULE_KEYS.VERIFICATION_STATUS)
              ? [{ label: "Verification Status", href: `${base}/profile/verification`, icon: <AppIcon icon={ShieldCheck} /> }]
              : [])
          ]
    },
    {
      title: "Hiring",
      items: [
        ...(canCreateInternships
          ? [{ label: "Post Internship", href: `${base}/hiring/post`, icon: <AppIcon icon={FilePlus2} /> }]
          : []),
        ...(has(SIDEBAR_MODULE_KEYS.INTERNSHIPS)
          ? [{ label: "Active Internships", href: `${base}/hiring/active`, icon: <AppIcon icon={ClipboardList} /> }]
          : []),
        ...(has(SIDEBAR_MODULE_KEYS.APPLICATIONS)
          ? [
              { label: "Applicants", href: `${base}/hiring/applicants`, icon: <AppIcon icon={Users} /> },
              { label: "Shortlisted", href: `${base}/hiring/shortlisted`, icon: <AppIcon icon={Users} /> },
              { label: "Hiring Pipeline", href: `${base}/hiring/pipeline`, icon: <AppIcon icon={GitBranch} /> }
            ]
          : []),
        ...(has(SIDEBAR_MODULE_KEYS.INTERVIEW_SCHEDULING) || has(SIDEBAR_MODULE_KEYS.INTERVIEW_CALENDAR)
          ? [{ label: "Interviews", href: `${base}/hiring/interviews`, icon: <AppIcon icon={CalendarClock} /> }]
          : []),
        ...(has(SIDEBAR_MODULE_KEYS.INTERVIEW_CALENDAR)
          ? [{ label: "Calendar", href: `${base}/hiring/calendar`, icon: <AppIcon icon={CalendarDays} /> }]
          : []),
        ...(FEATURE_FLAGS.ENABLE_CHAT && has(SIDEBAR_MODULE_KEYS.MESSAGES)
          ? [
              {
                label: chatUnread > 0 ? `Messages (${chatUnread > 9 ? "9+" : chatUnread})` : "Messages",
                href: `${base}/chat`,
                icon: <AppIcon icon={MessageSquare} />
              }
            ]
          : []),
        { label: "Notifications", href: `${base}/notifications`, icon: <AppIcon icon={Bell} /> }
      ]
    },
    {
      title: "Matching",
      items: [
        ...(has(SIDEBAR_MODULE_KEYS.AI_INSIGHTS)
          ? [{ label: "AI Matched Candidates", href: `${base}/matching/ai`, icon: <AppIcon icon={Sparkles} /> }]
          : []),
        ...(has(SIDEBAR_MODULE_KEYS.CANDIDATE_SEARCH)
          ? [{ label: "Candidate Search", href: `${base}/matching/search`, icon: <AppIcon icon={Search} /> }]
          : []),
        ...(has(SIDEBAR_MODULE_KEYS.SAVED_CANDIDATES)
          ? [{ label: "Saved Candidates", href: `${base}/matching/saved`, icon: <AppIcon icon={Bookmark} /> }]
          : [])
      ]
    },
    {
      title: "Feedback & Reports",
      items: has(SIDEBAR_MODULE_KEYS.HIRING_REPORTS)
        ? [
            { label: "Feedback", href: `${base}/reports/feedback`, icon: <AppIcon icon={MessageSquare} /> },
            { label: "Hiring Notes", href: `${base}/reports/notes`, icon: <AppIcon icon={ClipboardList} /> },
            { label: "Reports / Export", href: `${base}/reports/export`, icon: <AppIcon icon={Download} /> }
          ]
        : []
    },
    {
      title: "Company Admin",
      items: [
        ...(has(SIDEBAR_MODULE_KEYS.HR_MANAGEMENT) || has(SIDEBAR_MODULE_KEYS.TEAM_MEMBERS)
          ? [{ label: "Recruiter Management", href: `${base}/team/recruiters`, icon: <AppIcon icon={Users} /> }]
          : []),
        ...(has(SIDEBAR_MODULE_KEYS.ANALYTICS)
          ? [{ label: "Company Analytics", href: `${base}/analytics/company`, icon: <AppIcon icon={BarChart3} /> }]
          : []),
        ...(canViewSalary && has(SIDEBAR_MODULE_KEYS.ANALYTICS)
          ? [{ label: "Salary Insights", href: `${base}/analytics/salary`, icon: <AppIcon icon={BarChart3} /> }]
          : [])
      ]
    }
  ].filter((section) => section.items.length > 0);
}

function isItemActive(pathname: string, href: string) {
  if (href === "/dashboard/companyCEO" || href === "/dashboard/companyHR") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function CompanyShell({ welcomeName, companyAccountType, permissions, sidebarModules, onLogout, children }: CompanyShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed, toggle: toggleCollapsed } = useSidebarCollapsed();
  const isDesktop = useIsDesktopViewport();
  const railCollapsed = collapsed && isDesktop;
  const { messageUnread } = useMessagingUnread();
  const { unreadCount: notificationUnread, setUnreadCount: setNotificationUnread } = useNotificationUnread("company");
  const sections = useMemo(
    () => buildSections({ companyAccountType, permissions, sidebarModules, chatUnread: messageUnread }),
    [companyAccountType, permissions, sidebarModules, messageUnread]
  );
  const notificationHref = `${getCompanyDashboardPath(companyAccountType)}/notifications`;
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
            <PortalBrandHeader portalLabel="Company Portal" collapsed={railCollapsed} />
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
            welcomeLabel={ROLE_WELCOME_LABEL.company}
            welcomeTagline={ROLE_WELCOME_TAGLINE.company}
            welcomeName={welcomeName || "Company"}
            mobileMenuOpen={mobileOpen}
            onOpenMenu={() => setMobileOpen(true)}
            onLogout={onLogout}
            notificationHref={notificationHref}
            notificationRole="company"
            notificationUnreadCount={notificationUnread}
            onNotificationUnreadCountChange={setNotificationUnread}
          />

          <main id="main-content" tabIndex={-1} className="relative z-10 mx-auto w-full max-w-[1240px] p-4 lg:p-5 focus:outline-none">{children}</main>
        </div>
      </div>
    </div>
  );
}
