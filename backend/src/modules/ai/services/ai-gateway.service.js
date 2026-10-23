const { routeCompletion } = require("../../../shared/infrastructure/ai/ai-provider.router");
const { hashPayload, remember } = require("../../../shared/infrastructure/cache/cache.service");
const { PLATFORM_CONFIG } = require("../../../shared/config/platform.config");
const {
  parseResumeText,
  calculateResumeScore,
  getSkillGap,
  recommendInternships,
  rankApplicantsForInternship
} = require("../../../services/ai.service");

async function withDeterministicCache(operation, payload, userId, factory, ttlSeconds = 1800) {
  const key = `ai:deterministic:${operation}:${userId || "anon"}:${hashPayload(payload)}`;
  const result = await remember(key, ttlSeconds, factory);
  return {
    payload: result.value,
    cacheHit: result.cacheHit
  };
}

async function parseResumeEnhanced({ text, userId }) {
  const localParsed = parseResumeText(text);
  const llm = await routeCompletion({
    operation: "parse-resume",
    payload: { text: String(text || "").slice(0, 4000) },
    userId,
    systemPrompt:
      "Extract structured resume data. Return strict JSON with exactly these keys: " +
      'skills (array of strings), education (array of strings), projects (array of strings), ' +
      "certifications (array of strings). Use [] for any section not present in the text. " +
      "No prose, no markdown, no extra keys.",
    userPrompt: text,
    skipRateLimit: true,
    localFallback: async () => ({
      provider: "local-heuristics",
      content: JSON.stringify(localParsed)
    })
  });

  try {
    const parsed = JSON.parse(llm.content);
    return { parsed, meta: { provider: llm.provider, cacheHit: llm.cacheHit } };
  } catch {
    return { parsed: localParsed, meta: { provider: llm.provider || "local-heuristics", cacheHit: llm.cacheHit } };
  }
}

async function computeResumeScoreCached(profile, userId) {
  const cached = await withDeterministicCache(
    "resume-score",
    { profileId: String(profile._id) },
    userId,
    async () => calculateResumeScore(profile)
  );
  return { ...cached.payload, cacheHit: cached.cacheHit };
}

async function computeSkillGapCached(internSkills, internshipSkills, userId) {
  const cached = await withDeterministicCache(
    "skill-gap",
    { internSkills, internshipSkills },
    userId,
    async () => getSkillGap(internSkills, internshipSkills)
  );
  return { ...cached.payload, cacheHit: cached.cacheHit };
}

async function recommendInternshipsCached(profile, internships, options, userId) {
  const cached = await withDeterministicCache(
    "recommendations",
    { profileId: String(profile._id), count: internships.length },
    userId,
    async () => recommendInternships(profile, internships, options)
  );
  return cached.payload;
}

async function rankApplicantsCached(internship, applicants, userId) {
  const cached = await withDeterministicCache(
    "match-candidates",
    { internshipId: String(internship._id), applicantCount: applicants.length },
    userId,
    async () => rankApplicantsForInternship(internship, applicants)
  );
  return cached.payload;
}

module.exports = {
  parseResumeEnhanced,
  computeResumeScoreCached,
  computeSkillGapCached,
  recommendInternshipsCached,
  rankApplicantsCached,
  PLATFORM_CONFIG
};
