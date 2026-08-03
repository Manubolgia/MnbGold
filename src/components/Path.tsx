import { useEffect, useRef } from 'react';
import type { PathCard } from '../../shared/types.js';
import { CardArt } from '../art/Cards.js';
import { GemIcon } from '../art/Icons.js';

/**
 * The face-up trail of cards, and the only part of the table that flexes: the
 * cards are sized off the height left over, so the board fits the phone instead
 * of the phone scrolling to fit the board. Scrolls itself to the newest card.
 */
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
      <div className="path" ref={scroller}>
        {path.map((card, i) => (
          <div key={card.id} className={`path-card ${i === count - 1 ? 'is-newest' : 'is-past'}`}>
            <CardArt card={card} />
            <div className="card-gems">
              {card.kind === 'treasure' && card.remaining > 0 ? (
                <>
                  <GemIcon size={11} />
                  {card.remaining}
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
