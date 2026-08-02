import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Decision, GameEvent } from '../shared/types.js';
import { useRoom } from './lib/useRoom.js';
import { useTheme } from './lib/useTheme.js';
import { loadIdentity, saveIdentity, clearSession } from './lib/storage.js';
import { ScreenFade } from './components/ScreenFade.js';
import { TopBar } from './components/TopBar.js';
import { RulesSheet, ThemeSheet } from './components/Sheets.js';
import { Home } from './screens/Home.js';
import { Lobby } from './screens/Lobby.js';
import { Table } from './screens/Table.js';
import { dangerLevel } from './components/Hud.js';

type FlashKind = 'danger' | 'gold' | 'artifact';

/** The one event a frame is really "about", for the banner and the flash. */
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

function pickHeadline(events: GameEvent[]): GameEvent | null {
  let best: GameEvent | null = null;
  for (const e of events) {
    if (!best || EVENT_WEIGHT[e.t] > EVENT_WEIGHT[best.t]) best = e;
  }
  return best && EVENT_WEIGHT[best.t] > 0 ? best : null;
}

function deepLinkCode(): string {
  const fromPath = location.pathname.match(/^\/r\/([A-Za-z0-9]{4})\/?$/);
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
  const [sheet, setSheet] = useState<'theme' | 'rules' | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [flash, setFlash] = useState<{ id: number; kind: FlashKind } | null>(null);
  const [shaking, setShaking] = useState(false);
  const [struck, setStruck] = useState<string[]>([]);
  const [lastEvent, setLastEvent] = useState<GameEvent | null>(null);
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

    const head = pickHeadline(events);
    if (head) setLastEvent(head);

    const strike = events.find((e) => e.t === 'hazard-strike');
    if (strike && strike.t === 'hazard-strike') {
      setFlash({ id: Date.now(), kind: 'danger' });
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
      setFlash({ id: Date.now(), kind: 'artifact' });
      return;
    }

    const treasure = events.find((e) => e.t === 'treasure-split');
    if (treasure && treasure.t === 'treasure-split' && treasure.value >= 11) {
      setFlash({ id: Date.now(), kind: 'gold' });
    }
  }, [pulse]);

  // Clear the flash once its animation has played out.
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 760);
    return () => clearTimeout(id);
  }, [flash]);

  // A fresh expedition should not inherit the previous one's headline.
  const phase = room.state?.phase;
  useEffect(() => {
    if (phase === 'lobby') setLastEvent(null);
  }, [phase]);

  /* ---- Actions ---- */

  const shareInvite = useCallback(async () => {
    const code = room.state?.code;
    if (!code) return;
    const url = `${location.origin}/r/${code}`;
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
    setLastEvent(null);
    history.replaceState(null, '', '/');
  }, [room]);

  /* ---- Which screen ---- */

  const view = useMemo(() => {
    if (!room.state) return 'home';
    if (room.state.phase === 'lobby') return 'lobby';
    return 'table';
  }, [room.state]);

  const busy = room.conn === 'connecting';
  const dread = room.state && view === 'table' ? dangerLevel(room.state) : 0;

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
            onShare={shareInvite}
          />
        ) : (
          <Table
            state={room.state}
            youId={room.youId}
            lastEvent={lastEvent}
            struck={struck}
            onDecide={decide}
            onRematch={() => room.send({ t: 'rematch' })}
            onLeave={leave}
          />
        )}
      </ScreenFade>

      {/* Hard-edged vignette that tightens as hazards stack up. */}
      <div className="dread" data-level={dread} aria-hidden="true" />

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

      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.text}
          </div>
        ))}
      </div>

      {room.conn === 'reconnecting' || room.conn === 'offline' ? (
        <div className="toast-wrap" style={{ bottom: 'auto', top: 'calc(64px + var(--safe-top))' }}>
          <div className="toast">
            {room.conn === 'offline' ? 'Offline — still trying to reconnect…' : 'Reconnecting to the temple…'}
          </div>
        </div>
      ) : null}
    </div>
  );
}
