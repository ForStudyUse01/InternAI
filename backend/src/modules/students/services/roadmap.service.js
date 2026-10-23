const { ROLE_SKILL_TEMPLATES } = require("../../../data/role-skill-templates");
const { normalizeSkillList } = require("../../../shared/utils/skill-normalizer");

function normalizeRoleKey(role = "") {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function buildRoadmap({ targetRole, currentSkills = [] }) {
  const roleKey = normalizeRoleKey(targetRole);
  const template = ROLE_SKILL_TEMPLATES[roleKey] || ROLE_SKILL_TEMPLATES.full_stack_developer;
  const normalizedCurrent = normalizeSkillList(currentSkills);
  const normalizedRequired = normalizeSkillList(template.requiredSkills);
  const missingSkills = normalizedRequired.filter((skill) => !normalizedCurrent.includes(skill));

  const roadmap = missingSkills.map((skill, idx) => {
    const priority = idx < 3 ? "high" : idx < 6 ? "medium" : "low";
    const phase = idx < 3 ? "beginner" : idx < 7 ? "intermediate" : "advanced";

    const suggestions =
      phase === "beginner"
        ? [
            `Learn ${skill} fundamentals through a focused tutorial or crash course`,
            `Build a small practice project applying ${skill} in isolation`,
            `Add ${skill} to your resume once you can explain it in an interview`
          ]
        : phase === "intermediate"
          ? [
              `Build a real project that combines ${skill} with skills you already have`,
              `Complete a structured course or certification in ${skill}`,
              `Showcase ${skill} on your portfolio with a working demo or repo link`
            ]
          : [
              `Use ${skill} in a production-style project with deployment or CI`,
              `Contribute to an open-source project or team task using ${skill}`,
              `Highlight measurable impact from using ${skill} in your resume bullets`
            ];

    return { skill, priority, phase, suggestions };
  });

  return {
    targetRole: template.role,
    currentSkills: normalizedCurrent,
    requiredSkills: normalizedRequired,
    missingSkills,
    matchPercent: normalizedRequired.length ? Math.round(((normalizedRequired.length - missingSkills.length) / normalizedRequired.length) * 100) : 0,
    roadmap
  };
}

module.exports = { buildRoadmap };
