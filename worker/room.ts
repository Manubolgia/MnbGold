/// <reference types="@cloudflare/workers-types" />

import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  type ClientMessage,
  type GameEvent,
  type LogEntry,
  type ServerMessage,
} from '../shared/types.js';
import {
  addPlayer,
  allDecided,
  beginRound,
  canJoin,
  createRoom,
  decide,
  defaultSettings,
  openDecisions,
  pushLog,
  removePlayer,
  resolveDecisions,
  revealCard,
  startGame,
  toPublic,
  type RoomState,
} from '../shared/engine.js';

/** How long each beat of the presentation lasts, in ms. */
const BEAT = {
  roundIntro: 2600,
  treasure: 2400,
  hazardSafe: 2400,
  artifact: 2700,
  strike: 4200,
  resolve: 3000,
  roundEnd: 5600,
} as const;

/** A disconnected player keeps their seat this long before the lobby drops them. */
const LOBBY_GRACE_MS = 15_000;
/** Rooms with nobody connected are swept after this long. */
const IDLE_SWEEP_MS = 2 * 60 * 60 * 1000;

interface Session {
  socket: WebSocket;
  playerId: string | null;
}

export class GameRoom implements DurableObject {
  private state: RoomState | null = null;
  private sessions = new Set<Session>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lobbyDrops = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private ctx: DurableObjectState) {
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<RoomState>('state');
      if (stored) {
        this.state = stored;
        // A room stored before a setting existed comes back without it.
        this.state.settings = { ...defaultSettings, ...this.state.settings };
        // Nobody is connected across an eviction.
        for (const p of this.state.players) p.connected = false;
      }
    });
  }

  /* -------------------------------------------------------------- */
  /* HTTP                                                            */
  /* -------------------------------------------------------------- */

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.endsWith('/create')) {
      const code = url.searchParams.get('code') ?? '';
      if (this.state) {
        return Response.json({ ok: false, reason: 'exists' }, { status: 409 });
      }
      this.state = createRoom(code, Date.now());
      await this.persist();
      return Response.json({ ok: true, code });
    }

    if (url.pathname.endsWith('/info')) {
      if (!this.state) return Response.json({ ok: false, reason: 'not-found' }, { status: 404 });
      return Response.json({
        ok: true,
        code: this.state.code,
        phase: this.state.phase,
        players: this.state.players.length,
        names: this.state.players.map((p) => p.name),
      });
    }

    if (url.pathname.endsWith('/ws')) {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected a WebSocket upgrade.', { status: 426 });
      }
      if (!this.state) return new Response('No such expedition.', { status: 404 });

      const pair = new WebSocketPair();
      this.accept(pair[1]);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    return new Response('Not found', { status: 404 });
  }

  /* -------------------------------------------------------------- */
  /* Sockets                                                         */
  /* -------------------------------------------------------------- */

  private accept(socket: WebSocket): void {
    socket.accept();
    const session: Session = { socket, playerId: null };
    this.sessions.add(session);

    socket.addEventListener('message', (event) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(typeof event.data === 'string' ? event.data : '');
      } catch {
        return;
      }
      this.onMessage(session, msg).catch((err) => {
        console.error('room message failed', err);
        this.send(session, { t: 'error', code: 'internal', message: 'Something went wrong in the temple.' });
      });
    });

    const close = () => this.onClose(session);
    socket.addEventListener('close', close);
    socket.addEventListener('error', close);
  }

  private async onMessage(session: Session, msg: ClientMessage): Promise<void> {
    const state = this.state;
    if (!state) return;
    state.lastActivity = Date.now();

    switch (msg.t) {
      case 'ping':
        this.send(session, { t: 'pong' });
        return;

      case 'hello':
        await this.onHello(session, msg);
        return;

      case 'start': {
        const player = this.playerOf(session);
        if (!player?.isHost) return;
        if (state.phase !== 'lobby' && state.phase !== 'game-over') return;
        if (state.players.length < MIN_PLAYERS) {
          this.send(session, {
            t: 'error',
            code: 'too-few',
            message: 'An expedition needs at least 2 explorers.',
          });
          return;
        }
        const events = startGame(state, this.rng);
        await this.advance(events, BEAT.roundIntro, () => this.stepReveal());
        return;
      }

      case 'rematch': {
        const player = this.playerOf(session);
        if (!player?.isHost) return;
        if (state.phase !== 'game-over') return;
        state.phase = 'lobby';
        state.round = 0;
        state.path = [];
        state.deck = [];
        state.log = [];
        for (const p of state.players) {
          p.chest = 0;
          p.hand = 0;
          p.artifacts = 0;
          p.artifactPoints = 0;
          p.inTemple = false;
          p.decision = null;
          p.leftWith = null;
          p.lostThisRound = null;
        }
        await this.broadcastState();
        return;
      }

      case 'decide': {
        const player = this.playerOf(session);
        if (!player) return;
        if (!decide(state, player.id, msg.decision)) return;
        if (allDecided(state)) {
          this.clearTimer();
          await this.stepResolve();
        } else {
          await this.broadcastState();
        }
        return;
      }

      case 'settings': {
        const player = this.playerOf(session);
        if (!player?.isHost || state.phase !== 'lobby') return;
        if (typeof msg.settings.decisionSeconds === 'number') {
          const s = Math.round(msg.settings.decisionSeconds);
          state.settings.decisionSeconds = Math.max(0, Math.min(120, s));
        }
        if (typeof msg.settings.extraMode === 'boolean') {
          state.settings.extraMode = msg.settings.extraMode;
        }
        await this.broadcastState();
        return;
      }

      case 'kick': {
        const player = this.playerOf(session);
        if (!player?.isHost || state.phase !== 'lobby') return;
        if (msg.playerId === player.id) return;
        for (const s of this.sessions) {
          if (s.playerId === msg.playerId) {
            this.send(s, { t: 'error', code: 'kicked', message: 'The host removed you from the expedition.' });
            s.playerId = null;
            try {
              s.socket.close(4000, 'kicked');
            } catch {
              /* already gone */
            }
          }
        }
        removePlayer(state, msg.playerId);
        await this.broadcastState();
        return;
      }
    }
  }

  private async onHello(session: Session, msg: Extract<ClientMessage, { t: 'hello' }>): Promise<void> {
    const state = this.state!;
    const name = sanitiseName(msg.name);

    // Reconnecting: the token reclaims the original seat, mid-expedition included.
    const existing = msg.token ? state.players.find((p) => p.token === msg.token) : undefined;
    if (existing) {
      const drop = this.lobbyDrops.get(existing.id);
      if (drop) {
        clearTimeout(drop);
        this.lobbyDrops.delete(existing.id);
      }
      // Close any stale socket still holding this seat.
      for (const s of this.sessions) {
        if (s !== session && s.playerId === existing.id) {
          s.playerId = null;
          try {
            s.socket.close(4001, 'replaced');
          } catch {
            /* already gone */
          }
        }
      }
      existing.connected = true;
      if (name) existing.name = name;
      session.playerId = existing.id;
      this.send(session, {
        t: 'welcome',
        you: existing.id,
        token: existing.token,
        state: toPublic(state, Date.now()),
      });
      await this.broadcastState();
      return;
    }

    const gate = canJoin(state);
    if (!gate.ok) {
      this.send(session, { t: 'error', code: 'cannot-join', message: gate.reason });
      return;
    }

    const player = addPlayer(state, {
      id: crypto.randomUUID(),
      name: name || `Explorer ${state.players.length + 1}`,
      token: crypto.randomUUID(),
      avatar: freeAvatar(state, msg.avatar),
    });
    session.playerId = player.id;

    this.send(session, {
      t: 'welcome',
      you: player.id,
      token: player.token,
      state: toPublic(state, Date.now()),
    });
    await this.broadcastState();
  }

  private onClose(session: Session): void {
    if (!this.sessions.has(session)) return;
    this.sessions.delete(session);
    const state = this.state;
    if (!state || !session.playerId) return;

    const player = state.players.find((p) => p.id === session.playerId);
    if (!player) return;
    // A second socket may already have taken over this seat.
    if ([...this.sessions].some((s) => s.playerId === player.id)) return;

    player.connected = false;

    if (state.phase === 'lobby') {
      // Hold the seat briefly so a flaky connection can come straight back.
      const handle = setTimeout(() => {
        this.lobbyDrops.delete(player.id);
        const current = this.state;
        if (!current || current.phase !== 'lobby') return;
        const stillGone = current.players.find((p) => p.id === player.id && !p.connected);
        if (!stillGone) return;
        removePlayer(current, player.id);
        void this.broadcastState();
      }, LOBBY_GRACE_MS);
      this.lobbyDrops.set(player.id, handle);
    }

    void this.broadcastState();
  }

  /* -------------------------------------------------------------- */
  /* Game clock                                                      */
  /* -------------------------------------------------------------- */

  /** Reveal the next card, then either open decisions or wind the round up. */
  private async stepReveal(): Promise<void> {
    const state = this.state!;
    const events = revealCard(state);
    const strike = events.some((e) => e.t === 'hazard-strike');
    const card = events.find((e): e is Extract<GameEvent, { t: 'card' }> => e.t === 'card');

    if (strike) {
      await this.advance(events, BEAT.strike, () => this.stepAfterRound());
      return;
    }

    const hold =
      card?.card.kind === 'artifact'
        ? BEAT.artifact
        : card?.card.kind === 'hazard'
          ? BEAT.hazardSafe
          : BEAT.treasure;

    await this.advance(events, hold, () => this.stepDecision());
  }

  private async stepDecision(): Promise<void> {
    const state = this.state!;
    if (!openDecisions(state, Date.now())) {
      await this.stepResolve();
      return;
    }
    await this.broadcastState();
    if (state.settings.decisionSeconds > 0) {
      // Small cushion so a decision sent right at the buzzer still lands.
      this.schedule(state.settings.decisionSeconds * 1000 + 400, () => this.stepResolve());
    }
  }

  private async stepResolve(): Promise<void> {
    const state = this.state!;
    if (state.phase !== 'decision') return;
    const events = resolveDecisions(state);
    const ended = events.some((e) => e.t === 'round-end');
    await this.advance(events, BEAT.resolve, () => (ended ? this.stepAfterRound() : this.stepReveal()));
  }

  private async stepAfterRound(): Promise<void> {
    const state = this.state!;
    if (state.phase === 'game-over') {
      await this.broadcastState();
      return;
    }
    this.schedule(BEAT.roundEnd, async () => {
      const events = beginRound(state, this.rng);
      await this.advance(events, BEAT.roundIntro, () => this.stepReveal());
    });
    await this.broadcastState();
  }

  /** Log + broadcast the events, then queue the next beat. */
  private async advance(events: GameEvent[], delay: number, next: () => Promise<void>): Promise<void> {
    const entries = pushLog(this.state!, events);
    await this.broadcastEvents(entries);
    this.schedule(delay, next);
  }

  private schedule(ms: number, fn: () => Promise<void> | void): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      Promise.resolve(fn()).catch((err) => console.error('room step failed', err));
    }, ms);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /* -------------------------------------------------------------- */
  /* Plumbing                                                        */
  /* -------------------------------------------------------------- */

  private get rng(): () => number {
    return () => {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0] / 4294967296;
    };
  }

  private playerOf(session: Session) {
    if (!session.playerId || !this.state) return undefined;
    return this.state.players.find((p) => p.id === session.playerId);
  }

  private send(session: Session, msg: ServerMessage): void {
    try {
      session.socket.send(JSON.stringify(msg));
    } catch {
      this.sessions.delete(session);
    }
  }

  private async broadcastState(): Promise<void> {
    const state = this.state;
    if (!state) return;
    state.seq += 1;
    const payload = JSON.stringify({ t: 'state', state: toPublic(state, Date.now()) } satisfies ServerMessage);
    this.fanout(payload);
    await this.persist();
  }

  private async broadcastEvents(events: LogEntry[]): Promise<void> {
    const state = this.state;
    if (!state) return;
    state.seq += 1;
    const payload = JSON.stringify({
      t: 'events',
      events,
      state: toPublic(state, Date.now()),
    } satisfies ServerMessage);
    this.fanout(payload);
    await this.persist();
  }

  private fanout(payload: string): void {
    for (const session of [...this.sessions]) {
      try {
        session.socket.send(payload);
      } catch {
        this.sessions.delete(session);
      }
    }
  }

  private async persist(): Promise<void> {
    if (!this.state) return;
    await this.ctx.storage.put('state', this.state);
    if (this.state.lastActivity + IDLE_SWEEP_MS < Date.now() && this.sessions.size === 0) {
      await this.ctx.storage.deleteAll();
      this.state = null;
    }
  }
}

/**
 * Honour the player's chosen explorer, but never seat two identical ones —
 * telling them apart at a glance is half the game.
 */
function freeAvatar(state: RoomState, requested: unknown): number {
  const taken = new Set(state.players.map((p) => p.avatar));
  const wanted = Number.isFinite(requested) ? Math.abs(Math.trunc(requested as number)) % MAX_PLAYERS : 0;
  if (!taken.has(wanted)) return wanted;
  for (let i = 0; i < MAX_PLAYERS; i++) {
    const candidate = (wanted + i) % MAX_PLAYERS;
    if (!taken.has(candidate)) return candidate;
  }
  return wanted;
}

function sanitiseName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\s+/g, ' ').trim().slice(0, 16);
}
