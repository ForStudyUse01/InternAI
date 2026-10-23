/**
 * Validates every URL in courseRecommendations.json (HEAD request, fallback GET).
 * Run: node scripts/validate-course-recommendations.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(__dirname, "../lib/data/courseRecommendations.json");

const data = JSON.parse(readFileSync(jsonPath, "utf8"));
const entries = [];

for (const [skill, courses] of Object.entries(data)) {
  if (!Array.isArray(courses)) continue;
  for (const course of courses) {
    entries.push({ skill, title: course.title, url: course.url });
  }
}

async function fetchStatus(url, method) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; InternAI-CourseValidator/1.0)" }
    });
    return res.status;
  } catch {
    return 0;
  } finally {
    clearTimeout(timeout);
  }
}

async function checkUrl(url) {
  const headStatus = await fetchStatus(url, "HEAD");
  if (headStatus >= 200 && headStatus < 400) return true;
  const getStatus = await fetchStatus(url, "GET");
  return getStatus >= 200 && getStatus < 400;
}

let failed = 0;
for (let i = 0; i < entries.length; i += 8) {
  const batch = entries.slice(i, i + 8);
  const results = await Promise.all(
    batch.map(async (entry) => {
      const ok = await checkUrl(entry.url);
      return { ...entry, ok };
    })
  );
  for (const r of results) {
    if (!r.ok) {
      failed += 1;
      console.error(`FAIL [${r.skill}] ${r.title}\n  ${r.url}`);
    }
  }
}

console.log(`Checked ${entries.length} URLs. Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
