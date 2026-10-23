import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const FRONTEND = path.join(ROOT, "frontend");
export const BACKEND = path.join(ROOT, "backend");

export function fileExists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

export function readText(relativePath) {
  const full = path.join(ROOT, relativePath);
  if (!fs.existsSync(full)) return "";
  return fs.readFileSync(full, "utf8");
}

/** Read backend source — resolves legacy shims to modular monolith implementation files. */
export function readBackendSource(...relativePaths) {
  for (const relativePath of relativePaths) {
    const text = readText(relativePath);
    if (!text) continue;
    const shimMatch = text.match(/module\.exports\s*=\s*require\(["']([^"']+)["']\)/);
    if (shimMatch && text.includes("Legacy shim")) {
      const resolved = path.normalize(path.join(path.dirname(path.join(ROOT, relativePath)), shimMatch[1]));
      const fromRoot = path.relative(ROOT, resolved).replace(/\\/g, "/");
      const impl = readText(fromRoot);
      if (impl && !impl.includes("Legacy shim")) return impl;
    }
    if (!text.includes("Legacy shim")) return text;
  }
  return readText(relativePaths[0]);
}

export function globPagesUnder(appSegment) {
  const base = path.join(FRONTEND, "app", appSegment);
  if (!fs.existsSync(base)) return [];

  const pages = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "page.tsx" || entry.name === "page.ts") {
        pages.push(full.replace(path.join(FRONTEND, "app"), "").replace(/\\/g, "/").replace(/\/page\.tsx?$/, ""));
      }
    }
  }
  walk(base);
  return pages;
}

export function extractHrefs(source) {
  const hrefs = new Set();
  const re = /href:\s*["']([^"']+)["']/g;
  let match;
  while ((match = re.exec(source))) {
    if (match[1].startsWith("/")) hrefs.add(match[1]);
  }
  return [...hrefs];
}

export function runCommand(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status ?? 1
  };
}

export function makeCheck({ id, category, name, status, message, blocking = status === "FAIL" }) {
  return { id, category, name, status, message, blocking };
}

export function scoreFromChecks(checks, category) {
  const scoped = checks.filter((c) => c.category === category && c.status !== "SKIP");
  if (!scoped.length) return 100;
  const passed = scoped.filter((c) => c.status === "PASS").length;
  const warned = scoped.filter((c) => c.status === "WARN").length;
  return Math.round(((passed + warned * 0.5) / scoped.length) * 100);
}
