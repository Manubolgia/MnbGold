/**
 * Rasterises assets-src/icon.svg into the PNG sizes iOS and Android need.
 * Run with `npm run icons` after editing the source art.
 */
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'assets-src/icon.svg');
const outDir = resolve(root, 'public/icons');

const SIZES = [
  { file: 'icon-180.png', size: 180 }, // apple-touch-icon
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-256.png', size: 256 },
  { file: 'icon-512.png', size: 512 },
];

await mkdir(outDir, { recursive: true });
const svg = await readFile(source);

for (const { file, size } of SIZES) {
  const png = await sharp(svg, { density: 512 }).resize(size, size, { kernel: 'nearest' }).png().toBuffer();
  await writeFile(resolve(outDir, file), png);
  console.log(`icons: ${file} (${size}x${size})`);
}

await copyFile(source, resolve(outDir, 'icon.svg'));
console.log('icons: icon.svg');
