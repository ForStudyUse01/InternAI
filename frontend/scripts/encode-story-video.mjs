/**
 * Re-encodes the InternAI brand intro for scroll-scrubbing, and extracts a
 * poster from its final branded frame.
 *
 * Run manually — not part of the build:  npm run encode:story-video
 *
 * Why re-encode at all: the source has a single keyframe (frame 0). Seeking
 * backwards through it forces the decoder to restart from frame 0 every time,
 * which no amount of throttling in the player can hide. `-g 1` makes every
 * frame a keyframe so both scrub directions are a single-frame decode. The
 * cost is file size, which is why the output is lazily fetched only as the
 * story section approaches.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, "..");

const SOURCE = path.resolve(frontend, "..", "assets", "InternAI_brand_intro-Video.mp4");
const OUT_DIR = path.resolve(frontend, "public", "story");
const OUT_VIDEO = path.join(OUT_DIR, "internai-brand-intro.mp4");
const OUT_POSTER = path.join(OUT_DIR, "internai-brand-intro-poster.jpg");

/** Source is 8.000s @ 24fps; grab the poster just inside the last frame. */
const POSTER_TIME = "7.95";

function run(label, args) {
  const result = spawnSync(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
  if (result.status !== 0) {
    console.error(`${label} failed:\n${result.stderr?.toString() ?? "(no stderr)"}`);
    process.exit(1);
  }
}

function mb(file) {
  return (fs.statSync(file).size / 1024 / 1024).toFixed(2);
}

if (!fs.existsSync(SOURCE)) {
  console.error(`Source not found: ${SOURCE}`);
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

run("video encode", [
  "-y",
  "-i", SOURCE,
  // The video is decorative and always muted — the audio track is dead weight.
  "-an",
  "-c:v", "libx264",
  "-preset", "slow",
  "-crf", "23",
  // Every frame an I-frame. keyint_min + sc_threshold stop x264 from
  // second-guessing -g and inserting P-frames on low-motion stretches.
  "-g", "1",
  "-keyint_min", "1",
  "-sc_threshold", "0",
  "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
  OUT_VIDEO
]);

run("poster extract", [
  "-y",
  "-ss", POSTER_TIME,
  "-i", SOURCE,
  "-frames:v", "1",
  "-q:v", "4",
  OUT_POSTER
]);

console.log(`source  ${mb(SOURCE)} MB  ${path.relative(frontend, SOURCE)}`);
console.log(`video   ${mb(OUT_VIDEO)} MB  ${path.relative(frontend, OUT_VIDEO)}`);
console.log(`poster  ${mb(OUT_POSTER)} MB  ${path.relative(frontend, OUT_POSTER)}`);
