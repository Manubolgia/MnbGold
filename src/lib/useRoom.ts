/**
 * The client half of the room protocol.
 *
 * Owns one WebSocket, reconnects with backoff, and replays the saved token so a
 * dropped phone walks straight back into its seat mid-expedition.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ClientMessage, LogEntry, PublicState, ServerMessage } from '../../shared/types.js';
import { apiUrl, socketUrl } from './server.js';
import { clearSession, loadSession, saveSession } from './storage.js';

export type ConnState = 'idle' | 'connecting' | 'online' | 'reconnecting' | 'offline';

export interface RoomApi {
  conn: ConnState;
  state: PublicState | null;
  youId: string | null;
  error: string | null;
  /** Events that arrived on the last frame, for one-shot effects. */
  pulse: LogEntry[];
  host: (name: string, avatar: number) => Promise<void>;
  join: (code: string, name: string, avatar: number) => Promise<void>;
  resume: () => Promise<void>;
  leave: () => void;
  send: (msg: ClientMessage) => void;
  dismissError: () => void;
  savedCode: string | null;
}

const MAX_BACKOFF = 8000;
const PING_MS = 25_000;

export function useRoom(): RoomApi {
  const [conn, setConn] = useState<ConnState>('idle');
  const [state, setState] = useState<PublicState | null>(null);
  const [youId, setYouId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState<LogEntry[]>([]);
  const [savedCode, setSavedCode] = useState<string | null>(() => loadSession()?.code ?? null);

  const socketRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wantedRef = useRef<{ code: string; name: string; avatar: number } | null>(null);
  const seqRef = useRef(-1);
  const closedByUsRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (retryRef.current) {
      clearTimeout(retryRef.current);
      retryRef.current = null;
    }
    if (pingRef.current) {
      clearInterval(pingRef.current);
      pingRef.current = null;
    }
  }, []);

  const teardown = useCallback(() => {
    clearTimers();
    closedByUsRef.current = true;
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState <= WebSocket.OPEN) socket.close(1000, 'bye');
  }, [clearTimers]);

  const connect = useCallback(() => {
    const wanted = wantedRef.current;
    if (!wanted) return;

    closedByUsRef.current = false;
    setConn(attemptRef.current === 0 ? 'connecting' : 'reconnecting');

    const socket = new WebSocket(socketUrl(wanted.code));
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      attemptRef.current = 0;
      const saved = loadSession();
      const token = saved && saved.code === wanted.code ? saved.token : null;
      socket.send(
        JSON.stringify({ t: 'hello', name: wanted.name, avatar: wanted.avatar, token } satisfies ClientMessage),
      );
      if (pingRef.current) clearInterval(pingRef.current);
      pingRef.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ t: 'ping' } satisfies ClientMessage));
      }, PING_MS);
    });

    socket.addEventListener('message', (event) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      switch (msg.t) {
        case 'welcome':
          setConn('online');
          setYouId(msg.you);
          seqRef.current = msg.state.seq;
          setState(msg.state);
          saveSession({ code: wanted.code, token: msg.token, name: wanted.name, avatar: wanted.avatar });
          setSavedCode(wanted.code);
          setError(null);
          break;

        case 'state':
          if (msg.state.seq < seqRef.current) break;
          seqRef.current = msg.state.seq;
          setState(msg.state);
          break;

        case 'events':
          if (msg.state.seq < seqRef.current) break;
          seqRef.current = msg.state.seq;
          setState(msg.state);
          setPulse(msg.events);
          break;

        case 'error':
          setError(msg.message);
          if (msg.code === 'cannot-join' || msg.code === 'kicked') {
            clearSession();
            setSavedCode(null);
            wantedRef.current = null;
            teardown();
            setConn('idle');
            setState(null);
            setYouId(null);
          }
          break;

        case 'pong':
          break;
      }
    });

    const onDown = () => {
      if (pingRef.current) {
        clearInterval(pingRef.current);
        pingRef.current = null;
      }
      if (closedByUsRef.current || !wantedRef.current) return;

      attemptRef.current += 1;
      setConn(attemptRef.current > 4 ? 'offline' : 'reconnecting');
      const delay = Math.min(MAX_BACKOFF, 500 * 2 ** (attemptRef.current - 1)) + Math.random() * 250;
      retryRef.current = setTimeout(connect, delay);
    };

    socket.addEventListener('close', onDown);
    socket.addEventListener('error', onDown);
  }, [teardown]);

  const startWith = useCallback(
    (code: string, name: string, avatar: number) => {
      teardown();
      attemptRef.current = 0;
      seqRef.current = -1;
      wantedRef.current = { code, name, avatar };
      connect();
    },
    [connect, teardown],
  );

  const host = useCallback(
    async (name: string, avatar: number) => {
      setError(null);
      setConn('connecting');
      try {
        const res = await fetch(apiUrl('/api/room'), { method: 'POST' });
        if (!res.ok) throw new Error('Could not open a room.');
        const { code } = (await res.json()) as { code: string };
        // A brand-new room must not inherit an old seat token.
        clearSession();
        startWith(code, name, avatar);
      } catch {
        setConn('idle');
        setError('Could not reach the temple. Check your connection and try again.');
      }
    },
    [startWith],
  );

  const join = useCallback(
    async (code: string, name: string, avatar: number) => {
      const clean = code.trim().toUpperCase();
      setError(null);
      setConn('connecting');
      try {
        const res = await fetch(apiUrl(`/api/room/${encodeURIComponent(clean)}`));
        if (!res.ok) {
          setConn('idle');
          setError('No expedition with that code. Check the letters and try again.');
          return;
        }
        const saved = loadSession();
        if (saved && saved.code !== clean) clearSession();
        startWith(clean, name, avatar);
      } catch {
        setConn('idle');
        setError('Could not reach the temple. Check your connection and try again.');
      }
    },
    [startWith],
  );

  const resume = useCallback(async () => {
    const saved = loadSession();
    if (!saved) return;
    setError(null);
    setConn('connecting');
    try {
      const res = await fetch(apiUrl(`/api/room/${encodeURIComponent(saved.code)}`));
      if (!res.ok) {
        clearSession();
        setSavedCode(null);
        setConn('idle');
        setError('That expedition has ended.');
        return;
      }
      startWith(saved.code, saved.name, saved.avatar);
    } catch {
      setConn('idle');
      setError('Could not reach the temple. Check your connection and try again.');
    }
  }, [startWith]);

  const leave = useCallback(() => {
    wantedRef.current = null;
    teardown();
    clearSession();
    setSavedCode(null);
    setConn('idle');
    setState(null);
    setYouId(null);
    setPulse([]);
    seqRef.current = -1;
  }, [teardown]);

  const send = useCallback((msg: ClientMessage) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
  }, []);

  // Coming back from the background on iOS often leaves a dead socket behind.
  useEffect(() => {
    const wake = () => {
      if (document.visibilityState !== 'visible') return;
      if (!wantedRef.current) return;
      const socket = socketRef.current;
      if (!socket || socket.readyState > WebSocket.OPEN) {
        attemptRef.current = 0;
        connect();
      }
    };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    return () => {
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
    };
  }, [connect]);

  useEffect(() => () => teardown(), [teardown]);

  const dismissError = useCallback(() => setError(null), []);

  return useMemo(
    () => ({ conn, state, youId, error, pulse, host, join, resume, leave, send, dismissError, savedCode }),
    [conn, state, youId, error, pulse, host, join, resume, leave, send, dismissError, savedCode],
  );
}
