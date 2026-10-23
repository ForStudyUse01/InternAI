export const ADMIN_PERMISSIONS = Object.freeze({
  USER_VIEW: "admin:user:view",
  USER_UPDATE: "admin:user:update",
  USER_DELETE: "admin:user:soft-delete",
  COMPANY_VERIFY: "admin:company:verify",
  COMPANY_SUSPEND: "admin:company:suspend",
  REPORT_REVIEW: "admin:report:review",
  ACTIVITY_VIEW: "admin:activity:view",
  MANAGE: "admin:manage",
  CERTIFICATION_REVIEW: "admin:certification:review"
});

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];

export function hasAdminPermission(permissions: string[], required: AdminPermission | AdminPermission[]): boolean {
  const requiredList = Array.isArray(required) ? required : [required];
  if (permissions.includes(ADMIN_PERMISSIONS.MANAGE)) return true;
  return requiredList.every((perm) => permissions.includes(perm));
}

export function canAccessAdminView(view: string, permissions: string[]): boolean {
  switch (view) {
    case "overview":
    case "analytics":
    case "notifications":
    case "settings":
    case "internships":
      return true;
    case "users":
      return hasAdminPermission(permissions, ADMIN_PERMISSIONS.USER_VIEW);
    case "companies":
    case "verification":
      return hasAdminPermission(permissions, ADMIN_PERMISSIONS.COMPANY_VERIFY);
    case "reports":
      return hasAdminPermission(permissions, ADMIN_PERMISSIONS.REPORT_REVIEW);
    case "activity-logs":
      return hasAdminPermission(permissions, ADMIN_PERMISSIONS.ACTIVITY_VIEW);
    case "certification-review":
      return hasAdminPermission(permissions, ADMIN_PERMISSIONS.CERTIFICATION_REVIEW);
    case "hiring-scoring":
      return hasAdminPermission(permissions, ADMIN_PERMISSIONS.MANAGE);
    default:
      return false;
  }
}
