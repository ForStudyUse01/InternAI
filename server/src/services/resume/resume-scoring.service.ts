import type { ParsedResumeData } from "./resume-parser.interface";

interface ResumeScoreBreakdown {
  skillScore: number;
  projectScore: number;
  completenessScore: number;
}

export interface ResumeScoreResult {
  score: number;
  breakdown: ResumeScoreBreakdown;
}

export function calculateResumeScore(data: ParsedResumeData): ResumeScoreResult {
  const skillCount = data.skills.length;
  const projectCount = data.projects.length;

  const skillScore = Math.min(40, skillCount * 8);
  const projectScore = projectCount > 0 ? Math.min(25, 10 + projectCount * 5) : 0;

  let completenessScore = 0;
  if (data.summary && data.summary.trim()) {
    completenessScore += 12;
  }
  if (data.contact && data.contact.trim()) {
    completenessScore += 12;
  }
  if (data.location && data.location.trim()) {
    completenessScore += 11;
  }

  const score = Math.min(100, skillScore + projectScore + completenessScore);

  return {
    score,
    breakdown: {
      skillScore,
      projectScore,
      completenessScore,
    },
  };
}
