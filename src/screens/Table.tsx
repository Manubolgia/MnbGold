import { useEffect, useState } from 'react';
import type { Decision, PublicState } from '../../shared/types.js';
import { StatusBar } from '../components/Hud.js';
import { Path } from '../components/Path.js';
import { Explorers } from '../components/Explorers.js';
import { DecideBar } from '../components/DecideBar.js';
import { RiskMeter } from '../components/RiskMeter.js';
import { Scores } from '../components/Scores.js';
import { ExitIcon, SkullIcon, TentIcon, TrophyIcon } from '../art/Icons.js';

interface Props {
  state: PublicState;
  youId: string | null;
  struck: string[];
  onDecide: (decision: Decision) => void;
  onScores: () => void;
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

/**
 * The table.
 *
 * Three fixed-purpose bands that always fit the phone: the status strip, the
 * path (which takes whatever height is left and sizes its cards to match), and
 * the explorer board. Nothing here scrolls vertically and nothing here is a
 * paragraph — the state of the game is carried by the card faces, the tiles and
 * the numbers on them.
 */
export function Table({ state, youId, struck, onDecide, onScores, onRematch, onLeave }: Props) {
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
        <StatusBar state={state} onScores={onScores} />
        <Path path={state.path} />
        <Explorers players={state.players} youId={youId} struck={struck} />
        {/* Extra mode only, and only while there is a next card to price. */}
        {state.readout ? <RiskMeter readout={state.readout} hand={you?.hand ?? 0} /> : null}
      </div>

      <DecideBar state={state} youId={youId} onDecide={onDecide} />

      {roundOver ? (
        <div className="overlay" role="status">
          <div className="sheet">
            <div className={`verdict${byHazard ? ' is-bad' : ''}`}>
              {byHazard ? <SkullIcon size={40} /> : <TentIcon size={40} />}
              <div className="pips is-big" aria-label={`Expedition ${state.round} of ${state.totalRounds}`}>
                {Array.from({ length: state.totalRounds }, (_, i) => (
                  <i key={i} className={i < state.round ? 'is-on' : ''} />
                ))}
              </div>
            </div>
            <Scores players={state.players} youId={youId} />
          </div>
        </div>
      ) : null}

      {gameOver ? (
        <div className="overlay" role="status">
          <div className="sheet">
            <div className="verdict is-final">
              <TrophyIcon size={44} />
            </div>
            <Scores players={state.players} youId={youId} />
            <div className="stack" style={{ marginTop: 16 }}>
              {isHost ? (
                <button type="button" className="btn btn-block" onClick={onRematch}>
                  Run it back
                </button>
              ) : null}
              <button type="button" className="btn btn-ghost btn-block" onClick={onLeave}>
                <ExitIcon size={18} />
                Leave
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
