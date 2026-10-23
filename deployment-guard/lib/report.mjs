import fs from "node:fs";
import path from "node:path";
import { scoreFromChecks, ROOT } from "./utils.mjs";

export function buildReport(checks, { target, durationMs }) {
  const failedChecks = checks.filter((c) => c.status === "FAIL").map((c) => `${c.id}: ${c.message}`);
  const warnings = checks.filter((c) => c.status === "WARN").map((c) => `${c.id}: ${c.message}`);

  return {
    buildStatus: failedChecks.length === 0 ? "PASS" : "FAIL",
    failedChecks,
    warnings,
    performanceScore: scoreFromChecks(checks, "performance"),
    aiReliabilityScore: scoreFromChecks(checks, "ai"),
    uiStabilityScore: scoreFromChecks(checks, "ui"),
    passedCount: checks.filter((c) => c.status === "PASS").length,
    failedCount: checks.filter((c) => c.status === "FAIL").length,
    warningCount: warnings.length,
    target,
    durationMs,
    checks
  };
}

export function printReport(report) {
  const divider = "─".repeat(60);
  console.log("\n" + divider);
  console.log("  DEPLOYMENT GUARD — RELEASE GATE REPORT");
  console.log(divider);
  console.log(`  Target:             ${report.target}`);
  console.log(`  Build Status:       ${report.buildStatus}`);
  console.log(`  Duration:           ${report.durationMs}ms`);
  console.log(`  Performance Score:  ${report.performanceScore}/100`);
  console.log(`  AI Reliability:     ${report.aiReliabilityScore}/100`);
  console.log(`  UI Stability:       ${report.uiStabilityScore}/100`);
  console.log(`  Passed:             ${report.passedCount}`);
  console.log(`  Failed:             ${report.failedCount}`);
  console.log(`  Warnings:           ${report.warningCount}`);
  console.log(divider);

  if (report.failedChecks.length) {
    console.log("\n  BLOCKED — Failed checks:");
    for (const item of report.failedChecks) console.log(`    ✖ ${item}`);
  }

  if (report.warnings.length) {
    console.log("\n  Warnings (non-blocking):");
    for (const item of report.warnings.slice(0, 12)) console.log(`    ⚠ ${item}`);
    if (report.warnings.length > 12) console.log(`    … and ${report.warnings.length - 12} more`);
  }

  if (report.buildStatus === "PASS") {
    console.log("\n  ✔ All blocking checks passed. Deployment may proceed.\n");
  } else {
    console.log("\n  ✖ Deployment BLOCKED. Fix failed checks before release.\n");
  }
}

export function persistReport(report) {
  const outPath = path.join(ROOT, "deployment-guard", "last-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  return outPath;
}
