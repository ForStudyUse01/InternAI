import type { AuthRole } from "@/lib/session";

export const DASHBOARD_PATH: Record<AuthRole, string> = {
  intern: "/dashboard/intern",
  company: "/dashboard/company",
  admin: "/dashboard/admin"
};

export const COMPANY_CEO_DASHBOARD_PATH = "/dashboard/companyCEO";
export const COMPANY_HR_DASHBOARD_PATH = "/dashboard/companyHR";

const EXECUTIVE_COMPANY_ACCOUNT_TYPES = new Set(["owner", "ceo"]);

export function isExecutiveCompanyAccountType(companyAccountType?: string | null): boolean {
  return EXECUTIVE_COMPANY_ACCOUNT_TYPES.has(companyAccountType || "owner");
}

export function getCompanyDashboardPath(companyAccountType?: string | null): string {
  return isExecutiveCompanyAccountType(companyAccountType) ? COMPANY_CEO_DASHBOARD_PATH : COMPANY_HR_DASHBOARD_PATH;
}

export const PROFILE_PATH: Record<AuthRole, string> = {
  intern: "/dashboard/intern/profile",
  company: "/dashboard/company/profile",
  admin: "/dashboard/admin/settings"
};

export const AUTH_PATH: Record<AuthRole, string> = {
  intern: "/auth/intern",
  company: "/auth/company",
  admin: "/auth/admin"
};

export const ROLE_WELCOME_TAGLINE: Record<AuthRole, string> = {
  intern: "Welcome back. Let's accelerate your career.",
  company: "Find and hire the right talent.",
  admin: "Platform management center."
};

export const ROLE_WELCOME_LABEL: Record<AuthRole, string> = {
  intern: "Intern Portal",
  company: "Company Portal",
  admin: "Admin Portal"
};

export function getDashboardPathForRole(role: AuthRole): string {
  return DASHBOARD_PATH[role];
}

export function getProfilePathForRole(role: AuthRole): string {
  return PROFILE_PATH[role];
}

export function getAuthPathForRole(role: AuthRole): string {
  return AUTH_PATH[role];
}

export function isInterviewPath(path: string): boolean {
  return path.startsWith("/interview/");
}

export function isPathAllowedForRole(path: string, role: AuthRole): boolean {
  if (isInterviewPath(path)) {
    return role === "intern" || role === "company";
  }
  if (!path.startsWith("/dashboard/")) return false;
  if (role === "admin") return path.startsWith("/dashboard/admin");
  return path.startsWith(DASHBOARD_PATH[role]);
}

export function resolvePostLoginRedirect(role: AuthRole, next?: string | null, companyAccountType?: string | null): string {
  const dashboard = role === "company" ? getCompanyDashboardPath(companyAccountType) : getDashboardPathForRole(role);
  if (!next || !next.startsWith("/")) return dashboard;
  // A stale `next` targeting the other company sub-dashboard (e.g. saved before
  // a session expired on /dashboard/companyCEO) must never override the
  // account's own role-correct dashboard.
  if (role === "company" && (next.startsWith(COMPANY_CEO_DASHBOARD_PATH) || next.startsWith(COMPANY_HR_DASHBOARD_PATH))) {
    return next.startsWith(dashboard) ? next : dashboard;
  }
  if (isPathAllowedForRole(next, role)) return next;
  return dashboard;
}

export function buildAuthRedirectUrl(role: AuthRole, returnPath?: string): string {
  const base = getAuthPathForRole(role);
  if (!returnPath || returnPath === base) return base;
  return `${base}?next=${encodeURIComponent(returnPath)}`;
}
