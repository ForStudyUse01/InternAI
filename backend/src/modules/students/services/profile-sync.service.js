const { normalizeSkillList, toDisplaySkillList } = require("../../../shared/utils/skill-normalizer");

// Single source of truth for syncing a freshly-parsed resume into a
// student's profile. Product rule (explicit): the LATEST uploaded resume is
// authoritative for every resume-derived field -- uploading a new resume
// must fully REPLACE old resume-derived data, not merge/accumulate it, so
// the profile always represents only the most recently uploaded resume.
//   - scalars (name/email/mobile/address/linkedin/github/portfolio) ->
//     overwritten whenever the parser extracted a valid value (see
//     isValidExtractedValue below); left untouched when the parser found
//     nothing for that field (a resume that omits a phone number must not
//     blank out a phone number the student already had on file). Name is
//     additionally gated on extraction confidence -- see
//     resume-structured-parser.service.js#extractFullName.
//   - flat lists (skills/education/projects/certifications/experience/
//     achievements/languages/links) -> replaced wholesale with the new
//     parse's values. If the new resume has zero entries for a category,
//     the field becomes [] -- that IS correct per spec: the profile must
//     stop showing a previous resume's now-outdated projects/skills/etc.
//   - structured arrays (educationDetails, profileSections.projects/
//     experience, certificationEntries) -> replaced wholesale too, same
//     reasoning.
//
// Deliberately NOT touched by resume sync:
//   - `summary` / `profileSections.professionalSummary`: manual-only field,
//     auto-filled only while empty; never silently overwritten by a resume
//     re-parse (the frontend offers an explicit "replace with resume
//     summary?" confirmation instead, using `parsed.summary`).
//   - `verifiedCertificationEntries` / `verifiedCertificationCount`: a
//     separate, admin-verified credential system populated through its own
//     proof-submission workflow (certification.service.js) -- unrelated to
//     resume text and must never be altered by parsing a resume.
const NAME_CONFIDENCE_THRESHOLD = 0.5;

// Placeholder/junk values a weak extraction can produce that must never
// overwrite real profile data, even though they are technically non-empty
// strings.
const INVALID_VALUE_SET = new Set([
  "unknown", "n/a", "na", "n.a.", "none", "not available", "not provided",
  "tbd", "-", "--",
  "resume", "cv", "curriculum vitae",
  "software engineer", "software developer", "computer engineer",
  "student"
]);

function isValidExtractedValue(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return false;
  return !INVALID_VALUE_SET.has(trimmed.toLowerCase());
}

function normalizeForDedup(value = "") {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

// Dedupes a flat string list case/whitespace-insensitively. The parser
// already dedupes within a single resume's extraction, but this stays as a
// safety net since it's cheap and guards against any future extractor that
// doesn't dedupe internally.
function dedupeStrings(list = []) {
  const result = [];
  const seen = new Set();
  for (const value of list || []) {
    const cleaned = String(value || "").trim();
    if (!cleaned) continue;
    const key = normalizeForDedup(cleaned);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }
  return result;
}

function findLinkByHost(links = [], hostPattern) {
  return (links || []).find((link) => hostPattern.test(String(link))) || "";
}

function findPortfolioUrl(links = []) {
  const candidates = (links || []).filter((link) => {
    const lower = String(link).toLowerCase();
    return !lower.includes("github.com") && !lower.includes("linkedin.com");
  });
  // Only auto-fill when unambiguous -- one clear personal-site link.
  return candidates.length === 1 ? candidates[0] : "";
}

function mergeParsedResumeIntoProfile(profile, parsed = {}) {
  if (!profile || !parsed) return profile;

  // --- Scalars: overwrite whenever the parser found a valid value ---
  const nameConfidence = typeof parsed.fullNameConfidence === "number" ? parsed.fullNameConfidence : 0;
  if (isValidExtractedValue(parsed.fullName) && nameConfidence >= NAME_CONFIDENCE_THRESHOLD) {
    profile.fullName = String(parsed.fullName).trim();
  }
  if (isValidExtractedValue(parsed.email)) profile.email = String(parsed.email).trim();
  if (isValidExtractedValue(parsed.mobile)) profile.mobile = String(parsed.mobile).trim();
  if (isValidExtractedValue(parsed.location)) profile.address = String(parsed.location).trim();

  // --- Professional Summary: unchanged policy -- fill only while empty ---
  const hasManualSummary = Boolean(String(profile.summary || "").trim() || String(profile.profileSections?.professionalSummary || "").trim());
  if (!hasManualSummary && parsed.summary) {
    profile.summary = parsed.summary;
    if (!profile.profileSections) profile.profileSections = {};
    profile.profileSections.professionalSummary = parsed.summary;
  }

  // --- Flat lists: full replace -- latest resume is the only source ---
  profile.skills = toDisplaySkillList(normalizeSkillList(parsed.skills || []));
  profile.softSkills = toDisplaySkillList(normalizeSkillList(parsed.softSkills || []));
  profile.education = dedupeStrings((parsed.education || []).map((item) => item.raw || "").filter(Boolean));
  profile.projects = dedupeStrings((parsed.projects || []).map((item) => item.title || item.description || "").filter(Boolean));
  profile.certifications = dedupeStrings((parsed.certifications || []).map((item) => item.name || item.raw || "").filter(Boolean));
  profile.experience = dedupeStrings((parsed.experience || []).map((item) => item.description || item.role || "").filter(Boolean));
  profile.achievements = dedupeStrings(parsed.achievements || []);
  profile.languages = dedupeStrings(parsed.languages || []);
  profile.links = dedupeStrings(parsed.links || []);

  // --- Structured arrays: full replace -- latest resume is the only source ---
  profile.educationDetails = (parsed.education || [])
    .filter((item) => item.institution || item.degree)
    .map((item) => ({
      college: item.institution || "",
      degree: item.degree || "",
      branch: item.branch || "",
      cgpa: item.grade || "",
      passingYear: item.graduationYear || item.endYear || ""
    }));

  if (!profile.profileSections) profile.profileSections = {};

  profile.profileSections.projects = (parsed.projects || [])
    .filter((item) => item.title)
    .map((item) => ({
      title: item.title || "",
      description: item.description || "",
      techStack: item.techStack || [],
      demoLink: item.demoLink || item.githubLink || ""
    }));

  profile.profileSections.experience = (parsed.experience || [])
    .filter((item) => item.role || item.company)
    .map((item) => ({
      role: item.role || "",
      company: item.company || "",
      duration: item.duration || "",
      description: item.description || ""
    }));

  profile.certificationEntries = (parsed.certifications || [])
    .filter((item) => item.name || item.raw)
    .map((item) => ({
      name: item.name || item.raw || "",
      issuer: item.issuer || "",
      year: item.year || "",
      certificateUrl: "",
      verificationLink: ""
    }));

  // --- Contact links: overwrite when the new resume has a valid link ---
  const linkedIn = findLinkByHost(parsed.links, /linkedin\.com/i);
  if (linkedIn) profile.linkedinUrl = linkedIn;
  const github = findLinkByHost(parsed.links, /github\.com/i);
  if (github) profile.githubUrl = github;
  const portfolio = findPortfolioUrl(parsed.links);
  if (portfolio) profile.portfolioUrl = portfolio;

  return profile;
}

module.exports = { mergeParsedResumeIntoProfile };
