/** Small typed wrapper over localStorage — never throws, even in private mode. */

export interface SavedSession {
  code: string;
  token: string;
  name: string;
  avatar: number;
  savedAt: number;
}

export interface SavedTheme {
  mode: 'light' | 'dark';
  scheme: string;
}

const SESSION_KEY = 'mnbgold:session';
const IDENTITY_KEY = 'mnbgold:identity';
export const THEME_KEY = 'mnbgold:theme';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — the app still works, it just cannot resume */
  }
}

function drop(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing to do */
  }
}

/** A session older than this is not worth offering to resume. */
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;

export function loadSession(): SavedSession | null {
  const saved = read<SavedSession>(SESSION_KEY);
  if (!saved || typeof saved.code !== 'string' || typeof saved.token !== 'string') return null;
  if (Date.now() - saved.savedAt > SESSION_TTL_MS) {
    drop(SESSION_KEY);
    return null;
  }
  return saved;
}

export function saveSession(session: Omit<SavedSession, 'savedAt'>): void {
  write(SESSION_KEY, { ...session, savedAt: Date.now() });
}

export function clearSession(): void {
  drop(SESSION_KEY);
}

export function loadIdentity(): { name: string; avatar: number } {
  const saved = read<{ name: string; avatar: number }>(IDENTITY_KEY);
  return {
    name: typeof saved?.name === 'string' ? saved.name : '',
    avatar: Number.isFinite(saved?.avatar) ? Number(saved?.avatar) : Math.floor(Math.random() * 10),
  };
}

export function saveIdentity(name: string, avatar: number): void {
  write(IDENTITY_KEY, { name, avatar });
}

export function loadTheme(): SavedTheme | null {
  return read<SavedTheme>(THEME_KEY);
}

export function saveTheme(theme: SavedTheme): void {
  write(THEME_KEY, theme);
}
