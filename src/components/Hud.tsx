import type { PublicState } from '../../shared/types.js';
import { HazardCard } from '../art/Cards.js';
import { DeckIcon, GemIcon, TrophyIcon } from '../art/Icons.js';
import { RiskMeter } from './RiskMeter.js';

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

/**
 * One glanceable strip instead of a grid of labelled numbers.
 *
 * Nothing here is a sentence: the expedition is a row of pips, the deck and the
 * loose gems are icon + number, and the hazards that would now end the run are
 * the actual card faces, ringed in the danger colour. Seeing a face here twice
 * — once on the strip, once on the path — is the whole warning.
 */
export function StatusBar({ state, onScores }: { state: PublicState; onScores: () => void }) {
  const threats = [...new Set(state.hazardsOnPath)];

  return (
    <div className="status">
      <div className="pips" aria-label={`Expedition ${state.round} of ${state.totalRounds}`}>
        {Array.from({ length: state.totalRounds }, (_, i) => (
          <i key={i} className={i < state.round ? 'is-on' : ''} />
        ))}
      </div>

      <span className="chip" title="Cards left in the deck">
        <DeckIcon size={13} />
        {state.deckCount}
      </span>

      <span className="chip is-gem" title="Gems lying on the path">
        <GemIcon size={13} />
        {state.gemsOnPath}
      </span>

      {/* Extra mode only, and only while there is a next card to price. */}
      {state.readout ? <RiskMeter readout={state.readout} /> : null}

      <div className="threats" aria-label="Hazards that would end the expedition">
        {threats.map((h) => (
          <span key={h} className="threat">
            <HazardCard hazard={h} />
          </span>
        ))}
      </div>

      <span className="spacer" />

      <button type="button" className="icon-btn is-small" onClick={onScores} aria-label="Scores" title="Scores">
        <TrophyIcon size={16} />
      </button>
    </div>
  );
}
