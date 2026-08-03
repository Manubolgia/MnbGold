import type { RiskReadout } from '../../shared/types.js';
import { RISK_TIERS } from '../../shared/types.js';
import { GemIcon, RiskIcon } from '../art/Icons.js';

/**
 * Extra mode's read-out, and the one thing on the table that is meant to be
 * *felt* rather than read.
 *
 * Three things in one strip, in the order you weigh them: how likely the next
 * card is to end you, what that gamble is currently worth, and — the part that
 * actually decides it — the gems you would carry out if you left right now.
 *
 * The bar is segmented rather than smooth: five hard blocks that light up in
 * turn, so the run tightening is a step you notice out of the corner of your
 * eye, not a gradient you have to study. It keeps the house rules — flat colour,
 * hard edges, no gradients — and the whole thing re-tints from `data-tier`, so
 * the strip goes hot as the temple turns.
 */
export function RiskMeter({ readout, hand }: { readout: RiskReadout; hand: number }) {
  const pct = Math.round(readout.risk * 100);
  const tierIndex = RISK_TIERS.findIndex((t) => t.id === readout.tier);
  const label = RISK_TIERS[tierIndex]?.label ?? '';
  const payout = Math.round(hand * readout.multiplier);

  return (
    <div
      className="risk"
      data-tier={readout.tier}
      role="group"
      aria-label={`Risk ${pct} percent, ${label}, paying ${readout.multiplier} times`}
    >
      <div className="risk-head">
        <RiskIcon size={15} />
        <span className="risk-tier">{label}</span>
        {/* The odds themselves, for anyone who wants the actual number. */}
        <span className="risk-odds mono">
          {readout.deadly}/{readout.deck}
        </span>
        <span className="spacer" />
        {/* Keyed so every change punches, not fades — the multiplier is the prize. */}
        <span key={readout.multiplier} className="risk-mult">
          {readout.multiplier}x
        </span>
      </div>

      {/* A deck with nothing lethal left in it lights nothing: an empty bar is
          the honest picture of no risk at all. */}
      <div className="risk-bar" aria-hidden="true">
        {RISK_TIERS.map((t, i) => (
          <i key={t.id} className={readout.deadly > 0 && i <= tierIndex ? 'is-lit' : ''} />
        ))}
      </div>

      {/* What the multiplier is actually worth to you, right now. */}
      <div className="risk-take">
        <span className="risk-take-label">Leave with</span>
        <span className="spacer" />
        <span key={payout} className="risk-take-value">
          <GemIcon size={13} />
          {payout}
        </span>
      </div>
    </div>
  );
}
