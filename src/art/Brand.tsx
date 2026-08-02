/**
 * Home-screen scene: two explorers at the mouth of the temple, deciding whether
 * to go in. Flat planes only — the tension comes from the silhouette and the
 * hard black doorway swallowing the middle of the frame.
 */
export function TempleScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 200" className={className} role="img" aria-label="Explorers at the temple entrance">
      <title>Explorers at the temple entrance</title>

      {/* Sky */}
      <rect width="320" height="200" fill="#241C12" />
      {/* Low sun, pushed off-centre so the temple never eclipses it */}
      <rect x="34" y="20" width="48" height="48" fill="var(--gold-deep)" />
      <rect x="42" y="28" width="32" height="32" fill="var(--gold)" />
      {/* Angular rays */}
      <path d="M58 2 L68 16 H48 Z" fill="var(--gold-deep)" />
      <path d="M6 44 L26 36 L26 52 Z" fill="var(--gold-deep)" />
      <path d="M96 26 L84 38 L98 44 Z" fill="var(--gold-deep)" />
      <path d="M96 62 L84 54 L98 48 Z" fill="var(--gold-deep)" />

      {/* Circling birds — two hard chevrons, high and far off */}
      <path d="M236 34 L244 28 L252 34" fill="none" stroke="#3A2E1D" strokeWidth="3" />
      <path d="M262 48 L268 43 L274 48" fill="none" stroke="#3A2E1D" strokeWidth="3" />

      {/* Distant ridge */}
      <path d="M0 96 L44 66 L84 92 L120 70 L160 96 L200 70 L240 92 L280 66 L320 96 V200 H0 Z" fill="#1B140D" />

      {/* Temple — stepped, lit face and hard shadow face */}
      <g>
        <rect x="112" y="70" width="96" height="24" fill="var(--gold)" />
        <rect x="92" y="94" width="136" height="26" fill="var(--gold)" />
        <rect x="70" y="120" width="180" height="28" fill="var(--gold)" />
        <rect x="46" y="148" width="228" height="30" fill="var(--gold)" />

        <rect x="112" y="70" width="20" height="24" fill="var(--gold-deep)" />
        <rect x="92" y="94" width="20" height="26" fill="var(--gold-deep)" />
        <rect x="70" y="120" width="20" height="28" fill="var(--gold-deep)" />
        <rect x="46" y="148" width="20" height="30" fill="var(--gold-deep)" />

        {/* Stone joints */}
        <rect x="112" y="92" width="96" height="2" fill="#241C12" />
        <rect x="92" y="118" width="136" height="2" fill="#241C12" />
        <rect x="70" y="146" width="180" height="2" fill="#241C12" />

        {/* Fret carving */}
        <rect x="78" y="130" width="14" height="6" fill="#241C12" />
        <rect x="100" y="130" width="14" height="6" fill="#241C12" />
        <rect x="206" y="130" width="14" height="6" fill="#241C12" />
        <rect x="228" y="130" width="14" height="6" fill="#241C12" />
      </g>

      {/* The doorway — pure black, the thing they have to walk into */}
      <rect x="136" y="104" width="48" height="74" fill="#0A0806" />
      <rect x="136" y="104" width="48" height="6" fill="var(--gold-deep)" />
      {/* A single gem glinting at the edge of the dark */}
      <path d="M160 138 L170 148 L160 160 L150 148 Z" fill="var(--gem)" />
      <path d="M160 138 L170 148 L160 148 Z" fill="var(--gem-lit)" />

      {/* Ground */}
      <rect x="0" y="178" width="320" height="22" fill="#151009" />

      {/* Two explorers, backlit, torch raised */}
      <g>
        <path d="M92 178 L96 156 H104 L108 178 Z" fill="#0A0806" />
        <rect x="95" y="146" width="10" height="10" fill="#0A0806" />
        <rect x="88" y="140" width="4" height="18" fill="#0A0806" />
        <path d="M90 140 L96 128 L84 128 Z" fill="var(--gold)" />
        <path d="M90 136 L94 128 L86 128 Z" fill="#FFD24A" />
      </g>
      <g>
        <path d="M214 178 L218 158 H226 L230 178 Z" fill="#0A0806" />
        <rect x="217" y="148" width="10" height="10" fill="#0A0806" />
        <rect x="228" y="150" width="16" height="4" fill="#0A0806" />
      </g>
    </svg>
  );
}
