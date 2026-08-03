import type { PublicState } from '../../shared/types.js';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../shared/types.js';
import { Avatar } from '../art/Avatars.js';
import { ClockIcon, CloseIcon, CopyIcon } from '../art/Icons.js';

interface Props {
  state: PublicState;
  youId: string | null;
  onStart: () => void;
  onKick: (playerId: string) => void;
  onTimer: (seconds: number) => void;
  onShare: () => void;
}

const TIMER_CHOICES = [0, 20, 30, 45];

export function Lobby({ state, youId, onStart, onKick, onTimer, onShare }: Props) {
  const you = state.players.find((p) => p.id === youId);
  const isHost = you?.isHost ?? false;
  const enough = state.players.length >= MIN_PLAYERS;

  return (
    <div className="screen lobby">
      <div className="code-hero">
        <span className="field-label">Room code</span>
        <span className="code-value mono">{state.code}</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onShare}>
          <CopyIcon size={16} />
          Share invite
        </button>
      </div>

      <div className="seats">
        <span className="field-label">
          Explorers {state.players.length}/{MAX_PLAYERS}
        </span>
        {/* minmax(0, …) on the tracks: without it a long name or the kick button
            sets a min-content floor and the second column runs off the screen. */}
        <div className="seat-grid">
          {state.players.map((p, i) => (
            <div
              key={p.id}
              className={`seat${p.connected ? '' : ' is-away'}`}
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <Avatar index={p.avatar} title={p.name} className="seat-avatar" />
              <div className="seat-who">
                <div className="seat-name">
                  {p.name}
                  {p.id === youId ? ' (you)' : ''}
                </div>
                {p.isHost ? <div className="seat-tag">Host</div> : null}
                {!p.connected ? <div className="seat-tag is-away">Away</div> : null}
              </div>
              {isHost && p.id !== youId ? (
                <button
                  type="button"
                  className="seat-kick"
                  onClick={() => onKick(p.id)}
                  aria-label={`Remove ${p.name}`}
                  title={`Remove ${p.name}`}
                >
                  <CloseIcon size={14} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {isHost ? (
        <div className="timer-pick">
          <ClockIcon size={16} />
          {TIMER_CHOICES.map((s) => (
            <button
              key={s}
              type="button"
              className={`btn btn-sm btn-block${state.settings.decisionSeconds === s ? '' : ' btn-ghost'}`}
              aria-pressed={state.settings.decisionSeconds === s}
              onClick={() => onTimer(s)}
            >
              {s === 0 ? 'Off' : `${s}s`}
            </button>
          ))}
        </div>
      ) : null}

      <div className="spacer" />

      {isHost ? (
        <button type="button" className="btn btn-block" disabled={!enough} onClick={onStart}>
          {enough ? 'Set off' : `Need ${MIN_PLAYERS - state.players.length} more`}
        </button>
      ) : (
        <div className="decide-locked">Waiting for the host…</div>
      )}
    </div>
  );
}
