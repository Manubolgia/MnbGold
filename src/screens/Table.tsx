import { useEffect, useMemo, useState } from 'react';
import type { Decision, GameEvent, PublicState } from '../../shared/types.js';
import { Hud } from '../components/Hud.js';
import { Path } from '../components/Path.js';
import { Explorers } from '../components/Explorers.js';
import { DecideBar } from '../components/DecideBar.js';
import { LogView } from '../components/LogView.js';
import { Scores, totalScore } from '../components/Scores.js';
import { headline } from '../lib/describe.js';

interface Props {
  state: PublicState;
  youId: string | null;
  lastEvent: GameEvent | null;
  struck: string[];
  onDecide: (decision: Decision) => void;
  onRematch: () => void;
  onLeave: () => void;
}

/** Counts the decision window down without ever re-laying out the page. */
function Timer({ deadline, serverNow, seconds }: { deadline: number | null; serverNow: number; seconds: number }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (deadline === null) {
      setRemaining(0);
      return;
    }
    // Correct for the gap between the server clock and this device's clock.
    const skew = Date.now() - serverNow;
    const tick = () => setRemaining(Math.max(0, deadline + skew - Date.now()));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
    // serverNow is intentionally sampled once per decision window.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  const active = deadline !== null && seconds > 0;
  const urgent = active && remaining <= 5000;

  return (
    <div className={`timer${urgent ? ' is-urgent' : ''}`} aria-hidden="true">
      <div
        className="timer-fill"
        key={deadline ?? 'idle'}
        style={{
          animationDuration: active ? `${Math.max(0, remaining)}ms` : '0ms',
          opacity: active ? 1 : 0,
        }}
      />
    </div>
  );
}

export function Table({ state, youId, lastEvent, struck, onDecide, onRematch, onLeave }: Props) {
  const head = useMemo(() => headline(state.phase, lastEvent, state.players), [state.phase, lastEvent, state.players]);
  const you = state.players.find((p) => p.id === youId) ?? null;
  const isHost = you?.isHost ?? false;

  const roundOver = state.phase === 'round-end';
  const gameOver = state.phase === 'game-over';
  const lastRoundEnd = [...state.log].reverse().find((e) => e.event.t === 'round-end');
  const byHazard = lastRoundEnd?.event.t === 'round-end' && lastRoundEnd.event.reason === 'hazard';

  return (
    <>
      <Timer deadline={state.decisionDeadline} serverNow={state.now} seconds={state.settings.decisionSeconds} />

      <div className="screen table">
        <Hud state={state} />

        <div className="banner">
          {/* Keyed so each new message cross-fades in the same fixed-height slot. */}
          <div key={head.note} className={`banner-msg is-${head.tone}`}>
            <span className="banner-title">{head.title}</span>
            <span className="banner-note">{head.note}</span>
          </div>
        </div>

        <Path path={state.path} />

        <Explorers players={state.players} youId={youId} struck={struck} />

        <LogView log={state.log} players={state.players} />

        <div className="spacer" />
      </div>

      <DecideBar state={state} youId={youId} onDecide={onDecide} />

      {roundOver ? (
        <div className="overlay" role="status">
          <div className="sheet">
            <div className="sheet-head">
              <h2 className="sheet-title">{byHazard ? 'Disaster' : 'Camp made'}</h2>
              <span className="spacer" />
              <span className="field-label">
                Expedition {state.round} of {state.totalRounds}
              </span>
            </div>
            <p className="hint" style={{ marginBottom: 14 }}>
              {byHazard
                ? 'A second hazard of the same kind. Everyone still inside lost the gems in their hands.'
                : 'The last explorer is out. The temple is sealed until the next expedition.'}
            </p>
            <Scores players={state.players} youId={youId} />
            <p className="hint" style={{ marginTop: 14 }}>
              The next expedition starts in a moment…
            </p>
          </div>
        </div>
      ) : null}

      {gameOver ? (
        <div className="overlay" role="status">
          <div className="sheet">
            <div className="sheet-head">
              <h2 className="sheet-title">Final count</h2>
            </div>
            <p className="hint" style={{ marginBottom: 14 }}>
              {(() => {
                const best = Math.max(...state.players.map(totalScore));
                const champs = state.players.filter((p) => totalScore(p) === best);
                if (champs.length === 1) return `${champs[0].name} walks away with ${best} gems.`;
                return `${champs.map((c) => c.name).join(' and ')} tie on ${best} gems.`;
              })()}
            </p>
            <Scores players={state.players} youId={youId} />
            <div className="stack" style={{ marginTop: 18 }}>
              {isHost ? (
                <button type="button" className="btn btn-block" onClick={onRematch}>
                  Run it back
                </button>
              ) : (
                <div className="decide-locked" style={{ minHeight: 54 }}>
                  Waiting for the host…
                </div>
              )}
              <button type="button" className="btn btn-ghost btn-block" onClick={onLeave}>
                Leave
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
