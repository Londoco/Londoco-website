// Londoco image optimiser (fixes: poorly optimised images, 4.75s mobile LCP saving,
// missing width/height). Run from the repo root:
//
//   npm install --no-save sharp
//   node scripts/optimise-images.mjs
//
// Reads  ./assets/*.png|jpg|jpeg   Writes  ./assets/optimised/   (originals untouched)
// It prints the width/height of every image so you can add them to your <img> tags.

import sharp from "sharp";
import { readdir, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const SRC = "assets";
const OUT = path.join(SRC, "optimised");
await mkdir(OUT, { recursive: true });

const kb = (n) => (n / 1024).toFixed(0) + "KB";
const files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g)$/i.test(f));

console.log("file | output | size before -> after | width x height");
for (const file of files) {
  const input = path.join(SRC, file);
  const base = path.parse(file).name;
  const before = (await stat(input)).size;
  const meta = await sharp(input).metadata();

  let jobs = [];
  if (base.startsWith("hero-")) {
    // Hero images: a mobile and a desktop size
    jobs = [800, 1600].map((w) => ({ name: `${base}-${w}.webp`, width: Math.min(w, meta.width), webp: { quality: 72 } }));
  } else if (base.includes("logo")) {
    // Logo: 520px wide covers a 255px logo at 2x density
    jobs = [
      { name: `${base}.webp`, width: Math.min(520, meta.width), webp: { quality: 85 } },
      { name: `${base}.png`, width: Math.min(520, meta.width), png: { palette: true, quality: 85, compressionLevel: 9 } },
    ];
  } else {
    jobs = [{ name: `${base}.webp`, width: Math.min(1600, meta.width), webp: { quality: 75 } }];
  }

  for (const job of jobs) {
    const outPath = path.join(OUT, job.name);
    let pipeline = sharp(input).resize({ width: job.width, withoutEnlargement: true });
    pipeline = job.webp ? pipeline.webp(job.webp) : pipeline.png(job.png);
    const info = await pipeline.toFile(outPath);
    console.log(`${file} | ${job.name} | ${kb(before)} -> ${kb(info.size)} | ${info.width}x${info.height}`);
  }
}
console.log("\nNext: point your CSS/HTML at /assets/optimised/..., add width and height attributes, then commit.");
