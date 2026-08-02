/**
 * Bundles the TypeScript tests (and the engine they import) with esbuild, then
 * hands them to node:test. Keeps the engine as the single source of truth
 * instead of maintaining a duplicate JS copy for testing.
 */
import { rm, mkdir, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import esbuild from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outdir = resolve(root, 'node_modules/.tmp/tests');

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });

const testsDir = resolve(root, 'tests');
const entries = (await readdir(testsDir)).filter((f) => f.endsWith('.test.ts')).map((f) => resolve(testsDir, f));

if (entries.length === 0) {
  console.log('no tests found');
  process.exit(0);
}

await esbuild.build({
  entryPoints: entries,
  outdir,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external: ['node:*'],
  outExtension: { '.js': '.mjs' },
});

const files = (await readdir(outdir)).filter((f) => f.endsWith('.mjs')).map((f) => resolve(outdir, f));

const child = spawn(process.execPath, ['--test', ...files], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));
