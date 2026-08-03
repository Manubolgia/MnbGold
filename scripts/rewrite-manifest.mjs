/**
 * Checks dist/manifest.webmanifest still resolves against wherever it is served.
 *
 * The manifest is written with relative URLs ("./", "./icons/…"), which the
 * browser resolves against the manifest's own address — so the same file works
 * at the origin root (the Worker) and under /<repo>/ (GitHub Pages) with nothing
 * to rewrite. That matters more than it sounds: an absolute "/" scope on a Pages
 * deploy puts every in-app URL outside the installed app's scope, and the PWA
 * drops into a browser tab with an address bar the moment it navigates.
 *
 * This script now only guards that invariant, so a hand-edit back to absolute
 * paths fails the build instead of shipping a PWA that breaks out of itself.
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = resolve(root, 'dist/manifest.webmanifest');

const manifest = JSON.parse(await readFile(file, 'utf8'));

const absolute = [
  ['start_url', manifest.start_url],
  ['scope', manifest.scope],
  ['id', manifest.id],
  ...(manifest.icons ?? []).map((icon, i) => [`icons[${i}].src`, icon.src]),
].filter(([, value]) => typeof value === 'string' && value.startsWith('/'));

if (absolute.length > 0) {
  console.error('manifest: these must be relative so the app installs under any base path:');
  for (const [key, value] of absolute) console.error(`  ${key} = ${value}`);
  process.exit(1);
}

console.log(`manifest: ok — relative throughout (base ${process.env.BASE_PATH ?? '/'})`);
