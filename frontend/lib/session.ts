export type AuthRole = "intern" | "company" | "admin";
export type AdminRole = "super_admin" | "verification_admin" | "moderation_admin" | "support_admin";

type StoredSession = {
  role: AuthRole;
  token: string;
  refreshToken?: string | null;
  adminRole?: AdminRole | null;
  permissions?: string[];
  companyAccountType?: string | null;
};

const AUTH_ROLE_KEY = "internai.auth.role";
const AUTH_LOGGED_IN_KEY = "internai.auth.logged_in";
const AUTH_TOKEN_KEY = "internai.auth.token";
const AUTH_REFRESH_TOKEN_KEY = "internai.auth.refresh_token";
const AUTH_ADMIN_ROLE_KEY = "internai.auth.admin_role";
const AUTH_PERMISSIONS_KEY = "internai.auth.permissions";
const AUTH_EMAIL_KEY = "internai.auth.email";
const AUTH_COMPANY_ACCOUNT_TYPE_KEY = "internai.auth.company_account_type";

export function setAuthSession(
  role: AuthRole,
  token: string,
  options?: {
    refreshToken?: string | null;
    adminRole?: AdminRole | null;
    permissions?: string[];
    email?: string | null;
    companyAccountType?: string | null;
  }
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_ROLE_KEY, role);
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_LOGGED_IN_KEY, "true");
  if (options?.refreshToken) localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, options.refreshToken);
  else localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  if (options?.adminRole) localStorage.setItem(AUTH_ADMIN_ROLE_KEY, options.adminRole);
  else localStorage.removeItem(AUTH_ADMIN_ROLE_KEY);
  if (options?.permissions && options.permissions.length) {
    localStorage.setItem(AUTH_PERMISSIONS_KEY, JSON.stringify(options.permissions));
  } else {
    localStorage.removeItem(AUTH_PERMISSIONS_KEY);
  }
  if (options?.email) localStorage.setItem(AUTH_EMAIL_KEY, options.email);
  else localStorage.removeItem(AUTH_EMAIL_KEY);
  if (options?.companyAccountType) localStorage.setItem(AUTH_COMPANY_ACCOUNT_TYPE_KEY, options.companyAccountType);
  else localStorage.removeItem(AUTH_COMPANY_ACCOUNT_TYPE_KEY);
  window.dispatchEvent(new Event("internai-auth-change"));
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_ROLE_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_LOGGED_IN_KEY);
  localStorage.removeItem(AUTH_ADMIN_ROLE_KEY);
  localStorage.removeItem(AUTH_PERMISSIONS_KEY);
  localStorage.removeItem(AUTH_EMAIL_KEY);
  localStorage.removeItem(AUTH_COMPANY_ACCOUNT_TYPE_KEY);
  window.dispatchEvent(new Event("internai-auth-change"));
}

export function getAuthSession(): {
  loggedIn: boolean;
  role: AuthRole | null;
  token: string | null;
  refreshToken: string | null;
  adminRole: AdminRole | null;
  permissions: string[];
  email: string | null;
  companyAccountType: string | null;
} {
  if (typeof window === "undefined") {
    return {
      loggedIn: false,
      role: null,
      token: null,
      refreshToken: null,
      adminRole: null,
      permissions: [],
      email: null,
      companyAccountType: null
    };
  }

  const loggedIn = localStorage.getItem(AUTH_LOGGED_IN_KEY) === "true";
  const roleValue = localStorage.getItem(AUTH_ROLE_KEY);
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const refreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
  const adminRoleRaw = localStorage.getItem(AUTH_ADMIN_ROLE_KEY);
  const permissionsRaw = localStorage.getItem(AUTH_PERMISSIONS_KEY);
  const role: AuthRole | null =
    roleValue === "intern" || roleValue === "company" || roleValue === "admin" ? roleValue : null;
  const adminRole: AdminRole | null =
    adminRoleRaw === "super_admin" ||
    adminRoleRaw === "verification_admin" ||
    adminRoleRaw === "moderation_admin" ||
    adminRoleRaw === "support_admin"
      ? adminRoleRaw
      : null;
  let permissions: string[] = [];
  if (permissionsRaw) {
    try {
      const parsed = JSON.parse(permissionsRaw);
      permissions = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
      permissions = [];
    }
  }

  const email = localStorage.getItem(AUTH_EMAIL_KEY);
  const companyAccountType = localStorage.getItem(AUTH_COMPANY_ACCOUNT_TYPE_KEY);

  return { loggedIn, role, token, refreshToken, adminRole, permissions, email, companyAccountType };
}

export function requireAuthSession(): StoredSession {
  const session = getAuthSession();
  if (!session.loggedIn || !session.role || !session.token) {
    throw new Error("Session not found");
  }

  return {
    role: session.role,
    token: session.token,
    refreshToken: session.refreshToken,
    adminRole: session.adminRole,
    permissions: session.permissions
  };
}
