import { useEffect, useRef, useState } from 'react';
import type { PublicState } from '../../shared/types.js';

/** Adds a one-shot class whenever the value changes, to nudge the number. */
function useTick(value: number | string): string {
  const [ticking, setTicking] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setTicking(true);
    const id = setTimeout(() => setTicking(false), 440);
    return () => clearTimeout(id);
  }, [value]);

  return ticking ? 'hud-value is-ticking' : 'hud-value';
}

function Cell({ label, value, hot }: { label: string; value: string | number; hot?: boolean }) {
  const cls = useTick(value);
  return (
    <div className={`hud-cell${hot ? ' is-hot' : ''}`}>
      <span className="hud-label">{label}</span>
      <span className={cls}>{value}</span>
    </div>
  );
}

/**
 * How close the expedition is to collapsing: every hazard type already face-up
 * is a card in the deck that would end it.
 */
export function dangerLevel(state: PublicState): number {
  const distinct = new Set(state.hazardsOnPath).size;
  if (distinct >= 3) return 2;
  if (distinct >= 2) return 1;
  return 0;
}

export function Hud({ state }: { state: PublicState }) {
  const distinct = new Set(state.hazardsOnPath).size;
  return (
    <div className="hud">
      <Cell label="Expedition" value={`${state.round}/${state.totalRounds}`} />
      <Cell label="Deck" value={state.deckCount} />
      <Cell label="On path" value={state.gemsOnPath} />
      <Cell label="Threats" value={distinct} hot={distinct >= 3} />
    </div>
  );
}
