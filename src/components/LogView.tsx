import type { LogEntry, PublicPlayer } from '../../shared/types.js';
import { describe } from '../lib/describe.js';

/** Newest first (the list is reversed in CSS), capped so it never grows the page. */
export function LogView({ log, players }: { log: LogEntry[]; players: PublicPlayer[] }) {
  const lines = log
    .map((entry) => ({ id: entry.id, line: describe(entry.event, players) }))
    .filter((x): x is { id: number; line: NonNullable<ReturnType<typeof describe>> } => x.line !== null)
    .slice(-24);

  return (
    <div className="log" aria-live="polite">
      {lines.map(({ id, line }) => (
        <p key={id} className={`log-line is-${line.tone}`}>
          {line.text}
        </p>
      ))}
    </div>
  );
}
