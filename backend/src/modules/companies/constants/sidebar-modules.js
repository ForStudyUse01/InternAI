const SIDEBAR_MODULE_KEYS = Object.freeze({
  DASHBOARD: "dashboard",
  INTERNSHIPS: "internships",
  APPLICATIONS: "applications",
  CANDIDATE_SEARCH: "candidate_search",
  SAVED_CANDIDATES: "saved_candidates",
  INTERVIEW_SCHEDULING: "interview_scheduling",
  INTERVIEW_CALENDAR: "interview_calendar",
  MESSAGES: "messages",
  ANALYTICS: "analytics",
  AI_INSIGHTS: "ai_insights",
  HIRING_REPORTS: "hiring_reports",
  COMPANY_PROFILE: "company_profile",
  VERIFICATION_STATUS: "verification_status",
  HR_MANAGEMENT: "hr_management",
  TEAM_MEMBERS: "team_members",
  SETTINGS: "settings"
});

const ALL_SIDEBAR_MODULE_KEYS = Object.values(SIDEBAR_MODULE_KEYS);

/**
 * Registry is the single source of truth for grouping/labels used by the
 * CEO permission management UI. `reserved: true` means the module key exists
 * for future-proofing but has no dedicated page/route wired up yet.
 */
const SIDEBAR_MODULE_REGISTRY = [
  { key: SIDEBAR_MODULE_KEYS.DASHBOARD, label: "Dashboard", group: "Dashboard" },
  { key: SIDEBAR_MODULE_KEYS.INTERNSHIPS, label: "Internships", group: "Recruitment" },
  { key: SIDEBAR_MODULE_KEYS.APPLICATIONS, label: "Applications", group: "Recruitment" },
  { key: SIDEBAR_MODULE_KEYS.CANDIDATE_SEARCH, label: "Candidate Search", group: "Recruitment" },
  { key: SIDEBAR_MODULE_KEYS.SAVED_CANDIDATES, label: "Saved Candidates", group: "Recruitment" },
  { key: SIDEBAR_MODULE_KEYS.INTERVIEW_SCHEDULING, label: "Interview Scheduling", group: "Interviews" },
  { key: SIDEBAR_MODULE_KEYS.INTERVIEW_CALENDAR, label: "Interview Calendar", group: "Interviews" },
  { key: SIDEBAR_MODULE_KEYS.MESSAGES, label: "Messages", group: "Messaging" },
  { key: SIDEBAR_MODULE_KEYS.ANALYTICS, label: "Analytics", group: "Analytics" },
  { key: SIDEBAR_MODULE_KEYS.AI_INSIGHTS, label: "AI Insights", group: "Analytics" },
  { key: SIDEBAR_MODULE_KEYS.HIRING_REPORTS, label: "Hiring Reports", group: "Analytics" },
  { key: SIDEBAR_MODULE_KEYS.COMPANY_PROFILE, label: "Company Profile", group: "Company" },
  { key: SIDEBAR_MODULE_KEYS.VERIFICATION_STATUS, label: "Verification Status", group: "Company" },
  { key: SIDEBAR_MODULE_KEYS.HR_MANAGEMENT, label: "HR Management", group: "Team", executiveOnly: true },
  { key: SIDEBAR_MODULE_KEYS.TEAM_MEMBERS, label: "Team Members", group: "Team", executiveOnly: true },
  { key: SIDEBAR_MODULE_KEYS.SETTINGS, label: "Settings", group: "Settings", reserved: true }
];

/**
 * Modules an HR account sees when nothing has been explicitly configured yet
 * (legacy accounts predating this feature). Mirrors the sidebar visibility
 * that existed before per-HR module permissions were introduced, so no
 * existing HR account loses access on deploy.
 */
const HR_DEFAULT_SIDEBAR_MODULES = [
  SIDEBAR_MODULE_KEYS.DASHBOARD,
  SIDEBAR_MODULE_KEYS.INTERNSHIPS,
  SIDEBAR_MODULE_KEYS.APPLICATIONS,
  SIDEBAR_MODULE_KEYS.CANDIDATE_SEARCH,
  SIDEBAR_MODULE_KEYS.SAVED_CANDIDATES,
  SIDEBAR_MODULE_KEYS.INTERVIEW_SCHEDULING,
  SIDEBAR_MODULE_KEYS.INTERVIEW_CALENDAR,
  SIDEBAR_MODULE_KEYS.MESSAGES,
  SIDEBAR_MODULE_KEYS.ANALYTICS,
  SIDEBAR_MODULE_KEYS.AI_INSIGHTS,
  SIDEBAR_MODULE_KEYS.HIRING_REPORTS,
  SIDEBAR_MODULE_KEYS.COMPANY_PROFILE,
  SIDEBAR_MODULE_KEYS.VERIFICATION_STATUS
];

const EXECUTIVE_ONLY_MODULE_KEYS = SIDEBAR_MODULE_REGISTRY.filter((entry) => entry.executiveOnly).map(
  (entry) => entry.key
);

/** HR accounts can never be granted executiveOnly modules, even via a direct API call. */
function normalizeSidebarModules(requested = []) {
  const list = Array.isArray(requested) ? requested.map(String) : [];
  return [
    ...new Set(
      list.filter((key) => ALL_SIDEBAR_MODULE_KEYS.includes(key) && !EXECUTIVE_ONLY_MODULE_KEYS.includes(key))
    )
  ];
}

module.exports = {
  SIDEBAR_MODULE_KEYS,
  ALL_SIDEBAR_MODULE_KEYS,
  SIDEBAR_MODULE_REGISTRY,
  HR_DEFAULT_SIDEBAR_MODULES,
  normalizeSidebarModules
};
