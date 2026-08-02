/// <reference types="@cloudflare/workers-types" />

export { GameRoom } from './room.js';

export interface Env {
  ROOMS: DurableObjectNamespace;
  ASSETS: Fetcher;
}

/** Unambiguous alphabet — no O/0, I/1, or the letters people mishear on a call. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;

function newCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = '';
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

function normaliseCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  if (code.length !== CODE_LENGTH) return null;
  for (const ch of code) if (!CODE_ALPHABET.includes(ch)) return null;
  return code;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return json({ ok: true });
    }

    // Host a new expedition.
    if (url.pathname === '/api/room' && request.method === 'POST') {
      for (let attempt = 0; attempt < 8; attempt++) {
        const code = newCode();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        const res = await stub.fetch(`https://room/create?code=${code}`);
        if (res.ok) return json({ code });
      }
      return json({ error: 'Could not find a free expedition code. Try again.' }, 503);
    }

    const match = url.pathname.match(/^\/api\/room\/([^/]+)(\/ws)?$/);
    if (match) {
      const code = normaliseCode(decodeURIComponent(match[1]));
      if (!code) return json({ error: 'That code does not look right.' }, 400);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(code));

      if (match[2]) {
        return stub.fetch(`https://room/ws`, request);
      }
      return stub.fetch(`https://room/info`);
    }

    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'Not found' }, 404);
    }

    // Static assets, with an SPA fallback for deep links like /join/ABCD.
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;

    const accepts = request.headers.get('accept') ?? '';
    if (request.method === 'GET' && accepts.includes('text/html')) {
      return env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
    }
    return asset;
  },
} satisfies ExportedHandler<Env>;
