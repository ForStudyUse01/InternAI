/**
 * Modular monolith migration — moves code into feature modules + shared kernel.
 * Legacy paths become thin re-export shims for backward compatibility.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "src");

if (fs.existsSync(path.join(SRC, "registry", "index.js"))) {
  console.log("Migration already applied (registry exists). Skipping.");
  process.exit(0);
}

const SHARED_DIRS = ["config", "middleware", "utils", "infrastructure", "socket", "data"];
const SHARED_CONSTANTS = ["brand.js", "enums.js", "roles.js", "validation-rules.js"];

const MODULE_MAP = {
  authentication: {
    mount: { path: "/auth", domain: "authentication", description: "Authentication, JWT sessions, OTP" },
    router: "routes/auth.routes.js",
    files: {
      "routes/auth.routes.js": "routes/auth.routes.js",
      "controllers/auth.controller.js": "controllers/auth.controller.js",
      "services/otp.service.js": "services/otp.service.js",
      "models/User.js": "models/User.js",
      "models/OtpVerification.js": "models/OtpVerification.js",
      "validators/auth.validator.js": "validators/auth.validator.js"
    }
  },
  students: {
    mount: { path: "/intern", domain: "students", description: "Student/intern profiles, resume, certifications" },
    router: "routes/intern.routes.js",
    files: {
      "routes/intern.routes.js": "routes/intern.routes.js",
      "controllers/intern.controller.js": "controllers/intern.controller.js",
      "controllers/certification.controller.js": "controllers/certification.controller.js",
      "services/certification.service.js": "services/certification.service.js",
      "services/file-upload.service.js": "services/file-upload.service.js",
      "services/resume-parser.service.js": "services/resume-parser.service.js",
      "services/resume-structured-parser.service.js": "services/resume-structured-parser.service.js",
      "services/resume-quality.service.js": "services/resume-quality.service.js",
      "services/resume-intelligence-v2.service.js": "services/resume-intelligence-v2.service.js",
      "services/scorer.service.js": "services/scorer.service.js",
      "services/roadmap.service.js": "services/roadmap.service.js",
      "models/InternProfile.js": "models/InternProfile.js",
      "models/Certification.js": "models/Certification.js",
      "constants/resume-intelligence-v2.js": "constants/resume-intelligence-v2.js",
      "constants/score-weights.js": "constants/score-weights.js"
    }
  },
  companies: {
    mount: { path: "/company", domain: "companies", description: "Company hiring portal and HR management" },
    router: "routes/company.routes.js",
    extraRouters: [{ path: "/companies", file: "routes/companies.routes.js" }],
    files: {
      "routes/company.routes.js": "routes/company.routes.js",
      "routes/companies.routes.js": "routes/companies.routes.js",
      "controllers/company.controller.js": "controllers/company.controller.js",
      "controllers/company-hr.controller.js": "controllers/company-hr.controller.js",
      "controllers/company-public.controller.js": "controllers/company-public.controller.js",
      "services/company-access.service.js": "services/company-access.service.js",
      "services/company-analytics.service.js": "services/company-analytics.service.js",
      "services/company-hr.service.js": "services/company-hr.service.js",
      "services/company-query.service.js": "services/company-query.service.js",
      "models/CompanyProfile.js": "models/CompanyProfile.js",
      "constants/hr-permissions.js": "constants/hr-permissions.js"
    }
  },
  internships: {
    mount: { path: "/internships", domain: "internships", description: "Internship listings" },
    router: "routes/internship.routes.js",
    files: {
      "routes/internship.routes.js": "routes/internship.routes.js",
      "controllers/internship.controller.js": "controllers/internship.controller.js",
      "models/Internship.js": "models/Internship.js"
    }
  },
  applications: {
    mount: { path: "/applications", domain: "applications", description: "Application workflow" },
    router: "routes/application.routes.js",
    files: {
      "routes/application.routes.js": "routes/application.routes.js",
      "controllers/application.controller.js": "controllers/application.controller.js",
      "services/application-relevance.service.js": "services/application-relevance.service.js",
      "services/pipeline.service.js": "services/pipeline.service.js",
      "models/Application.js": "models/Application.js",
      "constants/pipeline.js": "constants/pipeline.js"
    }
  },
  "ats-scoring": {
    mount: null,
    files: {
      "controllers/hiring-scoring.controller.js": "controllers/hiring-scoring.controller.js",
      "services/hiring-scoring-config.service.js": "services/hiring-scoring-config.service.js",
      "models/HiringScoringTemplate.js": "models/HiringScoringTemplate.js"
    }
  },
  ai: {
    mount: { path: "/ai", domain: "ai", description: "AI recommendations and skill gap" },
    router: "routes/ai.routes.js",
    files: {
      "routes/ai.routes.js": "routes/ai.routes.js",
      "controllers/ai.controller.js": "controllers/ai.controller.js",
      "services/ai.service.js": "services/ai.service.js",
      "services/ai-gateway.service.js": "services/ai-gateway.service.js",
      "services/ai-orchestrator.service.js": "services/ai-orchestrator.service.js",
      "services/project-evaluation.service.js": "services/project-evaluation.service.js",
      "data/role-skill-templates.js": "data/role-skill-templates.js"
    }
  },
  interviews: {
    mount: { path: "/interview", domain: "interviews", description: "Interview scheduling and rooms" },
    router: "routes/interview.routes.js",
    files: {
      "routes/interview.routes.js": "routes/interview.routes.js",
      "controllers/interview.controller.js": "controllers/interview.controller.js",
      "services/interview-room.service.js": "services/interview-room.service.js",
      "services/interview-workflow.service.js": "services/interview-workflow.service.js",
      "models/InterviewRoom.js": "models/InterviewRoom.js"
    }
  },
  notifications: {
    mount: null,
    files: {
      "controllers/notification.controller.js": "controllers/notification.controller.js",
      "services/in-app-notification.service.js": "services/in-app-notification.service.js",
      "services/notification.service.js": "services/notification.service.js",
      "services/notification-queue.service.js": "services/notification-queue.service.js",
      "models/Notification.js": "models/Notification.js",
      "constants/notification-types.js": "constants/notification-types.js"
    }
  },
  email: {
    mount: null,
    files: {
      "services/email-template.service.js": "services/email-template.service.js"
    }
  },
  reports: {
    mount: null,
    files: {
      "controllers/report.controller.js": "controllers/report.controller.js",
      "services/report-data.service.js": "services/report-data.service.js",
      "services/report-number.service.js": "services/report-number.service.js",
      "services/report-pdf.service.js": "services/report-pdf.service.js",
      "models/ReportSequence.js": "models/ReportSequence.js",
      "constants/report-types.js": "constants/report-types.js"
    }
  },
  calendar: {
    mount: { path: "/calendar", domain: "calendar", description: "Personal calendar" },
    router: "routes/calendar.routes.js",
    files: {
      "routes/calendar.routes.js": "routes/calendar.routes.js",
      "controllers/calendar.controller.js": "controllers/calendar.controller.js",
      "models/CalendarDayEntry.js": "models/CalendarDayEntry.js",
      "constants/calendar-stickers.js": "constants/calendar-stickers.js"
    }
  },
  analytics: {
    mount: null,
    files: {
      "services/activity-log.service.js": "services/activity-log.service.js",
      "models/ActivityLog.js": "models/ActivityLog.js"
    }
  },
  admin: {
    mount: { path: "/admin", domain: "admin", description: "Platform administration" },
    router: "routes/admin.routes.js",
    files: {
      "routes/admin.routes.js": "routes/admin.routes.js",
      "controllers/admin.controller.js": "controllers/admin.controller.js",
      "models/ReportedCompany.js": "models/ReportedCompany.js"
    }
  },
  chat: {
    mount: { path: "/chat", domain: "chat", description: "Realtime messaging" },
    router: "routes/chat.routes.js",
    files: {
      "routes/chat.routes.js": "routes/chat.routes.js",
      "controllers/chat.controller.js": "controllers/chat.controller.js",
      "services/chat.service.js": "services/chat.service.js",
      "models/ChatConversation.js": "models/ChatConversation.js",
      "models/ChatMessage.js": "models/ChatMessage.js"
    }
  },
  portfolio: {
    mount: { path: "/portfolios", domain: "portfolio", description: "3D portfolios" },
    router: "routes/portfolio.routes.js",
    files: {
      "routes/portfolio.routes.js": "routes/portfolio.routes.js",
      "controllers/portfolio.controller.js": "controllers/portfolio.controller.js",
      "services/portfolio.service.js": "services/portfolio.service.js",
      "models/InternPortfolio.js": "models/InternPortfolio.js",
      "constants/portfolio-themes.js": "constants/portfolio-themes.js"
    }
  },
  skills: {
    mount: { path: "/skills", domain: "skills", description: "Skill taxonomy" },
    router: "routes/skill.routes.js",
    files: {
      "routes/skill.routes.js": "routes/skill.routes.js",
      "controllers/skill.controller.js": "controllers/skill.controller.js",
      "models/Skill.js": "models/Skill.js"
    }
  },
  candidates: {
    mount: { path: "/candidates", domain: "candidates", description: "Recruiter candidate search" },
    router: "routes/candidate.routes.js",
    files: {
      "routes/candidate.routes.js": "routes/candidate.routes.js",
      "controllers/candidate.controller.js": "controllers/candidate.controller.js"
    }
  }
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function toPosix(p) {
  return p.replace(/\\/g, "/");
}

function sharedPrefix(fromFile) {
  const rel = toPosix(path.relative(SRC, fromFile));
  const depth = rel.split("/").length - 1;
  return `${"../".repeat(depth)}shared`;
}

function legacyPrefix(fromFile) {
  const rel = toPosix(path.relative(SRC, fromFile));
  const depth = rel.split("/").length - 1;
  return `${"../".repeat(depth)}`;
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  if (!fs.existsSync(src)) {
    console.warn(`SKIP missing: ${src}`);
    return false;
  }
  fs.copyFileSync(src, dest);
  return true;
}

function writeShim(legacyPath, targetFromSrc) {
  ensureDir(path.dirname(legacyPath));
  const rel = toPosix(path.relative(path.dirname(legacyPath), path.join(SRC, targetFromSrc)));
  const reqPath = rel.startsWith(".") ? rel : `./${rel}`;
  fs.writeFileSync(
    legacyPath,
    `/** Legacy shim — use modules/ or shared/ directly in new code */\nmodule.exports = require("${reqPath}");\n`
  );
}

function patchImports(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const shared = sharedPrefix(filePath);
  const legacy = legacyPrefix(filePath);

  const rules = [
    [/require\("\.\.\/config\//g, `require("${shared}/config/`],
    [/require\('\.\.\/config\//g, `require('${shared}/config/`],
    [/require\("\.\.\/middleware\//g, `require("${shared}/middleware/`],
    [/require\('\.\.\/middleware\//g, `require('${shared}/middleware/`],
    [/require\("\.\.\/utils\//g, `require("${shared}/utils/`],
    [/require\('\.\.\/utils\//g, `require('${shared}/utils/`],
    [/require\("\.\.\/infrastructure\//g, `require("${shared}/infrastructure/`],
    [/require\('\.\.\/infrastructure\//g, `require('${shared}/infrastructure/`],
    [/require\("\.\.\/socket\//g, `require("${shared}/socket/`],
    [/require\('\.\.\/socket\//g, `require('${shared}/socket/`],
    [/require\("\.\.\/validators\//g, `require("${legacy}validators/`],
    [/require\('\.\.\/validators\//g, `require('${legacy}validators/`]
  ];

  for (const [pattern, replacement] of rules) {
    content = content.replace(pattern, replacement);
  }

  // Cross-module: legacy layer paths resolve through shims
  content = content.replace(/require\("\.\.\/controllers\//g, `require("${legacy}controllers/`);
  content = content.replace(/require\('\.\.\/controllers\//g, `require('${legacy}controllers/`);
  content = content.replace(/require\("\.\.\/services\//g, `require("${legacy}services/`);
  content = content.replace(/require\('\.\.\/services\//g, `require('${legacy}services/`);
  content = content.replace(/require\("\.\.\/models\//g, `require("${legacy}models/`);
  content = content.replace(/require\('\.\.\/models\//g, `require('${legacy}models/`);
  content = content.replace(/require\("\.\.\/constants\//g, `require("${legacy}constants/`);
  content = content.replace(/require\('\.\.\/constants\//g, `require('${legacy}constants/`);

  fs.writeFileSync(filePath, content);
}

function copyTree(srcDir, destDir, shimBase) {
  ensureDir(destDir);
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isFile()) {
      copyFile(srcPath, destPath);
      writeShim(srcPath, path.join(shimBase, entry.name));
    } else {
      copyTree(srcPath, destPath, path.join(shimBase, entry.name));
    }
  }
}

function moveShared() {
  const sharedRoot = path.join(SRC, "shared");
  ensureDir(sharedRoot);

  for (const dir of SHARED_DIRS) {
    const srcDir = path.join(SRC, dir);
    if (!fs.existsSync(srcDir)) continue;
    copyTree(srcDir, path.join(sharedRoot, dir), path.join("shared", dir));
  }

  ensureDir(path.join(sharedRoot, "constants"));
  for (const file of SHARED_CONSTANTS) {
    const src = path.join(SRC, "constants", file);
    if (fs.existsSync(src)) {
      copyFile(src, path.join(sharedRoot, "constants", file));
      writeShim(src, path.join("shared", "constants", file));
    }
  }

  ensureDir(path.join(sharedRoot, "database"));
  if (fs.existsSync(path.join(SRC, "config", "db.js"))) {
    copyFile(path.join(SRC, "config", "db.js"), path.join(sharedRoot, "database", "db.js"));
    writeShim(path.join(SRC, "config", "db.js"), path.join("shared", "database", "db.js"));
  }
}

function migrateModules() {
  for (const [moduleName, config] of Object.entries(MODULE_MAP)) {
    const moduleRoot = path.join(SRC, "modules", moduleName);
    ensureDir(moduleRoot);

    for (const [legacyRel, moduleRel] of Object.entries(config.files)) {
      const srcPath = path.join(SRC, legacyRel);
      const destPath = path.join(moduleRoot, moduleRel);
      if (copyFile(srcPath, destPath)) {
        patchImports(destPath);
        writeShim(srcPath, path.join("modules", moduleName, moduleRel));
      }
    }
  }
}

function createSharedUtilities() {
  ensureDir(path.join(SRC, "shared", "logger"));
  fs.writeFileSync(
    path.join(SRC, "shared", "logger", "index.js"),
    `const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const current = LEVELS[String(process.env.LOG_LEVEL || "info").toLowerCase()] ?? LEVELS.info;
function emit(level, message, meta) {
  if (LEVELS[level] > current) return;
  const fn = level === "debug" ? "log" : level;
  if (meta !== undefined) console[fn](\`[\${level.toUpperCase()}]\`, message, meta);
  else console[fn](\`[\${level.toUpperCase()}]\`, message);
}
module.exports = {
  error: (m, meta) => emit("error", m, meta),
  warn: (m, meta) => emit("warn", m, meta),
  info: (m, meta) => emit("info", m, meta),
  debug: (m, meta) => emit("debug", m, meta)
};
`
  );

  fs.writeFileSync(
    path.join(SRC, "shared", "config", "env.schema.js"),
    `module.exports = Object.freeze({
  server: ["PORT", "NODE_ENV", "CLIENT_URL", "ALLOW_VERCEL_PREVIEW", "AUTO_SEED"],
  database: ["MONGO_URI"],
  auth: ["JWT_SECRET", "JWT_EXPIRES_IN"],
  email: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"],
  ai: ["ENABLE_AI", "GROQ_API_KEY", "HUGGINGFACE_API_KEY"],
  storage: ["STORAGE_PROVIDER", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
  cache: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  features: ["ENABLE_CHAT", "ENABLE_NOTIFICATIONS", "ENABLE_INTERVIEW_ROOMS", "ENABLE_3D_PORTFOLIO", "ENABLE_RECORDINGS"]
});
`
  );

  fs.writeFileSync(
    path.join(SRC, "shared", "index.js"),
    `module.exports = {
  config: require("./config/platform.config"),
  db: require("./database/db"),
  logger: require("./logger"),
  responses: require("./utils/api-response"),
  errors: require("./utils/AppError"),
  asyncHandler: require("./utils/asyncHandler")
};
`
  );
}

function createModuleIndexes() {
  for (const [moduleName, config] of Object.entries(MODULE_MAP)) {
    const indexPath = path.join(SRC, "modules", moduleName, "index.js");
    const lines = [
      `/** ${moduleName} module — self-contained domain boundary */`,
      `const name = ${JSON.stringify(moduleName)};`
    ];

    if (config.mount) {
      lines.push(`const mountPath = ${JSON.stringify(config.mount.path)};`);
      lines.push(`const domain = ${JSON.stringify(config.mount.domain)};`);
      lines.push(`const description = ${JSON.stringify(config.mount.description)};`);
    }
    if (config.router) {
      lines.push(`const router = require("./${config.router.replace(/\\/g, "/")}");`);
    } else {
      lines.push(`const router = null;`);
    }

    lines.push(`
module.exports = {
  name,
  ${config.mount ? "mountPath, domain, description," : ""}
  router,
  controllers: {},
  services: {}
};
`);
    fs.writeFileSync(indexPath, lines.join("\n"));
  }
}

function createRegistry() {
  const mounts = [];
  for (const [moduleName, config] of Object.entries(MODULE_MAP)) {
    if (config.mount) {
      mounts.push({
        module: moduleName,
        path: config.mount.path,
        domain: config.mount.domain,
        description: config.mount.description,
        routerFile: config.router
      });
    }
    if (config.extraRouters) {
      for (const extra of config.extraRouters) {
        mounts.push({
          module: moduleName,
          path: extra.path,
          domain: config.mount.domain,
          description: extra.description || config.mount.description,
          routerFile: extra.file
        });
      }
    }
  }

  const registryContent = `/**
 * Modular monolith registry — mounts feature modules on shared API prefixes.
 * Each module is independently extractable to a future microservice.
 */

const MODULE_REGISTRY = Object.freeze([
${mounts
  .map((m) => {
    return `  { module: "${m.module}", domain: "${m.domain}", path: "${m.path}", description: ${JSON.stringify(m.description)}, get router() { return require("../modules/${m.module}/${m.routerFile.replace(/\\/g, "/")}"); } }`;
  })
  .join(",\n")}
]);

function mountModularApi(app, prefix = "/api") {
  const mounted = new Set();
  for (const entry of MODULE_REGISTRY) {
    if (!entry.router || mounted.has(\`\${prefix}\${entry.path}\`)) continue;
    app.use(\`\${prefix}\${entry.path}\`, entry.router);
    mounted.add(\`\${prefix}\${entry.path}\`);
  }
}

function getModuleManifest() {
  return MODULE_REGISTRY.map(({ module, domain, path, description }) => ({ module, domain, path, description }));
}

module.exports = { MODULE_REGISTRY, mountModularApi, getModuleManifest };
`;

  ensureDir(path.join(SRC, "registry"));
  fs.writeFileSync(path.join(SRC, "registry", "index.js"), registryContent);

  // Legacy modules/index.js forwards to registry
  const legacyModulesIndex = path.join(SRC, "modules", "index.js");
  fs.writeFileSync(
    legacyModulesIndex,
    `/** @deprecated Use registry/index.js */\nmodule.exports = require("../registry/index.js");\n`
  );
}

moveShared();
migrateModules();
createSharedUtilities();
createModuleIndexes();
createRegistry();
console.log("Modular monolith migration completed.");
