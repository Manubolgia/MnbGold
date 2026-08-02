/**
 * Shared vocabulary between the Cloudflare Worker (authoritative) and the PWA client.
 * The client never sees the deck contents — only its size.
 */

export const MAX_PLAYERS = 10;
export const MIN_PLAYERS = 2;
export const TOTAL_ROUNDS = 5;

/** The five hazard types, three physical copies of each in the box. */
export const HAZARD_TYPES = ['snake', 'spider', 'mummy', 'fire', 'rockfall'] as const;
export type HazardType = (typeof HAZARD_TYPES)[number];

/** The 15 treasure card values, exactly as printed in Incan Gold. */
export const TREASURE_VALUES = [1, 2, 3, 4, 5, 5, 7, 7, 9, 11, 11, 13, 14, 15, 17] as const;

/** Copies of each hazard in the deck at game start. */
export const HAZARD_COPIES = 3;

/** Five artifact cards; one is shuffled in at the start of each round. */
export const ARTIFACT_COUNT = 5;

/**
 * The first three artifacts recovered over the whole game are worth 5 gems,
 * the fourth and fifth are worth 10.
 */
export function artifactValue(nthClaimedOverall: number): number {
  return nthClaimedOverall <= 3 ? 5 : 10;
}

export type Card =
  | { kind: 'treasure'; id: string; value: number }
  | { kind: 'hazard'; id: string; hazard: HazardType }
  | { kind: 'artifact'; id: string };

/** A card face-up on the path. Treasures remember the gems nobody could divide. */
export type PathCard =
  | { kind: 'treasure'; id: string; value: number; remaining: number }
  | { kind: 'hazard'; id: string; hazard: HazardType }
  | { kind: 'artifact'; id: string };

export type Decision = 'continue' | 'leave';

export type Phase =
  | 'lobby'
  | 'round-intro'
  | 'reveal'
  | 'decision'
  | 'resolve'
  | 'round-end'
  | 'game-over';

export interface PublicPlayer {
  id: string;
  name: string;
  /** Index into the explorer avatar art set. */
  avatar: number;
  color: number;
  connected: boolean;
  isHost: boolean;
  /** Still walking the temple this round. */
  inTemple: boolean;
  /** Gems carried this round — lost if a hazard pair strikes. */
  hand: number;
  /** Gems safe in the tent. */
  chest: number;
  /** Artifacts recovered, and the points they are worth. */
  artifacts: number;
  artifactPoints: number;
  /** Whether this player has locked in a decision (the choice stays secret). */
  hasDecided: boolean;
  /** Revealed only during 'resolve' and later. */
  decision: Decision | null;
  /** Set for one beat after they walk out, to drive the exit animation. */
  leftWith: number | null;
  /** Set for one beat when a hazard pair wipes them out. */
  lostThisRound: number | null;
}

export type GameEvent =
  | { t: 'round-start'; round: number }
  | { t: 'card'; card: PathCard }
  | { t: 'treasure-split'; value: number; each: number; remainder: number; players: number }
  | { t: 'hazard-safe'; hazard: HazardType }
  | { t: 'hazard-strike'; hazard: HazardType; victims: string[]; lost: number }
  | { t: 'artifact-found' }
  | { t: 'leave'; players: string[]; each: number; remainder: number; artifacts: number }
  | { t: 'round-end'; round: number; reason: 'hazard' | 'empty-temple' }
  | { t: 'game-over'; winners: string[] };

export interface LogEntry {
  id: number;
  round: number;
  event: GameEvent;
}

export interface Settings {
  /** Seconds allowed for the simultaneous decision. 0 disables the timer. */
  decisionSeconds: number;
}

/** The snapshot every client renders from. */
export interface PublicState {
  code: string;
  phase: Phase;
  round: number;
  totalRounds: number;
  players: PublicPlayer[];
  path: PathCard[];
  deckCount: number;
  /** Hazards face-up on the path this round (for the danger meter). */
  hazardsOnPath: HazardType[];
  /** Hazard types removed from the game for good. */
  removedHazards: HazardType[];
  artifactsInSupply: number;
  artifactsOnPath: number;
  artifactsClaimed: number;
  /** Gems still lying on the path, undivided. */
  gemsOnPath: number;
  /** Unix ms when the decision window closes, if a timer is running. */
  decisionDeadline: number | null;
  settings: Settings;
  log: LogEntry[];
  /** Monotonic, so clients can ignore out-of-order frames. */
  seq: number;
  /** Server clock, so clients can correct for drift on the timer. */
  now: number;
}

export type ClientMessage =
  | { t: 'hello'; name: string; token: string | null; avatar: number }
  | { t: 'start' }
  | { t: 'decide'; decision: Decision }
  | { t: 'settings'; settings: Partial<Settings> }
  | { t: 'kick'; playerId: string }
  | { t: 'rematch' }
  | { t: 'ping' };

export type ServerMessage =
  | { t: 'welcome'; you: string; token: string; state: PublicState }
  | { t: 'state'; state: PublicState }
  | { t: 'events'; events: LogEntry[]; state: PublicState }
  | { t: 'error'; code: string; message: string }
  | { t: 'pong' };
