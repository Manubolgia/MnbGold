import type { Decision, PublicState } from '../../shared/types.js';
import { CheckIcon, ExitIcon, GemIcon, OnwardIcon, TentIcon } from '../art/Icons.js';

interface Props {
  state: PublicState;
  youId: string | null;
  onDecide: (decision: Decision) => void;
}

/**
 * One pip per explorer still inside, filled once they have locked in — and your
 * own pip is outlined, so you can see your own state too. It says "three of five
 * have chosen" without a sentence, and it is the same row in every phase, so the
 * bar never changes height.
 */
function Pips({ state, youId }: { state: PublicState; youId: string | null }) {
  const inside = state.players.filter((p) => p.inTemple);
  const ready = inside.filter((p) => p.hasDecided).length;
  return (
    <div className="pips is-wait" aria-label={`${ready} of ${inside.length} explorers ready`}>
      {inside.map((p) => (
        <i key={p.id} className={`${p.hasDecided ? 'is-on' : ''}${p.id === youId ? ' is-you' : ''}`} />
      ))}
    </div>
  );
}

/**
 * The commit bar. Always mounted and always the same height, so the table above
 * it never jumps between phases — only its contents cross-fade.
 *
 * Which way you went stays secret until everybody reveals, so a locked-in bar
 * only says *that* you chose: both buttons drain and a tick lights up. Tapping
 * again still changes your mind.
 */
export function DecideBar({ state, youId, onDecide }: Props) {
  const you = state.players.find((p) => p.id === youId) ?? null;
  const inTemple = you?.inTemple ?? false;
  const open = state.phase === 'decision' && inTemple;

  if (!open) {
    return (
      <div className="decide is-idle">
        <div className="decide-idle">
          {inTemple ? <GemIcon size={24} /> : <TentIcon size={24} />}
          <Pips state={state} youId={youId} />
        </div>
      </div>
    );
  }

  const locked = you?.hasDecided ?? false;
  const hand = you?.hand ?? 0;
  // In extra mode the honest figure is the multiplied one — that is what the
  // tent actually receives, so that is the number the button has to show.
  const multiplier = state.readout?.multiplier ?? 1;
  const takeaway = Math.round(hand * multiplier);
  const boosted = takeaway > hand;

  return (
    <div className={`decide${locked ? ' is-locked' : ''}`}>
      <button type="button" className="btn btn-secondary" onClick={() => onDecide('continue')}>
        <OnwardIcon size={26} />
        Press on
      </button>
      {/* The number is the point of this one: it is what you walk away with. */}
      <button type="button" className="btn btn-accent" onClick={() => onDecide('leave')}>
        <span className={`tally${boosted ? ' is-boosted' : ''}`}>
          <ExitIcon size={22} />
          <GemIcon size={16} />
          {takeaway}
          {boosted ? <span className="tally-mult">{multiplier}x</span> : null}
        </span>
        Get out
      </button>
      <div className="decide-foot">
        {locked ? (
          <span className="locked-tick" aria-label="Locked in">
            <CheckIcon size={14} />
          </span>
        ) : null}
        <Pips state={state} youId={youId} />
      </div>
    </div>
  );
}
