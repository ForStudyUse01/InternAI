import { makeCheck, readText } from "../lib/utils.mjs";

export async function runTestEngineChecks() {
  const checks = [];

  const examView = readText("frontend/components/dashboard/intern/aptitude-exam-view.tsx");
  checks.push(
    makeCheck({
      id: "test.timer-ref",
      category: "functionality",
      name: "Aptitude timer stability",
      status: examView.includes("remainingSecondsRef") && examView.includes("finalizeSubmit(true)") ? "PASS" : "FAIL",
      message: "Timer uses refs and marks timeout auto-submit"
    })
  );

  const hub = readText("frontend/components/dashboard/intern/mock-aptitude-hub.tsx");
  checks.push(
    makeCheck({
      id: "test.dedupe-recovery",
      category: "functionality",
      name: "Aptitude submit dedupe",
      status:
        hub.includes("dedupeKey") && hub.includes('fullscreenExit: payload.trigger === "fullscreen_exit"')
          ? "PASS"
          : "FAIL",
      message: "Result dedupe enabled; refresh recovery uses correct fullscreen flag"
    })
  );

  const progress = readText("frontend/lib/aptitude-progress.ts");
  checks.push(
    makeCheck({
      id: "test.attempt-limits",
      category: "functionality",
      name: "Attempt tracking",
      status:
        progress.includes("MAX_ATTEMPTS_PER_TEST") &&
        progress.includes("canStartAttempt") &&
        progress.includes("dedupeKey")
          ? "PASS"
          : "FAIL",
      message: "Attempt limits and dedupe keys configured"
    })
  );

  const proctor = readText("frontend/lib/aptitude-proctor.ts");
  checks.push(
    makeCheck({
      id: "test.proctor-merge",
      category: "functionality",
      name: "Proctor log integrity",
      status: proctor.includes("fullscreenExit") && proctor.includes("computeCheatingReport") ? "PASS" : "FAIL",
      message: "Proctor tracks fullscreen exit in cheating report"
    })
  );

  const loader = readText("frontend/lib/aptitude-test-loader.ts");
  checks.push(
    makeCheck({
      id: "test.lazy-load",
      category: "performance",
      name: "Lazy question loading",
      status: loader.includes("loadTestSetQuestions") && loader.includes("import(") ? "PASS" : "FAIL",
      message: "Question banks lazy-loaded for performance"
    })
  );

  const engine = readText("frontend/lib/aptitude-test-engine.ts");
  checks.push(
    makeCheck({
      id: "test.scoring-engine",
      category: "functionality",
      name: "Score calculation module",
      status: engine.includes("submitTest") && engine.includes("evaluate") ? "PASS" : "FAIL",
      message: "Aptitude scoring engine present"
    })
  );

  return checks;
}
