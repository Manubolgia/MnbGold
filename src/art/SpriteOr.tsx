/**
 * Renders a custom sprite if one exists, otherwise the built-in SVG art.
 *
 * `src` is given without an extension; SVG is tried first, then PNG, so either
 * format drops in with no configuration. The result is memoised per slot for
 * the session, so a missing sprite costs one probe rather than one per card
 * drawn. Until the probe settles the built-in art is on screen, so the table
 * never shows a gap.
 */
import { useEffect, useState, type ReactNode } from 'react';

/**
 * Tried in order. PNG first because `npm run sprites` generates PNGs from the
 * masters in assets-src/; a hand-placed .svg still wins if no .png exists.
 */
const EXTENSIONS = ['png', 'svg'];

type Result = { found: true; url: string } | { found: false };

const cache = new Map<string, Result>();
const waiting = new Map<string, Promise<Result>>();

function load(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

async function probe(base: string): Promise<Result> {
  for (const ext of EXTENSIONS) {
    const url = `${base}.${ext}`;
    if (await load(url)) return { found: true, url };
  }
  return { found: false };
}

function resolve(base: string): Promise<Result> {
  const done = waiting.get(base);
  if (done) return done;
  const pending = probe(base).then((result) => {
    cache.set(base, result);
    return result;
  });
  waiting.set(base, pending);
  return pending;
}

export function SpriteOr({
  src,
  alt,
  className,
  children,
}: {
  src: string;
  alt: string;
  className?: string;
  children: ReactNode;
}) {
  const [result, setResult] = useState<Result | null>(() => cache.get(src) ?? null);

  useEffect(() => {
    const known = cache.get(src);
    if (known) {
      setResult(known);
      return;
    }
    let live = true;
    resolve(src).then((next) => {
      if (live) setResult(next);
    });
    return () => {
      live = false;
    };
  }, [src]);

  if (!result?.found) return <>{children}</>;

  const raster = result.url.endsWith('.svg') ? '' : ' is-raster';
  return (
    <img src={result.url} alt={alt} className={`sprite${raster}${className ? ` ${className}` : ''}`} draggable={false} />
  );
}
