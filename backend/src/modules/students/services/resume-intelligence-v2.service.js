const { computeSkillMatch } = require("../../../shared/utils/compute-skill-match");
const { normalizeSkillList, textMentionsSkill } = require("../../../shared/utils/skill-normalizer");
const { canonicalSkill, displaySkill } = require("../../../services/resume-structured-parser.service");
const { sanitizeParsed, qualityReport } = require("../../../services/resume-quality.service");
const {
  DIMENSION_WEIGHTS,
  SKILL_CATEGORY_TAXONOMY,
  TARGET_ROLE_PROFILES,
  REQUIRED_SECTIONS
} = require("../../../constants/resume-intelligence-v2");

function clampScore(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function hasSection(parsed, text, key) {
  const lower = String(text || "").toLowerCase();
  switch (key) {
    case "summary":
      return Boolean(parsed.summary && parsed.summary.length >= 40);
    case "skills":
      return (parsed.skills || []).length >= 3;
    case "projects":
      return (parsed.projects || []).length > 0;
    case "education":
      return (parsed.education || []).length > 0;
    case "experience":
      return (parsed.experience || []).length > 0 || /internship|experience|worked at/i.test(lower);
    case "certifications":
      return (parsed.certifications || []).length > 0;
    case "achievements":
      return (parsed.achievements || []).length > 0;
    default:
      return false;
  }
}

function categorizeSkillsV2(skillList = []) {
  const normalized = normalizeSkillList(skillList).map((s) => canonicalSkill(s)).filter(Boolean);
  const groups = {};

  for (const [category, tokens] of Object.entries(SKILL_CATEGORY_TAXONOMY)) {
    const matched = normalized.filter((skill) => tokens.some((token) => skill === token || skill.includes(token))).map(displaySkill);
    if (matched.length > 0) {
      groups[category] = [...new Set(matched)];
    }
  }

  const assigned = new Set(Object.values(groups).flat().map((s) => s.toLowerCase()));
  const uncategorized = skillList
    .map((s) => displaySkill(canonicalSkill(s) || s))
    .filter((s) => s && !assigned.has(s.toLowerCase()));

  if (uncategorized.length > 0) {
    groups.Other = uncategorized.slice(0, 12);
  }

  return groups;
}

/** Dimension 1: Resume Structure & Formatting (5%) — never over-penalized. */
function scoreStructure(parsed, text, textAnalysis) {
  const present = REQUIRED_SECTIONS.filter((key) => hasSection(parsed, text, key));
  const sectionCoverage = (present.length / REQUIRED_SECTIONS.length) * 100;
  const formatting = textAnalysis?.categoryScores?.formattingQuality ?? textAnalysis?.checks?.formattingQualityScore ?? 60;
  const readability = textAnalysis?.categoryScores?.structure ?? 65;
  const wordCount = textAnalysis?.checks?.wordCount ?? String(text || "").split(/\s+/).length;
  const lengthFit = wordCount >= 280 && wordCount <= 950 ? 100 : wordCount >= 200 ? 75 : 45;

  const score = clampScore(sectionCoverage * 0.45 + formatting * 0.3 + readability * 0.15 + lengthFit * 0.1);
  const suggestions = [];
  if (present.length < 5) suggestions.push("Add missing sections: summary, skills, projects, education, and experience.");
  if (wordCount < 250) suggestions.push("Expand resume content with measurable outcomes and project details.");
  if (formatting < 70) suggestions.push("Improve formatting consistency and section headings for ATS parsing.");

  return {
    key: "structure",
    label: "Resume Structure & Formatting",
    weight: DIMENSION_WEIGHTS.structure,
    score,
    explanation: `${present.length}/${REQUIRED_SECTIONS.length} core sections detected with readable formatting.`,
    suggestions: suggestions.slice(0, 3)
  };
}

/**
 * Dimension 2: Keyword Match (45%) — matched required keywords ÷ total
 * required keywords, with preferred keywords weighted lighter (0.8/0.2 split,
 * same deterministic formula as computeSkillMatch). Scored against the
 * selected internship's actual posting when one is provided; otherwise
 * against the student's own declared profile skills as a generic proxy.
 */
function scoreKeywordMatch(text, profile, internshipContext, targetRoleKey) {
  const isInternshipScoped = Boolean(internshipContext?.requiredSkills?.length);
  // Generic mode (no specific internship selected) must still be role-aware:
  // score against the selected target role's own required/emerging skill
  // taxonomy, not the student's self-declared profile skills — otherwise
  // this 45%-weighted dimension (the dominant one) is identical for every
  // role and only the 10%-weighted technical-skills dimension would ever
  // differ, producing near-identical scores across roles.
  const roleProfile = targetRoleKey ? TARGET_ROLE_PROFILES[targetRoleKey] : null;
  const isRoleScoped = !isInternshipScoped && Boolean(roleProfile);

  let requiredSource;
  let preferredSource;
  if (isInternshipScoped) {
    requiredSource = internshipContext.requiredSkills;
    preferredSource = internshipContext.preferredSkills || [];
  } else if (isRoleScoped) {
    requiredSource = roleProfile.coreSkills || [];
    preferredSource = roleProfile.emergingSkills || [];
  } else {
    requiredSource = profile?.skills || [];
    preferredSource = [];
  }

  const normalizedRequired = normalizeSkillList(requiredSource);
  const normalizedPreferred = normalizeSkillList(preferredSource);

  if (normalizedRequired.length === 0) {
    return {
      key: "keywordMatch",
      label: "Keyword Match",
      weight: DIMENSION_WEIGHTS.keywordMatch,
      score: 60,
      explanation: "No target skills available yet to check keyword relevance — add skills to your profile, or view this analysis against a specific internship for a precise match.",
      suggestions: ["Add skills to your profile or select an internship to score against its actual requirements."],
      missingKeywords: []
    };
  }

  // Normalization-aware: "Node.js", "Node", "NodeJS" etc. all count as the
  // same required keyword — a naive substring check on differently-cased,
  // differently-punctuated text would otherwise miss real matches.
  const matchedRequired = normalizedRequired.filter((skill) => textMentionsSkill(text, skill));
  const matchedPreferred = normalizedPreferred.filter((skill) => textMentionsSkill(text, skill));
  const requiredPercent = Math.round((matchedRequired.length / normalizedRequired.length) * 100);
  const preferredPercent = normalizedPreferred.length
    ? Math.round((matchedPreferred.length / normalizedPreferred.length) * 100)
    : null;
  const score = preferredPercent === null ? requiredPercent : clampScore(requiredPercent * 0.8 + preferredPercent * 0.2);
  const missing = normalizedRequired.filter((skill) => !matchedRequired.includes(skill)).map(displaySkill);

  const roleLabel = isInternshipScoped ? internshipContext.roleLabel : roleProfile?.label;

  return {
    key: "keywordMatch",
    label: "Keyword Match",
    weight: DIMENSION_WEIGHTS.keywordMatch,
    score,
    explanation: roleLabel
      ? `${matchedRequired.length}/${normalizedRequired.length} required keywords for "${roleLabel}" found in your resume text${
          normalizedPreferred.length ? `, ${matchedPreferred.length}/${normalizedPreferred.length} preferred keywords found` : ""
        }.`
      : `${matchedRequired.length}/${normalizedRequired.length} of your profile's skills appear as keywords in your resume text.`,
    suggestions: missing.length ? [`Mention these keywords naturally in your resume: ${missing.slice(0, 5).join(", ")}.`] : [],
    missingKeywords: missing
  };
}

/**
 * Dimension 3: Experience Match (20%). Parses the posting's free-text
 * experience requirement for a stated minimum (months/years). No stated
 * requirement, or the candidate meeting/exceeding it, never costs points —
 * only a genuine, stated-and-unmet gap does.
 */
function parseExperienceRequirementMonths(text = "") {
  const t = String(text || "").toLowerCase().trim();
  if (!t) return { requiredMonths: 0, stated: false };
  if (/fresher|no\s*experience|not\s*required|entry[-\s]?level|no\s*prior|0\s*(year|month)/i.test(t)) {
    return { requiredMonths: 0, stated: true };
  }
  const match = t.match(/(\d+(?:\.\d+)?)\s*\+?\s*(year|yr|month|mo)/i);
  if (!match) return { requiredMonths: 0, stated: true };
  const n = parseFloat(match[1]);
  const months = match[2].toLowerCase().startsWith("y") ? Math.round(n * 12) : Math.round(n);
  return { requiredMonths: months, stated: true };
}

function scoreExperience(parsed, profile, textAnalysis, internshipContext) {
  const exp = parsed.experience || [];
  const hasAnyExperience = exp.length > 0 || (profile?.experience || []).length > 0;

  if (internshipContext) {
    const { requiredMonths, stated } = parseExperienceRequirementMonths(internshipContext.experienceRequirement);

    if (!stated || requiredMonths === 0) {
      return {
        key: "experience",
        label: "Experience Match",
        weight: DIMENSION_WEIGHTS.experience,
        score: 100,
        explanation: "No specific experience requirement for this internship — you are not penalized here.",
        suggestions: hasAnyExperience ? [] : ["Add any internships, freelance work, or academic project responsibilities."]
      };
    }

    if (hasAnyExperience) {
      return {
        key: "experience",
        label: "Experience Match",
        weight: DIMENSION_WEIGHTS.experience,
        score: 100,
        explanation: `This internship prefers ~${requiredMonths} month(s) of experience, and relevant experience/internship entries were found on your resume.`,
        suggestions: []
      };
    }

    return {
      key: "experience",
      label: "Experience Match",
      weight: DIMENSION_WEIGHTS.experience,
      score: 40,
      explanation: `This internship prefers ~${requiredMonths} month(s) of experience, but no experience/internship entries were found on your resume.`,
      suggestions: ["Add any internship, freelance, or part-time work — short-term experience still counts."]
    };
  }

  // Generic (no internship selected): this platform's candidates are
  // students by definition, so having zero professional experience is the
  // normal case, not a deficiency — it must not crater a 10%-weight
  // dimension. A neutral baseline is given regardless, with genuine credit
  // for any experience/internship entries actually present.
  const impact = textAnalysis?.categoryScores?.experienceWeighted ?? 65;
  const score = exp.length === 0 ? clampScore(60 + impact * 0.1) : clampScore(70 + Math.min(30, exp.length * 15));
  return {
    key: "experience",
    label: "Experience Match",
    weight: DIMENSION_WEIGHTS.experience,
    score,
    explanation: exp.length
      ? `${exp.length} experience/internship entries — not required for internships, but counted as a bonus.`
      : "No experience entries — expected for a student profile, not penalized.",
    suggestions: exp.length === 0 ? ["Add internships, freelance work, or leadership roles with outcomes if you have them."] : ["Use action verbs and measurable results per role."]
  };
}

/**
 * Dimension 4: Education Match (10%). Compared against the posting's
 * educationQualification / degreePreferences / minimumCgpa only when the
 * posting actually states them — never deducted otherwise.
 */
const DEGREE_SYNONYM_GROUPS = [
  ["b.tech", "btech", "bachelor of technology", "b.e", "be"],
  ["m.tech", "mtech", "master of technology", "m.e", "me"],
  ["bca", "bachelor of computer applications"],
  ["mca", "master of computer applications"],
  ["b.sc", "bsc", "bachelor of science"],
  ["m.sc", "msc", "master of science"],
  ["mba", "master of business administration"],
  ["bba", "bachelor of business administration"],
  ["diploma"],
  ["phd", "ph.d", "doctorate"]
];

function normalizeForMatch(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textsReferToSameDegree(a, b) {
  const na = normalizeForMatch(a);
  const nb = normalizeForMatch(b);
  if (!na || !nb) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  return DEGREE_SYNONYM_GROUPS.some((group) => group.some((g) => na.includes(g)) && group.some((g) => nb.includes(g)));
}

function scoreEducation(parsed, profile, internshipContext) {
  const candidateEntries = [
    ...((profile?.educationDetails) || []).map((e) => ({ degree: e.degree, branch: e.branch, cgpa: e.cgpa })),
    ...((parsed.education) || []).map((e) => ({ degree: e.degree, branch: e.branch, cgpa: e.grade }))
  ].filter((e) => e.degree || e.branch || e.cgpa);

  const hasRequirement = Boolean(
    internshipContext && (internshipContext.educationQualification || internshipContext.degreePreferences || internshipContext.minimumCgpa)
  );

  if (hasRequirement) {
    if (candidateEntries.length === 0) {
      return {
        key: "education",
        label: "Education Match",
        weight: DIMENSION_WEIGHTS.education,
        score: 40,
        explanation: "This internship lists education requirements, but no education details were found on your profile or resume.",
        suggestions: ["Add your degree, branch, and CGPA to your profile education details."]
      };
    }

    const primary = candidateEntries[0];
    let score = 100;
    const reasons = [];

    if (internshipContext.educationQualification) {
      const matches = candidateEntries.some((e) => textsReferToSameDegree(e.degree, internshipContext.educationQualification));
      if (!matches) {
        score -= 40;
        reasons.push(
          `Degree requirement (${internshipContext.educationQualification}) doesn't clearly match your listed degree (${primary.degree || "not specified"}).`
        );
      }
    }

    if (internshipContext.degreePreferences) {
      const prefNormalized = normalizeForMatch(internshipContext.degreePreferences);
      const matches = candidateEntries.some((e) => e.branch && prefNormalized.includes(normalizeForMatch(e.branch)));
      if (!matches) {
        score -= 30;
        reasons.push(
          `Preferred branch (${internshipContext.degreePreferences}) doesn't clearly match your listed branch (${primary.branch || "not specified"}).`
        );
      }
    }

    if (internshipContext.minimumCgpa) {
      const minCgpa = parseFloat(internshipContext.minimumCgpa);
      const candidateCgpa = parseFloat(primary.cgpa);
      if (!Number.isNaN(minCgpa)) {
        if (Number.isNaN(candidateCgpa)) {
          score -= 10;
          reasons.push(`Minimum CGPA of ${minCgpa} is required, but no CGPA was found on your profile.`);
        } else if (candidateCgpa < minCgpa) {
          score -= 20;
          reasons.push(`Your CGPA (${candidateCgpa}) is below the required minimum (${minCgpa}).`);
        }
      }
    }

    score = clampScore(score);
    return {
      key: "education",
      label: "Education Match",
      weight: DIMENSION_WEIGHTS.education,
      score,
      explanation: reasons.length ? reasons.join(" ") : "Your education matches this internship's stated requirements.",
      suggestions: reasons.length
        ? ["Update your profile education details if your qualifications meet the requirement — this check only sees what's listed there."]
        : []
    };
  }

  // No stated requirement anywhere — never penalize; presence-based fallback.
  if (candidateEntries.length === 0) {
    return {
      key: "education",
      label: "Education Match",
      weight: DIMENSION_WEIGHTS.education,
      score: 60,
      explanation: "No education requirement to check, and no education details found on your profile or resume.",
      suggestions: ["Add degree, institution, branch, CGPA/percentage, and graduation year."]
    };
  }
  return {
    key: "education",
    label: "Education Match",
    weight: DIMENSION_WEIGHTS.education,
    score: 100,
    explanation: "No specific education requirement stated — your listed education is on file.",
    suggestions: []
  };
}

/**
 * Dimension 5: Technical Skills Match (10%) — distinct from raw keyword
 * presence: this counts only skills with actual evidence (resume skills
 * section, projects, profile) via the same skill-intelligence pipeline used
 * for the skill-gap analysis, so the two surfaces never disagree.
 */
function scoreTechnicalSkillsMatch(skillIntelligence) {
  const matched = skillIntelligence.careerMatch.matchedSkills || [];
  const missing = skillIntelligence.careerMatch.missingSkills || [];
  const total = matched.length + missing.length;
  const isInternshipScoped = skillIntelligence.scoredAgainstInternship;

  return {
    key: "technicalSkillsMatch",
    label: "Technical Skills Match",
    weight: DIMENSION_WEIGHTS.technicalSkillsMatch,
    score: clampScore(skillIntelligence.overview.matchPercent),
    explanation:
      total > 0
        ? `${matched.length}/${total} ${isInternshipScoped ? "required/preferred" : "target role"} skills are verifiably present in your resume or profile.`
        : `${skillIntelligence.overview.totalSkills} skills verified across ${skillIntelligence.overview.categoryCount} categories.`,
    suggestions: missing.length ? [`Add verifiable evidence (projects, certifications) for: ${missing.slice(0, 5).join(", ")}.`] : []
  };
}

/**
 * Dimension 6: Certifications (5%) — additive/bonus dimension. Only
 * certifications relevant to the target role's skills count; irrelevant
 * certifications are still listed but don't inflate the score.
 */
function scoreCertifications(parsed, profile, internshipContext, targetRoleKey) {
  const rawCerts = [
    ...((parsed.certifications) || []).map((c) => ({ name: c.name, issuer: c.issuer })),
    ...((profile?.certificationEntries) || []).map((c) => ({ name: c.name, issuer: c.issuer }))
  ];

  const seen = new Set();
  const uniqueCerts = rawCerts.filter((c) => {
    const key = String(c.name || "").toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (uniqueCerts.length === 0) {
    return {
      key: "certifications",
      label: "Certifications",
      weight: DIMENSION_WEIGHTS.certifications,
      score: 0,
      explanation: "No certifications listed. This is a bonus dimension, not a hard requirement.",
      suggestions: ["Add industry-relevant certifications (AWS, Google, NPTEL, Coursera) aligned to your target roles."]
    };
  }

  const isInternshipScoped = Boolean(internshipContext?.requiredSkills?.length);
  const roleProfile = !isInternshipScoped && targetRoleKey ? TARGET_ROLE_PROFILES[targetRoleKey] : null;
  const isScoped = isInternshipScoped || Boolean(roleProfile);
  const targetSkills = isInternshipScoped
    ? normalizeSkillList([...(internshipContext.requiredSkills || []), ...(internshipContext.preferredSkills || [])])
    : roleProfile
      ? normalizeSkillList([...(roleProfile.coreSkills || []), ...(roleProfile.emergingSkills || [])])
      : [];

  const relevantCerts = isScoped
    ? uniqueCerts.filter((c) => {
        const blob = `${c.name || ""} ${c.issuer || ""}`;
        return targetSkills.some((skill) => textMentionsSkill(blob, skill));
      })
    : uniqueCerts;

  const score = isScoped
    ? relevantCerts.length === 0
      ? 10
      : clampScore(50 + Math.min(50, relevantCerts.length * 20))
    : clampScore(40 + Math.min(60, uniqueCerts.length * 18));

  const relevanceLabel = isInternshipScoped ? "this internship's required skills" : roleProfile ? `the ${roleProfile.label} role` : "";
  const explanation = isScoped
    ? relevantCerts.length > 0
      ? `${relevantCerts.length} of ${uniqueCerts.length} certification(s) are relevant to ${relevanceLabel}.`
      : `${uniqueCerts.length} certification(s) found, but none appear relevant to ${relevanceLabel}.`
    : `${uniqueCerts.length} certification(s) found.`;

  return {
    key: "certifications",
    label: "Certifications",
    weight: DIMENSION_WEIGHTS.certifications,
    score,
    explanation,
    suggestions: relevantCerts.length < 2 ? ["Add a certification directly relevant to this role's required skills."] : []
  };
}

/**
 * Dimension 7: Projects & Achievements (5%). Project quality/links score is
 * multiplied by relevance-to-role when a posting's skills are known — a
 * backend project should not inflate a frontend-role score, and vice versa.
 */
function computeProjectScore(parsed, internshipContext, targetRoleKey) {
  const projects = parsed.projects || [];
  if (projects.length === 0) {
    return { score: 15, explanation: "No structured projects detected.", relevantCount: 0, total: 0 };
  }

  const isInternshipScoped = Boolean(internshipContext?.requiredSkills?.length);
  const roleProfile = !isInternshipScoped && targetRoleKey ? TARGET_ROLE_PROFILES[targetRoleKey] : null;
  // A backend project should boost a backend-role score, not a frontend one —
  // apply the same role-relevance weighting used for internship scoring when
  // no internship is selected, using the chosen target role's skill set.
  const targetSkills = isInternshipScoped
    ? new Set(normalizeSkillList([...(internshipContext.requiredSkills || []), ...(internshipContext.preferredSkills || [])]))
    : roleProfile
      ? new Set(normalizeSkillList([...(roleProfile.coreSkills || []), ...(roleProfile.emergingSkills || [])]))
      : null;

  let quality = 0;
  let relevantCount = 0;
  for (const project of projects) {
    let pts = 35;
    const techStack = project.techStack || [];
    if (techStack.length >= 2) pts += 20;
    if (project.description && project.description.length > 80) pts += 15;
    if (project.githubLink) pts += 15;
    if (project.demoLink) pts += 15;
    pts = Math.min(100, pts);

    if (targetSkills) {
      const projectSkills = normalizeSkillList(techStack);
      const overlap = projectSkills.filter((s) => targetSkills.has(s));
      const relevanceRatio = projectSkills.length ? overlap.length / projectSkills.length : 0;
      if (overlap.length > 0) relevantCount += 1;
      // A project unrelated to this role's stack still shows initiative, but
      // shouldn't inflate a role-specific score as much as a relevant one.
      pts *= 0.4 + 0.6 * relevanceRatio;
    }
    quality += pts;
  }

  const avg = quality / projects.length;
  const githubBonus = projects.some((p) => p.githubLink) ? 8 : 0;
  const score = clampScore(avg + githubBonus);

  const explanation = targetSkills
    ? `${projects.length} project(s) evaluated; ${relevantCount} use skills relevant to this internship.`
    : `${projects.length} project(s) evaluated for depth, stack, and links.`;

  return { score, explanation, relevantCount, total: projects.length };
}

function scoreProjectsAchievements(parsed, internshipContext, targetRoleKey) {
  const projectPart = computeProjectScore(parsed, internshipContext, targetRoleKey);
  const achievements = parsed.achievements || [];
  const achievementScore = achievements.length === 0 ? 20 : clampScore(45 + Math.min(55, achievements.length * 14));
  const score = clampScore(projectPart.score * 0.75 + achievementScore * 0.25);

  const suggestions = [];
  if (projectPart.total === 0) {
    suggestions.push("Add 2–3 projects with tech stack, outcomes, and deployment/GitHub links.");
  } else if (internshipContext?.requiredSkills?.length && projectPart.relevantCount === 0) {
    suggestions.push("Add a project that uses this internship's required skills — none of your current projects overlap with it.");
  } else if (projectPart.score < 70) {
    suggestions.push("Add deployment links and quantify project impact.");
  }
  if (achievements.length < 2) suggestions.push("Add hackathons, competitions, scholarships, or academic awards.");

  return {
    key: "projectsAchievements",
    label: "Projects & Achievements",
    weight: DIMENSION_WEIGHTS.projectsAchievements,
    score,
    explanation: `${projectPart.explanation} ${achievements.length ? `${achievements.length} achievement(s) also listed.` : "No achievements listed."}`,
    suggestions: suggestions.slice(0, 3)
  };
}

const SKILL_CATEGORY_RECOMMENDATION_TEMPLATES = {
  "Web Development": (skill) => `Build a small project (e.g. a personal site or CRUD app) using ${skill} and add it to your portfolio.`,
  "Mobile Development": (skill) => `Ship a small mobile app using ${skill} to show hands-on experience beyond coursework.`,
  Databases: (skill) => `Model and query a real dataset with ${skill} in a portfolio project to demonstrate practical usage.`,
  Cloud: (skill) => `Deploy one of your existing projects to ${skill} and document the setup in your README.`,
  DevOps: (skill) => `Set up ${skill} for one of your projects (e.g. an automated build/deploy pipeline) to show production-readiness.`,
  "AI / ML": (skill) => `Complete a guided ${skill} project (e.g. a Kaggle notebook or tutorial) and summarize the results in your portfolio.`,
  "Data Science": (skill) => `Use ${skill} to analyze a real dataset and present the findings as a short case study.`,
  Tools: (skill) => `Get comfortable with ${skill} through daily use on your next project so it shows up naturally in your workflow.`,
  "Programming Languages": (skill) => `Solve a few practical problems or build a small tool in ${skill} to strengthen this on your resume.`
};

function categoryForSkill(skill) {
  const canonical = canonicalSkill(skill);
  if (!canonical) return null;
  // Exact match only (not substring): a loose `includes` check would wrongly
  // classify e.g. "mongodb" under Go, since "mongodb" contains "go".
  for (const [category, tokens] of Object.entries(SKILL_CATEGORY_TAXONOMY)) {
    if (tokens.includes(canonical)) {
      return category;
    }
  }
  return null;
}

function buildSkillRecommendation(skill) {
  const category = categoryForSkill(skill);
  const template = category && SKILL_CATEGORY_RECOMMENDATION_TEMPLATES[category];
  if (template) return template(skill);
  return `Complete a focused project or certification in ${skill} to strengthen this skill on your resume.`;
}

function buildSkillIntelligence(parsed, profile, targetRoleKey = "full_stack_developer", internshipContext = null) {
  const allSkills = normalizeSkillList([
    ...(parsed.skills || []),
    ...(parsed.technicalSkills || []),
    ...(profile?.skills || [])
  ]);

  const categorized = categorizeSkillsV2(allSkills);

  // When scoring against a specific internship posting, keyword relevance /
  // required-skills-matched must reflect that posting's actual requirements
  // instead of a generic static role preset. In generic (role-preset) mode,
  // coreSkills are the true "required" set and emergingSkills are a genuine
  // bonus/"preferred" tier — concatenating them together (as before) made a
  // candidate who has every core fundamental still show as "missing" a
  // required skill for lacking an advanced extra, which breaks the Present /
  // Missing Required / Missing Preferred distinction the skill-gap analysis
  // is supposed to report.
  const hasInternshipSkills = Boolean(internshipContext?.requiredSkills?.length);
  const roleProfile = TARGET_ROLE_PROFILES[targetRoleKey] || TARGET_ROLE_PROFILES.full_stack_developer;
  const required = hasInternshipSkills
    ? normalizeSkillList(internshipContext.requiredSkills)
    : normalizeSkillList(roleProfile.coreSkills);
  const preferred = hasInternshipSkills
    ? normalizeSkillList(internshipContext.preferredSkills || [])
    : normalizeSkillList(roleProfile.emergingSkills || []);
  const match = computeSkillMatch(allSkills, required, preferred);
  const roleLabel = hasInternshipSkills ? internshipContext.roleLabel || "Selected internship" : roleProfile.label;

  const strengths = [];
  if ((categorized["Programming Languages"] || []).length >= 2) strengths.push("Strong programming language foundation.");
  if ((categorized["Web Development"] || []).length >= 2) strengths.push("Solid web development stack.");
  if ((categorized["AI / ML"] || []).length >= 2) strengths.push("AI/ML skills present on profile.");
  if ((parsed.projects || []).length >= 2) strengths.push("Good project diversity for internship screening.");

  const gaps = match.missingRequiredSkills
    .map(displaySkill)
    .filter((skill) => skill && skill.length > 2 && !/^(ci|cd)$/i.test(skill));
  const recommendations = gaps.slice(0, 6).map((skill) => buildSkillRecommendation(skill));

  if (gaps.some((g) => /docker|kubernetes|aws|deployment/i.test(g))) {
    recommendations.push("Add a cloud deployment project to demonstrate production readiness.");
  }
  if (gaps.some((g) => /test|jest|cypress/i.test(g))) {
    recommendations.push("Include automated testing in your next project README.");
  }

  return {
    overview: {
      totalSkills: allSkills.length,
      categoryCount: Object.keys(categorized).length,
      matchPercent: match.requiredMatchPercent
    },
    categorized,
    strengths: strengths.slice(0, 5),
    skillGaps: gaps,
    emergingGaps: hasInternshipSkills
      ? preferred
          .filter((s) => !allSkills.map(canonicalSkill).includes(canonicalSkill(s)))
          .map(displaySkill)
          .slice(0, 8)
      : roleProfile.emergingSkills
          .filter((s) => !allSkills.map(canonicalSkill).includes(canonicalSkill(s)))
          .map(displaySkill)
          .slice(0, 8),
    targetRole: roleLabel,
    targetRoleKey,
    scoredAgainstInternship: hasInternshipSkills,
    careerMatch: {
      matchPercent: match.requiredMatchPercent,
      matchedSkills: match.matchedRequiredSkills.map(displaySkill),
      missingSkills: gaps
    },
    learningRecommendations: [...new Set(recommendations)].slice(0, 6)
  };
}

function buildCompositeScores(dimensions, textAnalysis, quality) {
  const weighted = dimensions.reduce((sum, dim) => sum + dim.score * dim.weight, 0);
  const overall = clampScore(weighted);

  const structure = dimensions.find((d) => d.key === "structure")?.score ?? 0;
  const skills = dimensions.find((d) => d.key === "technicalSkillsMatch")?.score ?? 0;
  const projects = dimensions.find((d) => d.key === "projectsAchievements")?.score ?? 0;
  const keyword = dimensions.find((d) => d.key === "keywordMatch")?.score ?? 0;
  const ats = clampScore(keyword * 0.5 + structure * 0.25 + (textAnalysis?.checks?.completenessPercent ?? 0) * 0.25);

  const technicalStrength = clampScore(skills * 0.6 + keyword * 0.4);
  const projectStrength = projects;
  const skillStrength = skills;
  const profileCompleteness = clampScore(textAnalysis?.checks?.completenessPercent ?? quality.confidence * 100);
  const recruiterReadiness = clampScore(
    overall * 0.35 + projectStrength * 0.25 + technicalStrength * 0.2 + ats * 0.2
  );

  return {
    overall,
    ats,
    technicalStrength,
    projectStrength,
    skillStrength,
    profileCompleteness,
    recruiterReadiness
  };
}

function buildStrengthsWeaknesses(dimensions, skillIntelligence, textAnalysis) {
  const strengths = [...(textAnalysis?.strengths || []), ...skillIntelligence.strengths].slice(0, 8);
  const weaknesses = [];

  for (const dim of dimensions) {
    if (dim.score < 55 && dim.suggestions?.[0]) {
      weaknesses.push(`${dim.label}: ${dim.suggestions[0]}`);
    }
  }

  if (skillIntelligence.skillGaps.length > 0) {
    weaknesses.push(`Missing role skills: ${skillIntelligence.skillGaps.slice(0, 4).join(", ")}.`);
  }

  const improvements = [];
  for (const dim of dimensions) {
    improvements.push(...(dim.suggestions || []));
  }
  improvements.push(...skillIntelligence.learningRecommendations);

  return {
    strengths: [...new Set(strengths)].slice(0, 8),
    weaknesses: [...new Set(weaknesses)].slice(0, 6),
    improvements: [...new Set(improvements)].slice(0, 8)
  };
}

/**
 * Explainable score trace: every dimension that lost points below its max
 * possible contribution is surfaced as a deduction with the concrete reason;
 * every dimension scoring 85+ is surfaced as a bonus. Points are derived
 * directly from weight * score — nothing here is a separately-invented number.
 */
function buildScoreExplanation(dimensions) {
  const deductions = [];
  const bonuses = [];

  for (const dim of dimensions) {
    const maxPoints = Math.round(dim.weight * 100);
    const earnedPoints = Math.round(dim.weight * dim.score);
    const delta = earnedPoints - maxPoints;

    if (delta < 0) {
      deductions.push({
        points: delta,
        dimension: dim.label,
        reason: dim.suggestions?.[0] || dim.explanation
      });
    } else if (dim.score >= 85) {
      bonuses.push({
        points: earnedPoints,
        dimension: dim.label,
        reason: dim.explanation
      });
    }
  }

  deductions.sort((a, b) => a.points - b.points);
  bonuses.sort((a, b) => b.points - a.points);

  return { deductions: deductions.slice(0, 8), bonuses: bonuses.slice(0, 5) };
}

/**
 * Resume Intelligence V2 — structured ATS scoring from parsed resume + text signals.
 */
function computeResumeIntelligenceV2({
  profile = {},
  resumeText = "",
  textAnalysis = null,
  targetRoleKey = "full_stack_developer",
  internshipContext = null
}) {
  const text = String(resumeText || profile?.resume?.text || "").trim();
  const parsed = sanitizeParsed(profile?.resume?.parsed || {});
  const quality = qualityReport(parsed);

  if (!text) {
    return {
      intelligenceVersion: "v2",
      overallScore: 0,
      compositeScores: {
        overall: 0,
        ats: 0,
        technicalStrength: 0,
        projectStrength: 0,
        skillStrength: 0,
        profileCompleteness: 0,
        recruiterReadiness: 0
      },
      dimensionBreakdown: [],
      scoreExplanation: { deductions: [], bonuses: [] },
      skillIntelligence: null,
      strengths: [],
      weaknesses: ["Upload a resume to begin analysis."],
      improvements: ["Upload a PDF, DOCX, or TXT resume."],
      criticalIssues: [],
      quality,
      confidence: 0
    };
  }

  const skillIntelligence = buildSkillIntelligence(parsed, profile, targetRoleKey, internshipContext);

  const dimensions = [
    scoreKeywordMatch(text, profile, internshipContext, targetRoleKey),
    scoreExperience(parsed, profile, textAnalysis, internshipContext),
    scoreEducation(parsed, profile, internshipContext),
    scoreTechnicalSkillsMatch(skillIntelligence),
    scoreCertifications(parsed, profile, internshipContext, targetRoleKey),
    scoreStructure(parsed, text, textAnalysis),
    scoreProjectsAchievements(parsed, internshipContext, targetRoleKey)
  ];

  const compositeScores = buildCompositeScores(dimensions, textAnalysis, quality);
  const narrative = buildStrengthsWeaknesses(dimensions, skillIntelligence, textAnalysis);
  const scoreExplanation = buildScoreExplanation(dimensions);

  let overallScore = compositeScores.overall;
  if (!quality.isReliable) {
    overallScore = clampScore(overallScore * quality.confidence);
  }

  const criticalIssues = [...(textAnalysis?.criticalIssues || [])];
  if (quality.issues.length > 0) {
    criticalIssues.push(...quality.issues.slice(0, 3));
  }

  return {
    intelligenceVersion: "v2",
    overallScore,
    compositeScores: { ...compositeScores, overall: overallScore },
    dimensionBreakdown: dimensions,
    scoreExplanation,
    skillIntelligence,
    strengths: narrative.strengths,
    weaknesses: narrative.weaknesses,
    improvements: narrative.improvements,
    criticalIssues: criticalIssues.slice(0, 5),
    quality,
    confidence: quality.confidence,
    sectionBreakdown: dimensions.map((d) => ({ key: d.key, label: d.label, score: d.score, weight: d.weight }))
  };
}

module.exports = {
  computeResumeIntelligenceV2,
  categorizeSkillsV2,
  buildSkillIntelligence,
  TARGET_ROLE_PROFILES
};
