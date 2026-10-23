"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { safeUrl } from "@/lib/safe-url";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AdminShell } from "@/components/dashboard/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { SummaryStatCard } from "@/components/dashboard/shared/summary-stat-card";
import { RoleDashboardGuard } from "@/components/ui/role-dashboard-guard";
import { ErrorState as SharedErrorState, classifyErrorMessage } from "@/components/errors/error-state";
import { ADMIN_PERMISSIONS, canAccessAdminView, hasAdminPermission } from "@/constants/admin-permissions";
import { logoutAuthSession } from "@/lib/api-client";
import { getAuthSession, type AdminRole } from "@/lib/session";
import { cn } from "@/lib/utils";
import {
  fetchAdminActivityLogs,
  fetchAdminCompanies,
  fetchAdminInternships,
  fetchAdminMetrics,
  fetchAdminReports,
  fetchAdminUsers,
  fetchAdminUserById,
  invalidateAdminPortalCache,
  resolveReport,
  softDeleteAdminUser,
  updateAdminUser,
  updateReportStatus,
  updateCompanyVerification,
  moderateAdminInternship,
  type AdminActivityLog,
  type AdminCompany,
  type AdminInternship,
  type AdminMetrics,
  type AdminReport,
  type AdminUser,
  type AdminUserDetail,
  type AdminInternProfileSummary
} from "@/lib/admin-portal";
import { Building2, Calendar, ClipboardList, Flag, GraduationCap, UserCheck, Users } from "lucide-react";
import { ReportDownloadButton } from "@/components/reports/report-download-button";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { StatusBadge } from "@/components/icons/status-badge";
import { BRANDED_EMPTY_STATES } from "@/lib/brand";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SearchInput } from "@/components/ui/search-input";
import { useToast } from "@/components/ui/toast";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { DashboardErrorState, LoadingRows, formatDate } from "@/components/dashboard/admin/admin-dashboard-shared";

// View-gated surfaces never appear on every view — split them into their own chunks.
const AdminGrowthCharts = dynamic(
  () => import("@/components/dashboard/admin/admin-growth-charts").then((m) => m.AdminGrowthCharts),
  { ssr: false, loading: () => <SkeletonTable /> }
);
const AdminRecentActivityPanel = dynamic(
  () => import("@/components/dashboard/admin/admin-recent-activity-panel").then((m) => m.AdminRecentActivityPanel),
  { ssr: false, loading: () => <SkeletonTable /> }
);
const AdminCompaniesView = dynamic(
  () => import("@/components/dashboard/admin/views/admin-companies-view").then((m) => m.AdminCompaniesView),
  { ssr: false, loading: () => <SkeletonTable /> }
);
const AdminCertificationReview = dynamic(
  () => import("@/components/dashboard/admin/admin-certification-review").then((m) => m.AdminCertificationReview),
  { ssr: false, loading: () => <SkeletonTable rows={3} columns={3} /> }
);
const AdminHiringScoringPanel = dynamic(
  () => import("@/components/dashboard/admin/admin-hiring-scoring-panel").then((m) => m.AdminHiringScoringPanel),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full" /> }
);
const ThemeSettingsPanel = dynamic(
  () => import("@/components/theme/theme-settings-panel").then((m) => m.ThemeSettingsPanel),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> }
);

export type AdminDashboardView =
  | "overview"
  | "users"
  | "companies"
  | "verification"
  | "internships"
  | "reports"
  | "activity-logs"
  | "analytics"
  | "notifications"
  | "settings"
  | "hiring-scoring"
  | "certification-review";

const VIEW_META: Record<AdminDashboardView, { title: string; subtitle: string }> = {
  overview: { title: "Platform Overview", subtitle: "Live snapshot of platform health, users, and moderation." },
  users: { title: "User Management", subtitle: "All interns, companies, and administrators on the platform." },
  companies: { title: "Companies", subtitle: "Registered companies and their verification status." },
  verification: { title: "Verification Queue", subtitle: "Review and approve or reject pending company accounts." },
  internships: { title: "Internships", subtitle: "All internship postings across companies." },
  reports: { title: "Reported Companies", subtitle: "Abuse reports awaiting moderation." },
  "activity-logs": { title: "Activity Logs", subtitle: "Audit trail of administrative and hiring actions." },
  analytics: { title: "Platform Analytics", subtitle: "Real-time KPIs and operational trends." },
  notifications: { title: "Notifications", subtitle: "Recent operational alerts and moderation notifications." },
  settings: { title: "Settings", subtitle: "Administrative controls and platform safeguards." },
  "hiring-scoring": {
    title: "AI Hiring Scoring",
    subtitle: "Configure role-specific evaluation weights with validation and version history."
  },
  "certification-review": {
    title: "Certification Review",
    subtitle: "Approve or reject intern course completion submissions."
  }
};

function AdminDashboardInner({ view }: { view: AdminDashboardView }) {
  const router = useRouter();
  const meta = VIEW_META[view];
  const session = getAuthSession();
  const permissions = session.permissions;
  const adminRole = session.adminRole;
  const welcomeName = session.email || "Administrator";
  const { pushToast } = useToast();

  const canUpdateUsers = hasAdminPermission(permissions, ADMIN_PERMISSIONS.USER_UPDATE);
  const canDeleteUsers = hasAdminPermission(permissions, ADMIN_PERMISSIONS.USER_DELETE);
  const canVerifyCompanies = hasAdminPermission(permissions, ADMIN_PERMISSIONS.COMPANY_VERIFY);
  const canReviewReports = hasAdminPermission(permissions, ADMIN_PERMISSIONS.REPORT_REVIEW);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [internships, setInternships] = useState<AdminInternship[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logSearch, setLogSearch] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const debouncedSearch = useDebouncedValue(search);
  const debouncedCompanySearch = useDebouncedValue(companySearch);
  const debouncedLogSearch = useDebouncedValue(logSearch);

  const [companyPage, setCompanyPage] = useState(1);
  const [internshipPage, setInternshipPage] = useState(1);
  const [reportPage, setReportPage] = useState(1);
  const PAGE_SIZE = 10;

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<{ user: AdminUserDetail; internProfile: AdminInternProfileSummary | null } | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userDetailError, setUserDetailError] = useState<string | null>(null);

  const [confirmAction, setConfirmAction] = useState<
    | { type: "delete-user"; user: AdminUser }
    | { type: "suspend-company"; company: AdminCompany }
    | { type: "unverify-company"; company: AdminCompany }
    | { type: "remove-internship"; internship: AdminInternship }
    | null
  >(null);

  useEffect(() => {
    if (!canAccessAdminView(view, permissions)) {
      router.replace("/dashboard/admin");
    }
  }, [view, permissions, router]);

  const loadData = useCallback(
    async (force = false) => {
      setLoading(true);
      setError(null);
      try {
        // The overview needs everything; specific views fetch their own slice.
        if (view === "overview") {
          const [m, u, c, i, r, l] = await Promise.all([
            fetchAdminMetrics(force),
            fetchAdminUsers({ limit: 100, force }),
            fetchAdminCompanies({ force }),
            fetchAdminInternships(force),
            fetchAdminReports(force),
            fetchAdminActivityLogs({ page: 1, limit: 20, force })
          ]);
          setMetrics(m);
          setUsers(u.users);
          setUserTotal(u.total);
          setCompanies(c);
          setInternships(i);
          setReports(r);
          setLogs(l.logs || []);
        } else if (view === "users") {
          const response = await fetchAdminUsers({ page: userPage, limit: 50, q: debouncedSearch, role: roleFilter, isActive: statusFilter, force });
          setUsers(response.users);
          setUserTotal(response.total);
        } else if (view === "analytics") {
          const [m, u, c, i] = await Promise.all([
            fetchAdminMetrics(force),
            fetchAdminUsers({ limit: 100, force }),
            fetchAdminCompanies({ force }),
            fetchAdminInternships(force)
          ]);
          setMetrics(m);
          setUsers(u.users);
          setUserTotal(u.total);
          setCompanies(c);
          setInternships(i);
        } else if (view === "companies") {
          setCompanies(await fetchAdminCompanies({ q: debouncedCompanySearch, force }));
        } else if (view === "verification") {
          setCompanies(await fetchAdminCompanies({ status: "pending", q: debouncedCompanySearch, force }));
        } else if (view === "internships") {
          setInternships(await fetchAdminInternships(force));
        } else if (view === "reports") {
          setReports(await fetchAdminReports(force));
        } else if (view === "activity-logs") {
          const response = await fetchAdminActivityLogs({ page: logsPage, limit: 30, q: debouncedLogSearch, force });
          setLogs(response.logs || []);
          setLogsTotal(response.total || 0);
        } else if (view === "notifications") {
          setReports(await fetchAdminReports(force));
          const response = await fetchAdminActivityLogs({ page: 1, limit: 20, force });
          setLogs(response.logs || []);
        } else if (view === "settings") {
          setUsers(await fetchAdminUsers({ limit: 10, force }).then((r) => r.users));
        }
      } catch (err) {
        setError((err as Error).message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    },
    [view, userPage, debouncedSearch, roleFilter, statusFilter, debouncedCompanySearch, logsPage, debouncedLogSearch]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setCompanyPage(1);
    setInternshipPage(1);
    setReportPage(1);
    setSelectedUserIds(new Set());
  }, [view]);

  const handleLogout = useCallback(async () => {
    await logoutAuthSession();
    invalidateAdminPortalCache();
    router.push("/auth/admin");
  }, [router]);

  const handleVerify = useCallback(
    async (company: AdminCompany, status: "verified" | "rejected" | "suspended" | "pending", reason = "") => {
      if (!canVerifyCompanies) return;
      setBusyId(company._id);
      try {
        await updateCompanyVerification(company._id, status, reason);
        const refreshed = await fetchAdminCompanies({
          status: view === "verification" ? "pending" : undefined,
          q: companySearch,
          force: true
        });
        setCompanies(refreshed);
        setRejectingId(null);
        setRejectReason("");
      } catch (err) {
        setError((err as Error).message || "Action failed");
      } finally {
        setBusyId(null);
      }
    },
    [canVerifyCompanies, view, companySearch]
  );

  const handleResolve = useCallback(async (report: AdminReport) => {
    setBusyId(report._id);
    try {
      await resolveReport(report._id, "Resolved by admin");
      const refreshed = await fetchAdminReports(true);
      setReports(refreshed);
      pushToast({ title: "Report resolved", message: report.company?.companyName || "Report", variant: "success" });
    } catch (err) {
      setError((err as Error).message || "Action failed");
    } finally {
      setBusyId(null);
    }
  }, [pushToast]);

  const handleUserActivation = useCallback(async (user: AdminUser, isActive: boolean) => {
    if (!canUpdateUsers) return;
    setBusyId(user._id);
    try {
      await updateAdminUser(user._id, { isActive });
      const response = await fetchAdminUsers({ page: userPage, limit: 50, q: search, role: roleFilter, isActive: statusFilter, force: true });
      setUsers(response.users);
      setUserTotal(response.total);
      pushToast({ title: isActive ? "User activated" : "User deactivated", message: user.email, variant: "success" });
    } catch (err) {
      setError((err as Error).message || "Failed to update user");
    } finally {
      setBusyId(null);
    }
  }, [canUpdateUsers, userPage, search, roleFilter, statusFilter, pushToast]);

  const handleUserRole = useCallback(async (user: AdminUser, role: AdminUser["role"]) => {
    if (!canUpdateUsers) return;
    setBusyId(user._id);
    try {
      await updateAdminUser(user._id, { role });
      const response = await fetchAdminUsers({ page: userPage, limit: 50, q: search, role: roleFilter, isActive: statusFilter, force: true });
      setUsers(response.users);
      setUserTotal(response.total);
      pushToast({ title: "Role updated", message: `${user.email} is now ${role}`, variant: "success" });
    } catch (err) {
      setError((err as Error).message || "Failed to update role");
    } finally {
      setBusyId(null);
    }
  }, [canUpdateUsers, userPage, search, roleFilter, statusFilter, pushToast]);

  const handleAdminRoleChange = useCallback(async (user: AdminUser, nextAdminRole: AdminRole) => {
    if (!canUpdateUsers) return;
    setBusyId(user._id);
    try {
      await updateAdminUser(user._id, { adminRole: nextAdminRole });
      const response = await fetchAdminUsers({ page: userPage, limit: 50, q: search, role: roleFilter, isActive: statusFilter, force: true });
      setUsers(response.users);
      setUserTotal(response.total);
      pushToast({ title: "Admin role updated", message: `${user.email} is now ${nextAdminRole.replace(/_/g, " ")}`, variant: "success" });
    } catch (err) {
      setError((err as Error).message || "Failed to update admin role");
    } finally {
      setBusyId(null);
    }
  }, [canUpdateUsers, userPage, search, roleFilter, statusFilter, pushToast]);

  const handleSoftDeleteUser = useCallback(async (user: AdminUser) => {
    if (!canDeleteUsers) return;
    setBusyId(user._id);
    try {
      await softDeleteAdminUser(user._id);
      const response = await fetchAdminUsers({ page: userPage, limit: 50, q: search, role: roleFilter, isActive: statusFilter, force: true });
      setUsers(response.users);
      setUserTotal(response.total);
      pushToast({ title: "User deleted", message: user.email, variant: "success" });
    } catch (err) {
      setError((err as Error).message || "Failed to delete user");
    } finally {
      setBusyId(null);
    }
  }, [canDeleteUsers, userPage, search, roleFilter, statusFilter, pushToast]);

  const handleReportStatus = useCallback(async (report: AdminReport, status: "in_review" | "escalated" | "resolved" | "dismissed") => {
    setBusyId(report._id);
    try {
      await updateReportStatus(report._id, {
        status,
        resolutionNote: status === "resolved" ? "Resolved by admin" : status === "dismissed" ? "Dismissed by admin" : ""
      });
      setReports(await fetchAdminReports(true));
      pushToast({ title: "Report updated", message: `${report.company?.companyName || "Report"} marked ${status.replace(/_/g, " ")}`, variant: "success" });
    } catch (err) {
      setError((err as Error).message || "Failed to update report");
    } finally {
      setBusyId(null);
    }
  }, [pushToast]);

  const runConfirmedAction = useCallback(async () => {
    if (!confirmAction) return;
    setBulkBusy(true);
    try {
      if (confirmAction.type === "delete-user") {
        await handleSoftDeleteUser(confirmAction.user);
      } else if (confirmAction.type === "suspend-company") {
        await handleVerify(confirmAction.company, "suspended", "Suspended by admin");
      } else if (confirmAction.type === "unverify-company") {
        await handleVerify(confirmAction.company, "pending", "Verification revoked by admin");
      } else if (confirmAction.type === "remove-internship") {
        await moderateAdminInternship(confirmAction.internship._id, { removePost: true });
        await loadData(true);
      }
    } finally {
      setBulkBusy(false);
      setConfirmAction(null);
    }
  }, [confirmAction, handleSoftDeleteUser, handleVerify, loadData]);

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const handleBulkUserActivation = useCallback(
    async (isActive: boolean) => {
      if (!canUpdateUsers || selectedUserIds.size === 0) return;
      setBulkBusy(true);
      try {
        const targets = users.filter((u) => selectedUserIds.has(u._id));
        for (const user of targets) {
          await updateAdminUser(user._id, { isActive });
        }
        const response = await fetchAdminUsers({ page: userPage, limit: 50, q: debouncedSearch, role: roleFilter, isActive: statusFilter, force: true });
        setUsers(response.users);
        setUserTotal(response.total);
        setSelectedUserIds(new Set());
        pushToast({
          title: isActive ? "Users activated" : "Users deactivated",
          message: `${targets.length} user${targets.length > 1 ? "s" : ""}`,
          variant: "success"
        });
      } catch (err) {
        setError((err as Error).message || "Bulk action failed");
      } finally {
        setBulkBusy(false);
      }
    },
    [canUpdateUsers, selectedUserIds, users, userPage, debouncedSearch, roleFilter, statusFilter, pushToast]
  );

  const openUserDetail = useCallback(async (userId: string) => {
    setViewingUserId(userId);
    setUserDetail(null);
    setUserDetailError(null);
    setUserDetailLoading(true);
    try {
      const detail = await fetchAdminUserById(userId);
      setUserDetail(detail);
    } catch (err) {
      setUserDetailError((err as Error).message || "Failed to load user details");
    } finally {
      setUserDetailLoading(false);
    }
  }, []);

  const stats = useMemo(() => {
    const interns = users.filter((u) => u.role === "intern").length;
    const companyUsers = users.filter((u) => u.role === "company").length;
    const pending = companies.filter((c) => c.verificationStatus === "pending").length;
    const openReports = reports.filter((r) => r.status === "open").length;
    return {
      interns,
      companyUsers,
      pending,
      openReports,
      totalStudents: metrics?.totalStudents ?? interns,
      totalCompanies: metrics?.totalCompanies ?? companies.length,
      activeInternships: metrics?.activeInternships ?? internships.length,
      totalHires: metrics?.totalHires ?? 0,
      activeInterviews: metrics?.activeInterviews ?? 0
    };
  }, [users, companies, reports, metrics, internships.length]);

  const pendingCompanies = useMemo(
    () => companies.filter((c) => c.verificationStatus === "pending"),
    [companies]
  );

  const visibleCompanies = view === "verification" ? pendingCompanies : companies;
  const companyTotalPages = Math.max(1, Math.ceil(visibleCompanies.length / PAGE_SIZE));
  const pagedCompanies = useMemo(
    () => visibleCompanies.slice((companyPage - 1) * PAGE_SIZE, companyPage * PAGE_SIZE),
    [visibleCompanies, companyPage]
  );

  const internshipTotalPages = Math.max(1, Math.ceil(internships.length / PAGE_SIZE));
  const pagedInternships = useMemo(
    () => internships.slice((internshipPage - 1) * PAGE_SIZE, internshipPage * PAGE_SIZE),
    [internships, internshipPage]
  );

  const reportTotalPages = Math.max(1, Math.ceil(reports.length / PAGE_SIZE));
  const pagedReports = useMemo(
    () => reports.slice((reportPage - 1) * PAGE_SIZE, reportPage * PAGE_SIZE),
    [reports, reportPage]
  );

  const userTotalPages = Math.max(1, Math.ceil(userTotal / 50));
  const logsTotalPages = Math.max(1, Math.ceil(logsTotal / 30));

  if (!canAccessAdminView(view, permissions)) {
    return null;
  }

  return (
    <AdminShell welcomeName={welcomeName} adminRole={adminRole} permissions={permissions} onLogout={handleLogout}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--ds-text)]">{meta.title}</h1>
          <p className="mt-1 text-sm text-[var(--ds-muted)]">{meta.subtitle}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => loadData(true)} disabled={loading}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-5">
          <DashboardErrorState message={error} onRetry={() => loadData(true)} />
        </div>
      )}

      {view === "overview" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ReportDownloadButton reportKey="platform-statistics" label="Download Platform Statistics PDF" />
          </div>
          {loading ? (
            <div role="status" aria-live="polite" aria-label="Loading platform statistics" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={`row1-${i}`} className="h-28 w-full" />
                ))}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={`row2-${i}`} className="h-28 w-full" />
                ))}
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={`row3-${i}`} className="h-56 w-full" />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryStatCard title="Total Students" value={stats.totalStudents} hint="Registered intern accounts" icon={GraduationCap} />
                <SummaryStatCard title="Total Companies" value={stats.totalCompanies} hint={`${stats.pending} pending verification`} icon={Building2} />
                <SummaryStatCard title="Active Internships" value={stats.activeInternships} hint="Active postings on platform" icon={ClipboardList} />
                <SummaryStatCard title="Total Applications" value="—" hint="Available in a future release" icon={Users} />
                <SummaryStatCard title="Interviews" value={stats.activeInterviews} hint="Ongoing interview pipeline" icon={Calendar} />
                <SummaryStatCard title="Offers" value={stats.totalHires} hint="Selected or offered applications" icon={UserCheck} />
                <SummaryStatCard title="Pending Verifications" value={stats.pending} hint="Companies awaiting approval" icon={Building2} />
                <SummaryStatCard title="Reports" value={stats.openReports} hint={`${reports.length} total reports`} icon={Flag} />
              </div>

              <div className="mt-6">
                <AdminGrowthCharts users={users} companies={companies} internships={internships} />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AdminRecentActivityPanel logs={logs} />

                <div className="space-y-4">
                  <Card title="Pending Verification" subtitle="Companies awaiting approval">
                    {pendingCompanies.length === 0 ? (
                      <EmptyState title="No pending companies" hint="All companies have been reviewed." presetKey="companies" />
                    ) : (
                      <ul className="space-y-2">
                        {pendingCompanies.slice(0, 5).map((company) => (
                          <li
                            key={company._id}
                            className="flex items-center justify-between rounded-xl border border-[var(--ds-border)] bg-[var(--ds-card)] px-3 py-2.5 "
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[var(--ds-text)]">{company.companyName}</p>
                              <p className="truncate text-xs text-[var(--ds-muted)]">{company.companyEmail}</p>
                            </div>
                            <Button size="sm" href="/dashboard/admin/verification" variant="secondary">
                              Review
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>

                  <Card title="Open Reports" subtitle="Abuse reports needing attention">
                    {reports.filter((r) => r.status === "open").length === 0 ? (
                      <EmptyState title="No open reports" hint="The moderation queue is clear." presetKey="reports" />
                    ) : (
                      <ul className="space-y-2">
                        {reports
                          .filter((r) => r.status === "open")
                          .slice(0, 5)
                          .map((report) => (
                            <li
                              key={report._id}
                              className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-card)] px-3 py-2.5 "
                            >
                              <p className="truncate text-sm font-semibold text-[var(--ds-text)]">
                                {report.company?.companyName || "Unknown company"}
                              </p>
                              <p className="truncate text-xs text-[var(--ds-muted)]">{report.reason}</p>
                            </li>
                          ))}
                      </ul>
                    )}
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {view === "users" && (
        <Card>
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <SearchInput
                value={search}
                onValueChange={(next) => {
                  setSearch(next);
                  setUserPage(1);
                }}
                loading={loading && Boolean(debouncedSearch)}
                placeholder="Search by email..."
              />
              <Select
                value={roleFilter}
                aria-label="Filter by role"
                onChange={(event) => {
                  setRoleFilter(event.target.value);
                  setUserPage(1);
                }}
              >
                <option value="">All roles</option>
                <option value="intern">Intern</option>
                <option value="company">Company</option>
                <option value="admin">Admin</option>
              </Select>
              <Select
                value={statusFilter}
                aria-label="Filter by status"
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setUserPage(1);
                }}
              >
                <option value="">All statuses</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
              <Button size="sm" variant="secondary" onClick={() => loadData(true)}>
                Apply filters
              </Button>
            </div>

          {loading ? (
            <SkeletonTable rows={6} columns={7} />
          ) : users.length === 0 ? (
            <EmptyState
              title="No users found"
              description={search || roleFilter || statusFilter ? "No users match the current search, role, or status filter." : undefined}
              presetKey="users"
              action={
                search || roleFilter || statusFilter ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSearch("");
                      setRoleFilter("");
                      setStatusFilter("");
                      setUserPage(1);
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">

              {canUpdateUsers && selectedUserIds.size > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--ds-primary)]/30 bg-[var(--ds-info-bg)] px-3 py-2.5">
                  <span className="text-sm font-semibold text-[var(--ds-primary-text)]">
                    {selectedUserIds.size} user{selectedUserIds.size > 1 ? "s" : ""} selected
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" disabled={bulkBusy} onClick={() => handleBulkUserActivation(true)}>
                      Activate
                    </Button>
                    <Button size="sm" variant="secondary" disabled={bulkBusy} onClick={() => handleBulkUserActivation(false)}>
                      Deactivate
                    </Button>
                    <Button size="sm" variant="ghost" disabled={bulkBusy} onClick={() => setSelectedUserIds(new Set())}>
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              <Table className="min-w-[760px]">
                <TableHead>
                  {canUpdateUsers && (
                    <TableCell as="th" className="w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all users on this page"
                        checked={users.length > 0 && users.every((u) => selectedUserIds.has(u._id))}
                        onChange={(event) => {
                          setSelectedUserIds(event.target.checked ? new Set(users.map((u) => u._id)) : new Set());
                        }}
                      />
                    </TableCell>
                  )}
                  <TableCell as="th">Email</TableCell>
                  <TableCell as="th">Role</TableCell>
                  <TableCell as="th">Admin Role</TableCell>
                  <TableCell as="th">Status</TableCell>
                  <TableCell as="th">Joined</TableCell>
                  <TableCell as="th">Actions</TableCell>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id}>
                      {canUpdateUsers && (
                        <TableCell>
                          <input
                            type="checkbox"
                            aria-label={`Select ${user.email}`}
                            checked={selectedUserIds.has(user._id)}
                            onChange={() => toggleUserSelection(user._id)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium text-[var(--ds-text)]">{user.email}</TableCell>
                      <TableCell>
                        <StatusBadge status={user.role} />
                      </TableCell>
                      <TableCell>
                        {user.role === "admin" ? (
                          canUpdateUsers ? (
                            <Select
                              value={user.adminRole || "super_admin"}
                              aria-label={`Change admin role for ${user.email}`}
                              disabled={busyId === user._id}
                              onChange={(event) => handleAdminRoleChange(user, event.target.value as AdminRole)}
                              className="h-8 py-1 text-xs"
                              wrapperClassName="w-44"
                            >
                              <option value="super_admin">Super Admin</option>
                              <option value="verification_admin">Verification Admin</option>
                              <option value="moderation_admin">Moderation Admin</option>
                              <option value="support_admin">Support Admin</option>
                            </Select>
                          ) : (
                            <span className="text-xs capitalize text-[var(--ds-text-secondary)]">{user.adminRole?.replace(/_/g, " ") || "—"}</span>
                          )
                        ) : (
                          <span className="text-xs text-[var(--ds-muted)]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[var(--ds-text-secondary)]">
                        {user.isActive === false ? "Inactive" : "Active"}
                      </TableCell>
                      <TableCell className="text-[var(--ds-muted)]">{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openUserDetail(user._id)}>
                            View
                          </Button>
                          {canUpdateUsers && (
                            <>
                              <Button size="sm" variant="secondary" disabled={busyId === user._id} onClick={() => handleUserActivation(user, user.isActive === false)}>
                                {user.isActive === false ? "Activate" : "Deactivate"}
                              </Button>
                              {user.role !== "admin" && (
                                <Button size="sm" variant="secondary" disabled={busyId === user._id} onClick={() => handleUserRole(user, user.role === "company" ? "intern" : "company")}>
                                  Toggle Role
                                </Button>
                              )}
                            </>
                          )}
                          {canDeleteUsers && (
                            <Button size="sm" variant="secondary" disabled={busyId === user._id} onClick={() => setConfirmAction({ type: "delete-user", user })}>
                              Soft Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-xs text-[var(--ds-muted)]">
                <span>
                  Page {userPage} · {users.length} of {userTotal} users
                </span>
                <Pagination page={userPage} totalPages={userTotalPages} onChange={(p) => setUserPage(p)} />
              </div>
            </div>
          )}
          </div>
        </Card>
      )}

      <Modal
        open={Boolean(viewingUserId)}
        onClose={() => setViewingUserId(null)}
        title={
          userDetail?.user.displayName ||
          userDetail?.internProfile?.fullName ||
          userDetail?.user.companyProfileRef?.companyName ||
          userDetail?.user.email ||
          "User details"
        }
        subtitle={userDetail?.user.email}
        icon={Users}
        size="md"
      >
        {userDetailLoading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : userDetailError ? (
          <DashboardErrorState message={userDetailError} onRetry={() => viewingUserId && openUserDetail(viewingUserId)} />
        ) : userDetail ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar
                size="lg"
                src={userDetail.user.photoUrl}
                name={
                  userDetail.user.displayName ||
                  userDetail.internProfile?.fullName ||
                  userDetail.user.companyProfileRef?.companyName ||
                  userDetail.user.email
                }
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--ds-text)]">
                  {userDetail.user.displayName ||
                    userDetail.internProfile?.fullName ||
                    userDetail.user.companyProfileRef?.companyName ||
                    userDetail.user.email}
                </p>
                <p className="truncate text-xs text-[var(--ds-muted)]">{userDetail.user.email}</p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-[var(--ds-muted)]">Role</dt>
                <dd className="capitalize text-[var(--ds-text)]">{userDetail.user.role}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--ds-muted)]">Status</dt>
                <dd className="text-[var(--ds-text)]">{userDetail.user.isActive === false ? "Inactive" : "Active"}</dd>
              </div>
              {userDetail.user.phone && (
                <div>
                  <dt className="text-xs text-[var(--ds-muted)]">Phone</dt>
                  <dd className="text-[var(--ds-text)]">{userDetail.user.phone}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-[var(--ds-muted)]">Joined</dt>
                <dd className="text-[var(--ds-text)]">{formatDate(userDetail.user.createdAt)}</dd>
              </div>
            </dl>

            {userDetail.user.bio && <p className="text-sm text-[var(--ds-text-secondary)]">{userDetail.user.bio}</p>}

            {userDetail.user.role === "admin" && (
              <div>
                <p className="text-xs font-semibold text-[var(--ds-muted)]">Admin privileges</p>
                <p className="mt-1 text-sm capitalize text-[var(--ds-text)]">
                  {userDetail.user.adminRole?.replace(/_/g, " ") || "—"}
                </p>
                {userDetail.user.permissions && userDetail.user.permissions.length > 0 && (
                  <p className="mt-1 text-xs text-[var(--ds-muted)]">{userDetail.user.permissions.join(", ")}</p>
                )}
              </div>
            )}

            {userDetail.user.role === "company" && (
              <div>
                <p className="text-xs font-semibold text-[var(--ds-muted)]">Company</p>
                {userDetail.user.companyProfileRef ? (
                  <div className="mt-1 space-y-0.5 text-sm text-[var(--ds-text)]">
                    <p className="font-medium">{userDetail.user.companyProfileRef.companyName}</p>
                    <p className="text-[var(--ds-text-secondary)]">{userDetail.user.companyProfileRef.companyEmail}</p>
                    {userDetail.user.companyProfileRef.industry && (
                      <p className="text-[var(--ds-text-secondary)]">{userDetail.user.companyProfileRef.industry}</p>
                    )}
                    <p className="text-xs capitalize text-[var(--ds-muted)]">
                      {userDetail.user.companyProfileRef.verificationStatus}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-[var(--ds-muted)]">No company profile linked.</p>
                )}
              </div>
            )}

            {userDetail.user.role === "intern" && (
              <div>
                <p className="text-xs font-semibold text-[var(--ds-muted)]">Academic</p>
                {userDetail.internProfile?.educationDetails && userDetail.internProfile.educationDetails.length > 0 ? (
                  <div className="mt-1 space-y-1 text-sm text-[var(--ds-text)]">
                    {userDetail.internProfile.educationDetails.map((edu, i) => (
                      <p key={i}>{[edu.degree, edu.branch, edu.college, edu.passingYear].filter(Boolean).join(" · ")}</p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-[var(--ds-muted)]">No academic details on file.</p>
                )}
                {userDetail.internProfile?.mobile && (
                  <p className="mt-1 text-xs text-[var(--ds-muted)]">Mobile: {userDetail.internProfile.mobile}</p>
                )}
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {(view === "companies" || view === "verification") && (
        <AdminCompaniesView
          view={view}
          companySearch={companySearch}
          setCompanySearch={setCompanySearch}
          setCompanyPage={setCompanyPage}
          loading={loading}
          debouncedCompanySearch={debouncedCompanySearch}
          visibleCompanies={visibleCompanies}
          pagedCompanies={pagedCompanies}
          companyPage={companyPage}
          companyTotalPages={companyTotalPages}
          canVerifyCompanies={canVerifyCompanies}
          busyId={busyId}
          setBusyId={setBusyId}
          setCompanies={setCompanies}
          setError={setError}
          rejectingId={rejectingId}
          setRejectingId={setRejectingId}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          handleVerify={handleVerify}
          onSuspend={(company) => setConfirmAction({ type: "suspend-company", company })}
          onUnverify={(company) => setConfirmAction({ type: "unverify-company", company })}
          loadData={loadData}
        />
      )}

      {view === "internships" && (
        <Card>
          {loading ? (
            <SkeletonTable rows={6} columns={7} />
          ) : internships.length === 0 ? (
            <EmptyState title="No internships posted yet" presetKey="internships" />
          ) : (
            <div className="space-y-3">
              <Table className="min-w-[680px]">
                <TableHead>
                  <TableCell as="th">Role</TableCell>
                  <TableCell as="th">Company</TableCell>
                  <TableCell as="th">Location</TableCell>
                  <TableCell as="th">Stipend</TableCell>
                  <TableCell as="th">Status</TableCell>
                  <TableCell as="th">Posted</TableCell>
                  <TableCell as="th">Actions</TableCell>
                </TableHead>
                <TableBody>
                  {pagedInternships.map((internship) => (
                    <TableRow key={internship._id}>
                      <TableCell className="font-medium text-[var(--ds-text)]">{internship.role}</TableCell>
                      <TableCell className="text-[var(--ds-text-secondary)]">{internship.company?.companyName || "—"}</TableCell>
                      <TableCell className="text-[var(--ds-text-secondary)]">{internship.location || "—"}</TableCell>
                      <TableCell className="text-[var(--ds-text-secondary)]">{internship.stipend || "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={internship.isActive === false ? "rejected" : "verified"} />
                      </TableCell>
                      <TableCell className="text-[var(--ds-muted)]">{formatDate(internship.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={async () => {
                              try {
                                await moderateAdminInternship(internship._id, { isActive: !internship.isActive });
                                await loadData(true);
                              } catch (err) {
                                setError((err as Error).message || "Failed to update internship");
                              }
                            }}
                          >
                            {internship.isActive === false ? "Activate" : "Deactivate"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmAction({ type: "remove-internship", internship })}
                          >
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--ds-muted)]">
                <span>
                  Page {internshipPage} of {internshipTotalPages} · {internships.length} internships
                </span>
                <Pagination page={internshipPage} totalPages={internshipTotalPages} onChange={(p) => setInternshipPage(p)} />
              </div>
            </div>
          )}
        </Card>
      )}

      {view === "reports" && (
        <div className="space-y-4">
          {loading ? (
            <LoadingRows />
          ) : reports.length === 0 ? (
            <EmptyState title={BRANDED_EMPTY_STATES.reports.title} hint={BRANDED_EMPTY_STATES.reports.hint} presetKey="reports" />
          ) : (
            <>
            {pagedReports.map((report) => (
              <Card key={report._id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-bold text-[var(--ds-text)]">
                        {report.company?.companyName || "Unknown company"}
                      </h3>
                      <StatusBadge status={report.status} />
                    </div>
                    <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">{report.reason}</p>
                    {report.reportType && (
                      <p className="mt-1 text-xs capitalize text-[var(--ds-muted)]">Type: {report.reportType.replace(/_/g, " ")}</p>
                    )}
                    {report.details && (
                      <p className="mt-2 text-xs text-[var(--ds-text-secondary)]">{report.details}</p>
                    )}
                    {report.internship?.role && (
                      <p className="mt-1 text-xs text-[var(--ds-muted)]">Internship: {report.internship.role}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--ds-muted)]">
                      {report.reportedBy?.email && <span>Reported by: {report.reportedBy.email}</span>}
                      <span>Filed: {formatDate(report.createdAt)}</span>
                    </div>
                    {(report.evidenceUrls || []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(report.evidenceUrls || []).map((url, index) => (
                          <a
                            key={`${report._id}-evidence-${index}`}
                            href={safeUrl(url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--ds-accent)]"
                          >
                            Evidence {index + 1}
                          </a>
                        ))}
                      </div>
                    )}
                    {report.status === "resolved" && report.resolutionNote && (
                      <p className="mt-2 text-xs text-[var(--ds-success)]">Resolution: {report.resolutionNote}</p>
                    )}
                  </div>
                  {canReviewReports && (
                  <div className="flex flex-wrap gap-2">
                    {report.status !== "in_review" && (
                      <Button size="sm" variant="secondary" disabled={busyId === report._id} onClick={() => handleReportStatus(report, "in_review")}>
                        In Review
                      </Button>
                    )}
                    {report.status !== "escalated" && (
                      <Button size="sm" variant="secondary" disabled={busyId === report._id} onClick={() => handleReportStatus(report, "escalated")}>
                        Escalate
                      </Button>
                    )}
                    {report.status !== "resolved" && (
                      <Button size="sm" disabled={busyId === report._id} onClick={() => handleResolve(report)}>
                        {busyId === report._id ? "Saving…" : "Resolve"}
                      </Button>
                    )}
                    {report.status !== "dismissed" && (
                      <Button size="sm" variant="secondary" disabled={busyId === report._id} onClick={() => handleReportStatus(report, "dismissed")}>
                        Dismiss
                      </Button>
                    )}
                  </div>
                  )}
                </div>
              </Card>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-[var(--ds-muted)]">
              <span>
                Page {reportPage} of {reportTotalPages} · {reports.length} reports
              </span>
              <Pagination page={reportPage} totalPages={reportTotalPages} onChange={(p) => setReportPage(p)} />
            </div>
            </>
          )}
        </div>
      )}

      {view === "activity-logs" && (
        <Card>
          <div className="mb-3 flex flex-wrap gap-2">
            <SearchInput
              value={logSearch}
              onValueChange={(next) => {
                setLogSearch(next);
                setLogsPage(1);
              }}
              loading={loading && Boolean(debouncedLogSearch)}
              placeholder="Search activity logs..."
              containerClassName="min-w-[220px] flex-1"
            />
            <Button size="sm" variant="secondary" onClick={() => loadData(true)}>
              Search
            </Button>
          </div>
          {loading ? (
            <LoadingRows rows={6} />
          ) : logs.length === 0 ? (
            <EmptyState
              title={logSearch ? "No logs match your search" : "No activity recorded yet"}
              hint={logSearch ? "Try a different keyword or action name." : "Administrative and hiring actions will appear here."}
              presetKey="activity"
              action={
                logSearch ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setLogSearch("");
                      setLogsPage(1);
                    }}
                  >
                    Clear Search
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
            <ul className="space-y-2">
              {logs.map((log) => (
                <li
                  key={log._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-card)] px-3 py-2.5 "
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--ds-text)]">
                      <span className="capitalize">{(log.action || "").replace(/_/g, " ") || "Action"}</span>
                    </p>
                    <p className="truncate text-xs text-[var(--ds-muted)]">
                      {log.actorUser?.email ? `${log.actorUser.email} · ` : log.actorRole ? `${log.actorRole} · ` : ""}
                      {log.entityType || ""}
                      {log.ipAddress ? ` · ${log.ipAddress}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--ds-muted)]">{formatDate(log.createdAt)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--ds-muted)]">
              <span>
                Page {logsPage} · {logs.length} of {logsTotal} entries
              </span>
              <Pagination page={logsPage} totalPages={logsTotalPages} onChange={(p) => setLogsPage(p)} />
            </div>
            </>
          )}
        </Card>
      )}

      {view === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryStatCard title="Total Students" value={stats.totalStudents} hint="Registered intern accounts" icon={GraduationCap} />
            <SummaryStatCard title="Total Companies" value={stats.totalCompanies} hint="Company organizations onboarded" icon={Building2} />
            <SummaryStatCard title="Total Hires" value={stats.totalHires} hint="Applications marked selected/offered" icon={UserCheck} />
            <SummaryStatCard title="Active Interviews" value={stats.activeInterviews} hint="Ongoing interview pipeline" icon={Calendar} />
          </div>
          <AdminGrowthCharts users={users} companies={companies} internships={internships} />
          <Card title="Operational Mix" subtitle="Current platform workload distribution">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--ds-border)] p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--ds-muted)]">Pending Company Approvals</p>
                <p className="mt-1 text-2xl font-black text-[var(--ds-text)]">{stats.pending}</p>
              </div>
              <div className="rounded-xl border border-[var(--ds-border)] p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--ds-muted)]">Open Reports</p>
                <p className="mt-1 text-2xl font-black text-[var(--ds-text)]">{stats.openReports}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {view === "notifications" && (
        <Card title="Recent Alerts" subtitle="Moderation and verification notifications">
          {reports.length === 0 && logs.length === 0 ? (
            <EmptyState title={BRANDED_EMPTY_STATES.notifications.title} hint={BRANDED_EMPTY_STATES.notifications.hint} presetKey="notifications" />
          ) : (
            <ul className="space-y-2">
              {reports.slice(0, 8).map((report) => (
                <li key={`report-${report._id}`} className="rounded-xl border border-[var(--ds-border)] px-3 py-2">
                  <p className="text-sm font-semibold text-[var(--ds-text)]">Report: {report.company?.companyName || "Unknown company"}</p>
                  <p className="text-xs text-[var(--ds-muted)]">{report.reason}</p>
                </li>
              ))}
              {logs.slice(0, 8).map((log) => (
                <li key={`log-${log._id}`} className="rounded-xl border border-[var(--ds-border)] px-3 py-2">
                  <p className="text-sm font-semibold text-[var(--ds-text)]">{(log.action || "").replace(/_/g, " ")}</p>
                  <p className="text-xs text-[var(--ds-muted)]">{log.actorUser?.email || log.actorRole || "system"}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {view === "certification-review" && (
        <Card title={meta.title} subtitle={meta.subtitle}>
          <AdminCertificationReview />
        </Card>
      )}

      {view === "hiring-scoring" && hasAdminPermission(permissions, ADMIN_PERMISSIONS.MANAGE) && <AdminHiringScoringPanel />}

      {view === "settings" && (
        <Card title="Administrative Settings" subtitle="Safety controls and account policy preferences">
          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--ds-border)] p-3">
              <p className="text-sm font-semibold text-[var(--ds-text)]">Your Admin Account</p>
              <p className="mt-1 text-xs text-[var(--ds-muted)]">Email: {welcomeName}</p>
              <p className="text-xs capitalize text-[var(--ds-muted)]">Role: {adminRole?.replace(/_/g, " ") || "super admin"}</p>
              <p className="mt-1 text-xs text-[var(--ds-muted)]">{permissions.length} permissions assigned</p>
            </div>
            <div className="rounded-xl border border-[var(--ds-border)] p-3">
              <p className="text-sm font-semibold text-[var(--ds-text)]">Admin MFA Policy</p>
              <p className="text-xs text-[var(--ds-muted)]">Admin login is protected with mandatory OTP verification.</p>
            </div>
            <div className="rounded-xl border border-[var(--ds-border)] p-3">
              <p className="text-sm font-semibold text-[var(--ds-text)]">Session Security</p>
              <p className="text-xs text-[var(--ds-muted)]">Access tokens auto-refresh and sessions are cookie backed.</p>
            </div>
            <div className="rounded-xl border border-[var(--ds-border)] p-3">
              <p className="text-sm font-semibold text-[var(--ds-text)]">Default Admin Credentials (dev seed)</p>
              <p className="text-xs text-[var(--ds-muted)]">admin@internai.com / Admin@123</p>
            </div>
          </div>
        </Card>
      )}

      {view === "settings" && <ThemeSettingsPanel />}

      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction?.type === "delete-user"
            ? `Soft delete ${confirmAction.user.email}?`
            : confirmAction?.type === "suspend-company"
              ? `Suspend ${confirmAction.company.companyName}?`
              : confirmAction?.type === "unverify-company"
                ? `Unverify ${confirmAction.company.companyName}?`
                : confirmAction?.type === "remove-internship"
                  ? `Remove "${confirmAction.internship.role}" posting?`
                  : ""
        }
        description={
          confirmAction?.type === "delete-user"
            ? "The account is deactivated and marked deleted. This can be reversed by reactivating the user."
            : confirmAction?.type === "suspend-company"
              ? "The company loses platform access until reinstated by an admin."
              : confirmAction?.type === "unverify-company"
                ? "This revokes their verified badge and returns them to Pending review. They will need to be re-verified before regaining verified-company features."
                : confirmAction?.type === "remove-internship"
                  ? "This internship posting will be removed from the platform."
                  : undefined
        }
        confirmLabel={
          confirmAction?.type === "delete-user"
            ? "Soft Delete"
            : confirmAction?.type === "suspend-company"
              ? "Suspend"
              : confirmAction?.type === "unverify-company"
                ? "Unverify"
                : "Remove"
        }
        busy={bulkBusy}
        onConfirm={runConfirmedAction}
        onCancel={() => setConfirmAction(null)}
      />
    </AdminShell>
  );
}

export function AdminDashboardPage({ view }: { view: AdminDashboardView }) {
  return (
    <RoleDashboardGuard expectedRole="admin">
      <AdminDashboardInner view={view} />
    </RoleDashboardGuard>
  );
}
