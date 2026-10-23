import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public", "brand");
const source = path.join(publicDir, "icon-mark.png");

/** Pads the (non-square) icon mark onto a square canvas, centered, preserving aspect ratio. */
async function squareIcon(sharp, size, background) {
  const inner = Math.round(size * 0.82);
  const resized = await sharp(source)
    .resize(inner, inner, { fit: "inside", withoutEnlargement: false })
    .toBuffer();
  const meta = await sharp(resized).metadata();
  const left = Math.round((size - (meta.width || inner)) / 2);
  const top = Math.round((size - (meta.height || inner)) / 2);

  return sharp({
    create: { width: size, height: size, channels: 4, background }
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();
}

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.log("sharp not installed; skipping favicon generation.");
    return;
  }

  await mkdir(publicDir, { recursive: true });
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  const darkTile = { r: 7, g: 13, b: 26, alpha: 1 }; // matches platform bg (#070d1a)

  const favicon16 = await squareIcon(sharp, 16, transparent);
  const favicon32 = await squareIcon(sharp, 32, transparent);
  const favicon48 = await squareIcon(sharp, 48, transparent);
  const appleTouch = await squareIcon(sharp, 180, darkTile);
  const nextIcon = await squareIcon(sharp, 64, transparent);

  await writeFile(path.join(publicDir, "favicon-16.png"), favicon16);
  await writeFile(path.join(publicDir, "favicon-32.png"), favicon32);
  await writeFile(path.join(publicDir, "favicon-48.png"), favicon48);
  await writeFile(path.join(publicDir, "apple-touch-icon.png"), appleTouch);
  await writeFile(path.join(root, "app", "icon.png"), nextIcon);

  console.log("Favicon PNG assets generated from public/brand/icon-mark.png");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
