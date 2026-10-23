import type { CompanyInternship } from "@/lib/company-portal";
import type { RoleScoringTemplate, ScoringWeights } from "./types";

export const DEFAULT_ROLE_TEMPLATES: RoleScoringTemplate[] = [
  {
    roleKey: "software_engineer",
    roleLabel: "Software Engineer",
    weights: { skills: 40, tests: 30, projects: 20, experience: 10, resume: 0 },
    enabled: { skills: true, tests: true, projects: true, experience: true, resume: false }
  },
  {
    roleKey: "data_scientist",
    roleLabel: "Data Scientist",
    weights: { skills: 30, tests: 25, projects: 30, experience: 10, resume: 5 },
    enabled: { skills: true, tests: true, projects: true, experience: true, resume: true }
  },
  {
    roleKey: "ai_ml_engineer",
    roleLabel: "AI/ML Engineer",
    weights: { skills: 35, tests: 20, projects: 30, experience: 10, resume: 5 },
    enabled: { skills: true, tests: true, projects: true, experience: true, resume: true }
  },
  {
    roleKey: "frontend_developer",
    roleLabel: "Frontend Developer",
    weights: { skills: 40, tests: 15, projects: 30, experience: 10, resume: 5 },
    enabled: { skills: true, tests: true, projects: true, experience: true, resume: true }
  },
  {
    roleKey: "cybersecurity",
    roleLabel: "Cybersecurity Role",
    weights: { skills: 35, tests: 30, projects: 20, experience: 10, resume: 5 },
    enabled: { skills: true, tests: true, projects: true, experience: true, resume: true }
  },
  {
    roleKey: "backend_developer",
    roleLabel: "Backend Developer",
    weights: { skills: 40, tests: 25, projects: 20, experience: 10, resume: 5 },
    enabled: { skills: true, tests: true, projects: true, experience: true, resume: true }
  },
  {
    roleKey: "general",
    roleLabel: "General Role",
    weights: { skills: 35, tests: 25, projects: 20, experience: 10, resume: 10 },
    enabled: { skills: true, tests: true, projects: true, experience: true, resume: true }
  }
];

let activeTemplates: RoleScoringTemplate[] = DEFAULT_ROLE_TEMPLATES;

export function setRoleScoringTemplates(templates: RoleScoringTemplate[]) {
  activeTemplates = templates.length ? templates : DEFAULT_ROLE_TEMPLATES;
}

export function getRoleScoringTemplates() {
  return activeTemplates;
}

export function slugifyRoleKey(value: string) {
  return String(value || "general")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || "general";
}

export function detectRoleProfileKey(roleTitle: string, department?: string) {
  const blob = `${roleTitle} ${department || ""}`.toLowerCase();
  if (/data scientist|data science|analytics engineer/.test(blob)) return "data_scientist";
  if (/ml engineer|machine learning|ai engineer|artificial intelligence|deep learning/.test(blob)) return "ai_ml_engineer";
  if (/frontend|front-end|ui developer|react developer|vue developer/.test(blob)) return "frontend_developer";
  if (/security|cybersecurity|cyber security|infosec|penetration/.test(blob)) return "cybersecurity";
  if (/backend|back-end|server engineer|node developer|java backend/.test(blob)) return "backend_developer";
  if (/software engineer|full stack|fullstack|developer|engineer|sde/.test(blob)) return "software_engineer";
  return "general";
}

export function resolveRoleTemplate(internship?: CompanyInternship | null): RoleScoringTemplate {
  const templates = activeTemplates;
  const roleTitle = internship?.role || "";
  const detectedKey = detectRoleProfileKey(roleTitle, internship?.department);
  const exact = templates.find((item) => item.roleKey === detectedKey);
  if (exact) return exact;

  const slug = slugifyRoleKey(roleTitle);
  const bySlug = templates.find((item) => item.roleKey === slug);
  if (bySlug) return bySlug;

  return templates.find((item) => item.roleKey === "general") || DEFAULT_ROLE_TEMPLATES[DEFAULT_ROLE_TEMPLATES.length - 1];
}

export function validateScoringWeights(weights: ScoringWeights) {
  const total = weights.skills + weights.tests + weights.projects + weights.experience + weights.resume;
  if (total !== 100) {
    return { valid: false, total, message: `Weights must total 100%. Current total: ${total}%.` };
  }
  return { valid: true, total, message: "Valid weight configuration." };
}

export function previewWeightedScore(factorScores: ScoringWeights, weights: ScoringWeights, enabled: RoleScoringTemplate["enabled"]) {
  const entries = [
    { key: "skills" as const, score: factorScores.skills, weight: weights.skills, enabled: enabled.skills },
    { key: "tests" as const, score: factorScores.tests, weight: weights.tests, enabled: enabled.tests },
    { key: "projects" as const, score: factorScores.projects, weight: weights.projects, enabled: enabled.projects },
    { key: "experience" as const, score: factorScores.experience, weight: weights.experience, enabled: enabled.experience },
    { key: "resume" as const, score: factorScores.resume, weight: weights.resume, enabled: enabled.resume }
  ];

  const active = entries.filter((entry) => entry.enabled && entry.weight > 0);
  const activeWeight = active.reduce((sum, entry) => sum + entry.weight, 0) || 100;

  return Math.round(
    active.reduce((sum, entry) => sum + (entry.score * entry.weight) / activeWeight, 0)
  );
}
