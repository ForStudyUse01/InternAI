const { computeApplicationRelevance } = require("../../applications/services/application-relevance.service");
const { computeResumeIntelligenceV2 } = require("./resume-intelligence-v2.service");
const { routeCompletion } = require("../../../shared/infrastructure/ai/ai-provider.router");

function buildRuleBasedBullets(profile, internship) {
  const relevance = computeApplicationRelevance(profile || {}, internship || {});
  const intelligence = computeResumeIntelligenceV2({
    profile,
    resumeText: profile?.resume?.text || ""
  });

  const bullets = [];

  if (relevance.matchedRequiredSkills.length > 0) {
    bullets.push(
      `Your skills in ${relevance.matchedRequiredSkills.slice(0, 4).join(", ")} line up well with what this role is looking for.`
    );
  }

  const topStrength = (intelligence.strengths || [])[0];
  if (topStrength) bullets.push(topStrength);

  if (relevance.requiredSkillMatchPercent >= 70) {
    bullets.push(
      `You match ${relevance.requiredSkillMatchPercent}% of the required skills for this internship — a strong starting point.`
    );
  } else if (relevance.requiredSkillMatchPercent > 0) {
    bullets.push(
      `You already cover ${relevance.requiredSkillMatchPercent}% of the required skills — keep building on this foundation.`
    );
  }

  const projectCount = (profile?.resume?.parsed?.projects || profile?.projects || []).length;
  if (projectCount > 0) {
    bullets.push("Your project experience gives you concrete examples to highlight in your application.");
  }

  if (relevance.missingRequiredSkills.length > 0) {
    bullets.push(
      `Consider mentioning any exposure to ${relevance.missingRequiredSkills.slice(0, 3).join(", ")} — coursework or personal projects count too.`
    );
  }

  const deduped = [...new Set(bullets.filter(Boolean))];
  if (deduped.length === 0) {
    deduped.push("Complete your profile and upload a resume to unlock personalized insights for this internship.");
  }

  return deduped.slice(0, 5);
}

async function polishBullets(bullets, { internshipId, userId } = {}) {
  const result = await routeCompletion({
    operation: "application-insight",
    payload: { internshipId: String(internshipId || ""), bulletCount: bullets.length },
    userId,
    systemPrompt:
      "You are a supportive career coach helping a student see why they are a good fit for an internship. " +
      "Rephrase the given bullet points to sound warm, concise, and encouraging. " +
      "Keep exactly the same number of bullets and preserve every fact, number, and skill name — do not add new claims, " +
      "scores, or any discouraging/rejecting language. Return strict JSON: an array of strings, no markdown, no extra keys.",
    userPrompt: JSON.stringify(bullets),
    skipRateLimit: true,
    localFallback: async () => ({ provider: "local-heuristics", content: JSON.stringify(bullets) })
  });

  try {
    const parsed = JSON.parse(result.content);
    const isValid =
      Array.isArray(parsed) && parsed.length === bullets.length && parsed.every((item) => typeof item === "string" && item.trim());
    if (isValid) {
      return { bullets: parsed, source: result.provider || "local-heuristics" };
    }
  } catch {
    // Fall through to the original rule-based bullets below.
  }

  return { bullets, source: "local-heuristics" };
}

async function buildApplicationInsight({ profile, internship, userId }) {
  const bullets = buildRuleBasedBullets(profile, internship);
  return polishBullets(bullets, { internshipId: internship?._id, userId });
}

module.exports = { buildApplicationInsight };
