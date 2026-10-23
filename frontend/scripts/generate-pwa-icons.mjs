import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const source = path.join(root, "public", "brand", "icon-mark.png");
const outDir = path.join(root, "public", "icons");

// Platform background (#000c13) — matches manifest background_color / theme_color.
const brandBg = { r: 0, g: 12, b: 19, alpha: 1 };
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

/**
 * Composite the (non-square) icon mark centered on a square canvas.
 * `innerRatio` controls how much of the canvas the mark occupies — smaller ratio
 * = more padding. Maskable icons need the mark inside the ~80% safe zone so
 * adaptive masks (circle/squircle) never clip it, so they use a smaller ratio.
 */
async function renderIcon(sharp, size, background, innerRatio) {
  const inner = Math.round(size * innerRatio);
  const resized = await sharp(source)
    .resize(inner, inner, { fit: "inside", withoutEnlargement: false })
    .toBuffer();
  const meta = await sharp(resized).metadata();
  const left = Math.round((size - (meta.width || inner)) / 2);
  const top = Math.round((size - (meta.height || inner)) / 2);

  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();
}

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.log("sharp not installed; skipping PWA icon generation.");
    return;
  }

  await mkdir(outDir, { recursive: true });

  // "any" purpose icons: transparent bleed, mark fills 82% of canvas.
  const anySizes = [192, 256, 384, 512];
  for (const size of anySizes) {
    const buf = await renderIcon(sharp, size, transparent, 0.82);
    await writeFile(path.join(outDir, `icon-${size}.png`), buf);
  }

  // "maskable" purpose icons: opaque brand background, mark inside 60% safe zone.
  for (const size of [192, 512]) {
    const buf = await renderIcon(sharp, size, brandBg, 0.6);
    await writeFile(path.join(outDir, `icon-maskable-${size}.png`), buf);
  }

  console.log("PWA icons generated in public/icons/ from public/brand/icon-mark.png");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
