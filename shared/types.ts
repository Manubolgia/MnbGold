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
  | {
      t: 'leave';
      players: string[];
      each: number;
      remainder: number;
      artifacts: number;
      /** Extra mode only: the multiplier paid, and the gems it added on top. */
      multiplier: number;
      bonus: number;
    }
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
  /** Extra mode: show the odds the next card ends the run, and pay a matching multiplier. */
  extraMode: boolean;
}

/**
 * Extra mode.
 *
 * The engine knows the deck exactly, so the chance the next card ends the
 * expedition is not an estimate: it is the share of the remaining deck that is a
 * second copy of a hazard already face-up on the path. That number is shown to
 * everybody before they choose, and the gems banked by walking out are paid at a
 * multiplier read off the same number — so pressing deeper into a temple that is
 * visibly about to collapse is what makes the payout worth taking.
 */

/** Multiplier at zero risk, and the ceiling at maximum risk. */
export const RISK_MULTIPLIER_MIN = 1;
export const RISK_MULTIPLIER_MAX = 3;

/**
 * Risk at which the multiplier tops out. Past roughly a one-in-three chance of
 * losing everything the run is already reckless, so the curve pays its ceiling
 * there rather than at a theoretical 100% nobody ever sees.
 */
export const RISK_MULTIPLIER_CAP = 1 / 3;

/**
 * Five bands, so the read-out is a step and not a jittering decimal. Each band
 * carries the multiplier applied to everything a leaver banks at that risk.
 */
export const RISK_TIERS = [
  { id: 'safe', label: 'Safe', min: 0 },
  { id: 'uneasy', label: 'Uneasy', min: 0.05 },
  { id: 'risky', label: 'Risky', min: 0.12 },
  { id: 'grave', label: 'Grave', min: 0.2 },
  { id: 'lethal', label: 'Lethal', min: 0.28 },
] as const;

export type RiskTierId = (typeof RISK_TIERS)[number]['id'];

/**
 * The multiplier grows linearly with the risk and is rounded to a tenth, so the
 * badge reads 1.4x rather than 1.3871x. Bounded to [1, 3] whatever the odds.
 */
export function riskMultiplier(risk: number): number {
  const t = Math.min(1, Math.max(0, risk / RISK_MULTIPLIER_CAP));
  const raw = RISK_MULTIPLIER_MIN + t * (RISK_MULTIPLIER_MAX - RISK_MULTIPLIER_MIN);
  return Math.round(raw * 10) / 10;
}

export function riskTier(risk: number): (typeof RISK_TIERS)[number] {
  let tier: (typeof RISK_TIERS)[number] = RISK_TIERS[0];
  for (const t of RISK_TIERS) if (risk >= t.min) tier = t;
  return tier;
}

/** What extra mode shows before the decision, and pays out on afterwards. */
export interface RiskReadout {
  /** Probability in [0,1] that the very next card ends the expedition. */
  risk: number;
  /** Cards in the deck that would end it right now. */
  deadly: number;
  /** Cards left to draw from. */
  deck: number;
  multiplier: number;
  tier: RiskTierId;
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
  /**
   * Extra mode only, and only while a decision is actually pending — outside
   * that window there is no "next card" to price, and it stays null.
   */
  readout: RiskReadout | null;
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
