import type { CompanyApplication, CompanyInternship, CompanyMatchedCandidate } from "@/lib/company-portal";

export type RecommendationLevel =
  | "Highly Recommended"
  | "Strong Candidate"
  | "Consider"
  | "Potential Fit"
  | "Not Recommended Currently";

export type ScoreFactorKey = "skills" | "tests" | "projects" | "experience" | "resume";

export type ScoringWeights = Record<ScoreFactorKey, number>;

export type ScoringEnabledFlags = Record<ScoreFactorKey, boolean>;

export type RoleScoringTemplate = {
  roleKey: string;
  roleLabel: string;
  weights: ScoringWeights;
  enabled: ScoringEnabledFlags;
  version?: number;
  updatedAt?: string;
};

export type RoleScoringTemplateVersion = {
  version: number;
  weights: ScoringWeights;
  enabled: ScoringEnabledFlags;
  changedAt?: string;
  changedBy?: string;
};

export type ScoreBreakdownItem = {
  factor: ScoreFactorKey;
  label: string;
  rawScore: number;
  weight: number;
  weightedContribution: number;
  enabled: boolean;
};

export type CandidateEvaluation = {
  overallScore: number;
  confidenceScore: number;
  recommendationLevel: RecommendationLevel;
  rankingPosition?: number;
  scoreBreakdown: ScoreBreakdownItem[];
  factorScores: ScoringWeights;
  strengths: string[];
  weaknesses: string[];
  reasoning: string;
  topContributors: string[];
  projectEvaluation: CandidateProjectPortfolioEvaluation;
  roleTemplateKey: string;
  roleTemplateLabel: string;
  confidenceTier: "High Confidence" | "Medium Confidence" | "Low Confidence";
  auditTrail: string[];
};

export type RankingExplanation = {
  rankedPosition: number;
  overallScore: number;
  confidenceScore: number;
  recommendationLevel: RecommendationLevel;
  strengths: string[];
  weaknesses: string[];
  topContributors: string[];
  reasoning: string;
  scoreBreakdown: ScoreBreakdownItem[];
};

export type RankedCandidate = {
  applicationId: string | null;
  internshipId: string;
  internProfileId: string | null;
  match: CompanyMatchedCandidate;
  application: CompanyApplication | null;
  /** @deprecated use evaluation.overallScore */
  matchScore: number;
  rankingPosition: number;
  strengths: string[];
  weaknesses: string[];
  projectEvaluation: CandidateProjectPortfolioEvaluation;
  evaluation: CandidateEvaluation;
};

export type ProjectComplexityLevel = "Beginner" | "Intermediate" | "Advanced";

export type ProjectVerificationStatus = "complete" | "incomplete" | "title_only";

export type ProjectMetadata = {
  title: string;
  description: string;
  technologies: string[];
  githubLink: string;
  liveLink: string;
  duration: string;
  complexityLevel: ProjectComplexityLevel;
  featuresImplemented: string[];
};

export type TechnicalScope = {
  frontend: boolean;
  backend: boolean;
  database: boolean;
  apis: boolean;
  aiMl: boolean;
  deployment: boolean;
};

export type SkillEvidenceRecord = {
  skill: string;
  evidenceSources: string[];
};

export type GitHubAnalysis = {
  available: boolean;
  repositoryName: string;
  inferredStack: string[];
  hasDocumentationSignals: boolean;
  structureSignals: string[];
  confidenceBoost: number;
};

export type ProjectExplanation = {
  whyItMatters: string;
  skillsDemonstrated: string[];
  complexityLevel: ProjectComplexityLevel;
  notableFeatures: string[];
  scoreContribution: string;
};

export type ProjectEvaluation = {
  verified: boolean;
  verificationStatus: ProjectVerificationStatus;
  verificationNotes: string[];
  metadata: ProjectMetadata;
  technicalScope: TechnicalScope;
  engineeringQuality: {
    architecture: number;
    scalability: number;
    security: number;
    deploymentReadiness: number;
  };
  skillsDemonstrated: SkillEvidenceRecord[];
  githubAnalysis: GitHubAnalysis | null;
  scores: {
    qualityScore: number;
    complexityScore: number;
    implementationScore: number;
    confidenceScore: number;
  };
  explanation: ProjectExplanation;
};

export type CandidateProjectPortfolioEvaluation = {
  sufficient: boolean;
  evaluatedProjects: ProjectEvaluation[];
  verifiedProjectCount: number;
  aggregateScores: {
    qualityScore: number;
    complexityScore: number;
    implementationScore: number;
    confidenceScore: number;
  };
  roleRelevanceScore: number | null;
  validatedSkills: SkillEvidenceRecord[];
  lowConfidenceWarning: string | null;
  projectSummaries: ProjectExplanation[];
};

export type MatchExplanation = {
  sufficient: boolean;
  skillAlignment: string[];
  projectRelevance: string;
  experienceMatch: string;
  overallReasoning: string;
  projectInsights: ProjectExplanation[];
  projectConfidenceWarning: string | null;
  rankingExplanation?: RankingExplanation;
};

export type FunnelStageAnalytics = {
  key: string;
  label: string;
  count: number;
  avgDaysInStage: number | null;
  conversionFromPrevious: number | null;
  dropOffFromPrevious: number | null;
};

export type FunnelAnalytics = {
  sufficient: boolean;
  stages: FunnelStageAnalytics[];
  efficiencyScore: number;
  totalCandidates: number;
};

export type InterviewScheduleSlot = {
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
};

export type CandidateRankingInput = {
  matches: CompanyMatchedCandidate[];
  applications: CompanyApplication[];
  internships: CompanyInternship[];
};

export type HiringPrediction = {
  jobId: string;
  role: string;
  sufficient: boolean;
  timeToHireEstimate: string;
  hiringProbability: number;
  difficultyLevel: "Easy" | "Medium" | "Hard";
};

export type BestCandidateRecommendation = {
  candidateId: string;
  applicationId: string | null;
  internshipId: string;
  role: string;
  candidateName: string;
  matchScore: number;
  reasonForSelection: string;
  projectConfidenceWarning: string | null;
  overallScore: number;
  confidenceScore: number;
  recommendationLevel: RecommendationLevel;
  whyRecommended: string[];
  evaluation?: CandidateEvaluation;
};
