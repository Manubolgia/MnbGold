import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import type { Decision, GameEvent } from '../shared/types.js';
import { useRoom } from './lib/useRoom.js';
import { useTheme } from './lib/useTheme.js';
import { loadIdentity, saveIdentity, clearSession } from './lib/storage.js';
import { ScreenFade } from './components/ScreenFade.js';
import { TopBar } from './components/TopBar.js';
import { RulesSheet, ScoresSheet, ThemeSheet } from './components/Sheets.js';
import { Home } from './screens/Home.js';
import { Lobby } from './screens/Lobby.js';
import { Table } from './screens/Table.js';
import { dangerLevel } from './components/Hud.js';
import { ArtifactIcon, ExitIcon, GemIcon, SkullIcon } from './art/Icons.js';

type FlashKind = 'danger' | 'gold' | 'artifact';
type PopKind = 'gem' | 'skull' | 'artifact' | 'exit';

/** What the app is rooted at — '/' on the Worker, '/MnbGold/' on Pages. */
const BASE = import.meta.env.BASE_URL || '/';

/** The one event a frame is really "about", for the pop and the flash. */
const EVENT_WEIGHT: Record<GameEvent['t'], number> = {
  'hazard-strike': 100,
  'game-over': 90,
  leave: 80,
  'artifact-found': 70,
  'treasure-split': 60,
  'hazard-safe': 55,
  'round-end': 50,
  'round-start': 40,
  card: 0,
};

interface Pop {
  id: number;
  kind: PopKind;
  value: string | null;
  /** Second line, for when the headline number needs its total spelling out. */
  note?: string;
}

/*
 * The pop and the flash are siblings under the app shell and are keyed so each
 * new one restarts its animation, so their ids have to come from the same
 * counter — two `Date.now()` calls on one frame collide.
 */
let effectId = 0;
const nextId = () => ++effectId;

/**
 * The single wordless read-out for a frame: an icon and, at most, a number.
 * Anything that needs a sentence to explain it is not shown at all — the card
 * that landed and the tiles that changed are the explanation.
 */
function popFor(events: GameEvent[]): Pop | null {
  let best: GameEvent | null = null;
  for (const e of events) {
    if (!best || EVENT_WEIGHT[e.t] > EVENT_WEIGHT[best.t]) best = e;
  }
  if (!best) return null;

  const id = nextId();
  switch (best.t) {
    case 'hazard-strike':
      return { id, kind: 'skull', value: best.lost > 0 ? `−${best.lost}` : null };
    case 'leave':
      if (best.artifacts > 0) return { id, kind: 'artifact', value: `+${best.artifacts}` };
      // A multiplied escape is the whole point of extra mode: show what the
      // gamble paid, not the plain share of the path.
      if (best.bonus > 0) return { id, kind: 'gem', value: `${best.multiplier}x`, note: `+${best.bonus}` };
      return { id, kind: 'exit', value: best.each > 0 ? `+${best.each}` : null };
    case 'artifact-found':
      return { id, kind: 'artifact', value: null };
    case 'treasure-split':
      return best.each > 0 ? { id, kind: 'gem', value: `+${best.each}` } : null;
    default:
      return null;
  }
}

const POP_ART: Record<PopKind, (props: { size?: number }) => ReactElement> = {
  gem: GemIcon,
  skull: SkullIcon,
  artifact: ArtifactIcon,
  exit: ExitIcon,
};

function deepLinkCode(): string {
  // Matches /r/CODE wherever the app is rooted, so a Pages deploy under a
  // sub-path shares links that still work.
  const fromPath = location.pathname.match(/\/r\/([A-Za-z0-9]{4})\/?$/);
  if (fromPath) return fromPath[1].toUpperCase();
  const fromQuery = new URLSearchParams(location.search).get('r');
  return fromQuery ? fromQuery.toUpperCase().slice(0, 4) : '';
}

export function App() {
  const theme = useTheme();
  const room = useRoom();

  const identity = useRef(loadIdentity());
  const [name, setName] = useState(identity.current.name);
  const [avatar, setAvatar] = useState(identity.current.avatar);
  const [sheet, setSheet] = useState<'theme' | 'rules' | 'scores' | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [flash, setFlash] = useState<{ id: number; kind: FlashKind } | null>(null);
  const [shaking, setShaking] = useState(false);
  const [struck, setStruck] = useState<string[]>([]);
  const [pop, setPop] = useState<Pop | null>(null);
  const [prefill] = useState(deepLinkCode);

  // Reopening the app (or reloading mid-expedition) walks straight back into
  // the seat we still hold. The manual "Rejoin" card is the fallback if it fails.
  const autoResumed = useRef(false);
  useEffect(() => {
    if (autoResumed.current) return;
    if (!room.savedCode || room.conn !== 'idle') return;
    autoResumed.current = true;
    void room.resume();
  }, [room]);

  const toastId = useRef(0);
  const pushToast = useCallback((text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  useEffect(() => {
    saveIdentity(name, avatar);
  }, [name, avatar]);

  /* ---- One-shot effects driven by the events on each frame ---- */
  const pulse = room.pulse;
  useEffect(() => {
    if (pulse.length === 0) return;
    const events = pulse.map((e) => e.event);

    const next = popFor(events);
    if (next) setPop(next);

    const strike = events.find((e) => e.t === 'hazard-strike');
    if (strike && strike.t === 'hazard-strike') {
      setFlash({ id: nextId(), kind: 'danger' });
      setShaking(true);
      setStruck(strike.victims);
      const stopShake = setTimeout(() => setShaking(false), 640);
      const stopStruck = setTimeout(() => setStruck([]), 1600);
      return () => {
        clearTimeout(stopShake);
        clearTimeout(stopStruck);
      };
    }

    const artifact = events.find((e) => e.t === 'artifact-found');
    const soloGrab = events.find((e) => e.t === 'leave' && e.artifacts > 0);
    if (artifact || soloGrab) {
      setFlash({ id: nextId(), kind: 'artifact' });
      return;
    }

    // Cashing out at a multiplier is as big a moment as a fat treasure card.
    const paidOut = events.find((e) => e.t === 'leave' && e.bonus > 0);
    const treasure = events.find((e) => e.t === 'treasure-split');
    if (paidOut || (treasure && treasure.t === 'treasure-split' && treasure.value >= 11)) {
      setFlash({ id: nextId(), kind: 'gold' });
    }
  }, [pulse]);

  // Clear the one-shots once their animations have played out.
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 760);
    return () => clearTimeout(id);
  }, [flash]);

  useEffect(() => {
    if (!pop) return;
    const id = setTimeout(() => setPop(null), 1400);
    return () => clearTimeout(id);
  }, [pop]);

  // A fresh expedition should not inherit the previous one's pop.
  const phase = room.state?.phase;
  useEffect(() => {
    if (phase === 'lobby') setPop(null);
  }, [phase]);

  /* ---- Actions ---- */

  const shareInvite = useCallback(async () => {
    const code = room.state?.code;
    if (!code) return;
    const url = `${location.origin}${BASE}r/${code}`;
    const text = `Join my Incan Gold expedition — code ${code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Incan Gold', text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      pushToast('Invite link copied');
    } catch {
      pushToast(`Room code: ${code}`);
    }
  }, [room.state?.code, pushToast]);

  const copyCode = useCallback(async () => {
    const code = room.state?.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      pushToast('Code copied');
    } catch {
      pushToast(`Room code: ${code}`);
    }
  }, [room.state?.code, pushToast]);

  const decide = useCallback((decision: Decision) => room.send({ t: 'decide', decision }), [room]);

  const leave = useCallback(() => {
    room.leave();
    setPop(null);
    setSheet(null);
    // Back to the app's own root, never the origin root: stepping outside the
    // manifest scope is what drops an installed PWA into a browser tab.
    history.replaceState(null, '', BASE);
  }, [room]);

  /* ---- Which screen ---- */

  const view = useMemo(() => {
    if (!room.state) return 'home';
    if (room.state.phase === 'lobby') return 'lobby';
    return 'table';
  }, [room.state]);

  const busy = room.conn === 'connecting';
  const dread = room.state && view === 'table' ? dangerLevel(room.state) : 0;
  const PopArt = pop ? POP_ART[pop.kind] : null;

  return (
    <div className={`app${shaking ? ' is-shaking' : ''}`}>
      <TopBar
        code={room.state?.code ?? null}
        conn={room.conn}
        mode={theme.mode}
        onToggleMode={theme.toggleMode}
        onOpenTheme={() => setSheet('theme')}
        onOpenRules={() => setSheet('rules')}
        onCopyCode={copyCode}
        onLeave={room.state ? leave : undefined}
      />

      <ScreenFade k={view}>
        {view === 'home' || !room.state ? (
          <Home
            name={name}
            avatar={avatar}
            busy={busy}
            error={room.error}
            savedCode={room.savedCode}
            prefillCode={prefill}
            onName={setName}
            onAvatar={setAvatar}
            onHost={() => room.host(name.trim(), avatar)}
            onJoin={(code) => room.join(code, name.trim(), avatar)}
            onResume={room.resume}
            onForget={() => {
              clearSession();
              location.reload();
            }}
          />
        ) : view === 'lobby' ? (
          <Lobby
            state={room.state}
            youId={room.youId}
            onStart={() => room.send({ t: 'start' })}
            onKick={(playerId) => room.send({ t: 'kick', playerId })}
            onTimer={(decisionSeconds) => room.send({ t: 'settings', settings: { decisionSeconds } })}
            onExtraMode={(extraMode) => room.send({ t: 'settings', settings: { extraMode } })}
            onShare={shareInvite}
          />
        ) : (
          <Table
            state={room.state}
            youId={room.youId}
            struck={struck}
            onDecide={decide}
            onScores={() => setSheet('scores')}
            onRematch={() => room.send({ t: 'rematch' })}
            onLeave={leave}
          />
        )}
      </ScreenFade>

      {/* Hard-edged vignette that tightens as hazards stack up. */}
      <div className="dread" data-level={dread} aria-hidden="true" />

      {pop && PopArt ? (
        <div key={pop.id} className="pop" data-kind={pop.kind} aria-hidden="true">
          <PopArt size={54} />
          {pop.value ? <span className="pop-value">{pop.value}</span> : null}
          {pop.note ? <span className="pop-note">{pop.note}</span> : null}
        </div>
      ) : null}

      {flash ? <div key={flash.id} className="flash" data-kind={flash.kind} aria-hidden="true" /> : null}

      {sheet === 'theme' ? (
        <ThemeSheet
          mode={theme.mode}
          scheme={theme.scheme}
          onMode={theme.setMode}
          onScheme={theme.setScheme}
          onClose={() => setSheet(null)}
        />
      ) : null}
      {sheet === 'rules' ? <RulesSheet onClose={() => setSheet(null)} /> : null}
      {sheet === 'scores' && room.state ? (
        <ScoresSheet players={room.state.players} youId={room.youId} onClose={() => setSheet(null)} />
      ) : null}

      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.text}
          </div>
        ))}
      </div>

      {room.conn === 'reconnecting' || room.conn === 'offline' ? (
        <div className="toast-wrap is-top">
          <div className="toast">
            {room.conn === 'offline' ? 'Offline — still trying to reconnect…' : 'Reconnecting to the temple…'}
          </div>
        </div>
      ) : null}
    </div>
  );
}
