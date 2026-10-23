export type ValidationStatus = "validated" | "partial" | "conflict_detected";

export type ConfidenceTier = "high" | "medium" | "low";

/** User-facing reliability band — maps from confidenceScore thresholds */
export type ReliabilityLevel = "High" | "Medium" | "Low";

export type GroundingSource =
  | "resume"
  | "test_answers"
  | "role_requirements"
  | "user_history"
  | "computed_metrics";

export type GroundingContext = {
  sources: GroundingSource[];
  sufficient: boolean;
  missingFields: string[];
  signalCount: number;
};

export type ValidatedAIOutput<T> = {
  result: T;
  confidenceScore: number;
  validationStatus: ValidationStatus;
  explanationTrace: string;
  confidenceTier: ConfidenceTier;
  reliabilityLevel: ReliabilityLevel;
  insufficientData?: boolean;
  groundingSources?: GroundingSource[];
};

export type LearningMemory = {
  weakConcepts: Array<{ concept: string; section: string; count: number; lastSeen: string }>;
  masteredConcepts: Array<{ concept: string; section: string; masteredAt: string }>;
  frequentlyWrongPatterns: string[];
  improvedSkills: string[];
  userProgressTrend: Array<{ testId: number; readiness: number; accuracy: number; completedAt: string }>;
  skillGapsSeen: Array<{ skill: string; count: number; lastSeen: string }>;
  updatedAt: string;
};

export type CrossValidationInput<T> = {
  primary: T;
  secondary: T;
  compare: (a: T, b: T) => { delta: number; conflict: boolean; trace: string };
  baseConfidence?: number;
};
