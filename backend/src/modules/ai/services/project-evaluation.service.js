const { normalizeSkillList } = require("../../../shared/utils/skill-normalizer");

const KNOWN_SKILLS = new Set([
  "javascript", "typescript", "react", "next.js", "node.js", "express.js", "html", "css",
  "python", "java", "sql", "mysql", "postgresql", "mongodb", "docker", "git", "github",
  "aws", "machine learning", "tensorflow", "pytorch", "graphql", "rest api", "deployment"
]);

const SCOPE_KEYWORDS = {
  frontend: ["frontend", "react", "vue", "angular", "html", "css", "ui"],
  backend: ["backend", "server", "node", "express", "django", "flask", "spring"],
  database: ["database", "sql", "mysql", "postgres", "mongodb", "redis"],
  apis: ["rest", "graphql", "api", "endpoint"],
  aiMl: ["machine learning", "tensorflow", "pytorch", "nlp", "computer vision"],
  deployment: ["deploy", "docker", "kubernetes", "aws", "vercel", "netlify", "production"]
};

function clampScore(value) {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
}

function scanEvidenceText(text) {
  const lower = String(text || "").toLowerCase();
  const found = new Set();
  for (const skill of KNOWN_SKILLS) {
    if (lower.includes(skill)) found.add(skill);
  }
  return [...found];
}

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function collectRawProjects(profile) {
  const bucket = new Map();

  function upsert(key, patch) {
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
      githubLink: existing.githubLink || patch.githubLink
    });
  }

  for (const entry of profile?.resume?.parsed?.projects || []) {
    const title = entry.title?.trim() || "Untitled project";
    upsert(normalizeTitle(title), {
      title,
      description: entry.description || "",
      techStack: entry.techStack || [],
      demoLink: entry.demoLink || "",
      githubLink: entry.githubLink || ""
    });
  }

  for (const entry of profile?.profileSections?.projects || []) {
    const title = entry.title?.trim() || "Untitled project";
    upsert(normalizeTitle(title), {
      title,
      description: entry.description || "",
      techStack: entry.techStack || [],
      demoLink: entry.demoLink || "",
      githubLink: ""
    });
  }

  for (const line of profile?.projects || []) {
    const text = String(line || "").trim();
    if (!text) continue;
    const titleGuess = text.split(/[-–:|]/)[0]?.trim() || text.slice(0, 80);
    upsert(normalizeTitle(titleGuess), {
      title: titleGuess,
      description: text.length > titleGuess.length + 8 ? text : "",
      techStack: normalizeSkillList(text),
      demoLink: "",
      githubLink: (text.match(/https?:\/\/(?:www\.)?github\.com\/[\w.-]+\/[\w.-]+/i) || [])[0] || ""
    });
  }

  return [...bucket.values()];
}

function verifyProject(raw) {
  const hasDescription = Boolean(raw.description?.trim() && raw.description.trim().length > 20);
  const hasTechnologies = (raw.techStack || []).length > 0;
  const hasGithub = Boolean(raw.githubLink?.trim());
  const hasLiveLink = Boolean(raw.demoLink?.trim());

  if (!hasDescription && !hasTechnologies && !hasGithub && !hasLiveLink) {
    return { verified: false, status: "title_only" };
  }

  return {
    verified: true,
    status: hasDescription && (hasTechnologies || hasGithub || hasLiveLink) ? "complete" : "incomplete"
  };
}

function detectScope(text, technologies) {
  const blob = `${text} ${technologies.join(" ")}`.toLowerCase();
  return Object.fromEntries(Object.entries(SCOPE_KEYWORDS).map(([key, keywords]) => [key, keywords.some((word) => blob.includes(word))]));
}

function scoreProject(raw) {
  const verification = verifyProject(raw);
  if (!verification.verified) {
    return { qualityScore: 0, confidenceScore: 0, skillsDemonstrated: [] };
  }

  const blob = [raw.description, ...(raw.techStack || [])].filter(Boolean).join(" ");
  const technologies = [...new Set([...normalizeSkillList(raw.techStack || []), ...scanEvidenceText(blob)])];
  const scope = detectScope(blob, technologies);
  const scopeCount = Object.values(scope).filter(Boolean).length;
  const featureCount = String(raw.description || "").split(/\n|•|-\s+/).filter((line) => line.trim().length > 8).length;

  const complexityScore = clampScore(scopeCount * 14 + technologies.length * 10);
  const implementationScore = clampScore(featureCount * 15 + technologies.length * 8);
  const qualityScore = clampScore(complexityScore * 0.45 + implementationScore * 0.55);
  const confidenceScore = clampScore(
    (verification.status === "complete" ? 55 : 35) + Math.min(technologies.length * 6, 24) + (raw.githubLink ? 8 : 0)
  );

  return {
    qualityScore,
    confidenceScore,
    skillsDemonstrated: technologies.map((skill) => ({ skill, evidenceSources: [`project:${raw.title}`] }))
  };
}

function evaluateCandidateProjects(profile, requiredSkills = [], preferredSkills = []) {
  const rawProjects = collectRawProjects(profile);
  const roleSkills = normalizeSkillList([...(requiredSkills || []), ...(preferredSkills || [])]);
  const evaluated = rawProjects.map((raw) => ({ raw, ...scoreProject(raw) }));
  const verified = evaluated.filter((item) => item.qualityScore > 0);

  if (!verified.length) {
    return {
      sufficient: false,
      verifiedProjectCount: 0,
      aggregateScores: { qualityScore: 0, confidenceScore: 0 },
      roleRelevanceScore: null,
      validatedSkills: []
    };
  }

  const qualityScore = clampScore(verified.reduce((sum, item) => sum + item.qualityScore, 0) / verified.length);
  const confidenceScore = clampScore(verified.reduce((sum, item) => sum + item.confidenceScore, 0) / verified.length);
  const skillMap = new Map();
  verified.forEach((item) => {
    item.skillsDemonstrated.forEach((entry) => skillMap.set(entry.skill, entry));
  });
  const validatedSkills = [...skillMap.values()];
  const roleMatches = roleSkills.filter((skill) => skillMap.has(skill));
  const roleRelevanceScore =
    roleSkills.length > 0 ? clampScore((roleMatches.length / roleSkills.length) * 55 + qualityScore * 0.45) : null;

  return {
    sufficient: true,
    verifiedProjectCount: verified.length,
    aggregateScores: { qualityScore, confidenceScore },
    roleRelevanceScore,
    validatedSkills
  };
}

module.exports = {
  evaluateCandidateProjects
};
