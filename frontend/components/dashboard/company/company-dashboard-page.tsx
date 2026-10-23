"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Award,
  BarChart3,
  BadgeCheck,
  Bookmark,
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FileText,
  Globe,
  Layers,
  Link2,
  Mail,
  MapPin,
  MessageSquare,
  Percent,
  Phone,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  ShieldQuestion,
  Star,
  StickyNote,
  Trash2,
  TrendingUp,
  UserCircle,
  UserPlus,
  Users
} from "lucide-react";
import { useChatSocket } from "@/lib/use-chat-socket";
import { SectionPanel } from "@/components/dashboard/shared/section-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { AppIcon } from "@/components/icons/app-icon";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { CompanyDashboardItemCard } from "@/components/dashboard/company/company-dashboard-layout";
import { SkeletonList, SkeletonPage } from "@/components/ui/skeleton";
import { ErrorState, classifyErrorMessage } from "@/components/errors/error-state";
import { cn } from "@/lib/utils";
import {
  type CompanyAnalytics,
  CompanyApplication,
  CompanyInternship,
  CompanyMatchedCandidate,
  CompanyProfile,
  fetchCompanyApplications,
  fetchCompanyInternships,
  fetchCompanyMatchedCandidates,
  fetchCompanyProfile,
  fetchCompanyRecruiters,
  fetchCompanyHrInsights,
  createCompanyHrUser,
  deleteCompanyHrUser,
  updateCompanyHrPermissions,
  HR_ASSIGNABLE_PERMISSIONS,
  type CompanyHrInsights,
  type CompanyHrUser,
  fetchCompanyAnalytics,
  fetchCompanyHiringScoringTemplates,
  assignRecruiterToInternship,
  assignRecruiterToApplication,
  deleteCompanyInternship,
  postCompanyInternship,
  scheduleInterviewRound,
  updateCompanyApplicationStage,
  updateInterviewRound,
  updateCompanyProfile,
  uploadCompanyLogo,
  resolveCompanyLogoUrl,
  type CompanyPersonalProfile,
  fetchPersonalProfile,
  updatePersonalProfile,
  uploadPersonalPhoto,
  searchCandidates,
  CandidateSearchResult,
  addApplicationFeedback,
  CompanyCurrentUser,
  peekCompanyApplications,
  peekCompanyInternships,
  peekCompanyProfile,
  prefetchCompanyDashboardData,
  hasSidebarModule,
  SIDEBAR_MODULE_KEYS,
  HR_DEFAULT_SIDEBAR_MODULES,
  type SidebarModuleKey
} from "@/lib/company-portal";
import dynamic from "next/dynamic";
import { SidebarModulePicker } from "@/components/dashboard/company/sidebar-module-picker";
import { TechnologiesInput } from "@/components/dashboard/company/technologies-input";
import { CompanyLogoUploadField } from "@/components/dashboard/company/company-logo-upload-field";
import { PersonalPhotoUploadField } from "@/components/dashboard/company/personal-photo-upload-field";
import type { InterviewScheduleTarget } from "@/components/dashboard/company/interview-scheduling-panel";
import type { HiringSectionFocus } from "@/components/dashboard/hiring";
import {
  CompanyDashboardHub,
  CandidateCompareProvider,
  CandidateCompareBar
} from "@/components/dashboard/company";
import { CompanyDashboardPageIntro, companyDashboardStyles } from "@/components/dashboard/company/company-dashboard-layout";
import {
  ClampedNote,
  Empty,
  FeedbackRatingStars,
  InfoTile,
  PermissionChip,
  VERIFICATION_CTA,
  VERIFICATION_META,
  VERIFICATION_STATUS_VISUAL,
  field,
  fieldArea,
  fmtDate,
  formatCurrency,
  normalizeApplicantStage,
  normalizePipelineStatus
} from "@/components/dashboard/company/company-dashboard-shared";
// Heavy, view-gated or modal-only surfaces: split out of the initial company-dashboard
// bundle so switching views (hiring/interviews/matching/etc.) fetches its own chunk
// instead of every view's code shipping on first load.
const CompanyCandidateSearchView = dynamic(
  () => import("@/components/dashboard/company/views/company-matching-reports-views").then((m) => m.CompanyCandidateSearchView),
  { ssr: false, loading: () => <SkeletonPage /> }
);
const CompanyExportView = dynamic(
  () => import("@/components/dashboard/company/views/company-matching-reports-views").then((m) => m.CompanyExportView),
  { ssr: false, loading: () => <SkeletonPage /> }
);
const CompanyFeedbackView = dynamic(
  () => import("@/components/dashboard/company/views/company-matching-reports-views").then((m) => m.CompanyFeedbackView),
  { ssr: false, loading: () => <SkeletonPage /> }
);
const CompanyNotesView = dynamic(
  () => import("@/components/dashboard/company/views/company-matching-reports-views").then((m) => m.CompanyNotesView),
  { ssr: false, loading: () => <SkeletonPage /> }
);
const CompanySavedCandidatesView = dynamic(
  () => import("@/components/dashboard/company/views/company-matching-reports-views").then((m) => m.CompanySavedCandidatesView),
  { ssr: false, loading: () => <SkeletonPage /> }
);
const CompanyAnalyticsOverviewView = dynamic(
  () => import("@/components/dashboard/company/views/company-analytics-views").then((m) => m.CompanyAnalyticsOverviewView),
  { ssr: false, loading: () => <SkeletonPage /> }
);
const CompanySalaryAnalyticsView = dynamic(
  () => import("@/components/dashboard/company/views/company-analytics-views").then((m) => m.CompanySalaryAnalyticsView),
  { ssr: false, loading: () => <SkeletonPage /> }
);
const CompanyTeamRecruitersView = dynamic(
  () => import("@/components/dashboard/company/views/company-team-recruiters-view").then((m) => m.CompanyTeamRecruitersView),
  { ssr: false, loading: () => <SkeletonPage /> }
);
const CompanyPersonalProfileEditView = dynamic(
  () => import("@/components/dashboard/company/views/company-profile-views").then((m) => m.CompanyPersonalProfileEditView),
  { ssr: false, loading: () => <SkeletonPage /> }
);
const CompanyPersonalProfileView = dynamic(
  () => import("@/components/dashboard/company/views/company-profile-views").then((m) => m.CompanyPersonalProfileView),
  { ssr: false, loading: () => <SkeletonPage /> }
);
const CompanyProfileEditView = dynamic(
  () => import("@/components/dashboard/company/views/company-profile-views").then((m) => m.CompanyProfileEditView),
  { ssr: false, loading: () => <SkeletonPage /> }
);
const CompanyProfileView = dynamic(
  () => import("@/components/dashboard/company/views/company-profile-views").then((m) => m.CompanyProfileView),
  { ssr: false, loading: () => <SkeletonPage /> }
);
const CompanyVerificationView = dynamic(
  () => import("@/components/dashboard/company/views/company-profile-views").then((m) => m.CompanyVerificationView),
  { ssr: false, loading: () => <SkeletonPage /> }
);
const CompanyPostInternshipView = dynamic(
  () => import("@/components/dashboard/company/views/company-hiring-post-view").then((m) => m.CompanyPostInternshipView),
  { ssr: false, loading: () => <SkeletonPage /> }
);
const ApplicantDetailsModal = dynamic(
  () => import("@/components/dashboard/company/applicant-details-modal").then((m) => m.ApplicantDetailsModal),
  { ssr: false }
);
const InterviewScheduleModal = dynamic(
  () => import("@/components/dashboard/company/interview-schedule-modal").then((m) => m.InterviewScheduleModal),
  { ssr: false }
);
const InterviewSchedulingPanel = dynamic(
  () => import("@/components/dashboard/company/interview-scheduling-panel").then((m) => m.InterviewSchedulingPanel),
  { ssr: false, loading: () => <SkeletonPage /> }
);
const InterviewCalendar = dynamic(
  () => import("@/components/dashboard/intern/interview-calendar").then((m) => m.InterviewCalendar),
  { ssr: false, loading: () => <SkeletonPage /> }
);
const ViewResumeModal = dynamic(
  () => import("@/components/dashboard/company/view-resume-modal").then((m) => m.ViewResumeModal),
  { ssr: false }
);
const HiringSection = dynamic(() => import("@/components/dashboard/hiring").then((m) => m.HiringSection), {
  ssr: false,
  loading: () => <SkeletonPage />
});
const MatchedCandidatesView = dynamic(
  () => import("@/components/dashboard/company").then((m) => m.MatchedCandidatesView),
  { ssr: false, loading: () => <SkeletonPage /> }
);
const CandidateComparisonWorkspace = dynamic(
  () => import("@/components/dashboard/company").then((m) => m.CandidateComparisonWorkspace),
  { ssr: false }
);
import { hiringAIEngine, type InterviewScheduleSlot } from "@/lib/ai-hiring";
import { extractScheduledInterviews, findOverlappingInterviews, type ScheduledInterviewRecord } from "@/lib/interview-workflow";
import { useToast } from "@/components/ui/toast";
import { ReportDownloadButton } from "@/components/reports/report-download-button";
import { AccessDenied } from "@/components/dashboard/shared/access-denied";

export type CompanyDashboardView =
  | "overview"
  | "profile"
  | "profile-edit"
  | "personal-profile"
  | "personal-profile-edit"
  | "verification"
  | "hiring-post"
  | "hiring-active"
  | "hiring-applicants"
  | "hiring-shortlisted"
  | "hiring-pipeline"
  | "hiring-interviews"
  | "hiring-calendar"
  | "matching-ai"
  | "matching-search"
  | "matching-saved"
  | "reports-feedback"
  | "reports-notes"
  | "reports-export"
  | "team-recruiters"
  | "analytics-company"
  | "analytics-salary";

/** Module required to view each route. Views absent from this map (e.g. hiring-post,
 * which is gated by the existing hardcoded HR-cannot-post rule) have no module gate. */
const VIEW_MODULE_MAP: Partial<Record<CompanyDashboardView, SidebarModuleKey | SidebarModuleKey[]>> = {
  overview: SIDEBAR_MODULE_KEYS.DASHBOARD,
  profile: SIDEBAR_MODULE_KEYS.COMPANY_PROFILE,
  "profile-edit": SIDEBAR_MODULE_KEYS.COMPANY_PROFILE,
  verification: SIDEBAR_MODULE_KEYS.VERIFICATION_STATUS,
  "hiring-active": SIDEBAR_MODULE_KEYS.INTERNSHIPS,
  "hiring-applicants": SIDEBAR_MODULE_KEYS.APPLICATIONS,
  "hiring-shortlisted": SIDEBAR_MODULE_KEYS.APPLICATIONS,
  "hiring-pipeline": SIDEBAR_MODULE_KEYS.APPLICATIONS,
  "hiring-interviews": SIDEBAR_MODULE_KEYS.INTERVIEW_SCHEDULING,
  "hiring-calendar": SIDEBAR_MODULE_KEYS.INTERVIEW_CALENDAR,
  "matching-ai": SIDEBAR_MODULE_KEYS.AI_INSIGHTS,
  "matching-search": SIDEBAR_MODULE_KEYS.CANDIDATE_SEARCH,
  "matching-saved": SIDEBAR_MODULE_KEYS.SAVED_CANDIDATES,
  "reports-feedback": SIDEBAR_MODULE_KEYS.HIRING_REPORTS,
  "reports-notes": SIDEBAR_MODULE_KEYS.HIRING_REPORTS,
  "reports-export": SIDEBAR_MODULE_KEYS.HIRING_REPORTS,
  "team-recruiters": [SIDEBAR_MODULE_KEYS.HR_MANAGEMENT, SIDEBAR_MODULE_KEYS.TEAM_MEMBERS],
  "analytics-company": SIDEBAR_MODULE_KEYS.ANALYTICS,
  "analytics-salary": SIDEBAR_MODULE_KEYS.ANALYTICS
};

function isViewAllowed(currentUser: CompanyCurrentUser | null, view: CompanyDashboardView) {
  const requirement = VIEW_MODULE_MAP[view];
  if (!requirement) return true;
  const keys = Array.isArray(requirement) ? requirement : [requirement];
  return keys.some((key) => hasSidebarModule(currentUser, key));
}

const WITH_INTERNSHIPS = new Set<CompanyDashboardView>([
  "overview",
  "hiring-post",
  "hiring-active",
  "hiring-applicants",
  "hiring-shortlisted",
  "hiring-pipeline",
  "matching-ai",
  "reports-feedback",
  "reports-notes",
  "reports-export"
]);
const WITH_APPS = new Set<CompanyDashboardView>([
  "overview",
  "hiring-active",
  "hiring-applicants",
  "hiring-shortlisted",
  "hiring-pipeline",
  "hiring-interviews",
  "hiring-calendar",
  "matching-ai",
  "reports-feedback",
  "reports-notes",
  "reports-export"
]);

const HIRING_HUB_VIEWS = new Set<CompanyDashboardView>([
  "hiring-active",
  "hiring-applicants",
  "hiring-shortlisted",
  "hiring-pipeline"
]);

const HIRING_FOCUS_BY_VIEW: Partial<Record<CompanyDashboardView, HiringSectionFocus>> = {
  "hiring-active": "jobs",
  "hiring-applicants": "applications",
  "hiring-shortlisted": "shortlist",
  "hiring-pipeline": "pipeline"
};
const WITH_MATCHES = new Set<CompanyDashboardView>(["overview", "matching-ai"]);

const PERSONAL_PROFILE_VIEWS = new Set<CompanyDashboardView>(["personal-profile", "personal-profile-edit"]);

const PROFILE_MODAL_VIEWS = new Set<CompanyDashboardView>([
  "overview",
  "matching-ai",
  "hiring-active",
  "hiring-applicants",
  "hiring-shortlisted",
  "hiring-pipeline",
  "hiring-interviews",
  "hiring-calendar"
]);

// Landline is a frontend-only profile field for now — the backend company profile
// schema does not persist it. We keep it locally (keyed by company id) so edits
// survive reloads on this device, and read backend `landline` first if it ever exists.
const LANDLINE_KEY_PREFIX = "internai:company-landline:";
function readStoredLandline(companyId?: string): string {
  if (!companyId || typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(`${LANDLINE_KEY_PREFIX}${companyId}`) || "";
  } catch {
    return "";
  }
}
function writeStoredLandline(companyId: string | undefined, value: string) {
  if (!companyId || typeof window === "undefined") return;
  try {
    const key = `${LANDLINE_KEY_PREFIX}${companyId}`;
    if (value.trim()) window.localStorage.setItem(key, value.trim());
    else window.localStorage.removeItem(key);
  } catch {
    // ignore storage failures
  }
}

export function CompanyDashboardPage({ view }: { view: CompanyDashboardView }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [profile, setProfile] = useState<CompanyProfile | null>(() => peekCompanyProfile()?.profile ?? null);
  const [currentUser, setCurrentUser] = useState<CompanyCurrentUser | null>(
    () => peekCompanyProfile()?.currentUser ?? null
  );
  const [internships, setInternships] = useState<CompanyInternship[]>(() => peekCompanyInternships() ?? []);
  const [apps, setApps] = useState<CompanyApplication[]>(() => peekCompanyApplications() ?? []);
  const [matches, setMatches] = useState<CompanyMatchedCandidate[]>([]);
  const [loading, setLoading] = useState(() => !peekCompanyProfile());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CandidateSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recruiters, setRecruiters] = useState<Array<{ _id: string; email: string; displayName?: string; companyAccountType: "hr" | "ceo"; isActive: boolean }>>([]);
  const [hrInsights, setHrInsights] = useState<CompanyHrInsights | null>(null);
  const [hrForm, setHrForm] = useState({ name: "", email: "", password: "" });
  const [hrFormPermissions, setHrFormPermissions] = useState<string[]>([...HR_ASSIGNABLE_PERMISSIONS]);
  const [hrFormModules, setHrFormModules] = useState<string[]>([...HR_DEFAULT_SIDEBAR_MODULES]);
  const [selectedHrId, setSelectedHrId] = useState<string | null>(null);
  const [permissionDraft, setPermissionDraft] = useState<string[]>([]);
  const [moduleDraft, setModuleDraft] = useState<string[]>([]);
  const [hrActionLoading, setHrActionLoading] = useState(false);
  const [selectedRecruiterByInternship, setSelectedRecruiterByInternship] = useState<Record<string, string>>({});
  const [selectedRecruiterByApplication, setSelectedRecruiterByApplication] = useState<Record<string, string>>({});
  const [analytics, setAnalytics] = useState<CompanyAnalytics | null>(null);
  const [detailResumeError, setDetailResumeError] = useState<string | null>(null);
  const [applicantDetailId, setApplicantDetailId] = useState<string | null>(null);
  const [resumeModalApplicationId, setResumeModalApplicationId] = useState<string | null>(null);
  const [applicantScheduleTarget, setApplicantScheduleTarget] = useState<InterviewScheduleTarget | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, { feedback: string; rating: number; visibility: "internal" | "candidate" }>>({});

  const [profileForm, setProfileForm] = useState({
    companyName: "",
    contactName: "",
    phone: "",
    website: "",
    address: "",
    description: "",
    industry: "",
    companySize: "",
    headquarters: "",
    foundedYear: "",
    technologies: [] as string[],
    hiringProcessOverview: ""
  });
  // Frontend-only landline (see readStoredLandline / writeStoredLandline).
  const [landline, setLandline] = useState("");
  const [technologiesError, setTechnologiesError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const [personalProfile, setPersonalProfile] = useState<CompanyPersonalProfile | null>(null);
  const [personalProfileForm, setPersonalProfileForm] = useState({
    displayName: "",
    phone: "",
    designation: "",
    linkedInUrl: "",
    personalWebsite: "",
    bio: ""
  });
  const [personalSaving, setPersonalSaving] = useState(false);
  const [personalPhotoUploading, setPersonalPhotoUploading] = useState(false);
  const [personalPhotoError, setPersonalPhotoError] = useState<string | null>(null);
  const [postForm, setPostForm] = useState({
    role: "",
    department: "",
    internshipType: "",
    mode: "",
    location: "",
    duration: "",
    startDate: "",
    applicationDeadline: "",
    stipend: "",
    perks: "",
    openings: "",
    skillsRequired: "",
    prioritySkills: "",
    description: "",
    responsibilities: "",
    eligibilityCriteria: "",
    educationQualification: "",
    degreePreferences: "",
    minimumCgpa: "",
    experienceRequirement: "",
    selectionProcess: "",
    interviewRoundsInfo: "",
    additionalInstructions: "",
    hrContact: ""
  });

  useLayoutEffect(() => {
    const cachedProfile = peekCompanyProfile();
    if (cachedProfile) {
      setProfile(cachedProfile.profile);
      setCurrentUser(cachedProfile.currentUser);
      setLoading(false);
    }
    const cachedInternships = peekCompanyInternships();
    if (cachedInternships?.length) setInternships(cachedInternships);
    const cachedApps = peekCompanyApplications();
    if (cachedApps?.length) setApps(cachedApps);
  }, []);

  useEffect(() => {
    prefetchCompanyDashboardData();
  }, []);

  useEffect(() => {
    async function load() {
      const hasCachedProfile = Boolean(peekCompanyProfile());
      if (!hasCachedProfile) setLoading(true);
      try {
        setError(null);
        setSuccess(null);
        const companyContext = await fetchCompanyProfile();
        setProfile(companyContext.profile);
        setCurrentUser(companyContext.currentUser);
        if (!isViewAllowed(companyContext.currentUser, view)) {
          return;
        }
        if (WITH_INTERNSHIPS.has(view)) setInternships(await fetchCompanyInternships());
        if (WITH_APPS.has(view)) setApps(await fetchCompanyApplications());
        if (WITH_MATCHES.has(view)) setMatches(await fetchCompanyMatchedCandidates());
        if (PERSONAL_PROFILE_VIEWS.has(view) && ["owner", "ceo"].includes(companyContext.currentUser?.companyAccountType || "")) {
          setPersonalProfile(await fetchPersonalProfile());
        }
        if (WITH_MATCHES.has(view) || view === "overview" || HIRING_HUB_VIEWS.has(view)) {
          try {
            const templates = await fetchCompanyHiringScoringTemplates(true);
            if (templates.length) hiringAIEngine.configureRoleTemplates(templates);
          } catch {
            /* defaults remain active */
          }
        }
        if (["team-recruiters", "analytics-company", "analytics-salary"].includes(view)) {
          const isExecutive = ["owner", "ceo"].includes(companyContext.currentUser?.companyAccountType || "");
          const insights =
            isExecutive && (view === "team-recruiters" || view === "analytics-company")
              ? await fetchCompanyHrInsights(true)
              : null;
          setHrInsights(insights);
          if (insights && view === "team-recruiters") {
            setRecruiters(
              insights.hrUsers.map((hr) => ({
                _id: hr.id,
                email: hr.email,
                displayName: hr.name,
                companyAccountType: "hr" as const,
                isActive: hr.isActive
              }))
            );
          }
          setAnalytics(await fetchCompanyAnalytics());
        } else {
          setHrInsights(null);
          setAnalytics(null);
        }
        if (view === "overview" || HIRING_HUB_VIEWS.has(view)) {
          const user = companyContext.currentUser;
          const assignOk =
            (user?.permissions || []).includes("company:internship:assign") ||
            ["owner", "ceo"].includes(user?.companyAccountType || "");
          if (assignOk) {
            try {
              setRecruiters(await fetchCompanyRecruiters());
            } catch {
              setRecruiters([]);
            }
          } else if (view !== "team-recruiters") {
            setRecruiters([]);
          }
        } else if (!["team-recruiters", "analytics-company", "analytics-salary"].includes(view)) {
          setRecruiters([]);
        }
      } catch (e) {
        setError((e as Error).message || "Failed to load company data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [view]);

  // Interview scheduled/rescheduled/cancelled/completed pushes a socket
  // notification to company stakeholders; refetch applications so the
  // interview calendar and scheduling panel reflect it live, mirroring the
  // intern-side pattern in app/dashboard/intern/interviews/page.tsx.
  const interviewRefetchTimerRef = useRef<number | null>(null);
  useChatSocket({
    onNotification: (notification) => {
      const type = String((notification as { type?: string })?.type || "");
      if (!type.includes("interview")) return;
      if (interviewRefetchTimerRef.current) window.clearTimeout(interviewRefetchTimerRef.current);
      interviewRefetchTimerRef.current = window.setTimeout(() => {
        fetchCompanyApplications(true)
          .then(setApps)
          .catch(() => undefined);
      }, 400);
    }
  });

  useEffect(() => {
    return () => {
      if (interviewRefetchTimerRef.current) window.clearTimeout(interviewRefetchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!profile) return;
    setProfileForm({
      companyName: profile.companyName || "",
      contactName: profile.contactName || "",
      phone: profile.phone || "",
      website: profile.website || "",
      address: profile.address || "",
      description: profile.description || "",
      industry: profile.industry || "",
      companySize: profile.companySize || "",
      headquarters: profile.headquarters || "",
      foundedYear: profile.foundedYear ? String(profile.foundedYear) : "",
      technologies: profile.technologies || [],
      hiringProcessOverview: profile.hiringProcessOverview || ""
    });
    setLandline(profile.landline || readStoredLandline(profile._id));
  }, [profile]);

  useEffect(() => {
    if (!personalProfile) return;
    setPersonalProfileForm({
      displayName: personalProfile.displayName || "",
      phone: personalProfile.phone || "",
      designation: personalProfile.designation || "",
      linkedInUrl: personalProfile.linkedInUrl || "",
      personalWebsite: personalProfile.personalWebsite || "",
      bio: personalProfile.bio || ""
    });
  }, [personalProfile]);

  useEffect(() => {
    if (view !== "matching-search") return;
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query, view]);

  useEffect(() => {
    if (view !== "matching-search") return;
    if (!isViewAllowed(currentUser, view)) return;

    if (!debouncedQuery) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    setSearchError(null);

    searchCandidates(debouncedQuery)
      .then((results) => {
        if (!cancelled) setSearchResults(results);
      })
      .catch((e) => {
        if (!cancelled) {
          setSearchResults([]);
          setSearchError((e as Error).message || "Failed to search candidates.");
        }
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, view]);

  const shortlisted = useMemo(() => apps.filter((a) => normalizePipelineStatus(a.status) === "shortlisted"), [apps]);
  const isHrScoped = useMemo(() => currentUser?.companyAccountType === "hr", [currentUser?.companyAccountType]);
  const canManageRecruiters = useMemo(
    () => (currentUser?.permissions || []).includes("company:hr:manage") || ["owner", "ceo"].includes(currentUser?.companyAccountType || ""),
    [currentUser]
  );
  const isCeoOrOwner = useMemo(
    () => ["owner", "ceo"].includes(currentUser?.companyAccountType || ""),
    [currentUser?.companyAccountType]
  );

  async function reloadHrManagement() {
    const insights = await fetchCompanyHrInsights(true);
    setHrInsights(insights);
    setRecruiters(
      insights.hrUsers.map((hr) => ({
        _id: hr.id,
        email: hr.email,
        displayName: hr.name,
        companyAccountType: "hr" as const,
        isActive: hr.isActive
      }))
    );
  }

  async function handleCreateHr() {
    if (!hrForm.name.trim() || !hrForm.email.trim() || !hrForm.password.trim()) {
      setError("Name, email, and password are required to add HR.");
      return;
    }
    try {
      setHrActionLoading(true);
      setError(null);
      await createCompanyHrUser({
        name: hrForm.name.trim(),
        email: hrForm.email.trim(),
        password: hrForm.password,
        permissions: hrFormPermissions,
        sidebarModules: hrFormModules
      });
      setHrForm({ name: "", email: "", password: "" });
      setHrFormPermissions([...HR_ASSIGNABLE_PERMISSIONS]);
      setHrFormModules([...HR_DEFAULT_SIDEBAR_MODULES]);
      setSuccess("HR account created successfully.");
      await reloadHrManagement();
    } catch (e) {
      setError((e as Error).message || "Failed to create HR account.");
    } finally {
      setHrActionLoading(false);
    }
  }

  async function handleDeleteHr(hrId: string, email: string) {
    if (!window.confirm(`Delete HR account ${email}? This cannot be undone.`)) return;
    try {
      setHrActionLoading(true);
      setError(null);
      await deleteCompanyHrUser(hrId);
      if (selectedHrId === hrId) setSelectedHrId(null);
      setSuccess("HR account deleted.");
      await reloadHrManagement();
    } catch (e) {
      setError((e as Error).message || "Failed to delete HR account.");
    } finally {
      setHrActionLoading(false);
    }
  }

  function openHrInsights(hr: CompanyHrUser) {
    setSelectedHrId(hr.id);
    setPermissionDraft([...hr.permissions.filter((p) => HR_ASSIGNABLE_PERMISSIONS.includes(p as (typeof HR_ASSIGNABLE_PERMISSIONS)[number]))]);
    setModuleDraft(hr.sidebarModules?.length ? [...hr.sidebarModules] : [...HR_DEFAULT_SIDEBAR_MODULES]);
  }

  async function handleSaveHrPermissions(hrId: string) {
    try {
      setHrActionLoading(true);
      setError(null);
      await updateCompanyHrPermissions(hrId, permissionDraft, moduleDraft);
      setSuccess("HR permissions updated.");
      await reloadHrManagement();
    } catch (e) {
      setError((e as Error).message || "Failed to update HR permissions.");
    } finally {
      setHrActionLoading(false);
    }
  }
  const canAssign = useMemo(
    () => (currentUser?.permissions || []).includes("company:internship:assign") || ["owner", "ceo"].includes(currentUser?.companyAccountType || ""),
    [currentUser]
  );
  const canViewSalary = useMemo(
    () => (currentUser?.permissions || []).includes("company:analytics:salary") || ["owner", "ceo"].includes(currentUser?.companyAccountType || ""),
    [currentUser]
  );
  const detailApp = useMemo(
    () => (applicantDetailId ? apps.find((application) => application._id === applicantDetailId) ?? null : null),
    [apps, applicantDetailId]
  );
  const resumeModalApp = useMemo(
    () => (resumeModalApplicationId ? apps.find((application) => application._id === resumeModalApplicationId) ?? null : null),
    [apps, resumeModalApplicationId]
  );

  useEffect(() => {
    if (!PROFILE_MODAL_VIEWS.has(view)) {
      setApplicantDetailId(null);
    }
  }, [view]);

  useEffect(() => {
    if (applicantDetailId && !detailApp) setApplicantDetailId(null);
  }, [applicantDetailId, detailApp]);

  const summary = useMemo(
    () => ({
      verification: profile?.verificationStatus || "pending",
      activeInternships: internships.filter((item) => item.isActive).length,
      applicants: apps.length,
      shortlisted: shortlisted.length,
      matched: matches.length,
      roleLabel: currentUser?.companyAccountType?.toUpperCase() || "OWNER"
    }),
    [profile?.verificationStatus, internships, apps.length, shortlisted.length, matches.length, currentUser?.companyAccountType]
  );

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileForm.technologies.length === 0) {
      setTechnologiesError("Select at least one technology before saving.");
      return;
    }
    setTechnologiesError(null);
    try {
      setSaving(true);
      setError(null);
      const updated = await updateCompanyProfile(profileForm);
      // Landline isn't persisted by the backend yet — keep it locally so it survives reloads.
      writeStoredLandline(updated._id, landline);
      setProfile(updated);
      setSuccess("Company profile updated.");
    } catch (e) {
      setError((e as Error).message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoSelect(file: File) {
    try {
      setLogoUploading(true);
      setLogoError(null);
      const updated = await uploadCompanyLogo(file);
      setProfile(updated);
      setSuccess("Company logo updated.");
    } catch (e) {
      setLogoError((e as Error).message || "Failed to upload logo.");
    } finally {
      setLogoUploading(false);
    }
  }

  async function savePersonalProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setPersonalSaving(true);
      setError(null);
      const updated = await updatePersonalProfile(personalProfileForm);
      setPersonalProfile(updated);
      setSuccess("Personal information updated.");
    } catch (e) {
      setError((e as Error).message || "Failed to update personal information.");
    } finally {
      setPersonalSaving(false);
    }
  }

  async function handlePersonalPhotoSelect(file: File) {
    try {
      setPersonalPhotoUploading(true);
      setPersonalPhotoError(null);
      const updated = await uploadPersonalPhoto(file);
      setPersonalProfile(updated);
      setSuccess("Profile photo updated.");
    } catch (e) {
      setPersonalPhotoError((e as Error).message || "Failed to upload photo.");
    } finally {
      setPersonalPhotoUploading(false);
    }
  }

  async function createInternship(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!postForm.role.trim() || !postForm.description.trim()) {
      setError("Role and description are required.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const toList = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);
      await postCompanyInternship({
        role: postForm.role.trim(),
        description: postForm.description.trim(),
        skillsRequired: toList(postForm.skillsRequired),
        prioritySkills: toList(postForm.prioritySkills),
        stipend: postForm.stipend,
        perks: postForm.perks,
        openings: Number(postForm.openings) || undefined,
        duration: postForm.duration,
        location: postForm.location,
        internshipType: postForm.internshipType,
        department: postForm.department,
        startDate: postForm.startDate,
        applicationDeadline: postForm.applicationDeadline,
        mode: postForm.mode,
        responsibilities: postForm.responsibilities,
        eligibilityCriteria: postForm.eligibilityCriteria,
        educationQualification: postForm.educationQualification,
        degreePreferences: postForm.degreePreferences,
        minimumCgpa: postForm.minimumCgpa,
        experienceRequirement: postForm.experienceRequirement,
        selectionProcess: postForm.selectionProcess,
        interviewRoundsInfo: postForm.interviewRoundsInfo,
        additionalInstructions: postForm.additionalInstructions,
        hrContact: postForm.hrContact
      });
      setInternships(await fetchCompanyInternships(true));
      setSuccess("Internship posted successfully.");
      setPostForm({
        role: "", department: "", internshipType: "", mode: "", location: "", duration: "", startDate: "", applicationDeadline: "",
        stipend: "", perks: "", openings: "", skillsRequired: "", prioritySkills: "", description: "", responsibilities: "",
        eligibilityCriteria: "", educationQualification: "", degreePreferences: "", minimumCgpa: "", experienceRequirement: "",
        selectionProcess: "", interviewRoundsInfo: "", additionalInstructions: "", hrContact: ""
      });
    } catch (e) {
      setError((e as Error).message || "Failed to post internship.");
    } finally {
      setSaving(false);
    }
  }

  async function removeInternship(internshipId: string) {
    const confirmed = window.confirm("Are you sure you want to delete this internship?");
    if (!confirmed) return;
    try {
      setSaving(true);
      setError(null);
      await deleteCompanyInternship(internshipId);
      setInternships((prev) => prev.filter((item) => item._id !== internshipId));
      setApps(await fetchCompanyApplications(true));
      setSuccess("Internship deleted successfully.");
    } catch (e) {
      setError((e as Error).message || "Failed to delete internship.");
    } finally {
      setSaving(false);
    }
  }

  async function assignInternship(internshipId: string) {
    const recruiterId = selectedRecruiterByInternship[internshipId];
    if (!recruiterId) return;
    try {
      setSaving(true);
      await assignRecruiterToInternship(internshipId, recruiterId);
      setInternships(await fetchCompanyInternships(true));
      setApps(await fetchCompanyApplications(true));
      setSuccess("Internship assigned to recruiter.");
    } catch (e) {
      setError((e as Error).message || "Failed to assign internship.");
    } finally {
      setSaving(false);
    }
  }

  async function assignApplication(applicationId: string) {
    const recruiterId = selectedRecruiterByApplication[applicationId];
    if (!recruiterId) return;
    try {
      setSaving(true);
      await assignRecruiterToApplication(applicationId, recruiterId);
      setApps(await fetchCompanyApplications(true));
      setSuccess("Candidate assigned to recruiter.");
    } catch (e) {
      setError((e as Error).message || "Failed to assign candidate.");
    } finally {
      setSaving(false);
    }
  }

  async function applyStage(applicationId: string, status: string, note = "") {
    try {
      setSaving(true);
      setError(null);
      await updateCompanyApplicationStage(applicationId, status, note);
      setApps(await fetchCompanyApplications(true));
      setSuccess("Applicant status updated.");
    } catch (e) {
      setError((e as Error).message || "Failed to update applicant stage.");
    } finally {
      setSaving(false);
    }
  }

  async function submitFeedback(applicationId: string) {
    const draft = feedbackDrafts[applicationId];
    if (!draft?.feedback?.trim()) {
      setError("Feedback text is required.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await addApplicationFeedback(applicationId, draft);
      setApps(await fetchCompanyApplications(true));
      setSuccess("Feedback saved.");
      setFeedbackDrafts((prev) => ({ ...prev, [applicationId]: { feedback: "", rating: 3, visibility: "candidate" } }));
    } catch (e) {
      setError((e as Error).message || "Failed to add feedback.");
    } finally {
      setSaving(false);
    }
  }


  async function handleCancelInterview(item: ScheduledInterviewRecord) {
    try {
      setSaving(true);
      setError(null);
      // Cancelling a round only changes the round's own status — it must not
      // force-reject the whole application (that used to be conflated).
      await updateInterviewRound(item.applicationId, item.interviewId, { status: "cancelled" });
      setApps(await fetchCompanyApplications(true));
      pushToast({
        title: "Interview cancelled",
        message: `${item.candidateName || item.role}'s ${item.interviewType || "interview"} has been cancelled.`,
        variant: "info"
      });
    } catch (e) {
      const message = (e as Error).message || "Failed to cancel interview.";
      setError(message);
      pushToast({ title: "Cancel failed", message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateInterviewRoundStatus(item: ScheduledInterviewRecord, status: "completed" | "cancelled" | "no_show") {
    try {
      setSaving(true);
      setError(null);
      await updateInterviewRound(item.applicationId, item.interviewId, { status });
      setApps(await fetchCompanyApplications(true));
      const labels: Record<typeof status, string> = {
        completed: "marked completed",
        cancelled: "cancelled",
        no_show: "marked as a no-show"
      };
      pushToast({
        title: `Interview ${labels[status]}`,
        message: `${item.candidateName || item.role}'s ${item.interviewType || "interview"} was ${labels[status]}.`,
        variant: status === "completed" ? "success" : "info"
      });
    } catch (e) {
      const message = (e as Error).message || "Failed to update interview.";
      setError(message);
      pushToast({ title: "Update failed", message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    const rows = [["candidate", "email", "internship", "status", "relevanceScore", "createdAt"]];
    apps.forEach((a) => rows.push([a.intern?.fullName || "", a.intern?.email || "", a.internship?.role || "", a.status || "", String(a.relevanceScore ?? a.matchScore ?? 0), a.createdAt || ""]));
    const csv = rows
      .map((row) => row.map((item) => (item.includes(",") || item.includes("\n") || item.includes('"') ? `"${item.replace(/"/g, '""')}"` : item)).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `company-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openApplicantProfile(applicationId: string) {
    setApplicantDetailId(applicationId);
    const application = apps.find((item) => item._id === applicationId);
    if (application) {
      setStatusDrafts((prev) => ({ ...prev, [applicationId]: normalizeApplicantStage(application.status) }));
    }
  }

  function handleMatchedMessage(_match: CompanyMatchedCandidate, _applicationId: string) {
    router.push("/dashboard/company/chat");
  }

  async function handleMatchedShortlist(applicationId: string) {
    await applyStage(applicationId, "shortlisted", "Shortlisted from AI matched candidates");
  }

  async function handleMatchedReject(applicationId: string) {
    await applyStage(applicationId, "rejected", "Rejected from candidate comparison");
  }

  function handleMatchedViewResume(applicationId: string) {
    setResumeModalApplicationId(applicationId);
  }

  async function handleScheduleInterview(applicationId: string, slot: InterviewScheduleSlot, roundId?: string) {
    try {
      setSaving(true);
      setError(null);
      const payload = hiringAIEngine.buildInterviewPayload(slot);
      const overlaps = findOverlappingInterviews(
        extractScheduledInterviews(apps),
        payload.interviewDate,
        payload.interviewTime,
        roundId
      );
      if (overlaps.length > 0) {
        pushToast({
          title: "Overlapping interview",
          message: `This slot overlaps with ${overlaps.length} existing interview(s). Proceeding anyway.`,
          variant: "info"
        });
      }

      const application = roundId
        ? await updateInterviewRound(applicationId, roundId, {
            interviewDate: payload.interviewDate,
            interviewTime: payload.interviewTime,
            mode: payload.mode,
            ...(payload.durationMinutes ? { durationMinutes: payload.durationMinutes } : {}),
            ...(payload.timezone ? { timezone: payload.timezone } : {}),
            ...(payload.interviewers ? { interviewers: payload.interviewers } : {}),
            ...(payload.meetingLink ? { meetingLink: payload.meetingLink } : {}),
            ...(payload.location ? { location: payload.location } : {}),
            ...(payload.notes ? { notes: payload.notes } : {})
          })
        : await scheduleInterviewRound(applicationId, payload);

      setApps((prev) => prev.map((item) => (item._id === application._id ? application : item)));
      const latestRound = roundId
        ? application.interviewRounds?.find((round) => round._id === roundId)
        : application.interviewRounds?.[application.interviewRounds.length - 1];
      const roomLink = latestRound?.meetingLink;
      pushToast({
        title: roundId ? "Interview rescheduled" : "Interview scheduled",
        message: roomLink
          ? `${payload.roundType} interview updated. Platform room: ${roomLink}`
          : `${payload.roundType} interview updated. Calendar views will refresh automatically.`,
        variant: "success"
      });
      setSuccess(roundId ? "Interview rescheduled successfully." : "Interview scheduled successfully.");
    } catch (e) {
      const message = (e as Error).message || "Failed to schedule interview.";
      setError(message);
      pushToast({ title: roundId ? "Reschedule failed" : "Scheduling failed", message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  function renderHiringHub() {
    return (
      <HiringSection
        internships={internships}
        applications={apps}
        matches={matches}
        focus={HIRING_FOCUS_BY_VIEW[view] || "jobs"}
        isHrScoped={isHrScoped}
        saving={saving}
        canAssign={canAssign}
        recruiters={recruiters}
        selectedRecruiterByInternship={selectedRecruiterByInternship}
        onRecruiterChange={(internshipId, recruiterId) =>
          setSelectedRecruiterByInternship((prev) => ({ ...prev, [internshipId]: recruiterId }))
        }
        onAssignInternship={assignInternship}
        onDeleteInternship={removeInternship}
        onViewProfile={openApplicantProfile}
        onViewResume={handleMatchedViewResume}
        onScheduleInterview={handleScheduleInterview}
        onMoveStage={applyStage}
      />
    );
  }

  const viewAllowed = isViewAllowed(currentUser, view);

  const viewNode: React.ReactNode = (() => {
    if (!viewAllowed) {
      return <AccessDenied hint="Your Company Admin hasn't enabled this module for your account. Ask them to update your permissions." />;
    }
    switch (view) {
      case "overview":
        return (
          <CompanyDashboardHub
            internships={internships}
            applications={apps}
            matches={matches}
            shortlistedCount={shortlisted.length}
            isHrScoped={isHrScoped}
            currentUser={currentUser}
            saving={saving}
            onOpenProfile={openApplicantProfile}
            onMessage={handleMatchedMessage}
            onShortlist={handleMatchedShortlist}
            onViewResume={handleMatchedViewResume}
            onScheduleInterview={handleScheduleInterview}
            onCancelInterview={handleCancelInterview}
            onUpdateInterviewRoundStatus={handleUpdateInterviewRoundStatus}
          />
        );
      case "profile":
        return <CompanyProfileView profile={profile} landline={landline} />;
      case "profile-edit":
        return (
          <CompanyProfileEditView
            profile={profile}
            isHrScoped={isHrScoped}
            saveProfile={saveProfile}
            logoUploading={logoUploading}
            logoError={logoError}
            handleLogoSelect={handleLogoSelect}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            landline={landline}
            setLandline={setLandline}
            technologiesError={technologiesError}
            setTechnologiesError={setTechnologiesError}
            saving={saving}
          />
        );
      case "personal-profile":
        return <CompanyPersonalProfileView isCeoOrOwner={isCeoOrOwner} personalProfile={personalProfile} />;
      case "personal-profile-edit":
        return (
          <CompanyPersonalProfileEditView
            isCeoOrOwner={isCeoOrOwner}
            savePersonalProfile={savePersonalProfile}
            personalProfile={personalProfile}
            personalPhotoUploading={personalPhotoUploading}
            personalPhotoError={personalPhotoError}
            handlePersonalPhotoSelect={handlePersonalPhotoSelect}
            personalProfileForm={personalProfileForm}
            setPersonalProfileForm={setPersonalProfileForm}
            personalSaving={personalSaving}
          />
        );
      case "verification":
        return <CompanyVerificationView profile={profile} verificationStatus={summary.verification as CompanyProfile["verificationStatus"]} />;
      case "hiring-post":
        return (
          <CompanyPostInternshipView
            isHrScoped={isHrScoped}
            createInternship={createInternship}
            postForm={postForm}
            setPostForm={setPostForm}
            saving={saving}
          />
        );
      case "hiring-active":
      case "hiring-applicants":
      case "hiring-shortlisted":
      case "hiring-pipeline":
        return renderHiringHub();
      case "hiring-interviews": {
        return (
          <div className={companyDashboardStyles.pageStack}>
            <CompanyDashboardPageIntro
              title="Interviews"
              subtitle="Coordinate interview rounds, track statuses, and keep candidates moving through the pipeline."
            />
            <InterviewSchedulingPanel
              applications={apps}
              saving={saving}
              onViewProfile={openApplicantProfile}
              onScheduleInterview={setApplicantScheduleTarget}
              onCancelInterview={handleCancelInterview}
              onUpdateRoundStatus={handleUpdateInterviewRoundStatus}
            />
          </div>
        );
      }
      case "hiring-calendar": {
        return (
          <div className={companyDashboardStyles.pageStack}>
            <CompanyDashboardPageIntro
              title="Calendar"
              subtitle="Every scheduled interview across your pipeline, at a glance."
            />
            <InterviewCalendar applications={apps} audience="company" onViewProfile={openApplicantProfile} hideTitle />
          </div>
        );
      }
      case "matching-ai":
        return (
          <div className={companyDashboardStyles.pageStack}>
            <CompanyDashboardPageIntro
              title="AI Matched Candidates"
              subtitle="Full AI-ranked shortlist with explainable insights and one-click interview scheduling."
            />
            <MatchedCandidatesView
              matches={matches}
              applications={apps}
              internships={internships}
              defaultLimit={0}
              saving={saving}
              isHrScoped={isHrScoped}
              hideTitle
              onOpenProfile={openApplicantProfile}
              onMessage={handleMatchedMessage}
              onShortlist={handleMatchedShortlist}
              onViewResume={handleMatchedViewResume}
              onScheduleInterview={handleScheduleInterview}
            />
          </div>
        );
      case "matching-search":
        return (
          <CompanyCandidateSearchView
            query={query}
            setQuery={setQuery}
            searchLoading={searchLoading}
            searchError={searchError}
            debouncedQuery={debouncedQuery}
            searchResults={searchResults}
          />
        );
      case "matching-saved":
        return <CompanySavedCandidatesView />;
      case "reports-feedback":
        return <CompanyFeedbackView apps={apps} />;
      case "reports-notes":
        return <CompanyNotesView apps={apps} />;
      case "reports-export":
        return <CompanyExportView isHrScoped={isHrScoped} internships={internships} apps={apps} shortlisted={shortlisted} onExportCsv={exportCsv} />;
      case "team-recruiters":
        return (
          <CompanyTeamRecruitersView
            canManageRecruiters={canManageRecruiters}
            isCeoOrOwner={isCeoOrOwner}
            hrInsights={hrInsights}
            hrForm={hrForm}
            setHrForm={setHrForm}
            hrFormPermissions={hrFormPermissions}
            setHrFormPermissions={setHrFormPermissions}
            hrFormModules={hrFormModules}
            setHrFormModules={setHrFormModules}
            handleCreateHr={handleCreateHr}
            hrActionLoading={hrActionLoading}
            selectedHrId={selectedHrId}
            openHrInsights={openHrInsights}
            handleDeleteHr={handleDeleteHr}
            permissionDraft={permissionDraft}
            setPermissionDraft={setPermissionDraft}
            moduleDraft={moduleDraft}
            setModuleDraft={setModuleDraft}
            handleSaveHrPermissions={handleSaveHrPermissions}
          />
        );
      case "analytics-company":
        return <CompanyAnalyticsOverviewView analytics={analytics} hrInsights={hrInsights} />;
      case "analytics-salary":
        return <CompanySalaryAnalyticsView analytics={analytics} canViewSalary={canViewSalary} currentUser={currentUser} />;
      default:
        return null;
    }
  })();

  return loading ? (
    <SkeletonPage />
  ) : (
    <div className="space-y-5 dashboard-stack">
      {error && (
        <ErrorState
          variant={classifyErrorMessage(error)}
          size="inline"
          description={error}
          onRetry={() => window.location.reload()}
        />
      )}
      {success && <div role="status" aria-live="polite" className="rounded-xl border border-[var(--ds-success)] bg-[var(--ds-success-bg)] px-4 py-3 text-sm text-[var(--ds-success)]">{success}</div>}
      <CandidateCompareProvider>
        {viewNode}
        <CandidateCompareBar applications={apps} />
        <CandidateComparisonWorkspace
          applications={apps}
          matches={matches}
          internships={internships}
          saving={saving}
          onOpenProfile={openApplicantProfile}
          onViewResume={handleMatchedViewResume}
          onScheduleInterview={(applicationId, candidateName) => setApplicantScheduleTarget({ applicationId, candidateName })}
          onMessage={handleMatchedMessage}
          onShortlist={handleMatchedShortlist}
          onReject={handleMatchedReject}
        />
      </CandidateCompareProvider>
      {detailApp && (
        <ApplicantDetailsModal
          application={detailApp}
          onClose={() => setApplicantDetailId(null)}
          saving={saving}
          inputClassName={field}
          statusDraft={statusDrafts[detailApp._id] ?? normalizeApplicantStage(detailApp.status)}
          onStatusDraftChange={(value) => setStatusDrafts((prev) => ({ ...prev, [detailApp._id]: value }))}
          onSaveStatus={() => {
            const nextStatus = statusDrafts[detailApp._id] ?? normalizeApplicantStage(detailApp.status);
            applyStage(detailApp._id, nextStatus, "Status updated from hiring dashboard");
          }}
          onScheduleInterview={setApplicantScheduleTarget}
          feedbackDraft={feedbackDrafts[detailApp._id] || { feedback: "", rating: 3, visibility: "candidate" }}
          onFeedbackDraftChange={(patch) =>
            setFeedbackDrafts((prev) => ({
              ...prev,
              [detailApp._id]: { ...(prev[detailApp._id] || { feedback: "", rating: 3, visibility: "candidate" }), ...patch }
            }))
          }
          onSubmitFeedback={() => submitFeedback(detailApp._id)}
        />
      )}
      <InterviewScheduleModal
        open={Boolean(applicantScheduleTarget)}
        candidateName={applicantScheduleTarget?.candidateName}
        mode={applicantScheduleTarget?.roundId ? "reschedule" : "schedule"}
        initialSlot={applicantScheduleTarget?.initialSlot}
        saving={saving}
        onClose={() => setApplicantScheduleTarget(null)}
        onConfirm={async (slot) => {
          if (!applicantScheduleTarget) return;
          await handleScheduleInterview(applicantScheduleTarget.applicationId, slot, applicantScheduleTarget.roundId);
          setApplicantScheduleTarget(null);
        }}
      />
      <ViewResumeModal
        open={Boolean(resumeModalApplicationId)}
        applicationId={resumeModalApplicationId}
        candidateName={resumeModalApp?.intern?.fullName}
        role={resumeModalApp?.internship?.role}
        onClose={() => setResumeModalApplicationId(null)}
      />
    </div>
  );
}
