/**
 * Rasterises the sprite masters in assets-src/sprites/ into public/sprites/.
 *
 * The masters are traced vector art — thousands of paths each, which makes them
 * enormous (tens of MB) and pointless to ship: a card is drawn about 104px wide,
 * so a 360px PNG is already oversampled. Rasterising cuts the payload roughly
 * 16x with no visible difference.
 *
 * Run with `npm run sprites` after adding or editing a master. Requires Node 20+
 * (sharp will not load on 18).
 */
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = resolve(root, 'assets-src/sprites');
const outDir = resolve(root, 'public/sprites');

/** Cards are 5:7; explorer portraits are square. */
const CARD = { width: 360, height: 504 };
const EXPLORER = { width: 256, height: 256 };

/** Rendered at 3x the display size, then downsampled — keeps fine linework clean. */
const DENSITY = 300;

function targetFor(relPath) {
  return relPath.startsWith('explorers/') ? EXPLORER : CARD;
}

async function* svgFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* svgFiles(full);
    else if (entry.name.endsWith('.svg')) yield full;
  }
}

let count = 0;
let sourceBytes = 0;
let outBytes = 0;

for await (const file of svgFiles(sourceDir)) {
  const rel = relative(sourceDir, file);
  const { width, height } = targetFor(rel);
  const dest = resolve(outDir, rel.replace(/\.svg$/, '.png'));

  await mkdir(dirname(dest), { recursive: true });
  const png = await sharp(file, { density: DENSITY })
    .resize(width, height, { fit: 'fill' })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  await writeFile(dest, png);

  sourceBytes += (await stat(file)).size;
  outBytes += png.length;
  count += 1;
  console.log(`sprites: ${rel.replace(/\.svg$/, '.png')} (${width}x${height}, ${(png.length / 1024).toFixed(0)} KB)`);
}

const mb = (n) => (n / 1e6).toFixed(1);
console.log(`\nsprites: ${count} files — ${mb(sourceBytes)} MB of SVG in, ${mb(outBytes)} MB of PNG out.`);
