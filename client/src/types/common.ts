export type UserRole = "intern" | "company";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface ResumeParsedView {
  parsingStatus: "pending" | "parsed" | "failed";
  summary: string;
  skills: string[];
  projects: string[];
  contact: string;
  location: string;
  resumeScore: number;
}

export interface RecommendationItem {
  internship: {
    id: string;
    title: string;
    description: string;
    location: string;
    duration: string;
    stipend: string;
    requiredSkills: string[];
    preferredSkills: string[];
    status: string;
  };
  requiredMatch: number;
  preferredMatch: number;
  overallScore: number;
  missingRequiredSkills: string[];
  missingPreferredSkills: string[];
}

export interface PaginatedData<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Internship {
  _id: string;
  title: string;
  description: string;
  location: string;
  duration: string;
  stipend: string;
  requiredSkills: string[];
  preferredSkills: string[];
  status: "open" | "closed" | "draft";
}

export interface Application {
  _id: string;
  internshipId: string;
  internUserId: string;
  status: "applied" | "shortlisted" | "test" | "interview" | "selected" | "rejected";
  createdAt: string;
}

export interface Applicant {
  applicationId: string;
  internId: string;
  name: string;
  skills: string[];
  resumeScore: number | null;
  status: Application["status"];
}
