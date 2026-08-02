import { useCallback, useEffect, useState } from 'react';
import { loadTheme, saveTheme } from './storage.js';

export type Mode = 'light' | 'dark';
export type SchemeId = 'temple' | 'jungle' | 'obsidian';

export interface Scheme {
  id: SchemeId;
  name: string;
  blurb: string;
  /** Preview swatches: main, secondary, accent. */
  swatch: [string, string, string];
}

export const SCHEMES: Scheme[] = [
  { id: 'temple', name: 'Temple', blurb: 'Gold · Jade · Crimson', swatch: ['#e3ae2e', '#2fb89a', '#e2452f'] },
  { id: 'jungle', name: 'Jungle', blurb: 'Jade · Amber · Ember', swatch: ['#3ecf9c', '#ecb63c', '#ef5a2b'] },
  { id: 'obsidian', name: 'Obsidian', blurb: 'Lapis · Bone · Molten', swatch: ['#6f90f7', '#d5dced', '#ff7a1a'] },
];

function currentMode(): Mode {
  const attr = document.documentElement.dataset.mode;
  return attr === 'light' ? 'light' : 'dark';
}

function currentScheme(): SchemeId {
  const attr = document.documentElement.dataset.scheme as SchemeId | undefined;
  return SCHEMES.some((s) => s.id === attr) ? (attr as SchemeId) : 'temple';
}

/** Keep the iOS status bar and PWA chrome in step with the palette. */
function syncMetaThemeColor(): void {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (!bg) return;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = bg;
}

export function useTheme() {
  const [mode, setMode] = useState<Mode>(currentMode);
  const [scheme, setScheme] = useState<SchemeId>(currentScheme);

  useEffect(() => {
    document.documentElement.dataset.mode = mode;
    document.documentElement.dataset.scheme = scheme;
    saveTheme({ mode, scheme });
    // Let the CSS transition start before we sample the new background.
    const id = requestAnimationFrame(syncMetaThemeColor);
    return () => cancelAnimationFrame(id);
  }, [mode, scheme]);

  // Follow the system only until the player expresses a preference.
  useEffect(() => {
    if (loadTheme()) return;
    const query = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (e: MediaQueryListEvent) => setMode(e.matches ? 'light' : 'dark');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const toggleMode = useCallback(() => setMode((m) => (m === 'dark' ? 'light' : 'dark')), []);

  return { mode, scheme, setMode, setScheme, toggleMode };
}
