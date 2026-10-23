import { computeSkillMatch } from "@/lib/skill-normalizer";
import type { Application, InternProfile, Recommendation } from "@/lib/intern-portal";

/**
 * Internship-specific weakness analysis engine.
 *
 * Pure, deterministic derivation from data the dashboard already loads
 * (profile + recommendations/applications). No network calls, no caching:
 * the selected internship fully determines the output, so switching roles
 * recomputes instantly with zero staleness.
 */

export type WeaknessPriority = "High" | "Medium" | "Low";

export type WeaknessCategory =
  | "Technical Skills"
  | "Programming Languages"
  | "Frameworks"
  | "Soft Skills"
  | "Experience"
  | "Projects"
  | "Resume Quality"
  | "ATS Keywords"
  | "Certifications"
  | "Portfolio"
  | "GitHub Activity"
  | "Communication"
  | "Education";

export type Weakness = {
  id: string;
  title: string;
  category: WeaknessCategory;
  /** Short explanation of the weakness. */
  explanation: string;
  /** Why it affects selection for this internship. */
  whyItMatters: string;
  /** Concrete, actionable improvement suggestion. */
  suggestion: string;
  priority: WeaknessPriority;
  /** 0–100 severity, drives the severity bar + colour. */
  severity: number;
  /** Optional count of missing items (e.g. missing skills). */
  missingCount?: number;
};

export type WeaknessInternshipOption = {
  id: string;
  role: string;
  company: string;
  source: "recommended" | "applied";
  skillsRequired: string[];
  prioritySkills: string[];
  /** Pre-computed by the recommendation API when available. */
  missingRequiredSkills?: string[];
  missingPreferredSkills?: string[];
  matchedRequiredSkills?: string[];
  requiredMatchPercent?: number;
};

export type WeaknessAnalysis = {
  internshipId: string;
  role: string;
  company: string;
  /** Required-skill match for this internship (0–100). */
  matchPercent: number;
  /** Overall readiness for this internship (0–100). */
  readinessScore: number;
  /** How much headroom remains to improve (100 − readiness). */
  improvementPotential: number;
  missingSkillCount: number;
  weaknesses: Weakness[];
  byPriority: Record<WeaknessPriority, number>;
  hasResume: boolean;
};

const PRIORITY_RANK: Record<WeaknessPriority, number> = { High: 0, Medium: 1, Low: 2 };

const LANGUAGE_KEYWORDS = new Set([
  "javascript",
  "typescript",
  "python",
  "java",
  "c",
  "c++",
  "c#",
  "go",
  "golang",
  "rust",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "scala",
  "dart",
  "r",
  "matlab",
  "sql",
  "bash",
  "shell",
  "objective-c",
  "perl",
  "elixir"
]);

const FRAMEWORK_KEYWORDS = new Set([
  "react",
  "react native",
  "next.js",
  "nextjs",
  "angular",
  "vue",
  "vue.js",
  "svelte",
  "node",
  "node.js",
  "nodejs",
  "express",
  "nestjs",
  "django",
  "flask",
  "fastapi",
  "spring",
  "spring boot",
  "laravel",
  "rails",
  "ruby on rails",
  ".net",
  "asp.net",
  "tensorflow",
  "pytorch",
  "keras",
  "flutter",
  "tailwind",
  "tailwindcss",
  "bootstrap",
  "redux",
  "graphql"
]);

function classifySkill(skill: string): WeaknessCategory {
  const normalized = skill.trim().toLowerCase();
  if (LANGUAGE_KEYWORDS.has(normalized)) return "Programming Languages";
  if (FRAMEWORK_KEYWORDS.has(normalized)) return "Frameworks";
  return "Technical Skills";
}

function formatSkillList(skills: string[]): string {
  if (skills.length === 0) return "";
  if (skills.length === 1) return skills[0];
  if (skills.length === 2) return `${skills[0]} and ${skills[1]}`;
  return `${skills.slice(0, -1).join(", ")}, and ${skills[skills.length - 1]}`;
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Skills the student can credibly claim (resume-parsed first, profile fallback). */
function resolveInternSkills(profile: InternProfile | null): string[] {
  if (!profile) return [];
  const parsed = profile.resume?.parsed?.skills;
  const base = parsed && parsed.length > 0 ? parsed : profile.skills || [];
  return [...base, ...(profile.softSkills || [])];
}

/**
 * Build selector options from the internships the student is engaging with:
 * AI-recommended roles (richest signal) plus any applied roles not already
 * covered. Recommendations are listed first, highest match last-relevant.
 */
export function buildWeaknessOptions(
  recommendations: Recommendation[],
  applications: Application[]
): WeaknessInternshipOption[] {
  const options: WeaknessInternshipOption[] = [];
  const seen = new Set<string>();

  for (const rec of recommendations || []) {
    const id = rec.internship?._id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    options.push({
      id,
      role: rec.internship.role || "Internship",
      company: rec.internship.company?.companyName || "Company",
      source: "recommended",
      skillsRequired: rec.internship.skillsRequired || [],
      prioritySkills: rec.internship.prioritySkills || [],
      missingRequiredSkills: rec.missingRequiredSkills,
      missingPreferredSkills: rec.missingPreferredSkills,
      matchedRequiredSkills: rec.matchedRequiredSkills,
      requiredMatchPercent: rec.requiredSkillMatchPercent
    });
  }

  for (const app of applications || []) {
    const id = app.internship?._id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    options.push({
      id,
      role: app.internship.role || "Internship",
      company: app.internship.company?.companyName || "Company",
      source: "applied",
      skillsRequired: app.internship.skillsRequired || [],
      prioritySkills: app.internship.prioritySkills || []
    });
  }

  return options;
}

/**
 * Analyse a single internship against the student's profile and return a
 * categorised, prioritised list of weaknesses plus summary metrics.
 */
export function analyzeInternshipWeaknesses(
  profile: InternProfile | null,
  option: WeaknessInternshipOption | null
): WeaknessAnalysis | null {
  if (!option) return null;

  const internSkills = resolveInternSkills(profile);
  const hasResume = Boolean(profile?.resumeUploaded);

  // Prefer the API-computed skill match; otherwise derive it locally so applied
  // (non-recommended) internships are analysed with the same canonical logic.
  const precomputed =
    option.missingRequiredSkills !== undefined && option.requiredMatchPercent !== undefined;
  const match = precomputed
    ? null
    : computeSkillMatch(internSkills, option.skillsRequired, option.prioritySkills);

  const missingRequired = (precomputed ? option.missingRequiredSkills : match?.missingRequiredSkills) || [];
  const missingPreferred = (precomputed ? option.missingPreferredSkills : match?.missingPreferredSkills) || [];
  const matchPercent = clamp(
    precomputed ? (option.requiredMatchPercent as number) : match?.requiredMatchPercent ?? 0
  );

  const weaknesses: Weakness[] = [];

  // 1. Missing required skills — grouped by category, High priority.
  const requiredByCategory = groupByCategory(missingRequired);
  for (const [category, skills] of requiredByCategory) {
    weaknesses.push({
      id: `req-${category}`,
      title: `Missing ${category}: ${formatSkillList(skills.slice(0, 3))}${skills.length > 3 ? ` +${skills.length - 3}` : ""}`,
      category,
      explanation: `The role requires ${formatSkillList(skills)}, which are not evident in your resume or skills.`,
      whyItMatters: "Required skills are the primary filter recruiters and ATS use — missing them removes you from most shortlists.",
      suggestion: `Learn and demonstrate ${formatSkillList(skills.slice(0, 2))} through a project or certification, then list them explicitly on your resume.`,
      priority: "High",
      severity: clamp(70 + skills.length * 8),
      missingCount: skills.length
    });
  }

  // 2. Missing preferred/priority skills — Medium priority, competitive edge.
  if (missingPreferred.length > 0) {
    weaknesses.push({
      id: "preferred-skills",
      title: `Preferred skills gap: ${formatSkillList(missingPreferred.slice(0, 3))}${missingPreferred.length > 3 ? ` +${missingPreferred.length - 3}` : ""}`,
      category: "Technical Skills",
      explanation: `${formatSkillList(missingPreferred)} are preferred for this role and give shortlisted candidates an edge.`,
      whyItMatters: "Preferred skills are tie-breakers between otherwise-similar candidates and often decide the final shortlist.",
      suggestion: `Add one or two of ${formatSkillList(missingPreferred.slice(0, 2))} to strengthen your competitive position.`,
      priority: "Medium",
      severity: clamp(45 + missingPreferred.length * 6),
      missingCount: missingPreferred.length
    });
  }

  // 3. Resume / ATS quality — driven by the resume intelligence analysis.
  const analysis = profile?.resume?.analysis;
  const ats = analysis?.categoryScores?.ats;
  if (hasResume && typeof ats === "number" && ats < 75) {
    weaknesses.push({
      id: "ats-keywords",
      title: "Low ATS keyword coverage",
      category: "ATS Keywords",
      explanation: `Your resume scores ${clamp(ats)}/100 on ATS keyword alignment for this type of role.`,
      whyItMatters: "Applicant tracking systems rank and filter resumes on keyword matches before a human ever reviews them.",
      suggestion: "Mirror the exact skill and tool names from the internship description in your resume's skills and experience sections.",
      priority: ats < 55 ? "High" : "Medium",
      severity: clamp(100 - ats)
    });
  }

  const content = analysis?.categoryScores?.content;
  const structure = analysis?.categoryScores?.structure;
  const resumeQuality = averageDefined([content, structure, analysis?.categoryScores?.impact]);
  if (hasResume && resumeQuality !== null && resumeQuality < 70) {
    weaknesses.push({
      id: "resume-quality",
      title: "Resume clarity and impact need work",
      category: "Resume Quality",
      explanation: analysis?.weaknesses?.[0] || "Your resume's structure, content depth, or impact statements score below par.",
      whyItMatters: "A cluttered or vague resume weakens recruiter confidence even when your underlying skills are strong.",
      suggestion: analysis?.improvements?.[0] || "Use concise bullet points with measurable outcomes (numbers, %, impact) and a clean, consistent layout.",
      priority: "Medium",
      severity: clamp(100 - resumeQuality)
    });
  }

  // 4. Evidence gaps — projects, experience, certifications, portfolio, GitHub.
  const projectCount = countEntries(profile?.projects, profile?.profileSections?.projects, profile?.resume?.parsed?.projects);
  if (projectCount < 2) {
    weaknesses.push({
      id: "projects",
      title: projectCount === 0 ? "No projects showcased" : "Limited project portfolio",
      category: "Projects",
      explanation: projectCount === 0
        ? "You have no projects listed to demonstrate applied skills for this role."
        : "You have only one project, which limits proof of hands-on ability.",
      whyItMatters: "Projects are the strongest evidence that you can apply required skills in practice — recruiters weigh them heavily for internships.",
      suggestion: "Build and document at least two role-relevant projects with tech stack, outcomes, and links (live demo or GitHub).",
      priority: projectCount === 0 ? "High" : "Medium",
      severity: projectCount === 0 ? 80 : 55
    });
  }

  const experienceCount = countEntries(profile?.experience, profile?.profileSections?.experience, profile?.resume?.parsed?.experience);
  if (experienceCount === 0) {
    weaknesses.push({
      id: "experience",
      title: "No prior experience listed",
      category: "Experience",
      explanation: "No internships, freelance, or work experience entries were found on your profile.",
      whyItMatters: "Any hands-on experience signals reliability and workplace readiness, differentiating you from other applicants.",
      suggestion: "Add internships, freelance work, open-source contributions, or volunteering — even short engagements count.",
      priority: "Medium",
      severity: 50
    });
  }

  const certCount = countEntries(
    profile?.certifications,
    profile?.certificationEntries,
    profile?.resume?.parsed?.certifications
  );
  if (certCount === 0) {
    weaknesses.push({
      id: "certifications",
      title: "No certifications added",
      category: "Certifications",
      explanation: "You have no certifications validating your skills for this role.",
      whyItMatters: "Relevant certifications provide third-party proof of competency and help pass keyword-based screening.",
      suggestion: "Complete one focused certification aligned to this role's required skills and add it to your profile.",
      priority: "Low",
      severity: 35
    });
  }

  if (!profile?.githubUrl) {
    weaknesses.push({
      id: "github",
      title: "No GitHub profile linked",
      category: "GitHub Activity",
      explanation: "Your profile has no GitHub link, so recruiters cannot review your code or activity.",
      whyItMatters: "For technical internships, an active GitHub is often the first thing reviewers check for real coding evidence.",
      suggestion: "Add your GitHub URL and keep at least a few well-documented repositories public.",
      priority: "Low",
      severity: 30
    });
  }

  if (!profile?.portfolioUrl) {
    weaknesses.push({
      id: "portfolio",
      title: "No portfolio linked",
      category: "Portfolio",
      explanation: "No portfolio site is linked to present your work in one place.",
      whyItMatters: "A portfolio lets recruiters quickly gauge the breadth and quality of your work beyond a one-page resume.",
      suggestion: "Publish a simple portfolio (even a single page) linking your best projects and add the URL to your profile.",
      priority: "Low",
      severity: 25
    });
  }

  // 5. Soft skills / communication signal.
  const softSkillCount = countEntries(profile?.softSkills);
  if (softSkillCount === 0 && !profile?.linkedinUrl) {
    weaknesses.push({
      id: "soft-skills",
      title: "Soft skills not highlighted",
      category: "Soft Skills",
      explanation: "No soft skills or professional (LinkedIn) presence are surfaced on your profile.",
      whyItMatters: "Communication and teamwork are decisive in interviews and for collaborative internship environments.",
      suggestion: "List key soft skills (communication, teamwork, problem-solving) and connect a complete LinkedIn profile.",
      priority: "Low",
      severity: 20
    });
  }

  // Sort: priority first, then severity.
  weaknesses.sort((a, b) => {
    if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) {
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    }
    return b.severity - a.severity;
  });

  const byPriority: Record<WeaknessPriority, number> = { High: 0, Medium: 0, Low: 0 };
  weaknesses.forEach((w) => {
    byPriority[w.priority] += 1;
  });

  // Readiness blends skill match with evidence & resume signals.
  const evidenceScore = clamp(
    (projectCount >= 2 ? 100 : projectCount * 45) * 0.4 +
      (experienceCount > 0 ? 100 : 0) * 0.3 +
      (certCount > 0 ? 100 : 0) * 0.3
  );
  const resumeSignal = hasResume ? clamp(analysis?.overallScore ?? profile?.resume?.score ?? 60) : 40;
  const readinessScore = clamp(matchPercent * 0.55 + resumeSignal * 0.25 + evidenceScore * 0.2);

  return {
    internshipId: option.id,
    role: option.role,
    company: option.company,
    matchPercent,
    readinessScore,
    improvementPotential: clamp(100 - readinessScore),
    missingSkillCount: missingRequired.length + missingPreferred.length,
    weaknesses,
    byPriority,
    hasResume
  };
}

function groupByCategory(skills: string[]): Map<WeaknessCategory, string[]> {
  const map = new Map<WeaknessCategory, string[]>();
  for (const skill of skills) {
    if (!skill) continue;
    const category = classifySkill(skill);
    const existing = map.get(category);
    if (existing) existing.push(skill);
    else map.set(category, [skill]);
  }
  return map;
}

function averageDefined(values: Array<number | undefined>): number | null {
  const defined = values.filter((v): v is number => typeof v === "number");
  if (defined.length === 0) return null;
  return defined.reduce((sum, v) => sum + v, 0) / defined.length;
}

function countEntries(...sources: Array<unknown>): number {
  let count = 0;
  for (const source of sources) {
    if (Array.isArray(source)) count += source.filter(Boolean).length;
  }
  return count;
}
