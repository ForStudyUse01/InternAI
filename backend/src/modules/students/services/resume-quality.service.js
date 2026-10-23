const { normalizeSkillList } = require("../../../shared/utils/skill-normalizer");
const { canonicalSkill, displaySkill } = require("../../../services/resume-structured-parser.service");

function dedupeStrings(items = [], limit = 50) {
  const seen = new Set();
  const out = [];
  for (const raw of items) {
    const value = String(raw || "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
}

function sanitizeSkills(skills = []) {
  return normalizeSkillList(skills)
    .map((skill) => displaySkill(canonicalSkill(skill) || skill))
    .filter(Boolean);
}

function sanitizeParsed(parsed = {}) {
  const safe = parsed && typeof parsed === "object" ? { ...parsed } : {};

  safe.skills = sanitizeSkills(safe.skills || []);
  safe.technicalSkills = sanitizeSkills(safe.technicalSkills || safe.skills);
  safe.softSkills = dedupeStrings(safe.softSkills || [], 20);

  safe.projects = (Array.isArray(safe.projects) ? safe.projects : [])
    .map((p) => ({
      title: String(p?.title || "").trim(),
      description: String(p?.description || "").trim().slice(0, 1200),
      techStack: sanitizeSkills(p?.techStack || []),
      githubLink: String(p?.githubLink || "").trim(),
      demoLink: String(p?.demoLink || "").trim()
    }))
    .filter((p) => p.title || p.description);

  safe.education = (Array.isArray(safe.education) ? safe.education : [])
    .map((e) => ({
      institution: String(e?.institution || "").trim(),
      degree: String(e?.degree || "").trim(),
      branch: String(e?.branch || "").trim(),
      grade: String(e?.grade || "").trim(),
      graduationYear: String(e?.graduationYear || e?.endYear || "").trim()
    }))
    .filter((e) => e.institution || e.degree);

  safe.certifications = (Array.isArray(safe.certifications) ? safe.certifications : [])
    .map((c) => ({
      name: String(c?.name || c?.raw || "").trim(),
      issuer: String(c?.issuer || "").trim(),
      year: String(c?.year || "").trim()
    }))
    .filter((c) => c.name);

  safe.experience = (Array.isArray(safe.experience) ? safe.experience : [])
    .map((x) => ({
      role: String(x?.role || "").trim(),
      company: String(x?.company || "").trim(),
      duration: String(x?.duration || "").trim(),
      description: String(x?.description || "").trim().slice(0, 800)
    }))
    .filter((x) => x.role || x.company || x.description);

  safe.achievements = dedupeStrings(safe.achievements || [], 20);
  safe.links = dedupeStrings(safe.links || [], 15);
  safe.summary = String(safe.summary || "").trim().slice(0, 900);
  safe.email = String(safe.email || "").trim();
  safe.mobile = String(safe.mobile || "").trim();

  return safe;
}

function qualityReport(parsed = {}) {
  const issues = [];
  if (!parsed.email) issues.push("Email not detected in resume.");
  if (!parsed.mobile) issues.push("Phone number not detected.");
  if ((parsed.skills || []).length < 3) issues.push("Fewer than 3 technical skills extracted.");
  if ((parsed.projects || []).length === 0) issues.push("No projects section detected.");
  if ((parsed.education || []).length === 0) issues.push("No education entries detected.");
  if (!parsed.summary || parsed.summary.length < 40) issues.push("Professional summary is missing or too short.");

  const confidence =
    issues.length === 0 ? 0.95 : issues.length <= 2 ? 0.82 : issues.length <= 4 ? 0.68 : 0.55;

  return { issues, confidence, isReliable: confidence >= 0.75 };
}

module.exports = { sanitizeParsed, sanitizeSkills, dedupeStrings, qualityReport };
