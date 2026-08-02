import type { Decision, PublicState } from '../../shared/types.js';
import { ExitIcon, OnwardIcon } from '../art/Icons.js';

interface Props {
  state: PublicState;
  youId: string | null;
  onDecide: (decision: Decision) => void;
}

/**
 * The commit bar. It is always mounted and always the same height, so the table
 * above it never jumps between phases — only its contents cross-fade.
 */
export function DecideBar({ state, youId, onDecide }: Props) {
  const you = state.players.find((p) => p.id === youId) ?? null;
  const inTemple = you?.inTemple ?? false;
  const open = state.phase === 'decision' && inTemple;

  const waiting = state.players.filter((p) => p.inTemple && !p.hasDecided).length;

  if (!open) {
    let message = 'Watching from the campfire';
    if (state.phase === 'decision') {
      message = `Waiting on ${waiting} ${waiting === 1 ? 'explorer' : 'explorers'}…`;
    } else if (state.phase === 'round-intro') {
      message = 'Everyone walks in…';
    } else if (state.phase === 'round-end') {
      message = 'Breaking camp…';
    } else if (inTemple) {
      message = 'Hold your nerve…';
    }
    return (
      <div className="decide is-idle">
        <div className="decide-locked">{message}</div>
      </div>
    );
  }

  return (
    <div className="decide">
      <button type="button" className="btn btn-secondary" onClick={() => onDecide('continue')}>
        <OnwardIcon size={22} />
        Press on
        <span className="sub">Deeper into the dark</span>
      </button>
      <button type="button" className="btn btn-accent" onClick={() => onDecide('leave')}>
        <ExitIcon size={22} />
        Get out
        <span className="sub">Bank {you?.hand ?? 0} gems</span>
      </button>
      {/* Always rendered so locking in cannot resize the bar. */}
      <div className="decide-note">
        {you?.hasDecided
          ? `Locked in — waiting on ${waiting} ${waiting === 1 ? 'explorer' : 'explorers'}. Tap again to change.`
          : 'Everyone reveals at the same time.'}
      </div>
    </div>
  );
}
