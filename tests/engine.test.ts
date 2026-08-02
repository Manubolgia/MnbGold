import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addPlayer,
  allDecided,
  beginRound,
  buildRoundDeck,
  createRoom,
  decide,
  resolveDecisions,
  revealCard,
  score,
  startGame,
  winners,
  type RoomState,
} from '../shared/engine.js';
import { HAZARD_TYPES, TREASURE_VALUES, type Card, type HazardType } from '../shared/types.js';

/** Deterministic "shuffle" so deck order is exactly what each test stacks. */
const fixedRng = () => 0;

function room(playerCount: number): RoomState {
  const state = createRoom('TEST', 0);
  for (let i = 0; i < playerCount; i++) {
    addPlayer(state, { id: `p${i}`, name: `P${i}`, token: `tok${i}`, avatar: i });
  }
  return state;
}

/** Stacks the deck so the next reveal is `cards[0]`, then `cards[1]`, … */
function stack(state: RoomState, cards: Card[]): void {
  state.deck = [...cards].reverse();
}

const treasure = (value: number, id = `t-${value}`): Card => ({ kind: 'treasure', id, value });
const hazard = (h: HazardType, id = `h-${h}-${Math.random()}`): Card => ({ kind: 'hazard', id, hazard: h });
const artifact = (id = 'a-x'): Card => ({ kind: 'artifact', id });

/* ------------------------------------------------------------------ */
/* Deck composition                                                    */
/* ------------------------------------------------------------------ */

test('the deck is exactly the published card list', () => {
  const state = room(3);
  startGame(state, fixedRng);

  const deck = state.deck;
  const treasures = deck.filter((c) => c.kind === 'treasure');
  const hazards = deck.filter((c) => c.kind === 'hazard');
  const artifacts = deck.filter((c) => c.kind === 'artifact');

  assert.equal(treasures.length, 15);
  assert.equal(hazards.length, 15);
  assert.equal(artifacts.length, 1, 'one artifact joins the deck each expedition');
  assert.equal(deck.length, 31);

  const values = treasures.map((c) => (c.kind === 'treasure' ? c.value : 0)).sort((a, b) => a - b);
  assert.deepEqual(values, [...TREASURE_VALUES].sort((a, b) => a - b));

  for (const type of HAZARD_TYPES) {
    assert.equal(hazards.filter((c) => c.kind === 'hazard' && c.hazard === type).length, 3);
  }
});

test('all five artifacts enter play across the five expeditions, one at a time', () => {
  const state = room(2);
  startGame(state, fixedRng);
  const seen: string[] = [];

  for (let r = 1; r <= 5; r++) {
    const artifacts = state.deck.filter((c) => c.kind === 'artifact');
    assert.equal(artifacts.length, 1, `expedition ${r} has exactly one artifact`);
    seen.push(artifacts[0].id);
    if (r < 5) beginRound(state, fixedRng);
  }

  assert.equal(new Set(seen).size, 5, 'a different artifact each expedition');
  assert.equal(state.artifactSupply.length, 0);
});

/* ------------------------------------------------------------------ */
/* Treasure                                                            */
/* ------------------------------------------------------------------ */

test('treasure is split evenly and the remainder stays on the card', () => {
  const state = room(3);
  startGame(state, fixedRng);
  stack(state, [treasure(7)]);

  revealCard(state);

  for (const p of state.players) assert.equal(p.hand, 2);
  assert.equal(state.path.length, 1);
  assert.equal(state.path[0].kind === 'treasure' ? state.path[0].remaining : -1, 1);
});

test('a treasure smaller than the party leaves everything on the card', () => {
  const state = room(4);
  startGame(state, fixedRng);
  stack(state, [treasure(3)]);

  revealCard(state);

  for (const p of state.players) assert.equal(p.hand, 0);
  assert.equal(state.path[0].kind === 'treasure' ? state.path[0].remaining : -1, 3);
});

test('a treasure is split only between explorers still inside', () => {
  const state = room(4);
  startGame(state, fixedRng);

  // Two walk out first.
  stack(state, [treasure(4), treasure(8)]);
  revealCard(state);
  state.phase = 'decision';
  decide(state, 'p0', 'leave');
  decide(state, 'p1', 'leave');
  decide(state, 'p2', 'continue');
  decide(state, 'p3', 'continue');
  resolveDecisions(state);

  revealCard(state);
  assert.equal(state.players[2].hand, 1 + 4, 'first card gave 1, second gave 4');
  assert.equal(state.players[3].hand, 1 + 4);
});

/* ------------------------------------------------------------------ */
/* Hazards                                                             */
/* ------------------------------------------------------------------ */

test('the first hazard of a type is harmless', () => {
  const state = room(2);
  startGame(state, fixedRng);
  stack(state, [treasure(4), hazard('snake')]);

  revealCard(state);
  const events = revealCard(state);

  assert.ok(events.some((e) => e.t === 'hazard-safe'));
  assert.equal(state.phase, 'reveal');
  for (const p of state.players) {
    assert.equal(p.inTemple, true);
    assert.equal(p.hand, 2);
  }
});

test('a second hazard of the same type ends the expedition and empties every hand', () => {
  const state = room(2);
  startGame(state, fixedRng);
  stack(state, [treasure(10), hazard('mummy'), hazard('mummy')]);

  revealCard(state);
  revealCard(state);
  const events = revealCard(state);

  const strike = events.find((e) => e.t === 'hazard-strike');
  assert.ok(strike, 'the pair strikes');
  assert.equal(strike.t === 'hazard-strike' ? strike.lost : -1, 10, 'both hands are lost');

  for (const p of state.players) {
    assert.equal(p.hand, 0);
    assert.equal(p.chest, 0, 'nothing was banked this expedition');
    assert.equal(p.inTemple, false);
  }
  assert.equal(state.roundEndReason, 'hazard');
});

test('two different hazards do not end the expedition', () => {
  const state = room(2);
  startGame(state, fixedRng);
  stack(state, [hazard('snake'), hazard('fire')]);

  revealCard(state);
  const events = revealCard(state);

  assert.ok(!events.some((e) => e.t === 'hazard-strike'));
  for (const p of state.players) assert.equal(p.inTemple, true);
});

test('the hazard that ends an expedition is removed from the game for good', () => {
  const state = room(2);
  startGame(state, fixedRng);
  stack(state, [hazard('fire'), hazard('fire')]);

  revealCard(state);
  revealCard(state);
  assert.deepEqual(state.removedHazards, ['fire']);

  beginRound(state, fixedRng);
  const fires = state.deck.filter((c) => c.kind === 'hazard' && c.hazard === 'fire');
  assert.equal(fires.length, 2, 'one of the three fire cards is gone');
  assert.equal(state.deck.filter((c) => c.kind === 'hazard').length, 14);
});

/* ------------------------------------------------------------------ */
/* Leaving                                                             */
/* ------------------------------------------------------------------ */

test('leaving banks the hand and splits what is left on the path', () => {
  const state = room(4);
  startGame(state, fixedRng);
  // 9 between 4 leaves 1 on the card; 6 between 4 leaves 2. Path holds 3.
  stack(state, [treasure(9), treasure(6)]);
  revealCard(state);
  revealCard(state);

  for (const p of state.players) assert.equal(p.hand, 3, '2 + 1 each');
  assert.equal(state.path.reduce((s, c) => s + (c.kind === 'treasure' ? c.remaining : 0), 0), 3);

  state.phase = 'decision';
  decide(state, 'p0', 'leave');
  decide(state, 'p1', 'leave');
  decide(state, 'p2', 'continue');
  decide(state, 'p3', 'continue');
  resolveDecisions(state);

  // 3 gems on the path split between 2 leavers: 1 each, 1 stays behind.
  assert.equal(state.players[0].chest, 4);
  assert.equal(state.players[1].chest, 4);
  assert.equal(state.players[0].inTemple, false);
  assert.equal(state.path.reduce((s, c) => s + (c.kind === 'treasure' ? c.remaining : 0), 0), 1);

  // Those who stayed keep their gems in hand, not in the tent.
  assert.equal(state.players[2].chest, 0);
  assert.equal(state.players[2].hand, 3);
});

test('banked gems survive a later disaster', () => {
  const state = room(2);
  startGame(state, fixedRng);
  stack(state, [treasure(8), hazard('spider'), hazard('spider')]);

  revealCard(state);
  state.phase = 'decision';
  decide(state, 'p0', 'leave');
  decide(state, 'p1', 'continue');
  resolveDecisions(state);

  revealCard(state);
  revealCard(state);

  assert.equal(state.players[0].chest, 4, 'walked out in time');
  assert.equal(state.players[1].chest, 0, 'still inside when it collapsed');
});

test('an explorer leaving alone carries out every artifact on the path', () => {
  const state = room(3);
  startGame(state, fixedRng);
  stack(state, [artifact('a0'), artifact('a1')]);
  revealCard(state);
  revealCard(state);

  state.phase = 'decision';
  decide(state, 'p0', 'leave');
  decide(state, 'p1', 'continue');
  decide(state, 'p2', 'continue');
  resolveDecisions(state);

  assert.equal(state.players[0].artifacts, 2);
  assert.equal(state.players[0].artifactPoints, 10, 'the first two are worth 5 each');
  assert.equal(state.path.filter((c) => c.kind === 'artifact').length, 0);
});

test('two explorers leaving together leave the artifact behind', () => {
  const state = room(3);
  startGame(state, fixedRng);
  stack(state, [artifact('a0')]);
  revealCard(state);

  state.phase = 'decision';
  decide(state, 'p0', 'leave');
  decide(state, 'p1', 'leave');
  decide(state, 'p2', 'continue');
  resolveDecisions(state);

  assert.equal(state.players[0].artifacts, 0);
  assert.equal(state.players[1].artifacts, 0);
  assert.equal(state.path.filter((c) => c.kind === 'artifact').length, 1, 'it stays on the path');
});

test('an artifact left on the path when the expedition ends is lost forever', () => {
  const state = room(2);
  startGame(state, fixedRng);
  stack(state, [artifact('a0'), hazard('snake'), hazard('snake')]);
  revealCard(state);
  revealCard(state);
  revealCard(state);

  assert.equal(state.roundEndReason, 'hazard');
  beginRound(state, fixedRng);
  assert.ok(!state.deck.some((c) => c.id === 'a0'), 'it does not come back');
  assert.equal(state.artifactSupply.length, 3, 'and the supply moved on');
});

test('artifact values are 5, 5, 5, then 10, 10 across the whole game', () => {
  const state = room(2);
  startGame(state, fixedRng);
  const takenValues: number[] = [];

  for (let i = 0; i < 5; i++) {
    stack(state, [artifact(`a${i}`)]);
    // Everyone is back in the temple at the start of each pass.
    for (const p of state.players) {
      p.inTemple = true;
      p.decision = null;
    }
    state.path = [];
    revealCard(state);
    state.phase = 'decision';
    decide(state, 'p0', 'leave');
    decide(state, 'p1', 'continue');
    const before = state.players[0].artifactPoints;
    resolveDecisions(state);
    takenValues.push(state.players[0].artifactPoints - before);
  }

  assert.deepEqual(takenValues, [5, 5, 5, 10, 10]);
  assert.equal(state.players[0].artifactPoints, 35);
});

/* ------------------------------------------------------------------ */
/* Decisions & round flow                                              */
/* ------------------------------------------------------------------ */

test('an undecided explorer walks out rather than losing everything', () => {
  const state = room(2);
  startGame(state, fixedRng);
  stack(state, [treasure(4)]);
  revealCard(state);

  state.phase = 'decision';
  decide(state, 'p0', 'continue');
  assert.equal(allDecided(state), false, 'p1 has not chosen');

  resolveDecisions(state);

  assert.equal(state.players[1].inTemple, false);
  assert.equal(state.players[1].chest, 2, 'their gems are safe');
  assert.equal(state.players[0].inTemple, true);
});

test('the expedition ends when the last explorer walks out', () => {
  const state = room(2);
  startGame(state, fixedRng);
  stack(state, [treasure(4)]);
  revealCard(state);

  state.phase = 'decision';
  decide(state, 'p0', 'leave');
  decide(state, 'p1', 'leave');
  const events = resolveDecisions(state);

  assert.ok(events.some((e) => e.t === 'round-end' && e.reason === 'empty-temple'));
  assert.equal(state.phase, 'round-end');
});

test('a fresh expedition puts everyone back inside with empty hands', () => {
  const state = room(3);
  startGame(state, fixedRng);
  stack(state, [treasure(9)]);
  revealCard(state);
  state.phase = 'decision';
  for (const p of state.players) decide(state, p.id, 'leave');
  resolveDecisions(state);

  const banked = state.players.map((p) => p.chest);
  beginRound(state, fixedRng);

  assert.equal(state.round, 2);
  assert.equal(state.path.length, 0);
  state.players.forEach((p, i) => {
    assert.equal(p.inTemple, true);
    assert.equal(p.hand, 0);
    assert.equal(p.chest, banked[i], 'the tent is untouched');
  });
});

test('the game ends after the fifth expedition and the richest explorer wins', () => {
  const state = room(3);
  startGame(state, fixedRng);

  for (let r = 1; r <= 5; r++) {
    assert.equal(state.round, r);
    stack(state, [treasure(3)]);
    revealCard(state);
    state.phase = 'decision';
    for (const p of state.players) decide(state, p.id, 'leave');
    const events = resolveDecisions(state);
    if (r < 5) {
      assert.equal(state.phase, 'round-end');
      beginRound(state, fixedRng);
    } else {
      assert.equal(state.phase, 'game-over');
      assert.ok(events.some((e) => e.t === 'game-over'));
    }
  }

  // Everyone took 1 per expedition; give one explorer an artifact to break the tie.
  state.players[1].artifactPoints = 10;
  const champs = winners(state);
  assert.equal(champs.length, 1);
  assert.equal(champs[0].id, 'p1');
  assert.equal(score(champs[0]), 5 + 10);
});

test('decisions are only accepted from explorers still inside, during the window', () => {
  const state = room(2);
  startGame(state, fixedRng);
  stack(state, [treasure(4)]);
  revealCard(state);

  assert.equal(decide(state, 'p0', 'leave'), false, 'not during the reveal');

  state.phase = 'decision';
  assert.equal(decide(state, 'p0', 'leave'), true);
  resolveDecisions(state);
  assert.equal(decide(state, 'p0', 'continue'), false, 'they have already left');
});

test('a stacked deck never runs dry before the expedition resolves', () => {
  const state = room(2);
  startGame(state, fixedRng);
  // Build the worst legal case: every unique hazard, then all treasures.
  const cards: Card[] = HAZARD_TYPES.map((h) => hazard(h));
  cards.push(...TREASURE_VALUES.map((v) => treasure(v)));
  stack(state, cards);

  for (let i = 0; i < cards.length; i++) revealCard(state);

  assert.equal(state.deck.length, 0);
  assert.equal(state.path.length, cards.length);
});

/* ------------------------------------------------------------------ */
/* Deck rebuild                                                        */
/* ------------------------------------------------------------------ */

test('treasure cards return to the deck at full value each expedition', () => {
  const state = room(2);
  startGame(state, fixedRng);
  stack(state, [treasure(17, 't-big')]);
  revealCard(state);
  assert.equal(state.players[0].hand, 8);

  beginRound(state, fixedRng);
  const rebuilt = buildRoundDeck(state, fixedRng);
  const seventeens = rebuilt.filter((c) => c.kind === 'treasure' && c.value === 17);
  assert.equal(seventeens.length, 1, 'the 17 is back, undiminished');
});
