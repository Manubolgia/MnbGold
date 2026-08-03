/**
 * Authoritative Incan Gold rules engine.
 *
 * This is a faithful implementation of the published game:
 *  - 5 expeditions (rounds)
 *  - 15 treasure cards: 1 2 3 4 5 5 7 7 9 11 11 13 14 15 17
 *  - 15 hazard cards: 3 each of snake, spider, mummy, fire, rockfall
 *  - 5 artifact cards, one shuffled into the deck at the start of each round
 *  - Treasure is split evenly between the explorers still in the temple;
 *    the undividable remainder stays on the card
 *  - The second hazard of a type ends the expedition instantly: everyone still
 *    inside loses the gems in their hand, and one copy of that hazard is
 *    removed from the game
 *  - Explorers who walk out split the gems left on the path; a player who
 *    leaves *alone* also carries out every artifact on the path
 *  - Artifacts score 5 gems each for the first three recovered in the game,
 *    10 gems each for the fourth and fifth
 *  - Artifacts still on the path when an expedition ends are lost forever
 */

import {
  ARTIFACT_COUNT,
  HAZARD_COPIES,
  HAZARD_TYPES,
  MAX_PLAYERS,
  TOTAL_ROUNDS,
  TREASURE_VALUES,
  artifactValue,
  type Card,
  type Decision,
  type GameEvent,
  type HazardType,
  type LogEntry,
  type PathCard,
  type Phase,
  riskMultiplier,
  riskTier,
  type PublicPlayer,
  type PublicState,
  type RiskReadout,
  type Settings,
} from './types.js';

export interface EnginePlayer extends Omit<PublicPlayer, 'decision' | 'hasDecided'> {
  /** Secret until the decision window resolves. */
  decision: Decision | null;
  /** Auth token so a reconnecting device can reclaim this seat. */
  token: string;
  /** Order of joining, used for stable seating. */
  seat: number;
}

export interface RoomState {
  code: string;
  phase: Phase;
  round: number;
  players: EnginePlayer[];
  /** Face-down draw pile for the current expedition. Never sent to clients. */
  deck: Card[];
  path: PathCard[];
  /** One copy is struck from the game each time a hazard pair ends a round. */
  removedHazards: HazardType[];
  /** Artifact cards not yet shuffled into a deck. */
  artifactSupply: string[];
  artifactsClaimed: number;
  log: LogEntry[];
  logSeq: number;
  seq: number;
  settings: Settings;
  decisionDeadline: number | null;
  roundEndReason: 'hazard' | 'empty-temple' | null;
  createdAt: number;
  lastActivity: number;
}

export type Rng = () => number;

export const defaultSettings: Settings = { decisionSeconds: 30, extraMode: false };

/* ------------------------------------------------------------------ */
/* Risk (extra mode)                                                    */
/* ------------------------------------------------------------------ */

/**
 * The exact chance the next card ends the expedition.
 *
 * Not a heuristic: the deck is shuffled but its *contents* are known, and every
 * card is equally likely to be on top. So the probability is simply the share of
 * the remaining deck that is a second copy of a hazard already face-up — the
 * only cards that can end the run. Treasure and artifacts are always safe, and a
 * hazard type with no copy on the path yet is safe too.
 *
 * Computed server-side and only ever published as this one number, so extra mode
 * never leaks the deck order it was derived from.
 */
export function riskReadout(state: RoomState): RiskReadout {
  const facedUp = new Set(
    state.path.filter((c): c is Extract<PathCard, { kind: 'hazard' }> => c.kind === 'hazard').map((c) => c.hazard),
  );
  const deadly = state.deck.filter((c) => c.kind === 'hazard' && facedUp.has(c.hazard)).length;
  const deck = state.deck.length;
  const risk = deck > 0 ? deadly / deck : 0;
  return { risk, deadly, deck, multiplier: riskMultiplier(risk), tier: riskTier(risk).id };
}

export function createRoom(code: string, now: number): RoomState {
  return {
    code,
    phase: 'lobby',
    round: 0,
    players: [],
    deck: [],
    path: [],
    removedHazards: [],
    artifactSupply: [],
    artifactsClaimed: 0,
    log: [],
    logSeq: 0,
    seq: 0,
    settings: { ...defaultSettings },
    decisionDeadline: null,
    roundEndReason: null,
    createdAt: now,
    lastActivity: now,
  };
}

/* ------------------------------------------------------------------ */
/* Deck construction                                                    */
/* ------------------------------------------------------------------ */

export function buildRoundDeck(state: RoomState, rng: Rng): Card[] {
  const cards: Card[] = [];

  TREASURE_VALUES.forEach((value, i) => {
    cards.push({ kind: 'treasure', id: `t${i}`, value });
  });

  for (const hazard of HAZARD_TYPES) {
    const removed = state.removedHazards.filter((h) => h === hazard).length;
    for (let i = 0; i < HAZARD_COPIES - removed; i++) {
      cards.push({ kind: 'hazard', id: `h-${hazard}-${i}`, hazard });
    }
  }

  // One artifact joins the deck at the start of each expedition.
  const artifact = state.artifactSupply.shift();
  if (artifact) cards.push({ kind: 'artifact', id: artifact });

  return shuffle(cards, rng);
}

export function shuffle<T>(items: T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Players                                                              */
/* ------------------------------------------------------------------ */

export function addPlayer(
  state: RoomState,
  opts: { id: string; name: string; token: string; avatar: number },
): EnginePlayer {
  const seat = state.players.length;
  const player: EnginePlayer = {
    id: opts.id,
    name: opts.name,
    avatar: opts.avatar,
    color: seat % 10,
    connected: true,
    isHost: state.players.length === 0,
    inTemple: false,
    hand: 0,
    chest: 0,
    artifacts: 0,
    artifactPoints: 0,
    decision: null,
    leftWith: null,
    lostThisRound: null,
    token: opts.token,
    seat,
  };
  state.players.push(player);
  return player;
}

export function removePlayer(state: RoomState, playerId: string): void {
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return;
  const wasHost = state.players[idx].isHost;
  state.players.splice(idx, 1);
  if (wasHost && state.players.length > 0) state.players[0].isHost = true;
}

/**
 * A latecomer is always welcome; the only hard limit is the number of seats.
 *
 * Arriving mid-game does not drop them into the expedition already running —
 * that would either hand them a temple somebody else has been de-risking or
 * saddle them with a collapse they never chose to walk into. They wait at camp
 * with an empty chest and `beginRound` deals them in with everybody else.
 */
export function canJoin(state: RoomState): { ok: true } | { ok: false; reason: string } {
  if (state.players.length >= MAX_PLAYERS) return { ok: false, reason: 'This expedition is full (10 explorers).' };
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Round lifecycle                                                      */
/* ------------------------------------------------------------------ */

export function startGame(state: RoomState, rng: Rng): GameEvent[] {
  state.round = 0;
  state.removedHazards = [];
  state.artifactsClaimed = 0;
  state.artifactSupply = Array.from({ length: ARTIFACT_COUNT }, (_, i) => `a${i}`);
  state.log = [];
  state.logSeq = 0;
  for (const p of state.players) {
    p.chest = 0;
    p.hand = 0;
    p.artifacts = 0;
    p.artifactPoints = 0;
    p.leftWith = null;
    p.lostThisRound = null;
  }
  return beginRound(state, rng);
}

export function beginRound(state: RoomState, rng: Rng): GameEvent[] {
  state.round += 1;
  state.path = [];
  state.roundEndReason = null;
  state.decisionDeadline = null;
  state.deck = buildRoundDeck(state, rng);
  for (const p of state.players) {
    p.inTemple = true;
    p.hand = 0;
    p.decision = null;
    p.leftWith = null;
    p.lostThisRound = null;
  }
  state.phase = 'round-intro';
  return [{ t: 'round-start', round: state.round }];
}

/** Turn the top card of the deck face up and apply its effect. */
export function revealCard(state: RoomState): GameEvent[] {
  const events: GameEvent[] = [];
  const card = state.deck.pop();

  if (!card) {
    // Defensive: cannot happen with a legal deck, but never hang the room.
    return endRound(state, 'empty-temple');
  }

  for (const p of state.players) {
    p.leftWith = null;
    p.lostThisRound = null;
    p.decision = null;
  }

  state.phase = 'reveal';

  if (card.kind === 'treasure') {
    const explorers = state.players.filter((p) => p.inTemple);
    const each = explorers.length > 0 ? Math.floor(card.value / explorers.length) : 0;
    const remainder = card.value - each * explorers.length;
    for (const p of explorers) p.hand += each;
    const pathCard: PathCard = { kind: 'treasure', id: card.id, value: card.value, remaining: remainder };
    state.path.push(pathCard);
    events.push({ t: 'card', card: pathCard });
    events.push({
      t: 'treasure-split',
      value: card.value,
      each,
      remainder,
      players: explorers.length,
    });
    return events;
  }

  if (card.kind === 'artifact') {
    const pathCard: PathCard = { kind: 'artifact', id: card.id };
    state.path.push(pathCard);
    events.push({ t: 'card', card: pathCard });
    events.push({ t: 'artifact-found' });
    return events;
  }

  // Hazard.
  const isSecond = state.path.some((c) => c.kind === 'hazard' && c.hazard === card.hazard);
  const pathCard: PathCard = { kind: 'hazard', id: card.id, hazard: card.hazard };
  state.path.push(pathCard);
  events.push({ t: 'card', card: pathCard });

  if (!isSecond) {
    events.push({ t: 'hazard-safe', hazard: card.hazard });
    return events;
  }

  // The expedition collapses. Everyone still inside drops everything they carry.
  const victims = state.players.filter((p) => p.inTemple);
  const lost = victims.reduce((sum, p) => sum + p.hand, 0);
  for (const p of victims) {
    p.lostThisRound = p.hand;
    p.hand = 0;
    p.inTemple = false;
    p.decision = null;
  }
  // One copy of the offending hazard is removed from the game.
  state.removedHazards.push(card.hazard);

  events.push({
    t: 'hazard-strike',
    hazard: card.hazard,
    victims: victims.map((p) => p.id),
    lost,
  });
  events.push(...endRound(state, 'hazard'));
  return events;
}

/** Open the simultaneous decision window. Returns false if nobody is left inside. */
export function openDecisions(state: RoomState, now: number): boolean {
  const explorers = state.players.filter((p) => p.inTemple);
  if (explorers.length === 0) return false;
  for (const p of explorers) p.decision = null;
  state.phase = 'decision';
  state.decisionDeadline =
    state.settings.decisionSeconds > 0 ? now + state.settings.decisionSeconds * 1000 : null;
  return true;
}

export function decide(state: RoomState, playerId: string, decision: Decision): boolean {
  if (state.phase !== 'decision') return false;
  const player = state.players.find((p) => p.id === playerId);
  if (!player || !player.inTemple) return false;
  player.decision = decision;
  return true;
}

export function allDecided(state: RoomState): boolean {
  return state.players.filter((p) => p.inTemple).every((p) => p.decision !== null);
}

/**
 * Apply the simultaneous decisions. Undecided explorers (a dropped phone, or a
 * decision timer that ran out) walk out — the choice that protects their gems.
 */
export function resolveDecisions(state: RoomState): GameEvent[] {
  const events: GameEvent[] = [];
  state.phase = 'resolve';
  state.decisionDeadline = null;

  const explorers = state.players.filter((p) => p.inTemple);
  for (const p of explorers) {
    if (p.decision === null) p.decision = 'leave';
  }

  const leaving = explorers.filter((p) => p.decision === 'leave');

  // Extra mode pays at the odds the leavers actually faced when they chose —
  // read before the path is swept, since sweeping does not touch the deck.
  const multiplier = state.settings.extraMode ? riskReadout(state).multiplier : 1;

  if (leaving.length > 0) {
    const totalOnPath = state.path.reduce(
      (sum, c) => sum + (c.kind === 'treasure' ? c.remaining : 0),
      0,
    );
    const each = Math.floor(totalOnPath / leaving.length);
    const remainder = totalOnPath - each * leaving.length;

    // Sweep the path, then scatter the undividable gems back onto it.
    for (const c of state.path) if (c.kind === 'treasure') c.remaining = 0;
    let toScatter = remainder;
    for (const c of state.path) {
      if (toScatter === 0) break;
      if (c.kind === 'treasure') {
        c.remaining = 1;
        toScatter -= 1;
      }
    }

    let artifactsTaken = 0;
    if (leaving.length === 1) {
      // A lone explorer carries out every artifact on the path.
      const solo = leaving[0];
      const artifacts = state.path.filter((c) => c.kind === 'artifact');
      for (const _ of artifacts) {
        state.artifactsClaimed += 1;
        solo.artifacts += 1;
        solo.artifactPoints += artifactValue(state.artifactsClaimed);
      }
      artifactsTaken = artifacts.length;
      state.path = state.path.filter((c) => c.kind !== 'artifact');
    }

    // The multiplier rewards the gems carried out of the temple; artifacts are
    // scored at their printed value and are deliberately left out of it.
    let bonus = 0;
    for (const p of leaving) {
      p.hand += each;
      const paid = Math.round(p.hand * multiplier);
      bonus += paid - p.hand;
      p.chest += paid;
      p.leftWith = paid;
      p.hand = 0;
      p.inTemple = false;
    }

    events.push({
      t: 'leave',
      players: leaving.map((p) => p.id),
      each,
      remainder,
      artifacts: artifactsTaken,
      multiplier,
      bonus,
    });
  }

  if (state.players.every((p) => !p.inTemple)) {
    events.push(...endRound(state, 'empty-temple'));
  }

  return events;
}

export function endRound(state: RoomState, reason: 'hazard' | 'empty-temple'): GameEvent[] {
  const events: GameEvent[] = [];
  state.roundEndReason = reason;
  state.decisionDeadline = null;
  // Artifacts nobody carried out are lost for the rest of the game — they are
  // already out of the supply, so simply clearing the path is enough.
  state.phase = state.round >= TOTAL_ROUNDS ? 'game-over' : 'round-end';
  events.push({ t: 'round-end', round: state.round, reason });

  if (state.phase === 'game-over') {
    events.push({ t: 'game-over', winners: winners(state).map((p) => p.id) });
  }
  return events;
}

export function score(p: Pick<EnginePlayer, 'chest' | 'artifactPoints'>): number {
  return p.chest + p.artifactPoints;
}

export function winners(state: RoomState): EnginePlayer[] {
  if (state.players.length === 0) return [];
  const best = Math.max(...state.players.map(score));
  return state.players.filter((p) => score(p) === best);
}

/* ------------------------------------------------------------------ */
/* Serialisation                                                        */
/* ------------------------------------------------------------------ */

export function pushLog(state: RoomState, events: GameEvent[]): LogEntry[] {
  const entries = events.map((event) => ({
    id: ++state.logSeq,
    round: state.round,
    event,
  }));
  state.log.push(...entries);
  // Keep the tail bounded; the client only renders the recent history.
  if (state.log.length > 200) state.log.splice(0, state.log.length - 200);
  return entries;
}

export function toPublic(state: RoomState, now: number): PublicState {
  const revealDecisions = state.phase === 'resolve' || state.phase === 'round-end' || state.phase === 'game-over';
  return {
    code: state.code,
    phase: state.phase,
    round: state.round,
    totalRounds: TOTAL_ROUNDS,
    players: state.players.map<PublicPlayer>((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      connected: p.connected,
      isHost: p.isHost,
      inTemple: p.inTemple,
      hand: p.hand,
      chest: p.chest,
      artifacts: p.artifacts,
      artifactPoints: p.artifactPoints,
      hasDecided: p.decision !== null,
      decision: revealDecisions ? p.decision : null,
      leftWith: p.leftWith,
      lostThisRound: p.lostThisRound,
    })),
    path: state.path,
    deckCount: state.deck.length,
    hazardsOnPath: state.path.filter((c): c is Extract<PathCard, { kind: 'hazard' }> => c.kind === 'hazard').map((c) => c.hazard),
    removedHazards: state.removedHazards,
    artifactsInSupply: state.artifactSupply.length,
    artifactsOnPath: state.path.filter((c) => c.kind === 'artifact').length,
    artifactsClaimed: state.artifactsClaimed,
    gemsOnPath: state.path.reduce((sum, c) => sum + (c.kind === 'treasure' ? c.remaining : 0), 0),
    // Priced only while there is a next card to price, so the badge cannot
    // linger over a round that has already resolved.
    readout:
      state.settings.extraMode && (state.phase === 'decision' || state.phase === 'reveal')
        ? riskReadout(state)
        : null,
    decisionDeadline: state.decisionDeadline,
    settings: state.settings,
    log: state.log.slice(-60),
    seq: state.seq,
    now,
  };
}
