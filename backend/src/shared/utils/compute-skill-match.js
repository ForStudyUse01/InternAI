const { normalizeSkillList, toDisplaySkillList } = require("./skill-normalizer");

function computePercent(matchedCount, totalCount) {
  if (!totalCount) return 0;
  return Math.round((matchedCount / totalCount) * 100);
}

/**
 * Single source of truth for recommendation skill matching.
 */
function computeSkillMatch(internSkills = [], requiredSkills = [], preferredSkills = []) {
  const normalizedInternSkills = normalizeSkillList(internSkills);
  const normalizedRequiredSkills = normalizeSkillList(requiredSkills);
  const normalizedPreferredSkills = normalizeSkillList(preferredSkills);

  const internSet = new Set(normalizedInternSkills);

  const matchedRequiredCanonical = normalizedRequiredSkills.filter((skill) => internSet.has(skill));
  const missingRequiredCanonical = normalizedRequiredSkills.filter((skill) => !internSet.has(skill));

  const matchedPreferredCanonical = normalizedPreferredSkills.filter((skill) => internSet.has(skill));
  const missingPreferredCanonical = normalizedPreferredSkills.filter((skill) => !internSet.has(skill));

  // Vacuous truth: an internship listing zero required skills has nothing to
  // fail against, so it must not be scored as a 0% match.
  let requiredMatchPercent = normalizedRequiredSkills.length === 0
    ? 100
    : computePercent(matchedRequiredCanonical.length, normalizedRequiredSkills.length);
  const preferredMatchPercent = normalizedPreferredSkills.length
    ? computePercent(matchedPreferredCanonical.length, normalizedPreferredSkills.length)
    : null;

  // Guardrail: if no required skills are missing, required match must be 100.
  if (normalizedRequiredSkills.length > 0 && missingRequiredCanonical.length === 0) {
    requiredMatchPercent = 100;
  }

  const overallScore = preferredMatchPercent === null
    ? requiredMatchPercent
    : Math.round(requiredMatchPercent * 0.8 + preferredMatchPercent * 0.2);

  return {
    normalizedInternSkills,
    normalizedRequiredSkills,
    normalizedPreferredSkills,
    matchedRequiredCanonical,
    missingRequiredCanonical,
    matchedPreferredCanonical,
    missingPreferredCanonical,
    matchedRequiredSkills: toDisplaySkillList(matchedRequiredCanonical),
    missingRequiredSkills: toDisplaySkillList(missingRequiredCanonical),
    matchedPreferredSkills: toDisplaySkillList(matchedPreferredCanonical),
    missingPreferredSkills: toDisplaySkillList(missingPreferredCanonical),
    requiredMatchPercent,
    preferredMatchPercent,
    overallScore
  };
}

module.exports = { computeSkillMatch };
