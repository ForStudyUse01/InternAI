export type RouteEntry = { path: string; label: string };

// Glob-verified against app/dashboard/intern/**/page.tsx -- 25 routes total.
export const INTERN_ROUTES: RouteEntry[] = [
  { path: "/dashboard/intern", label: "overview" },
  { path: "/dashboard/intern/profile", label: "profile" },
  { path: "/dashboard/intern/profile/edit", label: "profile-edit" },
  { path: "/dashboard/intern/resume", label: "resume" },
  { path: "/dashboard/intern/resume/score", label: "resume-score" },
  { path: "/dashboard/intern/skill-gap", label: "skill-gap" },
  { path: "/dashboard/intern/portfolio", label: "portfolio" },
  { path: "/dashboard/intern/internships/recommended", label: "internships-recommended" },
  { path: "/dashboard/intern/internships/search", label: "internships-search" },
  { path: "/dashboard/intern/internships/saved", label: "internships-saved" },
  { path: "/dashboard/intern/applications", label: "applications" },
  { path: "/dashboard/intern/interviews", label: "interviews" },
  { path: "/dashboard/intern/calendar", label: "calendar" },
  { path: "/dashboard/intern/notifications", label: "notifications" },
  { path: "/dashboard/intern/chat", label: "chat" },
  { path: "/dashboard/intern/learning/courses", label: "learning-courses" },
  { path: "/dashboard/intern/learning/certifications", label: "learning-certifications" },
  { path: "/dashboard/intern/learning/mock-aptitude", label: "learning-mock-aptitude" },
  { path: "/dashboard/intern/learning/mock-interview", label: "learning-mock-interview" },
  { path: "/dashboard/intern/learning/mock-technical", label: "learning-mock-technical" },
  { path: "/dashboard/intern/placement-hub", label: "placement-hub" },
  { path: "/dashboard/intern/track-progress", label: "track-progress" },
  { path: "/dashboard/intern/feedback/hr", label: "feedback-hr" },
  { path: "/dashboard/intern/feedback/suggestions", label: "feedback-suggestions" },
  { path: "/dashboard/intern/support", label: "support" }
];

// Company routes are served under app/dashboard/company/[...view] but the
// canonical browser URLs are prefixed /dashboard/companyCEO or
// /dashboard/companyHR (next.config.ts rewrites both to /dashboard/company).
// The prefix is NOT cosmetic: app/dashboard/company/layout.tsx blocks a
// non-executive account from the CEO prefix ("Executive dashboard" inline
// AccessDenied) and silently redirects an executive account off the HR
// prefix onto the CEO prefix. Always pick the prefix matching the fixture's
// companyAccountType -- see COMPANY_CEO_BASE / COMPANY_HR_BASE below.
export const COMPANY_VIEWS: RouteEntry[] = [
  { path: "", label: "overview" },
  { path: "/profile", label: "profile" },
  { path: "/profile/edit", label: "profile-edit" },
  { path: "/profile/verification", label: "profile-verification" },
  { path: "/profile/personal", label: "profile-personal" },
  { path: "/profile/personal/edit", label: "profile-personal-edit" },
  { path: "/hiring/post", label: "hiring-post" },
  { path: "/hiring/active", label: "hiring-active" },
  { path: "/hiring/applicants", label: "hiring-applicants" },
  { path: "/hiring/shortlisted", label: "hiring-shortlisted" },
  { path: "/hiring/pipeline", label: "hiring-pipeline" },
  { path: "/hiring/interviews", label: "hiring-interviews" },
  { path: "/hiring/calendar", label: "hiring-calendar" },
  { path: "/matching/ai", label: "matching-ai" },
  { path: "/matching/search", label: "matching-search" },
  { path: "/matching/saved", label: "matching-saved" },
  { path: "/reports/feedback", label: "reports-feedback" },
  { path: "/reports/notes", label: "reports-notes" },
  { path: "/reports/export", label: "reports-export" },
  { path: "/team/recruiters", label: "team-recruiters" },
  { path: "/analytics/company", label: "analytics-company" },
  { path: "/analytics/salary", label: "analytics-salary" }
];

// Not in VIEW_MAP -- literal routes, still under the CEO/HR prefix.
export const COMPANY_LITERAL_ROUTES: RouteEntry[] = [
  { path: "/chat", label: "chat" },
  { path: "/notifications", label: "notifications" }
];

export const COMPANY_CEO_BASE = "/dashboard/companyCEO";
export const COMPANY_HR_BASE = "/dashboard/companyHR";

export function companyPath(base: string, view: RouteEntry) {
  return `${base}${view.path}`;
}

// Glob-verified against app/dashboard/admin/[...view]/page.tsx VIEW_MAP -- 12 total.
export const ADMIN_ROUTES: RouteEntry[] = [
  { path: "/dashboard/admin", label: "overview" },
  { path: "/dashboard/admin/users", label: "users" },
  { path: "/dashboard/admin/companies", label: "companies" },
  { path: "/dashboard/admin/verification", label: "verification" },
  { path: "/dashboard/admin/internships", label: "internships" },
  { path: "/dashboard/admin/reports", label: "reports" },
  { path: "/dashboard/admin/activity-logs", label: "activity-logs" },
  { path: "/dashboard/admin/analytics", label: "analytics" },
  { path: "/dashboard/admin/notifications", label: "notifications" },
  { path: "/dashboard/admin/settings", label: "settings" },
  { path: "/dashboard/admin/hiring-scoring", label: "hiring-scoring" },
  { path: "/dashboard/admin/certification-review", label: "certification-review" }
];
