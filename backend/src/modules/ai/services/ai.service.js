const { normalizeSkillList } = require("../../../shared/utils/skill-normalizer");
const { computeSkillMatch } = require("../../../shared/utils/compute-skill-match");
const { evaluateCandidateProjects } = require("../../../services/project-evaluation.service");

function unique(items = []) {
  return [...new Set(items)];
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "to", "for", "of", "in", "on", "at", "by", "with", "as", "is", "are", "was",
  "were", "be", "been", "being", "this", "that", "these", "those", "from", "it", "its", "into", "about", "over",
  "under", "than", "then", "also", "can", "could", "should", "would", "will", "may", "might", "do", "does", "did"
]);

function cleanResumeText(text = "") {
  return String(text)
    .replace(/http\S+\s*/g, " ")
    .replace(/RT|cc/g, " ")
    .replace(/#\S+/g, " ")
    .replace(/@\S+/g, " ")
    .replace(/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g, " ")
    .replace(/[^\x00-\x7F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function preprocessText(text = "") {
  const cleaned = cleanResumeText(text);
  return cleaned
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token && /^[a-z]+$/.test(token) && !STOP_WORDS.has(token));
}

function termFrequency(tokens = []) {
  const map = new Map();
  for (const token of tokens) {
    map.set(token, (map.get(token) || 0) + 1);
  }
  return map;
}

function cosineSimilarity(tokensA = [], tokensB = []) {
  const tfA = termFrequency(tokensA);
  const tfB = termFrequency(tokensB);

  const allTerms = new Set([...tfA.keys(), ...tfB.keys()]);
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const term of allTerms) {
    const a = tfA.get(term) || 0;
    const b = tfB.get(term) || 0;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * JS adaptation of sieve.ai `find_score` logic:
 * cosine similarity between processed resume and JD + custom keywords.
 */
function findScoreLikeSieve(jobDescription = "", resumeText = "", customKeywords = []) {
  const jdText = `${jobDescription || ""} ${customKeywords.join(" ")}`.trim();
  const resumeTokens = preprocessText(resumeText);
  const jdTokens = preprocessText(jdText);
  return Math.round(cosineSimilarity(resumeTokens, jdTokens) * 10000) / 100;
}

function parseResumeText(text = "") {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  const skillKeywords = ["javascript", "typescript", "node", "react", "python", "sql", "mongodb", "machine learning", "data analysis", "excel"];
  const foundSkills = skillKeywords.filter((skill) => text.toLowerCase().includes(skill));

  const education = lines.filter((line) => /b\.tech|btech|m\.tech|mtech|bca|mca|degree|university|college/i.test(line));
  const projects = lines.filter((line) => /project|built|developed|implemented/i.test(line));
  const certifications = lines.filter((line) => /certified|certificate|coursera|udemy|nptel/i.test(line));

  // Replace this deterministic parser with Gemini/OpenAI extraction for richer structured resume parsing.
  return {
    skills: unique(foundSkills),
    education: unique(education).slice(0, 5),
    projects: unique(projects).slice(0, 6),
    certifications: unique(certifications).slice(0, 6)
  };
}

function calculateResumeScore(profile) {
  const skills = profile.skills || [];
  const projects = profile.projects || [];
  const certifications = profile.certifications || [];
  const education = profile.education || [];
  const resumeText = profile.resume?.text || "";

  const benchmarkJobDescription = [
    "software engineering internship project experience problem solving communication teamwork",
    ...skills,
    ...projects,
    ...certifications,
    ...education
  ].join(" ");

  // Inspired by sieve.ai scoring approach.
  const similarityScore = findScoreLikeSieve(benchmarkJobDescription, resumeText, skills);

  const skillsStrength = Math.min(skills.length * 8, 100);
  const projectsStrength = Math.min(projects.length * 15, 100);
  const certStrength = Math.min(certifications.length * 12, 100);
  const educationStrength = education.length > 0 ? 100 : 0;
  const structureStrength = resumeText.length > 300 ? 100 : resumeText.length > 100 ? 60 : 20;

  const weighted =
    similarityScore * 0.5 +
    skillsStrength * 0.15 +
    projectsStrength * 0.15 +
    certStrength * 0.1 +
    educationStrength * 0.05 +
    structureStrength * 0.05;

  return Math.max(0, Math.min(100, Math.round(weighted)));
}

function getSkillGap(internSkills = [], requiredSkills = []) {
  const result = computeSkillMatch(internSkills, requiredSkills, []);
  return {
    matched: result.matchedRequiredSkills,
    missing: result.missingRequiredSkills,
    matchPercent: result.requiredMatchPercent
  };
}

function getParsedResumeSkills(internProfile = {}) {
  const parsedSkills = internProfile?.resume?.parsed?.skills;
  return normalizeSkillList(Array.isArray(parsedSkills) ? parsedSkills : []);
}

/**
 * Deterministic recommendation model (single source of truth in computeSkillMatch):
 * - requiredMatchPercent = matchedRequired / totalRequired * 100
 * - preferredMatchPercent = matchedPreferred / totalPreferred * 100 (or null)
 * - overallScore = round(required * 0.8 + preferred * 0.2), else required
 */
function buildInternshipRecommendation(internSkills = [], internship = {}) {
  const requiredSkills = internship?.skillsRequired || [];
  const preferredSkills = internship?.prioritySkills || [];
  const match = computeSkillMatch(internSkills, requiredSkills, preferredSkills);

  return {
    internship,
    requiredSkillMatchPercent: match.requiredMatchPercent,
    preferredSkillMatchPercent: match.preferredMatchPercent,
    overallRecommendationScore: match.overallScore,
    recommendationScore: match.overallScore,
    skillMatchPercent: match.requiredMatchPercent,
    matchedRequiredSkills: match.matchedRequiredSkills,
    missingRequiredSkills: match.missingRequiredSkills,
    matchedPreferredSkills: match.matchedPreferredSkills,
    missingPreferredSkills: match.missingPreferredSkills,
    skillGap: {
      matched: match.matchedRequiredSkills,
      missing: match.missingRequiredSkills,
      matchPercent: match.requiredMatchPercent
    }
  };
}

function recommendInternships(internProfile, internships = [], options = {}) {
  const internSkills = normalizeSkillList(options.internSkills || getParsedResumeSkills(internProfile));
  if (internSkills.length === 0) {
    return [];
  }

  const ranked = internships.map((internship) => {
    const recommendation = buildInternshipRecommendation(internSkills, internship);

    if (process.env.RECOMMENDATION_DEBUG === "true") {
      const debugMatch = computeSkillMatch(internSkills, internship?.skillsRequired || [], internship?.prioritySkills || []);
      // eslint-disable-next-line no-console
      console.log(
        "[recommendation-debug]",
        JSON.stringify({
          internshipId: internship?._id,
          internshipRole: internship?.role || "",
          normalizedInternSkills: debugMatch.normalizedInternSkills,
          normalizedRequiredSkills: debugMatch.normalizedRequiredSkills,
          matchedRequiredSkills: debugMatch.matchedRequiredSkills,
          missingRequiredSkills: debugMatch.missingRequiredSkills,
          requiredMatch: debugMatch.requiredMatchPercent,
          preferredMatch: debugMatch.preferredMatchPercent,
          overallScore: debugMatch.overallScore
        })
      );
    }

    return recommendation;
  });

  return ranked.sort((a, b) => {
    if (b.overallRecommendationScore !== a.overallRecommendationScore) {
      return b.overallRecommendationScore - a.overallRecommendationScore;
    }

    if (b.requiredSkillMatchPercent !== a.requiredSkillMatchPercent) {
      return b.requiredSkillMatchPercent - a.requiredSkillMatchPercent;
    }

    return String(a.internship?.role || "").localeCompare(String(b.internship?.role || ""));
  });
}

function rankApplicantsForInternship(internship, applicantProfiles = []) {
  return applicantProfiles
    .map((profile) => {
      const resumeScore = calculateResumeScore(profile);
      const internSkills = normalizeSkillList(profile?.resume?.parsed?.skills || profile?.skills || []);
      const match = computeSkillMatch(internSkills, internship.skillsRequired || [], internship.prioritySkills || []);
      const portfolio = evaluateCandidateProjects(profile, internship.skillsRequired || [], internship.prioritySkills || []);
      const projectScore = portfolio.roleRelevanceScore ?? (portfolio.sufficient ? portfolio.aggregateScores.qualityScore : 0);
      const finalScore = Math.round(
        match.requiredMatchPercent * 0.55 + resumeScore * 0.2 + projectScore * 0.25
      );

      return {
        profile,
        skillGap: {
          matched: match.matchedRequiredSkills,
          missing: match.missingRequiredSkills,
          matchPercent: match.requiredMatchPercent
        },
        projectEvaluation: portfolio,
        score: Math.min(100, finalScore)
      };
    })
    .sort((a, b) => b.score - a.score);
}

module.exports = {
  parseResumeText,
  calculateResumeScore,
  getSkillGap,
  recommendInternships,
  buildInternshipRecommendation,
  rankApplicantsForInternship
};
