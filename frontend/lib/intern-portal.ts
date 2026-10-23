import { apiRequest } from "@/lib/api-client";
import { normalizeSkillList } from "@/lib/skill-normalizer";
import { getAuthSession } from "@/lib/session";

export type ResumeSection = { key: string; label: string; score: number };

export type ResumeDimensionScore = {
  key: string;
  label: string;
  weight?: number;
  score: number;
  explanation?: string;
  suggestions?: string[];
};

export type ResumeCompositeScores = {
  overall: number;
  ats: number;
  technicalStrength: number;
  projectStrength: number;
  skillStrength: number;
  profileCompleteness: number;
  recruiterReadiness: number;
};

export type SkillIntelligence = {
  overview?: { totalSkills: number; categoryCount: number; matchPercent: number };
  categorized?: Record<string, string[]>;
  strengths?: string[];
  skillGaps?: string[];
  emergingGaps?: string[];
  targetRole?: string;
  targetRoleKey?: string;
  careerMatch?: { matchPercent: number; matchedSkills: string[]; missingSkills: string[] };
  learningRecommendations?: string[];
};

export type ResumeAnalysis = {
  overallScore: number;
  intelligenceVersion?: string;
  categoryScores: {
    ats: number;
    content: number;
    impact: number;
    skills: number;
    structure: number;
    roleSpecific?: number;
    formattingQuality?: number;
    experienceWeighted?: number;
    completeness?: number;
  };
  compositeScores?: ResumeCompositeScores;
  dimensionBreakdown?: ResumeDimensionScore[];
  scoreExplanation?: {
    deductions: Array<{ points: number; dimension: string; reason: string }>;
    bonuses: Array<{ points: number; dimension: string; reason: string }>;
  };
  skillIntelligence?: SkillIntelligence | null;
  sectionBreakdown?: ResumeSection[];
  strengths: string[];
  weaknesses?: string[];
  improvements: string[];
  criticalIssues?: string[];
  warnings?: string[];
  confidence?: number | null;
  quality?: { issues: string[]; confidence: number; isReliable: boolean };
  aiValidation?: {
    confidenceScore: number;
    validationStatus: "validated" | "partial" | "conflict_detected";
    confidenceTier: "high" | "medium" | "low";
    reliabilityLevel?: "High" | "Medium" | "Low";
    insufficientData?: boolean;
    groundingSources?: string[];
    explanationTrace: string;
  };
  checks?: {
    wordCount?: number;
    matchedSkills?: string[];
    missingSkills?: string[];
    roleSpecificScore?: number;
    formattingQualityScore?: number;
    experienceWeightedScore?: number;
    completenessPercent?: number;
  };
};

export type InternProfile = {
  _id: string;
  updatedAt?: string;
  fullName: string;
  email: string;
  mobile: string;
  skills: string[];
  education: string[];
  projects: string[];
  certifications: string[];
  experience?: string[];
  achievements?: string[];
  languages?: string[];
  links?: string[];
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  address?: string;
  bio?: string;
  softSkills?: string[];
  skillDetails?: Array<{ name?: string; level?: string; category?: string }>;
  educationDetails?: Array<{ college?: string; degree?: string; branch?: string; cgpa?: string; passingYear?: string }>;
  courseEntries?: Array<{ courseName?: string; platform?: string; completionDate?: string; certificateUrl?: string; verificationLink?: string }>;
  certificationEntries?: Array<{ name?: string; issuer?: string; year?: string; certificateUrl?: string; verificationLink?: string }>;
  verifiedCertificationCount?: number;
  verifiedCertificationEntries?: Array<{
    name?: string;
    issuer?: string;
    year?: string;
    certificateUrl?: string;
    verificationLink?: string;
    skillCategory?: string;
    verificationStatus?: string;
    certificationId?: string;
  }>;
  certificationStats?: { total: number; verified: number; pending: number; rejected: number };
  summary?: string;
  completedCourses: string[];
  profileSections?: {
    personalInformation?: { location?: string; headline?: string };
    professionalSummary?: string;
    education?: Array<{ degree?: string; institution?: string; startYear?: string; endYear?: string; grade?: string }>;
    experience?: Array<{ role?: string; company?: string; duration?: string; description?: string }>;
    projects?: Array<{ title?: string; description?: string; techStack?: string[]; demoLink?: string }>;
    certifications?: Array<{ name?: string; issuer?: string; year?: string }>;
    skills?: string[];
    socialLinks?: Array<{ platform?: string; url?: string }>;
    achievements?: string[];
  };
  resume: {
    filePath: string;
    text: string;
    score: number;
    scoreSource?: string;
    predictedCategory?: string;
    confidence?: number | null;
    analysis?: ResumeAnalysis | null;
    parsed?: {
      fullName?: string;
      email?: string;
      mobile?: string;
      location?: string;
      summary?: string;
      skills?: string[];
      technicalSkills?: string[];
      softSkills?: string[];
      skillCategories?: Record<string, string[]>;
      projects?: Array<{ title?: string; techStack?: string[]; description?: string; demoLink?: string; githubLink?: string }>;
      education?: Array<{ degree?: string; branch?: string; institution?: string; startYear?: string; endYear?: string; graduationYear?: string; grade?: string; raw?: string }>;
      certifications?: Array<{ name?: string; issuer?: string; year?: string; raw?: string }>;
      experience?: Array<{ role?: string; company?: string; duration?: string; description?: string }>;
      achievements?: string[];
      languages?: string[];
      links?: string[];
    } | null;
  };
  resumeUploaded: boolean;
};

export type Application = {
  _id: string;
  status: string;
  matchScore: number;
  relevanceScore?: number;
  appliedAt?: string;
  attachedResumePath?: string;
  availabilityStatus?: "yes" | "no";
  joiningDate?: string;
  internId?: string;
  internshipId?: string;
  companyId?: string;
  internship: {
    _id?: string;
    role: string;
    company?: { companyName?: string };
    description?: string;
    responsibilities?: string;
    stipend?: string;
    mode?: "remote" | "on-site" | "hybrid" | "";
    location?: string;
    skillsRequired?: string[];
    prioritySkills?: string[];
  };
  stageHistory: Array<{ stage: string; note: string; changedAt: string }>;
  hrFeedback: Array<{ feedback: string; createdAt: string; rating?: number | null; category?: string; stage?: string }>;
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
};

export type ScheduledInterview = {
  interviewId: string;
  applicationId: string;
  companyId?: string;
  roleId?: string;
  companyName: string;
  role: string;
  interviewDate: string;
  interviewTime: string;
  interviewType: string;
  interviewStatus: "scheduled" | "upcoming" | "in_progress" | "completed" | "cancelled" | "no_show";
  meetingLink?: string;
  roomId?: string | null;
  mode?: "online" | "offline" | "";
  location?: string;
  notes?: string;
  durationMinutes?: number;
  interviewers?: Array<{ name: string; role?: string }>;
  cancelReason?: string;
  rescheduleRequestedByCandidate?: { requestedAt: string; reason?: string; acknowledged?: boolean } | null;
  rawRoundStatus?: string;
};

export type InternshipListing = {
  _id: string;
  role: string;
  skillsRequired?: string[];
  prioritySkills?: string[];
  location?: string;
  stipend?: string;
  duration?: string;
  description?: string;
  mode?: "remote" | "on-site" | "hybrid" | "";
  responsibilities?: string;
  educationQualification?: string;
  degreePreferences?: string;
  minimumCgpa?: string;
  experienceRequirement?: string;
  company?: {
    _id?: string;
    companyName?: string;
    description?: string;
    website?: string;
    address?: string;
    verificationStatus?: string;
  };
  matchPercent?: number;
  missingRequiredSkills?: string[];
};

export type Recommendation = {
  internship: {
    _id: string;
    role: string;
    description?: string;
    stipend?: string;
    duration?: string;
    internshipType?: string;
    department?: string;
    mode?: "remote" | "on-site" | "hybrid" | "";
    responsibilities?: string;
    company?: {
      _id?: string;
      companyName?: string;
      description?: string;
      website?: string;
      address?: string;
    };
    location?: string;
    skillsRequired?: string[];
    prioritySkills?: string[];
  };
  requiredSkillMatchPercent: number;
  preferredSkillMatchPercent: number | null;
  overallRecommendationScore: number;
  recommendationScore?: number;
  skillMatchPercent?: number;
  matchedRequiredSkills: string[];
  missingRequiredSkills: string[];
  matchedPreferredSkills: string[];
  missingPreferredSkills: string[];
  skillGap: { matched: string[]; missing: string[]; matchPercent: number };
};

export type CareerRoadmap = {
  targetRole: string;
  currentSkills: string[];
  requiredSkills: string[];
  missingSkills: string[];
  matchPercent: number;
  roadmap: Array<{ skill: string; priority: string; phase: string; suggestions: string[] }>;
};

export type SkillOption = {
  _id: string;
  name: string;
  normalizedName: string;
  category?: string;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const PUBLIC_PROFILE_CACHE_TTL_MS = 10 * 60 * 1000;
const cacheStore = new Map<string, { ts: number; data: unknown; ttl?: number }>();
const inflightRequests = new Map<string, Promise<unknown>>();
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");

function getCache<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  const ttl = entry.ttl ?? CACHE_TTL_MS;
  if (Date.now() - entry.ts > ttl) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttlMs = CACHE_TTL_MS) {
  cacheStore.set(key, { ts: Date.now(), data, ttl: ttlMs });
}

async function dedupedFetch<T>(key: string, fetcher: () => Promise<T>, force = false): Promise<T> {
  if (!force) {
    const cached = getCache<T>(key);
    if (cached) return cached;
  }

  const pending = inflightRequests.get(key);
  if (pending) return pending as Promise<T>;

  const promise = fetcher()
    .then((result) => {
      setCache(key, result);
      return result;
    })
    .finally(() => {
      inflightRequests.delete(key);
    });

  inflightRequests.set(key, promise);
  return promise;
}

export function peekInternProfile() {
  return getCache<InternProfile>("intern:profile");
}

export function peekInternApplications() {
  return getCache<Application[]>("intern:applications");
}

export function peekActiveInternships() {
  return getCache<InternshipListing[]>("intern:internships");
}

export function peekSavedInternships() {
  return getCache<InternshipListing[]>("intern:saved");
}

export function peekInternNotifications() {
  return getCache<{ notifications: InAppNotification[]; unreadCount: number }>("intern:notifications");
}

export function prefetchInternDashboardData() {
  if (typeof window === "undefined") return;
  void fetchInternProfile();
  void fetchInternApplications();
  void fetchInternInterviews();
  void fetchInternNotifications();
  void fetchActiveInternships();
  void fetchSavedInternships();
}

export const PROFILE_UPDATED_EVENT = "internai-profile-updated";

export function invalidateInternCache() {
  cacheStore.clear();
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
}

// `cacheStore` is a module-level singleton -- it survives logout/login within
// the same browser tab since nothing else tears it down. Without this, a
// stale profile (e.g. from a previously logged-in account) can be served to
// whichever account logs in next, until the 5-minute TTL happens to expire.
if (typeof window !== "undefined") {
  window.addEventListener("internai-auth-change", () => cacheStore.clear());
}

export async function fetchInternProfile(force = false) {
  return dedupedFetch("intern:profile", async () => {
    const response = await apiRequest<{ profile: InternProfile }>("/api/intern/profile");
    return response.profile;
  }, force);
}

export async function fetchInternProfileWithScore(force = false) {
  const profile = await fetchInternProfile(force);
  if (!profile.resumeUploaded) return profile;

  try {
    const scoreResp = await apiRequest<{
      score: number;
      scoreSource?: string;
      predictedCategory?: string;
      confidence?: number | null;
      analysis?: ResumeAnalysis;
    }>("/api/intern/resume/score");

    const hydrated = {
      ...profile,
      resume: {
        ...profile.resume,
        score: scoreResp.score ?? profile.resume.score,
        scoreSource: scoreResp.scoreSource || profile.resume.scoreSource,
        predictedCategory: scoreResp.predictedCategory || profile.resume.predictedCategory,
        confidence: typeof scoreResp.confidence === "number" ? scoreResp.confidence : profile.resume.confidence,
        analysis: scoreResp.analysis || profile.resume.analysis
      }
    };
    setCache("intern:profile", hydrated);
    return hydrated;
  } catch {
    return profile;
  }
}

export async function fetchInternApplications(force = false) {
  return dedupedFetch("intern:applications", async () => {
    const response = await apiRequest<{ applications: Application[] }>("/api/intern/applications?limit=100&page=1");
    return response.applications || [];
  }, force);
}

export async function fetchSavedInternships(force = false) {
  return dedupedFetch("intern:saved", async () => {
    const response = await apiRequest<{ internships: InternshipListing[] }>("/api/intern/saved-internships");
    return response.internships || [];
  }, force);
}

export async function saveInternship(internshipId: string) {
  const response = await apiRequest<{ message: string }>(`/api/intern/saved-internships/${internshipId}`, { method: "POST" });
  cacheStore.delete("intern:saved");
  return response;
}

export async function unsaveInternship(internshipId: string) {
  const response = await apiRequest<{ message: string }>(`/api/intern/saved-internships/${internshipId}`, { method: "DELETE" });
  cacheStore.delete("intern:saved");
  return response;
}

export function buildAssetUrl(relativePath: string) {
  let normalized = String(relativePath || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  const uploadsIdx = normalized.indexOf("/uploads/");
  if (uploadsIdx >= 0) normalized = normalized.slice(uploadsIdx + 1);
  if (normalized.includes("uploads/")) normalized = normalized.slice(normalized.indexOf("uploads/"));
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `${API_BASE_URL}/${normalized}`;
}

export async function applyToInternship(
  internshipId: string,
  payload: { availabilityStatus: "yes" | "no"; joiningDate?: string | null }
) {
  const response = await apiRequest<{
    message: string;
    application: Application;
    relevance?: {
      relevanceScore?: number;
      requiredSkillMatchPercent?: number;
      preferredSkillMatchPercent?: number | null;
      missingRequiredSkills?: string[];
    };
  }>(`/api/intern/apply/${internshipId}`, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  cacheStore.delete("intern:applications");
  return response;
}

export type ApplicationAiInsight = {
  internshipId: string;
  bullets: string[];
  source: string;
};

export async function fetchApplicationAiInsights(internshipId: string) {
  return apiRequest<ApplicationAiInsight>(`/api/intern/internships/${internshipId}/ai-insights`);
}

export async function openApplicationResume(applicationId: string) {
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
    throw new Error((data as { message?: string }).message || "Resume not available");
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");
  if (!opened) {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "resume";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 120000);
}

export async function fetchActiveInternships(force = false) {
  return dedupedFetch("intern:internships", async () => {
    const response = await apiRequest<{ internships: InternshipListing[] }>("/api/intern/internships?limit=100");
    return response.internships || [];
  }, force);
}

export async function fetchInternRecommendations(internSkills: unknown, force = false) {
  const normalizedInternSkills = normalizeSkillList(internSkills);
  if (normalizedInternSkills.length === 0) {
    return [];
  }

  const cacheKey = `intern:recommendations:${normalizedInternSkills.join("|")}`;
  if (!force) {
    const cached = getCache<Recommendation[]>(cacheKey);
    if (cached) return cached;
  }

  const response = await apiRequest<{ recommendations: Recommendation[] }>("/api/intern/recommendations");
  const recommendations = response.recommendations || [];

  setCache(cacheKey, recommendations);
  return recommendations;
}

export async function searchSkills(query: string, page = 1, limit = 10): Promise<SkillOption[]> {
  const response = await apiRequest<{ success?: boolean; data?: { items?: SkillOption[] } }>(
    `/api/skills?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
  );
  return response.data?.items || [];
}

export async function createCustomSkill(name: string): Promise<SkillOption | null> {
  const response = await apiRequest<{ success?: boolean; data?: SkillOption }>("/api/skills/custom", {
    method: "POST",
    body: JSON.stringify({ name })
  });
  return response.data || null;
}

export async function generateCareerRoadmap(targetRole: string): Promise<CareerRoadmap | null> {
  const response = await apiRequest<{ roadmap: CareerRoadmap }>("/api/intern/roadmap", {
    method: "POST",
    body: JSON.stringify({ targetRole })
  });
  return response.roadmap || null;
}

function notifyNotificationsUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("notifications:updated"));
}

export type InAppNotification = {
  _id: string;
  type: string;
  title: string;
  message?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
};

export type PublicOpenPosition = {
  _id: string;
  role: string;
  department?: string;
  internshipType?: string;
  location?: string;
  mode?: string;
  duration?: string;
  stipend?: string;
  openings?: number | null;
  skillsRequired?: string[];
  applicationDeadline?: string | null;
  postedAt?: string;
};

export type PublicCompanyProfile = {
  _id: string;
  companyName: string;
  website?: string;
  address?: string;
  description?: string;
  linkedInUrl?: string;
  joinedAt?: string;
  verificationStatus?: string;
  isVerified: boolean;
  logoUrl?: string;
  industry?: string;
  companySize?: string;
  headquarters?: string;
  foundedYear?: number | null;
  technologies?: string[];
  hiringProcessOverview?: string;
  activeOpenings: number;
  totalInternsHired: number;
  hiringSuccessRate: number;
  totalApplications: number;
  openPositions?: PublicOpenPosition[];
};

export async function fetchInternNotifications(force = false) {
  return dedupedFetch("intern:notifications", async () => {
    const response = await apiRequest<{ notifications: InAppNotification[]; unreadCount: number }>(
      "/api/intern/notifications?limit=30"
    );
    return { notifications: response.notifications || [], unreadCount: response.unreadCount || 0 };
  }, force);
}

export async function markNotificationRead(notificationId: string) {
  await apiRequest(`/api/intern/notifications/${notificationId}/read`, { method: "PATCH" });
  cacheStore.delete("intern:notifications");
  notifyNotificationsUpdated();
}

export async function markAllNotificationsRead() {
  await apiRequest("/api/intern/notifications/read-all", { method: "PATCH" });
  cacheStore.delete("intern:notifications");
  notifyNotificationsUpdated();
}

export async function withdrawApplication(applicationId: string) {
  const response = await apiRequest<{ message: string; application: Application }>(`/api/intern/applications/${applicationId}/withdraw`, {
    method: "PATCH"
  });
  cacheStore.delete("intern:applications");
  return response;
}

export async function fetchInternInterviews(force = false) {
  const cacheKey = "intern:interviews";
  if (!force) {
    const cached = getCache<ScheduledInterview[]>(cacheKey);
    if (cached) return cached;
  }
  const response = await apiRequest<{ interviews: ScheduledInterview[] }>("/api/intern/interviews");
  const interviews = response.interviews || [];
  setCache(cacheKey, interviews);
  return interviews;
}

export async function checkInterviewReminders() {
  return apiRequest<{ sent: number }>("/api/intern/interviews/reminders/check", { method: "POST" });
}

export async function requestInterviewReschedule(applicationId: string, roundId: string, reason?: string) {
  const response = await apiRequest<{ message: string }>(
    `/api/intern/interviews/${applicationId}/rounds/${roundId}/request-reschedule`,
    { method: "POST", body: JSON.stringify({ reason: reason || "" }) }
  );
  cacheStore.delete("intern:interviews");
  return response;
}

export async function fetchPublicCompanyProfile(companyId: string) {
  const cacheKey = `company:public:${companyId}`;
  const cached = getCache<PublicCompanyProfile>(cacheKey);
  if (cached) return cached;

  const response = await apiRequest<{ company: PublicCompanyProfile }>(`/api/companies/${companyId}/public`);
  const company = response.company;
  setCache(cacheKey, company, PUBLIC_PROFILE_CACHE_TTL_MS);
  return company;
}

export async function reportCompany(payload: {
  companyId: string;
  reason: string;
  details?: string;
  reportType?: string;
  evidenceUrls?: string[];
  internshipId?: string;
}) {
  return apiRequest<{ message: string }>("/api/intern/report-company", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

