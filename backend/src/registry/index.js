/**
 * Modular monolith registry — mounts feature modules on shared API prefixes.
 * Each module is independently extractable to a future microservice.
 */

const MODULE_REGISTRY = Object.freeze([
  { module: "authentication", domain: "authentication", path: "/auth", description: "Authentication, JWT sessions, OTP", get router() { return require("../modules/authentication/routes/auth.routes.js"); } },
  { module: "students", domain: "students", path: "/intern", description: "Student/intern profiles, resume, certifications", get router() { return require("../modules/students/routes/intern.routes.js"); } },
  { module: "companies", domain: "companies", path: "/company", description: "Company hiring portal and HR management", get router() { return require("../modules/companies/routes/company.routes.js"); } },
  { module: "companies", domain: "companies", path: "/companies", description: "Company hiring portal and HR management", get router() { return require("../modules/companies/routes/companies.routes.js"); } },
  { module: "internships", domain: "internships", path: "/internships", description: "Internship listings", get router() { return require("../modules/internships/routes/internship.routes.js"); } },
  { module: "applications", domain: "applications", path: "/applications", description: "Application workflow", get router() { return require("../modules/applications/routes/application.routes.js"); } },
  { module: "ai", domain: "ai", path: "/ai", description: "AI recommendations and skill gap", get router() { return require("../modules/ai/routes/ai.routes.js"); } },
  { module: "interviews", domain: "interviews", path: "/interview", description: "Interview scheduling and rooms", get router() { return require("../modules/interviews/routes/interview.routes.js"); } },
  { module: "calendar", domain: "calendar", path: "/calendar", description: "Personal calendar", get router() { return require("../modules/calendar/routes/calendar.routes.js"); } },
  { module: "admin", domain: "admin", path: "/admin", description: "Platform administration", get router() { return require("../modules/admin/routes/admin.routes.js"); } },
  { module: "chat", domain: "chat", path: "/chat", description: "Realtime messaging", get router() { return require("../modules/chat/routes/chat.routes.js"); } },
  { module: "portfolio", domain: "portfolio", path: "/portfolios", description: "3D portfolios", get router() { return require("../modules/portfolio/routes/portfolio.routes.js"); } },
  { module: "skills", domain: "skills", path: "/skills", description: "Skill taxonomy", get router() { return require("../modules/skills/routes/skill.routes.js"); } },
  { module: "candidates", domain: "candidates", path: "/candidates", description: "Recruiter candidate search", get router() { return require("../modules/candidates/routes/candidate.routes.js"); } }
]);

function mountModularApi(app, prefix = "/api") {
  const mounted = new Set();
  for (const entry of MODULE_REGISTRY) {
    if (!entry.router || mounted.has(`${prefix}${entry.path}`)) continue;
    app.use(`${prefix}${entry.path}`, entry.router);
    mounted.add(`${prefix}${entry.path}`);
  }
}

function getModuleManifest() {
  return MODULE_REGISTRY.map(({ module, domain, path, description }) => ({ module, domain, path, description }));
}

module.exports = { MODULE_REGISTRY, mountModularApi, getModuleManifest };
