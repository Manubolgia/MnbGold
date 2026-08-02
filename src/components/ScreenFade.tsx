import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

const EXIT_MS = 300;

/**
 * Cross-fades between screens. The outgoing screen is kept for one beat and
 * faded out on top of the incoming one, and both live in the same grid cell —
 * so a screen change never collapses the layout or jumps the scroll position.
 */
export function ScreenFade({ k, children }: { k: string; children: ReactNode }) {
  const [outgoing, setOutgoing] = useState<ReactNode>(null);
  const snapshot = useRef<ReactNode>(children);
  const prevKey = useRef(k);

  useLayoutEffect(() => {
    if (prevKey.current === k) return;
    prevKey.current = k;
    // `snapshot` still holds the previous render's tree at this point.
    setOutgoing(snapshot.current);
    const id = setTimeout(() => setOutgoing(null), EXIT_MS);
    return () => clearTimeout(id);
  }, [k]);

  useEffect(() => {
    snapshot.current = children;
  });

  return (
    <div className="fader">
      {outgoing ? (
        <div className="fade-layer is-leaving" aria-hidden="true">
          {outgoing}
        </div>
      ) : null}
      <div className="fade-layer" key={k}>
        {children}
      </div>
    </div>
  );
}
