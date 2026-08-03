import type { RiskReadout } from '../../shared/types.js';
import { RiskIcon } from '../art/Icons.js';

/**
 * Extra mode's read-out, sized and shaped like the other status chips so it
 * lives in the top strip and costs the table no height at all.
 *
 * Two numbers, in the order you weigh them: the chance the next card ends the
 * run, and what leaving is currently paid at. The tier is never named — it only
 * drives `--risk-col` through `data-tier`, so the chip goes hot as the temple
 * turns without adding a word to read.
 */
export function RiskMeter({ readout }: { readout: RiskReadout }) {
  const pct = Math.round(readout.risk * 100);

  return (
    <span
      className="chip is-risk"
      data-tier={readout.tier}
      title={`${pct}% chance the next card ends the expedition — leaving pays ${readout.multiplier}x`}
      aria-label={`${pct} percent chance of losing, paying ${readout.multiplier} times`}
    >
      <RiskIcon size={13} />
      <span className="risk-pct mono">{pct}%</span>
      {/* Keyed so every change punches, not fades — the multiplier is the prize. */}
      <span key={readout.multiplier} className="risk-mult">
        {readout.multiplier}x
      </span>
    </span>
  );
}
