/**
 * Fixes cross-module imports after modular monolith migration.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "src");

const SHARED_CONSTANTS = {
  roles: "../../../shared/constants/roles",
  brand: "../../../shared/constants/brand",
  enums: "../../../shared/constants/enums",
  "validation-rules": "../../../shared/constants/validation-rules"
};

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".js")) files.push(full);
  }
  return files;
}

function legacyServicesPrefix(filePath) {
  const rel = path.relative(SRC, filePath).replace(/\\/g, "/");
  const depth = rel.split("/").length - 1;
  return `${"../".repeat(depth)}services/`;
}

function legacyModelsPrefix(filePath) {
  const rel = path.relative(SRC, filePath).replace(/\\/g, "/");
  const depth = rel.split("/").length - 1;
  return `${"../".repeat(depth)}models/`;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;
  const dir = path.dirname(filePath);

  for (const [name, target] of Object.entries(SHARED_CONSTANTS)) {
    const patterns = [
      new RegExp(`require\\(["']\\.\\/${name}["']\\)`, "g"),
      new RegExp(`require\\(["']\\.\\.\\/constants\\/${name}["']\\)`, "g")
    ];
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, `require("${target}")`);
        changed = true;
      }
    }
  }

  content = content.replace(/require\(["']\.\.\/models\//g, () => {
    changed = true;
    return `require("${legacyModelsPrefix(filePath)}`;
  });

  content = content.replace(/require\(["']\.\.\/constants\//g, () => {
    changed = true;
    return `require("${"../".repeat(path.relative(SRC, filePath).split(/[/\\]/).length - 1)}constants/`;
  });

  content = content.replace(/require\(["']\.\/([^"']+\.service)["']\)/g, (match, svc) => {
    const local = path.join(dir, svc);
    if (fs.existsSync(local)) return match;
    const legacy = `${legacyServicesPrefix(filePath)}${svc}`;
    changed = true;
    return `require("${legacy}")`;
  });

  if (changed) fs.writeFileSync(filePath, content);
}

for (const root of [path.join(SRC, "modules"), path.join(SRC, "shared")]) {
  if (fs.existsSync(root)) {
    for (const file of walk(root)) fixFile(file);
  }
}

console.log("Post-migration import fixes applied.");
