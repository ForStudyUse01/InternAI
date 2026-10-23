import { fileExists, makeCheck, readText, readBackendSource } from "../lib/utils.mjs";

export async function runAiChecks() {
  const checks = [];

  const scorer = readBackendSource(
    "backend/src/modules/students/services/scorer.service.js",
    "backend/src/services/scorer.service.js"
  );
  checks.push(
    makeCheck({
      id: "ai.scorer-validation",
      category: "ai",
      name: "Resume scorer aiValidation",
      status: scorer.includes("insufficient_data") && scorer.includes("aiValidation") ? "PASS" : "FAIL",
      message: "Empty resume path exposes aiValidation with insufficient_data"
    })
  );

  const gateway = readBackendSource(
    "backend/src/modules/ai/services/ai-gateway.service.js",
    "backend/src/services/ai-gateway.service.js"
  );
  checks.push(
    makeCheck({
      id: "ai.gateway-cache",
      category: "ai",
      name: "AI gateway caching",
      status: gateway.includes("withDeterministicCache") && gateway.includes("remember") ? "PASS" : "FAIL",
      message: "AI gateway uses deterministic caching layer"
    })
  );

  const router = readBackendSource(
    "backend/src/shared/infrastructure/ai/ai-provider.router.js",
    "backend/src/infrastructure/ai/ai-provider.router.js"
  );
  checks.push(
    makeCheck({
      id: "ai.provider-fallback",
      category: "ai",
      name: "AI provider fallback chain",
      status:
        router.includes("localFallback") && router.includes("assertWithinAiRateLimit") ? "PASS" : "FAIL",
      message: "AI router enforces rate limits and local fallback"
    })
  );

  const orchestrator = readBackendSource(
    "backend/src/modules/ai/services/ai-orchestrator.service.js",
    "backend/src/services/ai-orchestrator.service.js"
  );
  checks.push(
    makeCheck({
      id: "ai.orchestrator",
      category: "ai",
      name: "AI orchestrator validation",
      status: orchestrator.includes("validateResumeExtraction") ? "PASS" : "FAIL",
      message: "Resume extraction validation layer present"
    })
  );

  const skillGapPanel = readText("frontend/components/dashboard/intern/skill-gap-analysis-panel.tsx");
  checks.push(
    makeCheck({
      id: "ai.skill-gap-confidence",
      category: "ai",
      name: "Skill gap confidence UI",
      status:
        skillGapPanel.includes("AiConfidenceBadge") && skillGapPanel.includes("insufficientData") ? "PASS" : "FAIL",
      message: "Skill gap panel renders confidence even for insufficient data"
    })
  );

  const resumeDash = readText("frontend/components/dashboard/intern/resume-intelligence-dashboard.tsx");
  checks.push(
    makeCheck({
      id: "ai.resume-nan-guard",
      category: "ai",
      name: "Resume confidence NaN guard",
      status: resumeDash.includes("Number.isFinite") || resumeDash.includes("confidencePct == null") ? "PASS" : "FAIL",
      message: "Resume dashboard avoids NaN confidence display"
    })
  );

  const hiringEngine = readText("frontend/lib/ai-hiring/candidate-ai-engine.ts");
  checks.push(
    makeCheck({
      id: "ai.hiring-engine",
      category: "ai",
      name: "Hiring intelligence engine",
      status: hiringEngine.includes("rankCandidates") && hiringEngine.includes("generateRejectionReason") ? "PASS" : "FAIL",
      message: "Hiring AI engine exports ranking and rejection modules"
    })
  );

  const aiPlatform = readText("frontend/lib/ai-platform/orchestrator.ts");
  if (aiPlatform.includes("INSUFFICIENT") || aiPlatform.includes("insufficient")) {
    checks.push(
      makeCheck({
        id: "ai.platform-insufficient",
        category: "ai",
        name: "AI platform insufficient-data handling",
        status: "PASS",
        message: "Frontend AI orchestrator handles insufficient data paths"
      })
    );
  } else {
    checks.push(
      makeCheck({
        id: "ai.platform-insufficient",
        category: "ai",
        name: "AI platform insufficient-data handling",
        status: "WARN",
        message: "Could not verify INSUFFICIENT_DATA constant in orchestrator",
        blocking: false
      })
    );
  }

  return checks;
}
