const crypto = require("crypto");
const InternPortfolio = require("../../../models/InternPortfolio");
const InternProfile = require("../../../models/InternProfile");
const { PORTFOLIO_THEMES } = require("../../../constants/portfolio-themes");
const { routeCompletion } = require("../../../shared/infrastructure/ai/ai-provider.router");
const { PLATFORM_CONFIG } = require("../../../shared/config/platform.config");
const { isEnabled } = require("../../../shared/config/feature-flags");
const AppError = require("../../../shared/utils/AppError");
const { normalizeSkillList, toDisplaySkillList } = require("../../../shared/utils/skill-normalizer");
const { resolvePagination } = require("../../../shared/utils/pagination");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function ensureUniqueSlug(base, excludeId = null) {
  let slug = base || "intern";
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await InternPortfolio.exists(query);
    if (!exists) return candidate;
    suffix += 1;
  }
}

function uniqueStrings(values) {
  const seen = new Set();
  const out = [];
  for (const raw of values) {
    const value = String(raw || "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function mergeProjects(profile, parsed) {
  const structured = Array.isArray(profile.profileSections?.projects) ? profile.profileSections.projects : [];
  const parsedProjects = Array.isArray(parsed?.projects) ? parsed.projects : [];
  const legacy = Array.isArray(profile.projects) ? profile.projects : [];

  const fromStructured = structured.map((item) => ({
    title: item.title || "Untitled project",
    description: item.description || "",
    techStack: Array.isArray(item.techStack) ? item.techStack : [],
    demoLink: item.demoLink || "",
    githubLink: ""
  }));

  const fromParsed = parsedProjects.map((item) => ({
    title: item.title || "Untitled project",
    description: item.description || "",
    techStack: Array.isArray(item.techStack) ? item.techStack : [],
    demoLink: item.demoLink || "",
    githubLink: item.githubLink || ""
  }));

  const fromLegacy = legacy.map((line) => ({
    title: String(line).slice(0, 80),
    description: String(line),
    techStack: [],
    demoLink: "",
    githubLink: ""
  }));

  const merged = [...fromStructured, ...fromParsed, ...fromLegacy];
  const seen = new Set();
  return merged.filter((item) => {
    const key = `${item.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
}

function mergeEducation(profile, parsed) {
  const structured = Array.isArray(profile.profileSections?.education) ? profile.profileSections.education : [];
  const parsedEdu = Array.isArray(parsed?.education) ? parsed.education : [];
  const details = Array.isArray(profile.educationDetails) ? profile.educationDetails : [];
  const legacy = Array.isArray(profile.education) ? profile.education : [];

  const rows = [
    ...structured.map((e) => ({
      degree: e.degree || "",
      institution: e.institution || "",
      startYear: e.startYear || "",
      endYear: e.endYear || "",
      grade: e.grade || ""
    })),
    ...parsedEdu.map((e) => ({
      degree: e.degree || "",
      institution: e.institution || "",
      startYear: e.startYear || "",
      endYear: e.endYear || e.graduationYear || "",
      grade: e.grade || ""
    })),
    ...details.map((e) => ({
      degree: e.degree || "",
      institution: e.college || "",
      startYear: "",
      endYear: e.passingYear || "",
      grade: e.cgpa || ""
    })),
    ...legacy.map((line) => ({ degree: String(line), institution: "", startYear: "", endYear: "", grade: "" }))
  ];

  const seen = new Set();
  return rows.filter((row) => {
    const key = `${row.degree}|${row.institution}`.toLowerCase();
    if (!row.degree && !row.institution) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function mergeExperience(profile, parsed) {
  const structured = Array.isArray(profile.profileSections?.experience) ? profile.profileSections.experience : [];
  const parsedExp = Array.isArray(parsed?.experience) ? parsed.experience : [];
  const legacy = Array.isArray(profile.experience) ? profile.experience : [];

  const rows = [
    ...structured.map((e) => ({
      role: e.role || "",
      company: e.company || "",
      duration: e.duration || "",
      description: e.description || ""
    })),
    ...parsedExp.map((e) => ({
      role: e.role || e.title || "",
      company: e.company || "",
      duration: e.duration || "",
      description: e.description || ""
    })),
    ...legacy.map((line) => ({ role: String(line), company: "", duration: "", description: "" }))
  ];

  const seen = new Set();
  return rows.filter((row) => {
    const key = `${row.role}|${row.company}`.toLowerCase();
    if (!row.role && !row.company) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

// Portfolio certifications must show ONLY admin-verified credentials, never
// self-reported/resume-parsed/manual ones -- a recruiter viewing the public
// portfolio should never see a claim the platform hasn't confirmed. This
// reads the same verifiedCertificationEntries mirror that
// certification.service.js keeps in sync whenever an admin approves a
// certification, so it can never drift ahead of the actual review decision.
function mergeCertifications(profile) {
  const verified = Array.isArray(profile.verifiedCertificationEntries) ? profile.verifiedCertificationEntries : [];

  const seen = new Set();
  return verified
    .map((c) => ({ name: c.name || "", issuer: c.issuer || "", year: c.year || "", verified: true }))
    .filter((row) => {
      const key = row.name.toLowerCase();
      if (!row.name || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function collectSourceData(profileDoc) {
  const profile = profileDoc.toObject ? profileDoc.toObject() : profileDoc;
  const parsed = profile.resume?.parsed || {};
  const skillDetails = Array.isArray(profile.skillDetails) ? profile.skillDetails : [];
  const parsedSkills = normalizeSkillList([
    ...(Array.isArray(profile.skills) ? profile.skills : []),
    ...(Array.isArray(profile.profileSections?.skills) ? profile.profileSections.skills : []),
    ...(Array.isArray(parsed.skills) ? parsed.skills : []),
    ...(Array.isArray(parsed.technicalSkills) ? parsed.technicalSkills : [])
  ]);

  const skills = skillDetails.length
    ? skillDetails.map((s) => ({
        name: s.name || "",
        level: s.level || "",
        category: s.category || "technical"
      }))
    : toDisplaySkillList(parsedSkills).map((name) => ({ name, level: "", category: "technical" }));

  const achievements = uniqueStrings([
    ...(Array.isArray(profile.achievements) ? profile.achievements : []),
    ...(Array.isArray(profile.profileSections?.achievements) ? profile.profileSections.achievements : []),
    ...(Array.isArray(parsed.achievements) ? parsed.achievements : [])
  ]);

  const socialLinksRaw = [];
  if (profile.linkedinUrl) socialLinksRaw.push({ platform: "LinkedIn", url: profile.linkedinUrl });
  if (profile.githubUrl) socialLinksRaw.push({ platform: "GitHub", url: profile.githubUrl });
  if (profile.portfolioUrl) socialLinksRaw.push({ platform: "Portfolio", url: profile.portfolioUrl });
  for (const link of profile.profileSections?.socialLinks || []) {
    if (link?.url) socialLinksRaw.push({ platform: link.platform || "Link", url: link.url });
  }
  for (const link of parsed.links || []) {
    if (typeof link === "string") socialLinksRaw.push({ platform: "Link", url: link });
  }
  const socialSeen = new Set();
  const socialLinks = socialLinksRaw.filter((item) => {
    const url = String(item.url || "").trim();
    if (!url || socialSeen.has(url)) return false;
    socialSeen.add(url);
    return true;
  });

  return {
    fullName: profile.fullName || parsed.fullName || "Intern",
    email: profile.email || parsed.email || "",
    mobile: profile.mobile || parsed.mobile || "",
    location: profile.profileSections?.personalInformation?.location || profile.address || parsed.location || "",
    headline:
      profile.profileSections?.personalInformation?.headline ||
      profile.summary?.slice(0, 100) ||
      parsed.summary?.slice(0, 100) ||
      "Aspiring professional ready to contribute.",
    about:
      profile.profileSections?.professionalSummary ||
      profile.summary ||
      profile.bio ||
      parsed.summary ||
      "",
    skills,
    projects: mergeProjects(profile, parsed),
    certifications: mergeCertifications(profile),
    experience: mergeExperience(profile, parsed),
    education: mergeEducation(profile, parsed),
    achievements,
    socialLinks,
    resumeFilePath: profile.resume?.filePath || "",
    resumeScore: profile.resume?.score || 0
  };
}

function hashSource(source) {
  return crypto.createHash("sha256").update(JSON.stringify(source)).digest("hex").slice(0, 24);
}

async function enhanceWithAi(source, userId, sourceHash) {
  if (!PLATFORM_CONFIG.ai?.enabled || !isEnabled("ENABLE_AI")) {
    return { content: buildPortfolioContent(source), aiGenerated: false };
  }

  try {
    const llm = await routeCompletion({
      operation: "generate-portfolio",
      payload: { name: source.fullName, sourceHash },
      userId,
      systemPrompt:
        "You write concise professional portfolio copy for students. Return strict JSON with keys: about (2-3 sentences), projectDescriptions (array matching project count, each 1 sentence).",
      userPrompt: JSON.stringify({
        name: source.fullName,
        headline: source.headline,
        skills: source.skills.slice(0, 12).map((s) => s.name),
        projects: source.projects.map((p) => p.title),
        experience: source.experience.map((e) => e.role),
        education: source.education.map((e) => e.degree)
      }),
      skipRateLimit: true,
      localFallback: async () => ({
        provider: "local-heuristics",
        content: JSON.stringify({
          about: source.about || `${source.fullName} is a motivated candidate building real-world experience.`,
          projectDescriptions: source.projects.map((p) => p.description || `Hands-on work on ${p.title}.`)
        })
      })
    });

    const parsed = JSON.parse(llm.content);
    const content = buildPortfolioContent(source);
    if (parsed.about) content.about = String(parsed.about).trim();
    if (Array.isArray(parsed.projectDescriptions)) {
      content.projects = content.projects.map((project, index) => ({
        ...project,
        description: String(parsed.projectDescriptions[index] || project.description || "").trim() || project.description
      }));
    }
    return { content, aiGenerated: true };
  } catch {
    return { content: buildPortfolioContent(source), aiGenerated: false };
  }
}

function buildPortfolioContent(source) {
  const initials = source.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return {
    hero: {
      name: source.fullName,
      headline: source.headline,
      tagline: source.resumeScore > 0 ? `Resume score ${source.resumeScore}/100` : "Open to internship opportunities",
      initials: initials || "IN"
    },
    about: source.about || `${source.fullName} is building skills across modern technologies and seeking impactful internship roles.`,
    skills: source.skills,
    projects: source.projects,
    certifications: source.certifications,
    experience: source.experience,
    education: source.education,
    achievements: source.achievements,
    contact: {
      email: source.email,
      mobile: source.mobile,
      location: source.location
    },
    socialLinks: source.socialLinks,
    resumeFilePath: source.resumeFilePath
  };
}

function toPortfolioPayload(doc, { includeContent = true } = {}) {
  const row = doc.toObject ? doc.toObject() : doc;
  const payload = {
    _id: row._id,
    slug: row.slug,
    status: row.status,
    theme: row.theme,
    autoSync: row.autoSync,
    lastGeneratedAt: row.lastGeneratedAt,
    publishedAt: row.publishedAt,
    metadata: row.metadata,
    portfolioUrl: `/portfolio/${row.slug}`,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
  if (includeContent) payload.content = row.content;
  return payload;
}

async function getOrCreatePortfolioRecord(profile, userId) {
  let portfolio = await InternPortfolio.findOne({ user: userId });
  if (portfolio) return portfolio;

  const baseSlug = slugify(profile.fullName || profile.email?.split("@")[0] || "intern");
  const slug = await ensureUniqueSlug(baseSlug);

  portfolio = await InternPortfolio.create({
    user: userId,
    internProfile: profile._id,
    slug,
    status: "draft",
    theme: "midnight",
    autoSync: true
  });
  return portfolio;
}

async function generatePortfolio(userId, { theme, useAi = true } = {}) {
  const profile = await InternProfile.findOne({ user: userId });
  if (!profile) throw new AppError("Intern profile not found", 404);

  const source = collectSourceData(profile);
  const sourceHash = hashSource(source);
  const portfolio = await getOrCreatePortfolioRecord(profile, userId);

  const { content, aiGenerated } = useAi
    ? await enhanceWithAi(source, userId, sourceHash)
    : { content: buildPortfolioContent(source), aiGenerated: false };

  if (theme && PORTFOLIO_THEMES.includes(theme)) portfolio.theme = theme;
  portfolio.content = content;
  portfolio.lastGeneratedAt = new Date();
  portfolio.metadata = {
    ...(portfolio.metadata || {}),
    aiGenerated,
    sourceHash,
    needsRegeneration: false,
    viewCount: portfolio.metadata?.viewCount || 0,
    lastViewedAt: portfolio.metadata?.lastViewedAt || null
  };

  if (portfolio.status === "published" && !portfolio.publishedAt) {
    portfolio.publishedAt = new Date();
  }

  await portfolio.save();

  profile.portfolioUrl = profile.portfolioUrl || `/portfolio/${portfolio.slug}`;
  await profile.save();

  return portfolio;
}

async function syncPortfolioOnProfileChange(userId) {
  const portfolio = await InternPortfolio.findOne({ user: userId, status: "published", autoSync: true }).lean();
  if (!portfolio) return null;

  const profile = await InternProfile.findOne({ user: userId });
  if (!profile) return null;

  const source = collectSourceData(profile);
  const sourceHash = hashSource(source);
  if (portfolio.metadata?.sourceHash === sourceHash) return portfolio;

  return generatePortfolio(userId, { theme: portfolio.theme, useAi: false });
}

// The rest of a portfolio's content (bio, projects, AI copy) is intentionally
// cached and only refreshed via generatePortfolio/autoSync — but the
// student's own name must never lag behind their profile, regardless of
// publish/autoSync state, so it's overlaid from the live InternProfile at
// read time instead of trusting the generated-at-some-point-in-time snapshot.
function applyLiveHeroName(payload, fullName) {
  if (fullName && payload?.content?.hero) {
    payload.content.hero.name = fullName;
  }
  return payload;
}

async function getPortfolioForUser(userId) {
  const portfolio = await InternPortfolio.findOne({ user: userId }).lean();
  if (!portfolio) return null;
  const payload = toPortfolioPayload(portfolio);
  const profile = await InternProfile.findOne({ user: userId }).select("fullName").lean();
  return applyLiveHeroName(payload, profile?.fullName);
}

async function updatePortfolioSettings(userId, updates) {
  const portfolio = await InternPortfolio.findOne({ user: userId });
  if (!portfolio) throw new AppError("Portfolio not found. Generate your portfolio first.", 404);

  if (updates.theme && PORTFOLIO_THEMES.includes(updates.theme)) portfolio.theme = updates.theme;
  if (typeof updates.autoSync === "boolean") portfolio.autoSync = updates.autoSync;
  if (updates.status) {
    if (!["draft", "published", "disabled"].includes(updates.status)) {
      throw new AppError("Invalid portfolio status", 400);
    }
    if (updates.status === "published" && !portfolio.content) {
      throw new AppError("Generate portfolio content before publishing", 400);
    }
    portfolio.status = updates.status;
    if (updates.status === "published") portfolio.publishedAt = portfolio.publishedAt || new Date();
  }

  await portfolio.save();
  const payload = toPortfolioPayload(portfolio);
  const profile = await InternProfile.findOne({ user: userId }).select("fullName").lean();
  return applyLiveHeroName(payload, profile?.fullName);
}

async function getPublicPortfolio(slug) {
  const portfolio = await InternPortfolio.findOne({ slug: slugify(slug), status: "published" });
  if (!portfolio) throw new AppError("Portfolio not found", 404);

  portfolio.metadata = portfolio.metadata || {};
  portfolio.metadata.viewCount = (portfolio.metadata.viewCount || 0) + 1;
  portfolio.metadata.lastViewedAt = new Date();
  await portfolio.save();

  const profile = await InternProfile.findById(portfolio.internProfile).select("fullName").lean();

  return applyLiveHeroName(
    {
      slug: portfolio.slug,
      theme: portfolio.theme,
      lastGeneratedAt: portfolio.lastGeneratedAt,
      content: portfolio.content,
      metadata: {
        viewCount: portfolio.metadata.viewCount,
        aiGenerated: portfolio.metadata.aiGenerated
      }
    },
    profile?.fullName
  );
}

async function attachPortfolioSummaries(applications) {
  if (!Array.isArray(applications) || applications.length === 0) return applications;

  const internIds = applications
    .map((app) => app.intern?._id || app.intern)
    .filter(Boolean)
    .map(String);

  if (!internIds.length) return applications;

  const portfolios = await InternPortfolio.find({
    internProfile: { $in: internIds },
    status: "published"
  })
    .select("internProfile slug theme lastGeneratedAt metadata.viewCount status")
    .lean();

  const byIntern = new Map(portfolios.map((p) => [String(p.internProfile), p]));

  return applications.map((app) => {
    const internId = String(app.intern?._id || app.intern || "");
    const portfolio = byIntern.get(internId);
    if (!portfolio) return app;

    const summary = {
      slug: portfolio.slug,
      theme: portfolio.theme,
      status: portfolio.status,
      lastGeneratedAt: portfolio.lastGeneratedAt,
      viewCount: portfolio.metadata?.viewCount || 0,
      portfolioUrl: `/portfolio/${portfolio.slug}`
    };

    if (app.toObject) {
      const obj = app.toObject();
      obj.intern = { ...(obj.intern || {}), portfolio: summary };
      return obj;
    }

    return {
      ...app,
      intern: { ...(app.intern || {}), portfolio: summary }
    };
  });
}

async function listPortfoliosAdmin({ page = 1, limit = 50, status = "" } = {}) {
  const { page: safePage, limit: safeLimit, skip } = resolvePagination({ page, limit }, { defaultLimit: 50, maxLimit: 100 });
  const query = {};
  if (status) query.status = status;

  const [items, total] = await Promise.all([
    InternPortfolio.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate("internProfile", "fullName email")
      .lean(),
    InternPortfolio.countDocuments(query)
  ]);

  return {
    portfolios: items.map((row) => ({
      _id: row._id,
      slug: row.slug,
      status: row.status,
      theme: row.theme,
      lastGeneratedAt: row.lastGeneratedAt,
      intern: row.internProfile,
      metadata: row.metadata
    })),
    page: safePage,
    limit: safeLimit,
    total
  };
}

async function moderatePortfolio(adminUserId, portfolioId, { status, note }) {
  const portfolio = await InternPortfolio.findById(portfolioId);
  if (!portfolio) throw new AppError("Portfolio not found", 404);

  if (status && ["published", "disabled", "draft"].includes(status)) {
    portfolio.status = status;
  }
  portfolio.moderatedAt = new Date();
  portfolio.moderatedBy = adminUserId;
  if (note !== undefined) portfolio.moderationNote = String(note || "").trim();
  await portfolio.save();
  return toPortfolioPayload(portfolio);
}

module.exports = {
  collectSourceData,
  generatePortfolio,
  syncPortfolioOnProfileChange,
  getPortfolioForUser,
  updatePortfolioSettings,
  getPublicPortfolio,
  attachPortfolioSummaries,
  listPortfoliosAdmin,
  moderatePortfolio,
  toPortfolioPayload
};
