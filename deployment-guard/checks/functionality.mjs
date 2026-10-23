import {
  FRONTEND,
  BACKEND,
  extractHrefs,
  fileExists,
  globPagesUnder,
  makeCheck,
  readText,
  runCommand
} from "../lib/utils.mjs";

const KNOWN_BAD_ROUTES = ["/dashboard/company/internships"];

const COMPANY_VIEW_KEYS = [
  "profile",
  "profile/edit",
  "profile/verification",
  "hiring/post",
  "hiring/active",
  "hiring/applicants",
  "hiring/shortlisted",
  "hiring/pipeline",
  "matching/ai",
  "matching/search",
  "matching/saved",
  "reports/feedback",
  "reports/notes",
  "reports/export",
  "team/recruiters",
  "analytics/company",
  "analytics/salary"
];

function resolveRouteExists(routePath) {
  if (routePath === "/dashboard/intern") return fileExists("frontend/app/dashboard/intern/page.tsx");
  if (routePath === "/dashboard/company") return fileExists("frontend/app/dashboard/company/page.tsx");
  if (routePath === "/dashboard/admin") return fileExists("frontend/app/dashboard/admin/page.tsx");
  if (routePath.startsWith("/dashboard/company/")) {
    const sub = routePath.replace("/dashboard/company/", "");
    if (sub === "chat") return fileExists("frontend/app/dashboard/company/chat/page.tsx");
    if (sub === "notifications") return fileExists("frontend/app/dashboard/company/notifications/page.tsx");
    return COMPANY_VIEW_KEYS.includes(sub);
  }
  if (routePath.startsWith("/dashboard/intern/")) {
    const sub = routePath.replace("/dashboard/intern/", "");
    const pages = globPagesUnder("dashboard/intern");
    return pages.some((p) => p === `/dashboard/intern/${sub}` || p.endsWith(`/${sub}`));
  }
  if (routePath.startsWith("/interview/")) {
    return fileExists("frontend/app/interview/[roomId]/page.tsx");
  }
  if (routePath.startsWith("/auth/")) {
    const role = routePath.split("/")[2];
    return fileExists(`frontend/app/auth/${role}/page.tsx`);
  }
  return fileExists(`frontend/app${routePath}/page.tsx`);
}

export async function runFunctionalityChecks({ target, skipTsc = false }) {
  const checks = [];

  if (!skipTsc && (target === "all" || target === "frontend")) {
    const tsc = runCommand("npx", ["tsc", "--noEmit"], FRONTEND);
    checks.push(
      makeCheck({
        id: "func.tsc",
        category: "functionality",
        name: "TypeScript compile",
        status: tsc.ok ? "PASS" : "FAIL",
        message: tsc.ok ? "Frontend typecheck passed" : `TypeScript errors: ${(tsc.stdout + tsc.stderr).slice(0, 400)}`
      })
    );
  }

  const shellSources = [
    "frontend/components/dashboard/intern-shell.tsx",
    "frontend/components/dashboard/company-shell.tsx"
  ];

  const missingRoutes = [];
  for (const sourcePath of shellSources) {
    const source = readText(sourcePath);
    for (const href of extractHrefs(source)) {
      if (KNOWN_BAD_ROUTES.includes(href)) missingRoutes.push(href);
      else if (!resolveRouteExists(href)) missingRoutes.push(href);
    }
  }

  checks.push(
    makeCheck({
      id: "func.routes",
      category: "functionality",
      name: "Navigation routes",
      status: missingRoutes.length === 0 ? "PASS" : "FAIL",
      message:
        missingRoutes.length === 0
          ? "Shell navigation routes resolve"
          : `Broken routes: ${missingRoutes.slice(0, 5).join(", ")}`
    })
  );

  const brand = readText("frontend/lib/brand.ts");
  const brandBad = KNOWN_BAD_ROUTES.filter((route) => brand.includes(route));
  checks.push(
    makeCheck({
      id: "func.brand-cta",
      category: "functionality",
      name: "Branded empty-state CTAs",
      status: brandBad.length === 0 ? "PASS" : "FAIL",
      message: brandBad.length === 0 ? "No known dead CTAs in brand presets" : `Dead CTAs: ${brandBad.join(", ")}`
    })
  );

  if (target === "all" || target === "backend") {
    const backendLoad = runCommand("node", ["-e", "require('./src/app')"], BACKEND);
    checks.push(
      makeCheck({
        id: "func.backend-load",
        category: "functionality",
        name: "Backend bootstrap",
        status: backendLoad.ok ? "PASS" : "FAIL",
        message: backendLoad.ok ? "Backend app module loads" : backendLoad.stderr.slice(0, 300)
      })
    );
  }

  const criticalPages = [
    "frontend/app/interview/[roomId]/page.tsx",
    "frontend/app/dashboard/intern/learning/mock-aptitude/page.tsx",
    "frontend/app/dashboard/intern/chat/page.tsx",
    "frontend/app/dashboard/company/chat/page.tsx"
  ];
  const missingPages = criticalPages.filter((p) => !fileExists(p));
  checks.push(
    makeCheck({
      id: "func.critical-pages",
      category: "functionality",
      name: "Critical feature pages",
      status: missingPages.length === 0 ? "PASS" : "FAIL",
      message:
        missingPages.length === 0 ? "Interview, chat, and test pages exist" : `Missing: ${missingPages.join(", ")}`
    })
  );

  return checks;
}
