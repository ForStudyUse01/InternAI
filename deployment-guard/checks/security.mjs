import { makeCheck, readText, readBackendSource } from "../lib/utils.mjs";

export async function runSecurityChecks({ target }) {
  const checks = [];

  const authMiddleware = readBackendSource(
    "backend/src/shared/middleware/auth.middleware.js",
    "backend/src/middleware/auth.middleware.js"
  );
  checks.push(
    makeCheck({
      id: "sec.jwt-middleware",
      category: "security",
      name: "JWT auth middleware",
      status: authMiddleware.includes("verifyAccessToken") ? "PASS" : "FAIL",
      message: "Backend JWT verification middleware present"
    })
  );

  const roleGuard = readText("frontend/components/ui/role-dashboard-guard.tsx");
  checks.push(
    makeCheck({
      id: "sec.role-dashboard-guard",
      category: "security",
      name: "Dashboard role guard",
      status: roleGuard.includes("RoleDashboardGuard") && roleGuard.includes("isPathAllowedForRole") ? "PASS" : "FAIL",
      message: "Frontend dashboard routes protected by role guard"
    })
  );

  const interviewService = readBackendSource(
    "backend/src/modules/interviews/services/interview-room.service.js",
    "backend/src/services/interview-room.service.js"
  );
  checks.push(
    makeCheck({
      id: "sec.interview-unauthorized",
      category: "security",
      name: "Interview unauthorized block",
      status: interviewService.includes("not invited") || interviewService.includes("Forbidden") ? "PASS" : "FAIL",
      message: "Interview service rejects unauthorized participants"
    })
  );

  const chatRoutes = readBackendSource(
    "backend/src/modules/chat/routes/chat.routes.js",
    "backend/src/routes/chat.routes.js"
  );
  checks.push(
    makeCheck({
      id: "sec.chat-auth",
      category: "security",
      name: "Chat API auth",
      status: chatRoutes.includes("authMiddleware") ? "PASS" : "FAIL",
      message: "Chat REST routes require authentication"
    })
  );

  if (target === "all" || target === "backend") {
    const app = readText("backend/src/app.js");
    checks.push(
      makeCheck({
        id: "sec.rate-limit",
        category: "security",
        name: "API rate limiting",
        status: app.includes("rateLimit") ? "PASS" : "FAIL",
        message: "Express rate limiter mounted on /api"
      })
    );

    const envExample = readText(".env.example");
    if (envExample.includes("JWT_SECRET") && !envExample.includes("replace-with-long-random-secret")) {
      checks.push(
        makeCheck({
          id: "sec.env-secrets",
          category: "security",
          name: "Production secrets template",
          status: "WARN",
          message: "Ensure JWT_SECRET is rotated before production deploy",
          blocking: false
        })
      );
    } else {
      checks.push(
        makeCheck({
          id: "sec.env-secrets",
          category: "security",
          name: "Production secrets template",
          status: "PASS",
          message: ".env.example documents JWT secrets placeholder"
        })
      );
    }
  }

  const loader = readText("frontend/lib/aptitude-test-loader.ts");
  checks.push(
    makeCheck({
      id: "sec.test-lazy-gate",
      category: "security",
      name: "Test content lazy gate",
      status: loader.includes("loadTestSetQuestions") ? "PASS" : "FAIL",
      message: "Aptitude questions loaded only on test start (not pre-bundled to client nav)"
    })
  );

  return checks;
}
