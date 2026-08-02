import { useEffect, useRef } from 'react';
import type { PathCard } from '../../shared/types.js';
import { CardArt } from '../art/Cards.js';
import { GemIcon } from '../art/Icons.js';

/** The face-up trail of cards. Scrolls itself to the newest card as it lands. */
export function Path({ path }: { path: PathCard[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const count = path.length;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    // Wait for the new card to be laid out before chasing it.
    const id = requestAnimationFrame(() => {
      el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [count]);

  return (
    <div className="path-wrap">
      {count === 0 ? (
        <p className="path-empty">The path is clear… for now</p>
      ) : (
        <div className="path" ref={scroller}>
          {path.map((card, i) => (
            <div
              key={card.id}
              className={`path-card ${i === count - 1 ? 'is-newest' : 'is-past'}`}
              style={{ animationDelay: '0ms' }}
            >
              <CardArt card={card} />
              <div className="card-gems">
                {card.kind === 'treasure' && card.remaining > 0 ? (
                  <>
                    <GemIcon size={12} />
                    {card.remaining}
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
