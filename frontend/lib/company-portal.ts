import { apiRequest } from "@/lib/api-client";
import { getAuthSession } from "@/lib/session";
import type { InternProfile } from "@/lib/intern-portal";
import type { PortfolioSummary } from "@/lib/portfolio-types";

export type CompanyProfile = {
  _id: string;
  companyName: string;
  companyEmail: string;
  gst: string;
  contactName: string;
  phone: string;
  /** Optional landline / office number. Forward-compatible: backend may not yet persist this. */
  landline?: string;
  website?: string;
  address?: string;
  description?: string;
  logoUrl?: string;
  industry?: string;
  companySize?: string;
  headquarters?: string;
  foundedYear?: number | null;
  technologies?: string[];
  hiringProcessOverview?: string;
  verificationStatus: "pending" | "verified" | "rejected" | "suspended";
  verifiedBadgeIssuedAt?: string | null;
  rejectionReason?: string;
  verificationDocuments?: string[];
  hrIdentityProofUrl?: string;
  businessRegistrationProofUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CompanyAccountType = "owner" | "hr" | "ceo";

export type CompanyCurrentUser = {
  _id: string;
  email: string;
  companyAccountType: CompanyAccountType;
  permissions: string[];
  sidebarModules: string[];
};

/**
 * Sidebar/permission module registry — mirrors
 * backend/src/modules/companies/constants/sidebar-modules.js.
 * `reserved: true` = key exists for future-proofing, no page wired up yet.
 * `executiveOnly: true` = toggling this for an HR only grants read-only
 * access; account creation/deletion/permission-editing stays CEO/Owner-only.
 */
export const SIDEBAR_MODULE_KEYS = {
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
} as const;

export type SidebarModuleKey = (typeof SIDEBAR_MODULE_KEYS)[keyof typeof SIDEBAR_MODULE_KEYS];

export type SidebarModuleRegistryEntry = {
  key: SidebarModuleKey;
  label: string;
  group: string;
  reserved?: boolean;
  executiveOnly?: boolean;
  description?: string;
};

export const SIDEBAR_MODULE_DESCRIPTIONS: Record<SidebarModuleKey, string> = {
  dashboard: "Dashboard Overview page, including the Interview Scheduling widget.",
  internships: "Active Internships listing.",
  applications: "Applicants, Shortlisted, and Hiring Pipeline views.",
  candidate_search: "Search all candidates on the platform.",
  saved_candidates: "Bookmarked candidate shortlist.",
  interview_scheduling: "Schedule and manage interview rounds from the dashboard.",
  interview_calendar: "Calendar view of scheduled interviews on the dashboard.",
  messages: "In-app messaging with candidates.",
  analytics: "Company hiring analytics and recruiter performance.",
  ai_insights: "AI-matched candidate recommendations.",
  hiring_reports: "Feedback, hiring notes, and downloadable reports.",
  company_profile: "View and edit the company profile.",
  verification_status: "Company verification status page.",
  hr_management: "Read-only team roster. Creating, deleting, or editing HR permissions always stays CEO/Owner-only.",
  team_members: "Read-only team roster (same view as HR Management).",
  settings: "Reserved for a future Company Settings page."
};

export const SIDEBAR_MODULE_REGISTRY: SidebarModuleRegistryEntry[] = [
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

export const HR_DEFAULT_SIDEBAR_MODULES: SidebarModuleKey[] = [
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

type SidebarModuleAccessUser = {
  companyAccountType?: CompanyCurrentUser["companyAccountType"];
  sidebarModules?: string[];
};

export function isCompanyExecutive(user?: SidebarModuleAccessUser | null) {
  return user?.companyAccountType === "owner" || user?.companyAccountType === "ceo";
}

export function hasSidebarModule(user: SidebarModuleAccessUser | null | undefined, moduleKey: SidebarModuleKey) {
  if (!user) return false;
  if (isCompanyExecutive(user)) return true;
  return (user.sidebarModules || HR_DEFAULT_SIDEBAR_MODULES).includes(moduleKey);
}

export type CompanyInternship = {
  _id: string;
  role: string;
  skillsRequired: string[];
  prioritySkills: string[];
  stipend?: string;
  perks?: string;
  openings?: number | null;
  duration?: string;
  internshipType?: string;
  department?: string;
  location?: string;
  startDate?: string;
  applicationDeadline?: string;
  mode?: "remote" | "on-site" | "hybrid" | "";
  responsibilities?: string;
  eligibilityCriteria?: string;
  educationQualification?: string;
  degreePreferences?: string;
  minimumCgpa?: string;
  experienceRequirement?: string;
  selectionProcess?: string;
  interviewRoundsInfo?: string;
  additionalInstructions?: string;
  hrContact?: string;
  description: string;
  assignedRecruiter?: string | null;
  assignedDepartment?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CompanyApplication = {
  _id: string;
  status: string;
  matchScore: number;
  relevanceScore?: number;
  attachedResumePath?: string;
  availabilityStatus?: "yes" | "no";
  joiningDate?: string;
  intern?: {
    _id?: string;
    fullName?: string;
    email?: string;
    mobile?: string;
    skills?: string[];
    education?: string[];
    projects?: string[];
    certifications?: string[];
    achievements?: string[];
    summary?: string;
    experience?: string[];
    links?: string[];
    linkedinUrl?: string;
    interests?: string[];
    languages?: string[];
    resume?: InternProfile["resume"];
    portfolio?: PortfolioSummary | null;
  };
  internship: {
    _id?: string;
    role?: string;
    location?: string;
  };
  stageHistory: Array<{ stage: string; note: string; changedAt?: string }>;
  hrFeedback: Array<{
    feedback: string;
    createdAt?: string;
    stage?: string;
    rating?: number | null;
    category?: string;
    visibility?: "internal" | "candidate";
  }>;
  interviewRounds?: Array<{
    _id?: string;
    roundType?: string;
    interviewDate?: string;
    interviewTime?: string;
    durationMinutes?: number;
    timezone?: string;
    interviewers?: Array<{ name: string; role?: string }>;
    mode?: "online" | "offline" | "";
    meetingLink?: string;
    location?: string;
    notes?: string;
    status?: "scheduled" | "completed" | "cleared" | "rejected" | "cancelled" | "no_show";
    cancelReason?: string;
    rescheduleRequestedByCandidate?: { requestedAt: string; reason?: string; acknowledged?: boolean } | null;
    updatedAt?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
  assignedRecruiter?: string | null;
};

export type CandidateSearchResult = {
  _id: string;
  fullName: string;
  email: string;
  mobile?: string;
  skills: string[];
  resumeScore: number;
};
export type CompanyMatchedCandidate = {
  internshipId: string;
  internshipRole: string;
  internshipLocation?: string;
  score: number;
  skillGap?: {
    matched?: string[];
    missing?: string[];
    matchPercent?: number;
  };
  internProfile?: {
    _id?: string;
    fullName?: string;
    email?: string;
    mobile?: string;
    skills?: string[];
    resume?: { score?: number };
  };
};

type CacheEntry = { ts: number; data: unknown };
const CACHE_TTL_MS = 5 * 60 * 1000;
const cacheStore = new Map<string, CacheEntry>();
const inFlightStore = new Map<string, Promise<unknown>>();
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");

function getCache<T>(key: string): T | null {
  const cached = cacheStore.get(key);
  if (!cached) return null;
  if (Date.now() - cached.ts > CACHE_TTL_MS) {
    cacheStore.delete(key);
    return null;
  }
  return cached.data as T;
}

function setCache<T>(key: string, data: T) {
  cacheStore.set(key, { ts: Date.now(), data });
}

async function withCache<T>(key: string, force: boolean, fetcher: () => Promise<T>): Promise<T> {
  if (!force) {
    const cached = getCache<T>(key);
    if (cached) return cached;

    const active = inFlightStore.get(key);
    if (active) return active as Promise<T>;
  }

  const pending = fetcher()
    .then((result) => {
      setCache(key, result);
      return result;
    })
    .finally(() => {
      inFlightStore.delete(key);
    });

  inFlightStore.set(key, pending);
  return pending;
}

export function invalidateCompanyPortalCache() {
  cacheStore.clear();
  inFlightStore.clear();
}

// `cacheStore` is a module-level singleton -- it survives logout/login within
// the same browser tab since nothing else tears it down. Without this, a
// stale profile/role (e.g. from a previously logged-in CEO or HR account) can
// be served to whichever account logs in next, until the 5-minute TTL expires.
if (typeof window !== "undefined") {
  window.addEventListener("internai-auth-change", () => invalidateCompanyPortalCache());
}

export function peekCompanyProfile() {
  return getCache<{ profile: CompanyProfile; currentUser: CompanyCurrentUser }>("company:profile");
}

export function peekCompanyInternships() {
  return getCache<CompanyInternship[]>("company:internships");
}

export function peekCompanyApplications() {
  return getCache<CompanyApplication[]>("company:applications");
}

export function prefetchCompanyDashboardData() {
  if (typeof window === "undefined") return;
  void fetchCompanyProfile().catch(() => undefined);
  void fetchCompanyInternships().catch(() => undefined);
  void fetchCompanyApplications().catch(() => undefined);
}

export async function fetchCompanyProfile(force = false) {
  return withCache("company:profile", force, async () => {
    const response = await apiRequest<{ profile: CompanyProfile; currentUser: CompanyCurrentUser }>("/api/company/profile");
    return response;
  });
}

export type CompanyProfileUpdateInput = Partial<Omit<CompanyProfile, "foundedYear" | "technologies">> & {
  foundedYear?: string | number;
  technologies?: string | string[];
};

export async function updateCompanyProfile(payload: CompanyProfileUpdateInput) {
  const response = await apiRequest<{ profile: CompanyProfile; message: string }>("/api/company/profile", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  const cached = getCache<{ profile: CompanyProfile; currentUser: CompanyCurrentUser }>("company:profile");
  setCache("company:profile", {
    profile: response.profile,
    currentUser: cached?.currentUser || { _id: "", email: "", companyAccountType: "owner", permissions: [], sidebarModules: [] }
  });
  return response.profile;
}

export async function uploadCompanyLogo(file: File) {
  const formData = new FormData();
  formData.append("logo", file);
  const response = await apiRequest<{ profile: CompanyProfile; message: string }>("/api/company/profile/logo", {
    method: "POST",
    body: formData
  });
  const cached = getCache<{ profile: CompanyProfile; currentUser: CompanyCurrentUser }>("company:profile");
  setCache("company:profile", {
    profile: response.profile,
    currentUser: cached?.currentUser || { _id: "", email: "", companyAccountType: "owner", permissions: [], sidebarModules: [] }
  });
  return response.profile;
}

export type CompanyPersonalProfile = {
  _id: string;
  email: string;
  displayName: string;
  phone: string;
  photoUrl: string;
  designation: string;
  linkedInUrl: string;
  personalWebsite: string;
  bio: string;
  companyAccountType: CompanyAccountType;
};

export async function fetchPersonalProfile(force = false) {
  return withCache("company:personal-profile", force, async () => {
    const response = await apiRequest<{ personalProfile: CompanyPersonalProfile }>("/api/company/personal-profile");
    return response.personalProfile;
  });
}

export type PersonalProfileUpdateInput = Partial<
  Pick<CompanyPersonalProfile, "displayName" | "phone" | "designation" | "linkedInUrl" | "personalWebsite" | "bio">
>;

export async function updatePersonalProfile(payload: PersonalProfileUpdateInput) {
  const response = await apiRequest<{ personalProfile: CompanyPersonalProfile; message: string }>("/api/company/personal-profile", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  setCache("company:personal-profile", response.personalProfile);
  return response.personalProfile;
}

export async function uploadPersonalPhoto(file: File) {
  const formData = new FormData();
  formData.append("photo", file);
  const response = await apiRequest<{ personalProfile: CompanyPersonalProfile; message: string }>("/api/company/personal-profile/photo", {
    method: "POST",
    body: formData
  });
  setCache("company:personal-profile", response.personalProfile);
  return response.personalProfile;
}

export function resolveCompanyLogoUrl(logoUrl?: string | null): string | null {
  if (!logoUrl) return null;
  if (/^https?:\/\//i.test(logoUrl) || logoUrl.startsWith("blob:") || logoUrl.startsWith("data:")) return logoUrl;
  return `${API_BASE_URL}${logoUrl.startsWith("/") ? "" : "/"}${logoUrl}`;
}

export const COMPANY_TECHNOLOGY_SUGGESTIONS = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust", "PHP", "Ruby",
  "React", "Next.js", "Vue.js", "Angular", "Node.js", "Express", "Django", "Flask", "FastAPI", "Spring Boot",
  "MongoDB", "PostgreSQL", "MySQL", "Redis", "GraphQL", "REST API",
  "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "CI/CD", "Terraform",
  "Git", "Figma", "TailwindCSS", "Machine Learning", "Data Science", "TensorFlow", "PyTorch",
  "React Native", "Flutter", "Swift", "Kotlin", "Android", "iOS"
] as const;

export type CompanyHrPerformance = {
  candidatesHandled: number;
  shortlistedCandidates: number;
  hiredCandidates: number;
  conversionRate: number;
  interviewSuccessRate: number;
  recruiterResponseTimeHours: number;
  activitySummary: string;
};

export type CompanyHrUser = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  permissions: string[];
  sidebarModules: string[];
  assignedCandidates: number;
  assignedInternships: number;
  performanceMetrics: CompanyHrPerformance;
};

export type CompanyHrInsights = {
  summary: {
    totalHrUsers: number;
    activeHrUsers: number;
    totalAssignedCandidates: number;
    totalAssignedInternships: number;
    totalHires: number;
    averageConversionRate: number;
  };
  hrUsers: CompanyHrUser[];
};

export const HR_ASSIGNABLE_PERMISSIONS = [
  "application:review",
  "pipeline:update",
  "feedback:write",
  "company:analytics:recruiter"
] as const;

export async function fetchCompanyRecruiters() {
  const response = await apiRequest<{
    recruiters: Array<{
      _id: string;
      email: string;
      displayName?: string;
      companyAccountType: "hr" | "ceo";
      isActive: boolean;
    }>;
  }>("/api/company/recruiters");
  return response.recruiters || [];
}

export async function fetchCompanyHrInsights(force = false) {
  return withCache("company:hr-insights", force, async () => {
    const response = await apiRequest<CompanyHrInsights>("/api/company/hr/insights");
    return response;
  });
}

export async function createCompanyHrUser(payload: {
  name: string;
  email: string;
  password: string;
  permissions?: string[];
  sidebarModules?: string[];
}) {
  const response = await apiRequest<{ message: string; hrUser: CompanyHrUser }>("/api/company/hr/create", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  cacheStore.delete("company:hr-insights");
  cacheStore.delete("company:recruiters");
  return response;
}

export async function deleteCompanyHrUser(hrId: string) {
  const response = await apiRequest<{ message: string; deleted: boolean }>(`/api/company/hr/${hrId}`, {
    method: "DELETE"
  });
  cacheStore.delete("company:hr-insights");
  cacheStore.delete("company:recruiters");
  return response;
}

export async function updateCompanyHrPermissions(hrId: string, permissions: string[], sidebarModules?: string[]) {
  const response = await apiRequest<{ message: string; hrUser: { id: string; permissions: string[]; sidebarModules: string[] } }>(
    `/api/company/hr/${hrId}/permissions`,
    {
      method: "PATCH",
      body: JSON.stringify({ permissions, sidebarModules })
    }
  );
  cacheStore.delete("company:hr-insights");
  return response;
}

export async function assignRecruiterToInternship(internshipId: string, recruiterUserId: string, department = "") {
  return apiRequest<{ message: string }>(`/api/company/internships/${internshipId}/assign-recruiter`, {
    method: "POST",
    body: JSON.stringify({ recruiterUserId, department })
  });
}

export async function assignRecruiterToApplication(applicationId: string, recruiterUserId: string) {
  return apiRequest<{ message: string }>(`/api/company/applications/${applicationId}/assign-recruiter`, {
    method: "POST",
    body: JSON.stringify({ recruiterUserId })
  });
}

export type CompanyAnalytics = {
  recruiterPerformance: Array<{
    recruiterId: string;
    candidatesHandled: number;
    shortlistedCandidates: number;
    hiredCandidates: number;
    conversionRate: number;
    interviewSuccessRate: number;
    recruiterResponseTimeHours: number;
  }>;
  hiringAnalytics: {
    totalHires: number;
    totalApplications: number;
    departmentWiseHiring: Record<string, number>;
    internshipPerformance: number;
  };
  salaryAnalytics: {
    offeredSalaryPerCandidate: number[];
    stipendAnalytics: number[];
    averagePackage: number;
    totalSalaryExpenditure: number;
  };
};

export async function fetchCompanyAnalytics() {
  const response = await apiRequest<{ analytics: CompanyAnalytics }>("/api/company/analytics");
  return response.analytics;
}

export async function fetchCompanyHiringScoringTemplates(force = false) {
  return withCache("company:hiring-scoring", force, async () => {
    const response = await apiRequest<{
      templates: Array<{
        roleKey: string;
        roleLabel: string;
        weights: { skills: number; tests: number; projects: number; experience: number; resume: number };
        enabled: { skills: boolean; tests: boolean; projects: boolean; experience: boolean; resume: boolean };
        version?: number;
      }>;
    }>("/api/company/hiring-scoring/templates");
    return response.templates || [];
  });
}

export async function fetchCompanyInternships(force = false) {
  return withCache("company:internships", force, async () => {
    const response = await apiRequest<{ internships: CompanyInternship[] }>("/api/company/internships?limit=100");
    return response.internships || [];
  });
}

export async function postCompanyInternship(payload: {
  role: string;
  skillsRequired?: string[];
  prioritySkills?: string[];
  stipend?: string;
  perks?: string;
  openings?: number;
  duration?: string;
  internshipType?: string;
  department?: string;
  location?: string;
  startDate?: string;
  applicationDeadline?: string;
  mode?: string;
  responsibilities?: string;
  eligibilityCriteria?: string;
  educationQualification?: string;
  degreePreferences?: string;
  minimumCgpa?: string;
  experienceRequirement?: string;
  selectionProcess?: string;
  interviewRoundsInfo?: string;
  additionalInstructions?: string;
  hrContact?: string;
  description: string;
}) {
  const response = await apiRequest<{ internship: CompanyInternship; message: string }>("/api/company/internships", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  cacheStore.delete("company:internships");
  return response.internship;
}

export async function deleteCompanyInternship(internshipId: string) {
  const response = await apiRequest<{ message: string }>(`/api/company/internships/${internshipId}`, {
    method: "DELETE"
  });
  cacheStore.delete("company:internships");
  cacheStore.delete("company:applications");
  return response;
}

export async function fetchApplicantsForInternship(internshipId: string, force = false) {
  return withCache(`company:applicants:${internshipId}`, force, async () => {
    const response = await apiRequest<{ applications: CompanyApplication[] }>(`/api/company/internships/${internshipId}/applicants`);
    return response.applications || [];
  });
}

export async function fetchCompanyApplications(force = false) {
  return withCache("company:applications", force, async () => {
    const response = await apiRequest<{ applications: CompanyApplication[] }>("/api/company/applications?limit=100");
    return response.applications || [];
  });
}

export async function updateCompanyApplicationStage(applicationId: string, status: string, note = "") {
  const response = await apiRequest<{ application: CompanyApplication }>(`/api/company/applications/${applicationId}/stage`, {
    method: "PATCH",
    body: JSON.stringify({ status, note })
  });
  cacheStore.delete("company:applications");
  return response.application;
}

export async function addApplicationFeedback(
  applicationId: string,
  payload: { feedback: string; rating?: number; category?: string; visibility?: "internal" | "candidate" }
) {
  const response = await apiRequest<{ application: CompanyApplication }>(`/api/company/applications/${applicationId}/feedback`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  cacheStore.delete("company:applications");
  return response.application;
}

export async function scheduleInterviewRound(
  applicationId: string,
  payload: {
    roundType: string;
    interviewDate: string;
    interviewTime: string;
    durationMinutes?: number;
    timezone?: string;
    interviewers?: Array<{ name: string; role?: string }>;
    mode?: "online" | "offline" | "";
    meetingLink?: string;
    location?: string;
    notes?: string;
  }
) {
  const response = await apiRequest<{ application: CompanyApplication }>(`/api/company/applications/${applicationId}/interviews`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  cacheStore.delete("company:applications");
  return response.application;
}

export async function updateInterviewRound(
  applicationId: string,
  roundId: string,
  payload: {
    status?: "scheduled" | "completed" | "cleared" | "rejected" | "cancelled" | "no_show";
    notes?: string;
    interviewDate?: string;
    interviewTime?: string;
    durationMinutes?: number;
    timezone?: string;
    interviewers?: Array<{ name: string; role?: string }>;
    cancelReason?: string;
    mode?: "online" | "offline" | "";
    meetingLink?: string;
    location?: string;
    roundType?: string;
  }
) {
  const response = await apiRequest<{ application: CompanyApplication }>(`/api/company/applications/${applicationId}/interviews/${roundId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  cacheStore.delete("company:applications");
  return response.application;
}

export async function fetchCompanyApplicationResume(applicationId: string) {
  const session = getAuthSession();
  const token = session.token;
  if (!token) {
    throw new Error("Session not found");
  }

  const response = await fetch(`${API_BASE_URL}/api/applications/${applicationId}/resume`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error((data as { message?: string }).message || "Resume not available") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const blob = await response.blob();
  const contentType = response.headers.get("content-type") || blob.type || "application/octet-stream";
  const lastModified = response.headers.get("last-modified") || "";
  return { blob, contentType, lastModified };
}

export async function fetchMatchedCandidatesForInternship(internship: CompanyInternship, force = false) {
  return withCache(`company:matched:${internship._id}`, force, async () => {
    const response = await apiRequest<{
      matchedCandidates: Array<{
        internProfile?: CompanyMatchedCandidate["internProfile"];
        score: number;
        skillGap?: CompanyMatchedCandidate["skillGap"];
      }>;
    }>(`/api/company/internships/${internship._id}/matched-candidates`);

    return (response.matchedCandidates || []).map((candidate) => ({
      internshipId: internship._id,
      internshipRole: internship.role,
      internshipLocation: internship.location,
      score: candidate.score,
      skillGap: candidate.skillGap,
      internProfile: candidate.internProfile
    })) as CompanyMatchedCandidate[];
  });
}

export async function fetchCompanyMatchedCandidates(force = false) {
  return withCache("company:matched-all", force, async () => {
    const internships = await fetchCompanyInternships(force);
    if (!internships.length) return [] as CompanyMatchedCandidate[];

    const all = await Promise.all(internships.map((internship) => fetchMatchedCandidatesForInternship(internship, force)));
    return all.flat().sort((a, b) => b.score - a.score);
  });
}

export async function searchCandidates(query: string) {
  const q = query.trim();
  if (!q) return [] as CandidateSearchResult[];

  const response = await apiRequest<{ candidates: CandidateSearchResult[] }>(`/api/candidates/search?q=${encodeURIComponent(q)}`);
  return response.candidates || [];
}

export type CompanyNotification = {
  _id: string;
  type: string;
  title: string;
  message?: string;
  link?: string;
  metadata?: { conversationId?: string; alertType?: string };
  isRead?: boolean;
  createdAt?: string;
};

export async function fetchCompanyNotifications(force = false) {
  const cacheKey = "company:notifications";
  if (!force) {
    const cached = getCache<{ notifications: CompanyNotification[]; unreadCount: number }>(cacheKey);
    if (cached) return cached;
  }
  const response = await apiRequest<{ notifications: CompanyNotification[]; unreadCount: number }>(
    "/api/company/notifications?limit=30"
  );
  const payload = {
    notifications: response.notifications || [],
    unreadCount: response.unreadCount || 0
  };
  setCache(cacheKey, payload);
  return payload;
}

export function peekCompanyNotifications() {
  return getCache<{ notifications: CompanyNotification[]; unreadCount: number }>("company:notifications");
}

function notifyNotificationsUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("notifications:updated"));
}

export async function markCompanyNotificationRead(notificationId: string) {
  await apiRequest(`/api/company/notifications/${notificationId}/read`, { method: "PATCH" });
  cacheStore.delete("company:notifications");
  notifyNotificationsUpdated();
}

export async function markAllCompanyNotificationsRead() {
  await apiRequest("/api/company/notifications/read-all", { method: "PATCH" });
  cacheStore.delete("company:notifications");
  notifyNotificationsUpdated();
}
