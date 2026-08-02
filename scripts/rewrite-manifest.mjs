/**
 * Rewrites dist/manifest.webmanifest for a non-root base path.
 *
 * Vite rewrites asset URLs it finds in HTML and JS, but the manifest is copied
 * verbatim out of public/, so its start_url, scope and icon paths still point at
 * the origin root. GitHub Pages serves the board from /<repo>/, which breaks
 * installing the PWA unless those are prefixed too.
 *
 * No-op when BASE_PATH is unset or '/', which is the Worker deploy.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.env.BASE_PATH ?? '/';
if (base === '/') {
  console.log('manifest: root base, nothing to rewrite');
  process.exit(0);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = resolve(root, 'dist/manifest.webmanifest');

const manifest = JSON.parse(await readFile(file, 'utf8'));
const withBase = (p) => `${base.replace(/\/$/, '')}${p}`;

manifest.start_url = base;
manifest.scope = base;
manifest.icons = manifest.icons.map((icon) => ({ ...icon, src: withBase(icon.src) }));

await writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`manifest: rewritten for ${base}`);
