const { PERMISSION_KEYS } = require("../../../shared/constants/roles");

const HR_REQUIRED_PERMISSIONS = [
  PERMISSION_KEYS.PROFILE_READ,
  PERMISSION_KEYS.COMPANY_ASSIGNED_SCOPE
];

const HR_ASSIGNABLE_PERMISSIONS = [
  PERMISSION_KEYS.APPLICATION_REVIEW,
  PERMISSION_KEYS.PIPELINE_UPDATE,
  PERMISSION_KEYS.FEEDBACK_WRITE,
  PERMISSION_KEYS.COMPANY_ANALYTICS_RECRUITER
];

const HR_DEFAULT_PERMISSIONS = [
  ...HR_REQUIRED_PERMISSIONS,
  ...HR_ASSIGNABLE_PERMISSIONS
];

function normalizeHrPermissions(requested = []) {
  const list = Array.isArray(requested) ? requested.map(String) : [];
  const allowed = list.filter((key) => HR_ASSIGNABLE_PERMISSIONS.includes(key));
  return [...new Set([...HR_REQUIRED_PERMISSIONS, ...allowed])];
}

module.exports = {
  HR_REQUIRED_PERMISSIONS,
  HR_ASSIGNABLE_PERMISSIONS,
  HR_DEFAULT_PERMISSIONS,
  normalizeHrPermissions
};
