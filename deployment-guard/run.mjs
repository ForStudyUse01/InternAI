#!/usr/bin/env node
/**
 * Deployment Guard — FAANG-style pre-deploy release gate.
 *
 * Usage:
 *   node deployment-guard/run.mjs
 *   node deployment-guard/run.mjs --target=frontend
 *   node deployment-guard/run.mjs --target=backend
 *   node deployment-guard/run.mjs --skip-tsc
 *   DEPLOY_GUARD_API_URL=http://localhost:5000 node deployment-guard/run.mjs
 */

import { runFunctionalityChecks } from "./checks/functionality.mjs";
import { runAiChecks } from "./checks/ai-system.mjs";
import { runTestEngineChecks } from "./checks/test-engine.mjs";
import { runInterviewChecks } from "./checks/interview-system.mjs";
import { runPerformanceChecks } from "./checks/performance.mjs";
import { runUiChecks } from "./checks/ui-stability.mjs";
import { runSecurityChecks } from "./checks/security.mjs";
import { buildReport, persistReport, printReport } from "./lib/report.mjs";

function parseArgs(argv) {
  const args = { target: "all", skipTsc: false, jsonOnly: false };
  for (const arg of argv) {
    if (arg.startsWith("--target=")) args.target = arg.split("=")[1];
    if (arg === "--skip-tsc") args.skipTsc = true;
    if (arg === "--json") args.jsonOnly = true;
    if (arg === "--help" || arg === "-h") args.help = true;
  }
  return args;
}

async function runDeploymentGuard(options = {}) {
  const started = Date.now();
  const target = options.target || "all";

  console.log("\n▶ Deployment Guard — running pre-deploy validation…");
  console.log(`  Target: ${target}`);

  const steps = [
    { name: "Functionality", run: () => runFunctionalityChecks({ target, skipTsc: options.skipTsc }) },
    { name: "AI consistency", run: () => runAiChecks() },
    { name: "Test engine", run: () => runTestEngineChecks() },
    { name: "Interview system", run: () => runInterviewChecks() },
    { name: "Performance", run: () => runPerformanceChecks({ target }) },
    { name: "UI stability", run: () => runUiChecks() },
    { name: "Security", run: () => runSecurityChecks({ target }) }
  ];

  const allChecks = [];

  for (const step of steps) {
    process.stdout.write(`  • ${step.name}…`);
    const results = await step.run();
    allChecks.push(...results);
    const failed = results.filter((r) => r.status === "FAIL").length;
    console.log(failed ? ` ${results.length} checks (${failed} failed)` : ` ${results.length} checks OK`);
  }

  const report = buildReport(allChecks, { target, durationMs: Date.now() - started });
  const reportPath = persistReport(report);

  if (options.jsonOnly) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
    console.log(`  Report saved: ${reportPath}`);
  }

  return report;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`Deployment Guard\n\n  node deployment-guard/run.mjs [--target=all|frontend|backend] [--skip-tsc] [--json]\n`);
  process.exit(0);
}

runDeploymentGuard(args)
  .then((report) => {
    process.exit(report.buildStatus === "PASS" ? 0 : 1);
  })
  .catch((error) => {
    console.error("\nDeployment Guard crashed:", error);
    process.exit(2);
  });

export { runDeploymentGuard };
