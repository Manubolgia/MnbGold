import type { GameEvent, PublicPlayer } from '../../shared/types.js';
import { HAZARD_NAME } from '../art/Cards.js';

export type Tone = 'neutral' | 'good' | 'danger' | 'gold';

export interface Line {
  text: string;
  tone: Tone;
}

/** "Mara", "Mara and Idris", "Mara, Idris and Wen". */
export const list = (names: string[]): string => {
  if (names.length === 0) return 'nobody';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

const gems = (n: number) => `${n} ${n === 1 ? 'gem' : 'gems'}`;

export function describe(event: GameEvent, players: PublicPlayer[]): Line | null {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? 'Someone';

  switch (event.t) {
    case 'round-start':
      return { text: `Expedition ${event.round} sets off.`, tone: 'neutral' };

    case 'card':
      return null; // The card itself is the message.

    case 'treasure-split':
      if (event.each === 0) {
        return {
          text: `${gems(event.value)} — too few to split ${event.players} ways. All ${event.remainder} stay on the path.`,
          tone: 'gold',
        };
      }
      return {
        text:
          `${gems(event.value)} split ${event.players} ways — ${event.each} each` +
          (event.remainder > 0 ? `, ${event.remainder} left on the card.` : '.'),
        tone: 'gold',
      };

    case 'hazard-safe':
      return { text: `${HAZARD_NAME[event.hazard]}. The first one is a warning.`, tone: 'danger' };

    case 'hazard-strike':
      return {
        text: `A second ${HAZARD_NAME[event.hazard].toLowerCase()}. The expedition collapses — ${gems(event.lost)} lost.`,
        tone: 'danger',
      };

    case 'artifact-found':
      return { text: 'An artifact. Only an explorer leaving alone can carry it out.', tone: 'good' };

    case 'leave': {
      const who = list(event.players.map(nameOf));
      const artifacts =
        event.artifacts > 0
          ? ` and carries out ${event.artifacts} ${event.artifacts === 1 ? 'artifact' : 'artifacts'}`
          : '';
      const verb = event.players.length === 1 ? 'walks out' : 'walk out';
      const share = event.each > 0 ? `, sweeping ${gems(event.each)} each from the path` : '';
      return { text: `${who} ${verb}${share}${artifacts}.`, tone: 'good' };
    }

    case 'round-end':
      return {
        text:
          event.reason === 'hazard'
            ? `Expedition ${event.round} ends in disaster.`
            : `Expedition ${event.round} ends — the temple is empty.`,
        tone: event.reason === 'hazard' ? 'danger' : 'neutral',
      };

    case 'game-over':
      return { text: 'Five expeditions done. The gold is counted.', tone: 'gold' };
  }
}

/** The headline shown in the banner above the path. */
export function headline(
  phase: string,
  event: GameEvent | null,
  players: PublicPlayer[],
): { title: string; note: string; tone: Tone } {
  if (event) {
    const line = describe(event, players);
    if (line) {
      const titles: Record<string, string> = {
        'round-start': 'Into the temple',
        'treasure-split': 'Treasure',
        'hazard-safe': 'Hazard',
        'hazard-strike': 'Disaster',
        'artifact-found': 'Artifact',
        leave: 'Walking out',
        'round-end': 'Expedition over',
        'game-over': 'Final count',
      };
      return { title: titles[event.t] ?? 'Temple', note: line.text, tone: line.tone };
    }
  }

  if (phase === 'decision') {
    return { title: 'Press on, or get out?', note: 'Everyone chooses at the same time.', tone: 'neutral' };
  }
  return { title: 'The temple waits', note: 'Turning the next card…', tone: 'neutral' };
}
