/**
 * Where the game server lives.
 *
 * The board is static (GitHub Pages); the rooms run in a Cloudflare Durable
 * Object on another origin. The address is baked in at build time via
 * VITE_SERVER_URL — somebody running their own worker points a build at it with
 * ?server=https://... , which is remembered from then on.
 *
 * When the value is empty the app talks to its own origin, which is what the
 * `wrangler dev` setup and a Worker-only deploy both want.
 */
const BUILT_IN = (import.meta.env.VITE_SERVER_URL ?? '').trim();

const KEY = 'mnbgold.server';

function normalise(url: string): string {
  return String(url).trim().replace(/\/+$/, '');
}

/** Base URL for API calls — '' means same-origin. */
export function serverUrl(): string {
  const override = new URLSearchParams(location.search).get('server');
  if (override) {
    const clean = normalise(override);
    try {
      localStorage.setItem(KEY, clean);
    } catch {
      /* private mode */
    }
    return clean;
  }
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved;
  } catch {
    /* private mode */
  }
  return normalise(BUILT_IN);
}

export function apiUrl(path: string): string {
  return `${serverUrl()}${path}`;
}

export function socketUrl(code: string): string {
  const base = serverUrl();
  if (!base) {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}/api/room/${code}/ws`;
  }
  return `${base.replace(/^http/, 'ws')}/api/room/${code}/ws`;
}
