// S077 #90 follow-up: Rasterize /public/icons/icon.svg into PWA-ready PNGs.
//
// Inputs:
//   public/icons/icon.svg           — 512x512 single-source-of-truth SVG (S073)
//
// Outputs:
//   public/icons/icon-192.png       — 192x192 PWA icon
//   public/icons/icon-512.png       — 512x512 PWA icon
//   public/og-image.png             — 1200x630 OG/Twitter share image
//                                     (dark bg + centered green orb)
//
// Usage:  node scripts/generate-pwa-icons.js
//
// The 192/512 outputs are referenced from manifest.json + index.html link
// tags. The 1200x630 OG image is used by WhatsApp/iMessage/Slack/Discord
// link-preview crawlers and gets a wider canvas so previews render with the
// brand background instead of being cropped on the orb alone.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "public", "icons", "icon.svg");
const out192 = join(root, "public", "icons", "icon-192.png");
const out512 = join(root, "public", "icons", "icon-512.png");
const outOG = join(root, "public", "og-image.png");

const svg = readFileSync(svgPath);

// PWA icons: square rasters at 192 and 512. Density bumped so the SVG
// vectors are crisp at scale (default density rasterizes at 72 DPI which
// can soft-blur the inner satellites at 192px).
async function pngFromSvg(size, outPath) {
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`✓ ${outPath} (${size}x${size})`);
}

// OG image: 1200x630 dark canvas + centered orb at ~520px so it has comfortable
// breathing room on either side (WhatsApp/iMessage center-crops landscape
// previews to ~1.91:1 — this matches OG spec). Background matches app shell.
async function ogFromSvg() {
  const W = 1200, H = 630;
  const orbSize = 520;

  // Step 1: rasterize the orb at the target size with alpha.
  const orbBuffer = await sharp(svg, { density: 512 })
    .resize(orbSize, orbSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Step 2: compose onto a dark brand-tinted canvas.
  await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: { r: 8, g: 8, b: 8, alpha: 1 }, // matches index.html splash bg
    },
  })
    .composite([
      {
        input: orbBuffer,
        // Center the orb horizontally + nudge slightly above vertical
        // center so the imagined wordmark zone below stays empty (room
        // for future "PadelHub" text overlay if we re-render later).
        left: Math.round((W - orbSize) / 2),
        top: Math.round((H - orbSize) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(outOG);
  console.log(`✓ ${outOG} (${W}x${H})`);
}

await pngFromSvg(192, out192);
await pngFromSvg(512, out512);
await ogFromSvg();
console.log("done.");
