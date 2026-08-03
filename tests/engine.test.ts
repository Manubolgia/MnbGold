import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addPlayer,
  allDecided,
  beginRound,
  buildRoundDeck,
  canJoin,
  createRoom,
  decide,
  resolveDecisions,
  revealCard,
  riskReadout,
  score,
  startGame,
  toPublic,
  winners,
  type RoomState,
} from '../shared/engine.js';
import {
  HAZARD_TYPES,
  RISK_MULTIPLIER_MAX,
  RISK_MULTIPLIER_MIN,
  TREASURE_VALUES,
  riskMultiplier,
  type Card,
  type HazardType,
} from '../shared/types.js';

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

/* ------------------------------------------------------------------ */
/* Seating                                                             */
/* ------------------------------------------------------------------ */

test('a latecomer may join a game already under way', () => {
  const state = room(2);
  startGame(state, fixedRng);
  stack(state, [treasure(8)]);
  revealCard(state);

  assert.equal(canJoin(state).ok, true, 'the door is open mid-expedition');

  addPlayer(state, { id: 'late', name: 'Late', token: 'tokL', avatar: 3 });
  const late = state.players[2];

  // They wait at camp rather than being dropped into a run already in progress.
  assert.equal(late.inTemple, false);
  assert.equal(late.hand, 0);
  assert.equal(late.chest, 0);
  assert.equal(late.isHost, false, 'joining never steals the host seat');

  // And they take no share of treasure turned over before they arrived.
  stack(state, [treasure(9)]);
  revealCard(state);
  assert.equal(late.hand, 0, 'no share of a card they were not there for');
  assert.equal(state.players[0].hand, 4 + 4);
});

test('a latecomer cannot stall the decision window they are not part of', () => {
  const state = room(2);
  startGame(state, fixedRng);
  stack(state, [treasure(4)]);
  revealCard(state);
  addPlayer(state, { id: 'late', name: 'Late', token: 'tokL', avatar: 3 });

  state.phase = 'decision';
  decide(state, 'p0', 'continue');
  decide(state, 'p1', 'continue');
  assert.equal(allDecided(state), true, 'the camped newcomer is not waited on');
  assert.equal(decide(state, 'late', 'leave'), false, 'and cannot act from camp');
});

test('the next expedition deals the latecomer in with everybody else', () => {
  const state = room(2);
  startGame(state, fixedRng);
  stack(state, [treasure(4)]);
  revealCard(state);
  addPlayer(state, { id: 'late', name: 'Late', token: 'tokL', avatar: 3 });

  beginRound(state, fixedRng);

  const late = state.players[2];
  assert.equal(late.inTemple, true, 'in the temple from the fresh round');
  stack(state, [treasure(9)]);
  revealCard(state);
  assert.equal(late.hand, 3, 'and taking a full share of it');
});

test('a full room is still closed', () => {
  const state = room(10);
  startGame(state, fixedRng);
  const gate = canJoin(state);
  assert.equal(gate.ok, false);
  assert.match(gate.ok === false ? gate.reason : '', /full/);
});

test('two explorers may wear the same face', () => {
  const state = createRoom('TEST', 0);
  addPlayer(state, { id: 'p0', name: 'Ana', token: 'tok0', avatar: 4 });
  addPlayer(state, { id: 'p1', name: 'Bo', token: 'tok1', avatar: 4 });

  assert.equal(state.players[0].avatar, 4);
  assert.equal(state.players[1].avatar, 4, 'the second pick is honoured, not reassigned');
  // The name under the portrait is what tells them apart.
  assert.notEqual(state.players[0].name, state.players[1].name);
});

/* ------------------------------------------------------------------ */
/* Extra mode: risk & multiplier                                        */
/* ------------------------------------------------------------------ */

test('with no hazard face-up, nothing in the deck can end the run', () => {
  const state = room(2);
  startGame(state, fixedRng);
  stack(state, [treasure(4), treasure(6)]);
  revealCard(state);

  const r = riskReadout(state);
  assert.equal(r.deadly, 0);
  assert.equal(r.risk, 0);
  assert.equal(r.multiplier, RISK_MULTIPLIER_MIN, 'no risk pays no bonus');
});

test('risk is exactly the share of the deck that is a matching second hazard', () => {
  const state = room(2);
  startGame(state, fixedRng);
  // A deck of exactly 4: two snakes, a fire, a treasure. Reveal the snake, and
  // the one remaining snake is the only card that can end the run.
  stack(state, [hazard('snake', 'h-s1'), hazard('snake', 'h-s2'), hazard('fire', 'h-f1'), treasure(5)]);
  revealCard(state);

  const r = riskReadout(state);
  assert.equal(r.deck, 3, 'three cards left');
  assert.equal(r.deadly, 1, 'only the second snake is lethal');
  assert.equal(r.risk, 1 / 3);
});

test('a second face-up hazard type puts more of the deck in play', () => {
  const state = room(2);
  startGame(state, fixedRng);
  stack(state, [
    hazard('snake', 'h-s1'),
    hazard('fire', 'h-f1'),
    hazard('snake', 'h-s2'),
    hazard('fire', 'h-f2'),
    treasure(5),
    treasure(7),
  ]);
  revealCard(state);
  revealCard(state);

  const r = riskReadout(state);
  assert.equal(r.deck, 4);
  assert.equal(r.deadly, 2, 'the matching snake and the matching fire');
  assert.equal(r.risk, 0.5);
});

test('a hazard removed from the game stops counting toward the risk', () => {
  const state = room(2);
  startGame(state, fixedRng);
  // Burn a fire pair, which strikes one fire card out of the game for good.
  stack(state, [hazard('fire'), hazard('fire')]);
  revealCard(state);
  revealCard(state);
  assert.deepEqual(state.removedHazards, ['fire']);

  // A real rebuilt deck, not a stacked fixture — the point is what survives in it.
  beginRound(state, fixedRng);
  assert.equal(state.deck.filter((c) => c.kind === 'hazard' && c.hazard === 'fire').length, 2);

  // Draw one of the two remaining fires onto the path by hand, so the deck it
  // leaves behind is the genuine rebuilt one.
  const idx = state.deck.findIndex((c) => c.kind === 'hazard' && c.hazard === 'fire');
  state.deck.splice(idx, 1);
  state.path.push({ kind: 'hazard', id: 'h-fire-shown', hazard: 'fire' });

  const r = riskReadout(state);
  // Three fires in the box, one removed for good, one now face-up: one is left.
  assert.equal(r.deadly, 1, 'only the last surviving fire can strike');
  assert.equal(r.deck, state.deck.length);
});

test('the multiplier climbs with the risk and is bounded at both ends', () => {
  assert.equal(riskMultiplier(0), RISK_MULTIPLIER_MIN);
  assert.equal(riskMultiplier(1), RISK_MULTIPLIER_MAX, 'certain death still pays only the ceiling');
  assert.equal(riskMultiplier(-1), RISK_MULTIPLIER_MIN, 'never pays below the floor');
  assert.ok(riskMultiplier(0.1) > riskMultiplier(0.05), 'more risk pays more');
  assert.ok(riskMultiplier(0.05) > RISK_MULTIPLIER_MIN);
});

test('extra mode multiplies the gems a leaver banks', () => {
  const state = room(2);
  state.settings.extraMode = true;
  startGame(state, fixedRng);
  // Reveal a snake, then a 20-gem treasure, leaving a deck that is one third
  // lethal — the ceiling multiplier of 3x.
  stack(state, [hazard('snake', 'h-s1'), treasure(20), hazard('snake', 'h-s2'), treasure(1)]);
  revealCard(state);
  revealCard(state);

  assert.equal(riskReadout(state).multiplier, RISK_MULTIPLIER_MAX);
  for (const p of state.players) assert.equal(p.hand, 10);

  state.phase = 'decision';
  decide(state, 'p0', 'leave');
  decide(state, 'p1', 'continue');
  const events = resolveDecisions(state);

  assert.equal(state.players[0].chest, 30, '10 gems banked at 3x');
  const left = events.find((e) => e.t === 'leave');
  assert.equal(left?.t === 'leave' ? left.multiplier : 0, 3);
  assert.equal(left?.t === 'leave' ? left.bonus : -1, 20, 'the multiplier added 20 on top');
});

test('with extra mode off the payout is untouched', () => {
  const state = room(2);
  startGame(state, fixedRng);
  stack(state, [hazard('snake', 'h-s1'), treasure(20), hazard('snake', 'h-s2')]);
  revealCard(state);
  revealCard(state);

  state.phase = 'decision';
  decide(state, 'p0', 'leave');
  decide(state, 'p1', 'continue');
  const events = resolveDecisions(state);

  assert.equal(state.players[0].chest, 10, 'exactly what they carried');
  const left = events.find((e) => e.t === 'leave');
  assert.equal(left?.t === 'leave' ? left.multiplier : 0, 1);
  assert.equal(left?.t === 'leave' ? left.bonus : -1, 0);
});

test('the multiplier does not inflate artifact points', () => {
  const state = room(2);
  state.settings.extraMode = true;
  startGame(state, fixedRng);
  stack(state, [hazard('snake', 'h-s1'), artifact('a0'), hazard('snake', 'h-s2'), treasure(1)]);
  revealCard(state);
  revealCard(state);

  state.phase = 'decision';
  decide(state, 'p0', 'leave');
  decide(state, 'p1', 'continue');
  resolveDecisions(state);

  assert.equal(state.players[0].artifacts, 1);
  assert.equal(state.players[0].artifactPoints, 5, 'printed value, never multiplied');
});

test('the readout is published only during a live decision, and only in extra mode', () => {
  const state = room(2);
  startGame(state, fixedRng);
  stack(state, [hazard('snake', 'h-s1'), hazard('snake', 'h-s2'), treasure(4)]);
  revealCard(state);

  assert.equal(toPublic(state, 0).readout, null, 'off by default');

  state.settings.extraMode = true;
  const during = toPublic(state, 0).readout;
  assert.ok(during, 'shown while a card is on the table');
  assert.equal(during.deadly, 1);

  // Resolving into a fresh round leaves no next card to price.
  state.phase = 'round-end';
  assert.equal(toPublic(state, 0).readout, null, 'not once the round is over');
});

test('the published readout never leaks the deck order', () => {
  const state = room(2);
  state.settings.extraMode = true;
  startGame(state, fixedRng);
  stack(state, [hazard('snake', 'h-s1'), hazard('snake', 'h-s2'), treasure(9)]);
  revealCard(state);

  const published = JSON.stringify(toPublic(state, 0));
  assert.ok(!published.includes('h-s2'), 'the lethal card is not named');
  assert.ok(!published.includes('"deck":['), 'the deck itself is never serialised');
});
