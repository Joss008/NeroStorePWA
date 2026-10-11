import sharp from "sharp";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "icons");

const BASE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#dc2626"/>
      <stop offset="50%" stop-color="#7f1d1d"/>
      <stop offset="100%" stop-color="#450a0a"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f87171" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#ef4444" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="shine" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3"/>
      <stop offset="60%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <rect width="512" height="512" rx="96" fill="url(#shine)"/>
  <rect width="512" height="512" rx="96" fill="url(#glow)" opacity="0.4"/>
  <text x="256" y="340" font-family="Georgia, 'Times New Roman', serif" font-size="240" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="-8">BF</text>
</svg>
`;

const MASKABLE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#dc2626"/>
      <stop offset="50%" stop-color="#7f1d1d"/>
      <stop offset="100%" stop-color="#450a0a"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <text x="256" y="340" font-family="Georgia, 'Times New Roman', serif" font-size="200" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="-6">BF</text>
</svg>
`;

async function generate() {
  if (!existsSync(OUT_DIR)) {
    await mkdir(OUT_DIR, { recursive: true });
  }

  console.log("Generating PWA icons...");

  const targets = [
    { name: "icon-192x192.png", svg: BASE_SVG, size: 192 },
    { name: "icon-512x512.png", svg: BASE_SVG, size: 512 },
    { name: "maskable-icon-512x512.png", svg: MASKABLE_SVG, size: 512 },
    { name: "apple-touch-icon.png", svg: BASE_SVG, size: 180 },
    { name: "favicon-32x32.png", svg: BASE_SVG, size: 32 },
  ];

  for (const t of targets) {
    const buffer = await sharp(Buffer.from(t.svg))
      .resize(t.size, t.size)
      .png()
      .toBuffer();
    const outPath = join(OUT_DIR, t.name);
    await sharp(buffer).toFile(outPath);
    console.log(`  ✓ ${t.name} (${t.size}x${t.size})`);
  }

  // Generate favicon.ico from 32x32 png
  await sharp(Buffer.from(BASE_SVG)).resize(32, 32).toFile(join(__dirname, "..", "src", "app", "favicon.ico"));

  console.log("Icons generated successfully.");
}

generate().catch((err) => {
  console.error("Error generating icons:", err);
  process.exit(1);
});