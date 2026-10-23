import type { CompanyApplication, CompanyMatchedCandidate } from "@/lib/company-portal";
import { KNOWN_SKILL_DICTIONARY, SKILL_CANONICAL_MAP } from "@/lib/skill-gap-dictionary";
import { normalizeSkillList, normalizeSkillValue } from "@/lib/skill-normalizer";
import type {
  CandidateProjectPortfolioEvaluation,
  GitHubAnalysis,
  ProjectComplexityLevel,
  ProjectEvaluation,
  ProjectExplanation,
  ProjectMetadata,
  ProjectVerificationStatus,
  SkillEvidenceRecord,
  TechnicalScope
} from "./types";

type RawProjectInput = {
  title?: string;
  description?: string;
  techStack?: string[];
  demoLink?: string;
  githubLink?: string;
  duration?: string;
  source: string;
};

type InternLike = {
  projects?: string[];
  skills?: string[];
  links?: string[];
  githubUrl?: string;
  portfolioUrl?: string;
  resume?: {
    parsed?: {
      projects?: Array<{
        title?: string;
        description?: string;
        techStack?: string[];
        demoLink?: string;
        githubLink?: string;
      }>;
      links?: string[];
    } | null;
  };
  profileSections?: {
    projects?: Array<{
      title?: string;
      description?: string;
      techStack?: string[];
      demoLink?: string;
    }>;
  };
};

const GITHUB_URL_PATTERN = /https?:\/\/(?:www\.)?github\.com\/[\w.-]+\/[\w.-]+/i;
const LIVE_URL_PATTERN = /https?:\/\/[^\s]+/i;

const SCOPE_KEYWORDS: Record<keyof TechnicalScope, string[]> = {
  frontend: ["frontend", "react", "vue", "angular", "html", "css", "ui", "ux", "tailwind", "responsive"],
  backend: ["backend", "server", "api", "node", "express", "django", "flask", "spring", "microservice"],
  database: ["database", "sql", "mysql", "postgres", "mongodb", "redis", "firebase", "orm"],
  apis: ["rest", "graphql", "api", "endpoint", "integration", "webhook"],
  aiMl: ["machine learning", "deep learning", "tensorflow", "pytorch", "nlp", "computer vision", "ml", "ai"],
  deployment: ["deploy", "docker", "kubernetes", "ci/cd", "aws", "vercel", "netlify", "heroku", "production"]
};

const ENGINEERING_KEYWORDS = {
  architecture: ["architecture", "modular", "layered", "mvc", "clean code", "design pattern", "component"],
  scalability: ["scale", "scalable", "performance", "optimization", "cache", "load", "concurrent"],
  security: ["security", "authentication", "authorization", "jwt", "oauth", "encryption", "sanitize"],
  deploymentReadiness: ["deploy", "production", "docker", "pipeline", "monitoring", "hosting", "live"]
};

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function canonicalSkill(raw: string) {
  const normalized = normalizeSkillValue(raw);
  if (!normalized) return "";
  return SKILL_CANONICAL_MAP[normalized] || normalized;
}

function escapeRegExpToken(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scanEvidenceText(text: string): string[] {
  const lower = String(text || "").toLowerCase();
  if (!lower.trim()) return [];

  const found = new Set<string>();
  for (const skill of KNOWN_SKILL_DICTIONARY) {
    const token = escapeRegExpToken(skill.toLowerCase()).replace(/\s+/g, "\\s+");
    // Custom lookaround boundaries instead of \b: skill tokens like "c++"/"c#"/".net"
    // end in non-word characters, so a trailing \b (word<->non-word transition) never
    // matches there and would silently drop those skills from detection.
    const pattern = new RegExp(`(?<![a-z0-9])${token}(?![a-z0-9])`, "i");
    if (pattern.test(lower)) {
      found.add(canonicalSkill(skill));
    }
  }
  return [...found];
}

function normalizeTitle(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function extractUrls(values: Array<string | undefined>) {
  const urls: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const matches = String(value).match(/https?:\/\/[^\s,)]+/gi);
    if (matches) urls.push(...matches);
  }
  return urls;
}

function parseGithubUrl(url: string): GitHubAnalysis | null {
  const match = String(url).match(/github\.com\/([^/]+)\/([^/?#]+)/i);
  if (!match) return null;

  const repositoryName = match[2].replace(/\.git$/i, "");
  return {
    available: true,
    repositoryName,
    inferredStack: [],
    hasDocumentationSignals: false,
    structureSignals: [],
    confidenceBoost: 0
  };
}

function inferFeatures(description: string) {
  const lines = String(description || "")
    .split(/\n|•|·|-\s+/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 8);

  const featureLike = lines.filter((line) => /feature|implement|built|added|support|enable|allow|manage|track|auth|payment|search|dashboard/i.test(line));
  return (featureLike.length ? featureLike : lines).slice(0, 6);
}

function inferDuration(description: string, explicit?: string) {
  if (explicit?.trim()) return explicit.trim();
  const match = String(description || "").match(/(\d+\s?(?:weeks?|months?|days?))/i);
  return match ? match[1] : "";
}

function collectRawProjects(intern: InternLike | null | undefined): RawProjectInput[] {
  if (!intern) return [];

  const bucket = new Map<string, RawProjectInput>();

  function upsert(key: string, patch: RawProjectInput) {
    const existing = bucket.get(key);
    if (!existing) {
      bucket.set(key, patch);
      return;
    }
    bucket.set(key, {
      ...existing,
      title: existing.title || patch.title,
      description: existing.description || patch.description,
      techStack: [...new Set([...(existing.techStack || []), ...(patch.techStack || [])])],
      demoLink: existing.demoLink || patch.demoLink,
      githubLink: existing.githubLink || patch.githubLink,
      duration: existing.duration || patch.duration,
      source: `${existing.source}+${patch.source}`
    });
  }

  for (const entry of intern.resume?.parsed?.projects || []) {
    const title = entry.title?.trim() || "Untitled project";
    upsert(normalizeTitle(title), {
      title,
      description: entry.description || "",
      techStack: entry.techStack || [],
      demoLink: entry.demoLink || "",
      githubLink: entry.githubLink || "",
      source: "resume.parsed"
    });
  }

  for (const entry of intern.profileSections?.projects || []) {
    const title = entry.title?.trim() || "Untitled project";
    upsert(normalizeTitle(title), {
      title,
      description: entry.description || "",
      techStack: entry.techStack || [],
      demoLink: entry.demoLink || "",
      githubLink: "",
      source: "profileSections"
    });
  }

  for (const line of intern.projects || []) {
    const text = String(line || "").trim();
    if (!text) continue;

    const urlMatches = extractUrls([text]);
    const githubLink = urlMatches.find((url) => GITHUB_URL_PATTERN.test(url)) || "";
    const demoLink = urlMatches.find((url) => !GITHUB_URL_PATTERN.test(url)) || "";

    const titleGuess = text.split(/[-–:|]/)[0]?.trim() || text.slice(0, 80);
    const description = text.length > titleGuess.length + 8 ? text : "";
    upsert(normalizeTitle(titleGuess), {
      title: titleGuess,
      description,
      techStack: description ? normalizeSkillList(description) : [],
      demoLink,
      githubLink,
      source: "profile.projects"
    });
  }

  return [...bucket.values()];
}

function verifyProject(raw: RawProjectInput): { status: ProjectVerificationStatus; notes: string[]; verified: boolean } {
  const notes: string[] = [];
  const hasDescription = Boolean(raw.description?.trim() && raw.description.trim().length > 20);
  const hasTechnologies = (raw.techStack || []).length > 0;
  const hasGithub = Boolean(raw.githubLink?.trim());
  const hasLiveLink = Boolean(raw.demoLink?.trim());

  if (!hasDescription && !hasTechnologies && !hasGithub && !hasLiveLink) {
    notes.push("Project has title only — excluded from evidence-based scoring.");
    return { status: "title_only", notes, verified: false };
  }

  if (!hasDescription) notes.push("Description is limited; scoring relies on technologies and links.");
  if (!hasTechnologies) notes.push("No explicit technology stack listed.");
  if (!hasGithub && !hasLiveLink) notes.push("No repository or live demo link provided.");

  const status: ProjectVerificationStatus =
    hasDescription && (hasTechnologies || hasGithub || hasLiveLink) ? "complete" : "incomplete";

  return { status, notes, verified: true };
}

function buildMetadata(raw: RawProjectInput, descriptionBlob: string): ProjectMetadata {
  const description = raw.description?.trim() || "";
  const technologies = normalizeSkillList(raw.techStack || []).map((skill) => canonicalSkill(skill)).filter(Boolean);
  const scanned = scanEvidenceText(descriptionBlob);
  const mergedTechnologies = [...new Set([...technologies, ...scanned])];

  const scope = detectTechnicalScope(descriptionBlob, mergedTechnologies);
  const complexityLevel = inferComplexity(mergedTechnologies, scope, description, inferFeatures(description).length);

  return {
    title: raw.title?.trim() || "Untitled project",
    description,
    technologies: mergedTechnologies,
    githubLink: raw.githubLink || "",
    liveLink: raw.demoLink || "",
    duration: inferDuration(description, raw.duration),
    complexityLevel,
    featuresImplemented: inferFeatures(description)
  };
}

function detectTechnicalScope(text: string, technologies: string[]): TechnicalScope {
  const blob = `${text} ${technologies.join(" ")}`.toLowerCase();
  return {
    frontend: SCOPE_KEYWORDS.frontend.some((keyword) => blob.includes(keyword)),
    backend: SCOPE_KEYWORDS.backend.some((keyword) => blob.includes(keyword)),
    database: SCOPE_KEYWORDS.database.some((keyword) => blob.includes(keyword)),
    apis: SCOPE_KEYWORDS.apis.some((keyword) => blob.includes(keyword)),
    aiMl: SCOPE_KEYWORDS.aiMl.some((keyword) => blob.includes(keyword)),
    deployment: SCOPE_KEYWORDS.deployment.some((keyword) => blob.includes(keyword))
  };
}

function inferComplexity(
  technologies: string[],
  scope: TechnicalScope,
  description: string,
  featureCount: number
): ProjectComplexityLevel {
  const scopeCount = Object.values(scope).filter(Boolean).length;
  const depthScore = technologies.length + scopeCount * 2 + Math.min(featureCount, 4) + Math.min(description.length / 120, 4);

  if (depthScore >= 12 || (scopeCount >= 4 && technologies.length >= 4)) return "Advanced";
  if (depthScore >= 6 || scopeCount >= 2 || technologies.length >= 2) return "Intermediate";
  return "Beginner";
}

function scoreEngineeringQuality(description: string, scope: TechnicalScope, metadata: ProjectMetadata) {
  const blob = `${description} ${metadata.technologies.join(" ")}`.toLowerCase();
  const scoreBucket = (keywords: string[]) =>
    clampScore(keywords.filter((keyword) => blob.includes(keyword)).length * 25 + (metadata.githubLink ? 10 : 0));

  return {
    architecture: clampScore(scoreBucket(ENGINEERING_KEYWORDS.architecture) + (scope.frontend && scope.backend ? 15 : 0)),
    scalability: scoreBucket(ENGINEERING_KEYWORDS.scalability),
    security: scoreBucket(ENGINEERING_KEYWORDS.security),
    deploymentReadiness: clampScore(
      scoreBucket(ENGINEERING_KEYWORDS.deploymentReadiness) + (metadata.liveLink ? 20 : 0) + (scope.deployment ? 15 : 0)
    )
  };
}

function analyzeGithub(metadata: ProjectMetadata, intern: InternLike | null | undefined): GitHubAnalysis | null {
  const candidateUrls = [
    metadata.githubLink,
    ...(intern?.links || []),
    intern?.githubUrl || "",
    ...(intern?.resume?.parsed?.links || [])
  ].filter(Boolean);

  const githubUrl = candidateUrls.find((url) => GITHUB_URL_PATTERN.test(url)) || metadata.githubLink;
  if (!githubUrl) return null;

  const parsed = parseGithubUrl(githubUrl);
  if (!parsed) return null;

  const blob = `${metadata.description} ${metadata.technologies.join(" ")}`.toLowerCase();
  parsed.inferredStack = [...metadata.technologies];
  parsed.hasDocumentationSignals = /readme|documentation|docs|wiki|setup instructions|getting started/i.test(blob);
  parsed.structureSignals = [];
  if (/src|components|backend|frontend|api|routes|models|tests/i.test(blob)) parsed.structureSignals.push("Structured codebase signals in project details");
  if (parsed.hasDocumentationSignals) parsed.structureSignals.push("Documentation mentioned in project details");
  if (metadata.technologies.length >= 2) parsed.structureSignals.push("Multi-technology stack documented");

  parsed.confidenceBoost = clampScore(
    (parsed.hasDocumentationSignals ? 8 : 0) +
      Math.min(metadata.technologies.length * 2, 8) +
      (metadata.liveLink ? 4 : 0)
  );

  return parsed;
}

function validateProjectSkills(metadata: ProjectMetadata, github: GitHubAnalysis | null): SkillEvidenceRecord[] {
  const evidenceText = [metadata.description, metadata.technologies.join(" "), github?.inferredStack.join(" ") || ""]
    .filter(Boolean)
    .join(" ");

  const skills = scanEvidenceText(evidenceText);
  const fromTech = metadata.technologies.map((skill) => canonicalSkill(skill)).filter(Boolean);
  const merged = [...new Set([...skills, ...fromTech])];

  return merged.map((skill) => {
    const sources: string[] = [];
    if (metadata.technologies.some((tech) => canonicalSkill(tech) === skill)) {
      sources.push(`technologies:${metadata.title}`);
    }
    if (scanEvidenceText(metadata.description).includes(skill)) {
      sources.push(`description:${metadata.title}`);
    }
    if (github?.inferredStack.some((tech) => canonicalSkill(tech) === skill)) {
      sources.push(`github:${github.repositoryName}`);
    }
    return { skill, evidenceSources: sources.length ? sources : [`project:${metadata.title}`] };
  });
}

function scoreProject(metadata: ProjectMetadata, scope: TechnicalScope, engineeringQuality: ProjectEvaluation["engineeringQuality"], github: GitHubAnalysis | null, verificationStatus: ProjectVerificationStatus) {
  const featureScore = clampScore(Math.min(metadata.featuresImplemented.length * 18, 72) + (metadata.description.length > 80 ? 12 : 0));
  const technologyScore = clampScore(Math.min(metadata.technologies.length * 12, 60) + Object.values(scope).filter(Boolean).length * 8);
  const scopeScore = clampScore(Object.values(scope).filter(Boolean).length * 14 + (metadata.complexityLevel === "Advanced" ? 20 : metadata.complexityLevel === "Intermediate" ? 10 : 0));
  const engineeringAvg = average(Object.values(engineeringQuality)) ?? 0;
  const documentationScore = clampScore((github?.hasDocumentationSignals ? 18 : 8) + (metadata.liveLink ? 10 : 0));

  const complexityScore = clampScore(scopeScore * 0.55 + technologyScore * 0.45);
  const implementationScore = clampScore(featureScore * 0.45 + engineeringAvg * 0.35 + technologyScore * 0.2);
  const qualityScore = clampScore(complexityScore * 0.35 + implementationScore * 0.35 + documentationScore * 0.2 + featureScore * 0.1);

  let confidenceScore = clampScore(
    (verificationStatus === "complete" ? 55 : 35) +
      Math.min(metadata.technologies.length * 6, 24) +
      (github ? github.confidenceBoost : 0) +
      (metadata.description.length > 60 ? 10 : 0)
  );
  if (verificationStatus === "title_only") confidenceScore = 0;

  return { qualityScore, complexityScore, implementationScore, confidenceScore };
}

function average(values: number[]) {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildProjectExplanation(
  metadata: ProjectMetadata,
  scores: ProjectEvaluation["scores"],
  skillsDemonstrated: SkillEvidenceRecord[],
  roleRelevantSkills: string[]
): ProjectExplanation {
  const matchedRoleSkills = roleRelevantSkills.filter((skill) =>
    skillsDemonstrated.some((entry) => entry.skill === skill)
  );

  const whyItMatters =
    matchedRoleSkills.length > 0
      ? `Demonstrates role-relevant skills (${matchedRoleSkills.slice(0, 4).join(", ")}) through verified project evidence — not title keywords alone.`
      : skillsDemonstrated.length > 0
        ? `Demonstrates ${skillsDemonstrated.slice(0, 4).map((entry) => entry.skill).join(", ")} with documented implementation details.`
        : "Provides supporting portfolio context after verification of available project details.";

  return {
    whyItMatters,
    skillsDemonstrated: skillsDemonstrated.map((entry) => entry.skill).slice(0, 8),
    complexityLevel: metadata.complexityLevel,
    notableFeatures: metadata.featuresImplemented.slice(0, 4),
    scoreContribution: `Quality ${scores.qualityScore}/100 · Confidence ${scores.confidenceScore}/100`
  };
}

function evaluateSingleProject(raw: RawProjectInput, intern: InternLike | null | undefined, roleSkills: string[]): ProjectEvaluation {
  const verification = verifyProject(raw);
  const evidenceBlob = [raw.description, ...(raw.techStack || [])].filter(Boolean).join(" ");
  const metadata = buildMetadata(raw, evidenceBlob);
  const technicalScope = detectTechnicalScope(evidenceBlob, metadata.technologies);
  const engineeringQuality = scoreEngineeringQuality(metadata.description, technicalScope, metadata);
  const githubAnalysis = analyzeGithub(metadata, intern);
  const skillsDemonstrated = verification.verified ? validateProjectSkills(metadata, githubAnalysis) : [];
  const scores = verification.verified
    ? scoreProject(metadata, technicalScope, engineeringQuality, githubAnalysis, verification.status)
    : { qualityScore: 0, complexityScore: 0, implementationScore: 0, confidenceScore: 0 };

  const explanation = buildProjectExplanation(
    metadata,
    scores,
    skillsDemonstrated,
    normalizeSkillList(roleSkills).map((skill) => canonicalSkill(skill)).filter(Boolean)
  );

  return {
    verified: verification.verified,
    verificationStatus: verification.status,
    verificationNotes: verification.notes,
    metadata,
    technicalScope,
    engineeringQuality,
    skillsDemonstrated,
    githubAnalysis,
    scores,
    explanation
  };
}

export function evaluateCandidateProjects(
  application: CompanyApplication | null,
  match: CompanyMatchedCandidate | null,
  requiredSkills: string[] = [],
  preferredSkills: string[] = []
): CandidateProjectPortfolioEvaluation {
  const intern = application?.intern || null;
  const rawProjects = collectRawProjects(intern);
  const roleSkills = normalizeSkillList([...requiredSkills, ...preferredSkills]).map((skill) => canonicalSkill(skill)).filter(Boolean);

  const evaluatedProjects = rawProjects.map((raw) => evaluateSingleProject(raw, intern, roleSkills));
  const verifiedProjects = evaluatedProjects.filter((project) => project.verified);

  if (!verifiedProjects.length) {
    return {
      sufficient: false,
      evaluatedProjects,
      verifiedProjectCount: 0,
      aggregateScores: {
        qualityScore: 0,
        complexityScore: 0,
        implementationScore: 0,
        confidenceScore: 0
      },
      roleRelevanceScore: null,
      validatedSkills: [],
      lowConfidenceWarning: evaluatedProjects.some((project) => project.verificationStatus === "title_only")
        ? "Projects listed without verifiable details — title-only entries are excluded from AI scoring."
        : "Insufficient verified project evidence for strong portfolio scoring.",
      projectSummaries: []
    };
  }

  const aggregateScores = {
    qualityScore: average(verifiedProjects.map((project) => project.scores.qualityScore)) ?? 0,
    complexityScore: average(verifiedProjects.map((project) => project.scores.complexityScore)) ?? 0,
    implementationScore: average(verifiedProjects.map((project) => project.scores.implementationScore)) ?? 0,
    confidenceScore: average(verifiedProjects.map((project) => project.scores.confidenceScore)) ?? 0
  };

  const skillMap = new Map<string, SkillEvidenceRecord>();
  verifiedProjects.forEach((project) => {
    project.skillsDemonstrated.forEach((entry) => {
      const existing = skillMap.get(entry.skill);
      if (!existing) {
        skillMap.set(entry.skill, entry);
        return;
      }
      skillMap.set(entry.skill, {
        skill: entry.skill,
        evidenceSources: [...new Set([...existing.evidenceSources, ...entry.evidenceSources])]
      });
    });
  });
  const validatedSkills = [...skillMap.values()];

  const roleMatches = roleSkills.filter((skill) => skillMap.has(skill));
  const roleRelevanceScore =
    roleSkills.length > 0 ? clampScore((roleMatches.length / roleSkills.length) * 55 + aggregateScores.qualityScore * 0.45) : null;

  const lowConfidenceWarning =
    aggregateScores.confidenceScore < 45
      ? "Insufficient project evidence for strong recommendation"
      : null;

  return {
    sufficient: true,
    evaluatedProjects,
    verifiedProjectCount: verifiedProjects.length,
    aggregateScores,
    roleRelevanceScore,
    validatedSkills,
    lowConfidenceWarning,
    projectSummaries: verifiedProjects
      .sort((a, b) => b.scores.qualityScore - a.scores.qualityScore)
      .slice(0, 3)
      .map((project) => project.explanation)
  };
}

export function validateClaimedSkillWithProjects(
  skill: string,
  portfolio: CandidateProjectPortfolioEvaluation,
  internSkills: string[]
): { verified: boolean; sources: string[] } {
  const canonical = canonicalSkill(skill);
  const fromProjects = portfolio.validatedSkills.find((entry) => entry.skill === canonical);
  if (fromProjects) {
    return { verified: true, sources: fromProjects.evidenceSources };
  }

  const fromProfile = normalizeSkillList(internSkills).map((entry) => canonicalSkill(entry)).includes(canonical);
  return { verified: fromProfile, sources: fromProfile ? ["profile.skills"] : [] };
}

export function buildPortfolioProjectSummary(portfolio: CandidateProjectPortfolioEvaluation) {
  if (!portfolio.sufficient) {
    return portfolio.lowConfidenceWarning || "No verified project evidence available.";
  }

  const top = portfolio.evaluatedProjects
    .filter((project) => project.verified)
    .sort((a, b) => b.scores.qualityScore - a.scores.qualityScore)[0];

  if (!top) return "Verified projects available but quality signals are limited.";

  const skills = top.skillsDemonstrated.slice(0, 4).map((entry) => entry.skill).join(", ");
  return `${portfolio.verifiedProjectCount} verified project(s). Top project (${top.metadata.title}) — ${top.metadata.complexityLevel} complexity${skills ? `; skills: ${skills}` : ""}. Portfolio quality ${portfolio.aggregateScores.qualityScore}/100.`;
}

export const PROJECT_CONFIDENCE_THRESHOLD = 45;
export const PROJECT_RELEVANCE_STRONG_THRESHOLD = 40;
