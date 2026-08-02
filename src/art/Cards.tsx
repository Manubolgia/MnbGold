/**
 * The deck.
 *
 * House rules: flat colour only (no gradients) and hard edges only (no rounded
 * corners). Volume is built the way a screen-printed poster builds it — every
 * form is broken into facets, each facet a separate flat tone, with a single
 * light source coming from the top left. Depth comes from four planes: the
 * carved back wall, the subject's shadow, the subject, and foreground debris.
 *
 * Card geometry is 120 x 168 units.
 */
import type { ReactNode } from 'react';
import type { HazardType, PathCard } from '../../shared/types.js';
import { SpriteOr } from './SpriteOr.js';
import { artifactSprite, cardBackSprite, hazardSprite, treasureSprite } from './sprites.js';

const W = 120;
const H = 168;

/** Each hazard keeps its own tint so it is identifiable at a glance. */
export const HAZARD_TINT: Record<HazardType, string> = {
  snake: '#6FBF3A',
  spider: '#A97BE0',
  mummy: '#DCCBA2',
  fire: '#F79020',
  rockfall: '#9C8F7D',
};

export const HAZARD_NAME: Record<HazardType, string> = {
  snake: 'Snake',
  spider: 'Spider',
  mummy: 'Mummy',
  fire: 'Fire',
  rockfall: 'Rockfall',
};

/* ------------------------------------------------------------------ */
/* Shared frame                                                        */
/* ------------------------------------------------------------------ */

interface FrameProps {
  base: string;
  /** Carved border band. */
  frame: string;
  frameLit: string;
  frameShade: string;
  children: ReactNode;
  title: string;
  className?: string;
}

/**
 * Carved stone border: a bevelled band with mitred corners and a stepped
 * Andean fret worked into each corner.
 */
function CardFrame({ base, frame, frameLit, frameShade, children, title, className }: FrameProps) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`card-art${className ? ` ${className}` : ''}`} role="img" aria-label={title}>
      <title>{title}</title>

      {/* Outer edge */}
      <rect width={W} height={H} fill="#0A0806" />

      {/* Border band, bevelled: lit on the top/left, shaded on the bottom/right */}
      <rect x="2" y="2" width={W - 4} height={H - 4} fill={frame} />
      <path d={`M2 2 H${W - 2} L${W - 8} 8 H8 V${H - 8} L2 ${H - 2} Z`} fill={frameLit} />
      <path d={`M${W - 2} ${H - 2} H2 L8 ${H - 8} H${W - 8} V8 L${W - 2} 2 Z`} fill={frameShade} />

      {/* Inner plate */}
      <rect x="8" y="8" width={W - 16} height={H - 16} fill={base} />
      <rect x="8" y="8" width={W - 16} height={H - 16} fill="none" stroke="#0A0806" strokeWidth="1.5" />

      {/* Stepped fret in each corner, cut from the band into the plate */}
      <g fill={frame}>
        <path d="M8 8 H26 V13 H13 V26 H8 Z" />
        <path d="M8 8 H26 V13 H13 V26 H8 Z" fill={frameLit} />
        <path d={`M${W - 8} 8 H${W - 26} V13 H${W - 13} V26 H${W - 8} Z`} />
        <path d={`M8 ${H - 8} H26 V${H - 13} H13 V${H - 26} H8 Z`} />
        <path d={`M${W - 8} ${H - 8} H${W - 26} V${H - 13} H${W - 13} V${H - 26} H${W - 8} Z`} fill={frameShade} />
      </g>

      {children}

      {/* Keyline last, so nothing bleeds over the silhouette */}
      <rect x="0.75" y="0.75" width={W - 1.5} height={H - 1.5} fill="none" stroke="#0A0806" strokeWidth="1.5" />
    </svg>
  );
}

/** Carved back wall shared by every card: recessed panel + chiselled grooves. */
function BackWall({ tone, groove }: { tone: string; groove: string }) {
  return (
    <g>
      <rect x="10" y="10" width={W - 20} height={H - 20} fill={tone} />
      {/* Chisel grooves, spaced like block courses */}
      <g fill={groove}>
        <rect x="10" y="30" width={W - 20} height="1.5" />
        <rect x="10" y="62" width={W - 20} height="1.5" />
        <rect x="10" y="94" width={W - 20} height="1.5" />
        <rect x="10" y="126" width={W - 20} height="1.5" />
        <rect x="44" y="10" width="1.5" height="20" />
        <rect x="78" y="31" width="1.5" height="31" />
        <rect x="34" y="63" width="1.5" height="31" />
        <rect x="86" y="95" width="1.5" height="31" />
        <rect x="52" y="127" width="1.5" height="31" />
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Treasure                                                            */
/* ------------------------------------------------------------------ */

/**
 * A step-cut gem: flat table on top, then a pavilion tapering to a point.
 * Four facets plus a highlight chip, all flat tones.
 */
function Gem({ cx, cy, w, h }: { cx: number; cy: number; w: number; h: number }) {
  const shoulder = cy - h * 0.3;
  const tableL = cx - w * 0.5;
  const tableR = cx + w * 0.5;
  const top = cy - h;
  return (
    <g>
      {/* Table (top face) */}
      <path d={`M${tableL} ${top} H${cx} V${shoulder} H${cx - w} Z`} fill="var(--gem-lit)" />
      <path d={`M${cx} ${top} H${tableR} L${cx + w} ${shoulder} H${cx} Z`} fill="var(--gem)" />
      {/* Pavilion (lower facets) */}
      <path d={`M${cx - w} ${shoulder} H${cx} V${cy + h} Z`} fill="var(--gem-shade)" />
      <path d={`M${cx} ${shoulder} H${cx + w} L${cx} ${cy + h} Z`} fill="#0F5749" />
      {/* Girdle and a single hard highlight chip inside the lit table facet */}
      <rect x={cx - w} y={shoulder - 1} width={w * 2} height="1.4" fill="#0A0806" opacity="0.55" />
      <path
        d={`M${tableL + 1.5} ${top + 1.5} H${cx - 2} L${cx - w * 0.6} ${shoulder - 2} H${cx - w + 2.5} Z`}
        fill="#D8FFF4"
      />
    </g>
  );
}

/** A gold coin seen on edge: hexagonal, three tones. */
function Coin({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const half = r * 0.55;
  return (
    <g>
      <path d={`M${cx - half} ${cy - r} H${cx + half} L${cx + r} ${cy} L${cx + half} ${cy + r} H${cx - half} L${cx - r} ${cy} Z`} fill="var(--gold)" />
      <path d={`M${cx - half} ${cy - r} H${cx + half} L${cx + r} ${cy} H${cx - r} Z`} fill="#F6D067" />
      <path d={`M${cx - r} ${cy} H${cx + r} L${cx + half} ${cy + r} H${cx - half} Z`} fill="var(--gold-deep)" />
    </g>
  );
}

export function TreasureCard({ value, className }: { value: number; className?: string }) {
  return (
    <SpriteOr src={treasureSprite(value)} alt={`Treasure worth ${value} gems`} className={className}>
      <TreasureCardSvg value={value} className={className} />
    </SpriteOr>
  );
}

function TreasureCardSvg({ value, className }: { value: number; className?: string }) {
  return (
    <CardFrame
      base="#241C12"
      frame="#8A6418"
      frameLit="#C99A28"
      frameShade="#5A400E"
      title={`Treasure worth ${value} gems`}
      className={className}
    >
      <BackWall tone="#241C12" groove="#191308" />

      {/* Altar: three stone planes, top-lit */}
      <path d="M18 112 H102 L94 122 H26 Z" fill="#6A5838" />
      <path d="M26 122 H94 V136 H26 Z" fill="#4A3D26" />
      <path d="M26 136 H94 L88 144 H32 Z" fill="#332A1A" />
      {/* Carved fret on the altar face */}
      <g fill="#241C12">
        <rect x="32" y="126" width="10" height="3" />
        <rect x="46" y="126" width="10" height="3" />
        <rect x="60" y="126" width="10" height="3" />
        <rect x="74" y="126" width="10" height="3" />
      </g>
      {/* Hard cast shadow of the hoard */}
      <path d="M24 112 H98 L92 118 H30 Z" fill="#191308" />

      {/* The hoard: one big stone flanked by smaller cuts, coins on the altar lip */}
      <Gem cx={60} cy={62} w={20} h={24} />
      <Gem cx={32} cy={90} w={11} h={13} />
      <Gem cx={88} cy={92} w={10} h={12} />
      <Gem cx={48} cy={98} w={9} h={11} />
      <Gem cx={73} cy={100} w={8} h={10} />

      <Coin cx={22} cy={110} r={6} />
      <Coin cx={98} cy={111} r={5} />

      {/* Value cartouche: gold band with fret ends */}
      <rect x="16" y="146" width="88" height="16" fill="#0A0806" />
      <rect x="18" y="147" width="84" height="14" fill="var(--gold)" />
      <path d="M18 147 H30 L18 159 Z" fill="#F6D067" />
      <path d="M102 161 H90 L102 149 Z" fill="var(--gold-deep)" />
      <rect x="18" y="147" width="84" height="2" fill="#F6D067" />
      <text
        x="60"
        y="159"
        textAnchor="middle"
        fill="#241C12"
        fontSize="13"
        fontWeight="900"
        fontFamily="ui-monospace, 'SF Mono', Menlo, monospace"
      >
        {value}
      </text>
    </CardFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Hazards                                                             */
/* ------------------------------------------------------------------ */

const HAZARD_BASE = '#1C120E';
const HAZARD_WALL = '#160E0B';

function Snake() {
  // Four tight switchbacks climbing the card, so it reads as a coil rather
  // than a tube. Each pass is a stroke: dark outline, body, lit strip, rim.
  const coil = 'M26 150 L48 136 L22 120 L50 104 L24 88 L52 74 L72 66';
  const litCoil = 'M24 147 L46 133 L19 117 L47 101 L21 85 L49 71 L70 63';
  const rimCoil = 'M23 144 L44 131 L17 115 L45 99 L19 83 L47 69 L68 61';
  return (
    <g>
      {/* Ground shadow */}
      <path d="M20 152 H80 L72 160 H28 Z" fill="#100907" />

      <path d={coil} fill="none" stroke="#17300B" strokeWidth="19" strokeLinejoin="miter" strokeLinecap="butt" />
      <path d={coil} fill="none" stroke="#3E6E22" strokeWidth="14" strokeLinejoin="miter" strokeLinecap="butt" />
      <path d={litCoil} fill="none" stroke={HAZARD_TINT.snake} strokeWidth="6" strokeLinejoin="miter" strokeLinecap="butt" />
      <path d={rimCoil} fill="none" stroke="#A6E86A" strokeWidth="2" strokeLinejoin="miter" strokeLinecap="butt" />

      {/* Diamond markings down the spine */}
      <g fill="#17300B">
        <path d="M37 143 L42 138 L37 133 L32 138 Z" />
        <path d="M34 127 L39 122 L34 117 L29 122 Z" />
        <path d="M36 111 L41 106 L36 101 L31 106 Z" />
        <path d="M33 95 L38 90 L33 85 L28 90 Z" />
        <path d="M38 79 L43 74 L38 69 L33 74 Z" />
      </g>

      {/* Tapered tail tip */}
      <path d="M28 152 L12 158 L18 162 L32 157 Z" fill="#3E6E22" />
      <path d="M28 152 L12 158 L20 158 Z" fill={HAZARD_TINT.snake} />

      {/* Head: narrow wedge, jaws open */}
      <path d="M66 70 L98 46 L114 56 L98 70 L74 80 Z" fill="#2F5A19" />
      <path d="M66 70 L98 46 L110 53 L84 70 Z" fill={HAZARD_TINT.snake} />
      <path d="M72 66 L96 50 L102 54 L78 70 Z" fill="#A6E86A" />

      {/* Open mouth */}
      <path d="M74 80 L98 70 L108 78 L82 90 Z" fill="#5A1410" />
      {/* Lower jaw */}
      <path d="M78 88 L106 76 L112 84 L84 97 Z" fill="#2F5A19" />
      <path d="M78 88 L106 76 L109 80 L81 92 Z" fill="#3E6E22" />

      {/* Slit eye */}
      <path d="M90 56 L100 51 L102 59 L92 63 Z" fill="#F6D067" />
      <path d="M94 55 L98 53 L99 60 L95 62 Z" fill="#0A0806" />
      {/* Nostril */}
      <rect x="106" y="55" width="3" height="2.5" fill="#0A0806" />

      {/* Fangs hanging from the upper jaw */}
      <path d="M80 79 L83 93 L86 77 Z" fill="#F4F0E2" />
      <path d="M92 74 L94 87 L97 72 Z" fill="#F4F0E2" />

      {/* Forked tongue flicking out of the mouth */}
      <path d="M100 80 L114 92 M114 92 L106 96 M114 92 L116 100" stroke="var(--blood)" strokeWidth="3" fill="none" />
    </g>
  );
}

function Spider() {
  /**
   * Legs are drawn as strokes so they stay welded to the body: a dark outline
   * pass, then a thinner lit pass along the same joints.
   */
  const legs = [
    'M52 64 L28 40 L10 52',
    'M50 70 L20 62 L6 78',
    'M50 76 L22 92 L12 114',
    'M54 80 L38 104 L34 130',
    'M68 64 L92 40 L110 52',
    'M70 70 L100 62 L114 78',
    'M70 76 L98 92 L108 114',
    'M66 80 L82 104 L86 130',
  ];
  const feet = [
    'M10 52 L2 56 L10 58 Z',
    'M6 78 L0 84 L8 84 Z',
    'M12 114 L8 122 L16 120 Z',
    'M34 130 L30 140 L38 138 Z',
    'M110 52 L118 56 L110 58 Z',
    'M114 78 L120 84 L112 84 Z',
    'M108 114 L112 122 L104 120 Z',
    'M86 130 L90 140 L82 138 Z',
  ];

  return (
    <g>
      {/* Web strands anchored in the corners */}
      <g stroke="#2E2038" strokeWidth="1.5" fill="none">
        <path d="M12 12 L44 44 M12 30 L34 44 M30 12 L44 30" />
        <path d="M108 12 L76 44 M108 30 L86 44 M90 12 L76 30" />
      </g>

      {/* Ground shadow */}
      <path d="M30 134 H90 L82 144 H38 Z" fill="#100907" />

      {legs.map((d) => (
        <path key={d} d={d} fill="none" stroke="#2A1C3E" strokeWidth="7" strokeLinejoin="miter" strokeLinecap="butt" />
      ))}
      {legs.map((d) => (
        <path
          key={`${d}-lit`}
          d={d}
          fill="none"
          stroke={HAZARD_TINT.spider}
          strokeWidth="2.5"
          strokeLinejoin="miter"
          strokeLinecap="butt"
        />
      ))}
      {feet.map((d) => (
        <path key={d} d={d} fill="#2A1C3E" />
      ))}

      {/* Abdomen: three facets plus a blood-red hourglass */}
      <path d="M60 74 L82 94 L74 122 L60 130 L46 122 L38 94 Z" fill="#4A3070" />
      <path d="M60 74 L82 94 L74 122 L60 130 Z" fill="#3A2559" />
      <path d="M60 74 L38 94 L46 122 L60 130 Z" fill={HAZARD_TINT.spider} />
      {/* Hourglass */}
      <path d="M52 88 H68 L61 104 L68 120 H52 L59 104 Z" fill="var(--blood)" />

      {/* Cephalothorax, overlapping the leg roots */}
      <path d="M60 50 L76 64 L72 80 L48 80 L44 64 Z" fill="#5A3E85" />
      <path d="M60 50 L44 64 L48 80 L60 80 Z" fill={HAZARD_TINT.spider} />
      <path d="M60 50 L76 64 L68 64 L60 56 Z" fill="#7B57AE" />

      {/* Eight eyes, two rows */}
      <g fill="var(--blood)">
        <rect x="49" y="62" width="4.5" height="4.5" />
        <rect x="56" y="60" width="5" height="5" />
        <rect x="63" y="60" width="5" height="5" />
        <rect x="70" y="62" width="4.5" height="4.5" />
        <rect x="52" y="70" width="3.5" height="3.5" />
        <rect x="58" y="71" width="3.5" height="3.5" />
        <rect x="63" y="71" width="3.5" height="3.5" />
        <rect x="68" y="70" width="3.5" height="3.5" />
      </g>

      {/* Chelicerae */}
      <path d="M52 80 L55 92 L59 81 Z" fill="#F4F0E2" />
      <path d="M61 81 L65 92 L68 80 Z" fill="#F4F0E2" />
    </g>
  );
}

function Mummy() {
  return (
    <g>
      {/* Sarcophagus recess behind the figure */}
      <path d="M30 20 H90 L96 40 V150 H24 V40 Z" fill="#241611" />
      <path d="M30 20 H90 L96 40 H24 Z" fill="#2E1C15" />

      {/* Shoulders, wrapped */}
      <path d="M22 150 V120 L44 108 H76 L98 120 V150 Z" fill="#B3A282" />
      <path d="M22 150 V120 L44 108 H60 V150 Z" fill={HAZARD_TINT.mummy} />

      {/* Head */}
      <path d="M38 40 H82 L88 56 V96 L60 116 L32 96 V56 Z" fill="#B3A282" />
      <path d="M38 40 H82 L88 56 H32 Z" fill={HAZARD_TINT.mummy} />
      <path d="M60 116 L88 96 V56 H60 Z" fill="#8E7F63" />

      {/* Bandages: angled, overlapping strips with dark gaps between them */}
      <g fill="#CFBE9A">
        <path d="M32 60 H88 L88 66 H32 Z" />
        <path d="M32 72 L88 68 V74 L32 78 Z" />
        <path d="M32 84 H88 V90 L32 92 Z" />
        <path d="M34 98 L86 94 V100 L38 106 Z" />
        <path d="M22 126 L98 122 V128 L22 132 Z" />
        <path d="M22 138 H98 V144 H22 Z" />
      </g>
      <g fill="#6E6149">
        <path d="M32 66 H88 V68 H32 Z" />
        <path d="M32 78 L88 74 V76 L32 80 Z" />
        <path d="M32 92 H88 V94 L32 96 Z" />
        <path d="M22 132 L98 128 V130 L22 134 Z" />
      </g>

      {/* Trailing wrap coming loose off the shoulder */}
      <path d="M22 120 L8 128 L10 136 L24 130 Z" fill="#CFBE9A" />
      <path d="M8 128 L2 140 L8 142 L12 134 Z" fill="#8E7F63" />

      {/* Sunken sockets with a red glow burning inside */}
      <path d="M38 66 L56 62 L58 80 L38 82 Z" fill="#0A0806" />
      <path d="M82 66 L64 62 L62 80 L82 82 Z" fill="#0A0806" />
      <path d="M43 70 L53 68 L54 77 L43 78 Z" fill="var(--blood)" />
      <path d="M77 70 L67 68 L66 77 L77 78 Z" fill="var(--blood)" />
      <rect x="45" y="71" width="4" height="3" fill="#FF8A6A" />
      <rect x="71" y="71" width="4" height="3" fill="#FF8A6A" />

      {/* Jaw, unwrapped — bared teeth */}
      <path d="M46 100 H74 L70 112 H50 Z" fill="#0A0806" />
      <g fill="#EFE6D0">
        <rect x="49" y="100" width="4" height="8" />
        <rect x="55" y="100" width="4" height="9" />
        <rect x="61" y="100" width="4" height="9" />
        <rect x="67" y="100" width="4" height="8" />
      </g>

      {/* Gold amulet on the chest */}
      <path d="M60 122 L68 130 L60 140 L52 130 Z" fill="var(--gold)" />
      <path d="M60 122 L68 130 L60 130 Z" fill="#F6D067" />
      <path d="M52 130 L60 130 L60 140 Z" fill="var(--gold-deep)" />

      {/* Dust hanging in the air */}
      <g fill="#6E6149">
        <rect x="18" y="52" width="3" height="3" />
        <rect x="100" y="70" width="3" height="3" />
        <rect x="96" y="102" width="2.5" height="2.5" />
        <rect x="20" y="94" width="2.5" height="2.5" />
      </g>
    </g>
  );
}

function Fire() {
  return (
    <g>
      {/* Scorched wall behind */}
      <path d="M22 148 L34 60 L48 96 L60 28 L74 92 L88 58 L98 148 Z" fill="#2A1008" />

      {/* Flame, five tonal steps from the outside in */}
      <path d="M60 18 L80 56 L94 44 L88 84 L102 112 L86 146 L34 146 L18 112 L32 84 L26 44 L40 56 Z" fill="#8C2606" />
      <path d="M60 30 L77 62 L88 54 L83 88 L94 112 L80 140 L40 140 L26 112 L37 88 L32 54 L43 62 Z" fill="#C43C08" />
      <path d="M60 44 L73 72 L80 64 L77 92 L85 112 L74 134 L46 134 L35 112 L43 92 L40 64 L47 72 Z" fill={HAZARD_TINT.fire} />
      <path d="M60 62 L70 88 L74 108 L66 128 L54 128 L46 108 L50 88 Z" fill="#FFC531" />
      <path d="M60 84 L67 106 L60 124 L53 106 Z" fill="#FFF0B8" />

      {/* Charred logs at the base */}
      <path d="M18 146 H102 L96 158 H24 Z" fill="#241408" />
      <path d="M24 148 H96 L92 153 H28 Z" fill="#3E2410" />
      <g fill="#0A0806">
        <rect x="34" y="150" width="12" height="2" />
        <rect x="56" y="150" width="16" height="2" />
        <rect x="80" y="150" width="10" height="2" />
      </g>

      {/* Embers lifting off */}
      <g>
        <path d="M22 46 L27 52 L22 58 L17 52 Z" fill={HAZARD_TINT.fire} />
        <path d="M100 52 L105 58 L100 64 L95 58 Z" fill={HAZARD_TINT.fire} />
        <path d="M88 22 L92 26 L88 30 L84 26 Z" fill="#FFC531" />
        <path d="M30 24 L33 27 L30 30 L27 27 Z" fill="#FFC531" />
        <path d="M104 30 L107 33 L104 36 L101 33 Z" fill="#8C2606" />
        <path d="M14 76 L17 79 L14 82 L11 79 Z" fill="#FFC531" />
      </g>
    </g>
  );
}

function Rockfall() {
  /** One boulder: lit top, mid front, dark side, plus a hard crack. */
  const boulder = (top: string, front: string, side: string, crack: string) => (
    <g>
      <path d={front} fill="#6D6152" />
      <path d={top} fill={HAZARD_TINT.rockfall} />
      <path d={side} fill="#443B31" />
      <path d={crack} fill="#2A241E" />
    </g>
  );

  return (
    <g>
      {/* Ceiling giving way, with fracture lines running into the dark */}
      <path d="M10 10 H110 V26 L92 34 L74 22 L54 32 L34 20 L18 30 L10 24 Z" fill="#3A322A" />
      <path d="M10 10 H110 V16 H10 Z" fill="#5E5346" />
      <g stroke="#160E0B" strokeWidth="2" fill="none">
        <path d="M30 11 L38 22 L28 28" />
        <path d="M62 10 L58 20 L70 26" />
        <path d="M92 12 L86 22 L96 28" />
      </g>

      {/* Motion streaks behind the fall */}
      <g stroke="#241C16" strokeWidth="2" fill="none">
        <path d="M34 34 V52 M58 30 V44 M84 36 V54" />
      </g>

      {/* Falling debris, small and sharp */}
      <g fill="#5E5346">
        <path d="M20 54 L26 50 L28 58 L22 60 Z" />
        <path d="M100 62 L106 58 L108 66 L102 68 Z" />
        <path d="M84 44 L88 42 L89 47 L85 48 Z" />
      </g>

      {boulder(
        'M24 52 L48 44 L60 54 L36 62 Z',
        'M24 52 L36 62 L34 78 L20 70 Z',
        'M36 62 L60 54 L58 70 L34 78 Z',
        'M40 62 L46 70 L42 76 Z',
      )}
      {boulder(
        'M74 60 L100 54 L110 66 L86 72 Z',
        'M74 60 L86 72 L84 90 L70 80 Z',
        'M86 72 L110 66 L108 84 L84 90 Z',
        'M92 72 L98 82 L92 88 Z',
      )}
      {boulder(
        'M38 92 L72 84 L86 98 L52 106 Z',
        'M38 92 L52 106 L50 128 L34 116 Z',
        'M52 106 L86 98 L84 120 L50 128 Z',
        'M60 106 L68 118 L60 126 Z',
      )}

      {/* Impact: cracked floor, dust kicking up either side */}
      <path d="M14 142 H106 L98 152 H22 Z" fill="#3A322A" />
      <path d="M14 142 H106 L104 145 H16 Z" fill="#5E5346" />
      <g stroke="#0A0806" strokeWidth="2" fill="none">
        <path d="M30 152 L38 142 M56 152 L60 142 M84 152 L78 142" />
      </g>
      <g fill="#7E7365">
        <path d="M16 140 L24 130 L30 140 Z" />
        <path d="M90 140 L98 132 L104 140 Z" />
        <path d="M44 134 L50 128 L52 136 Z" />
        <path d="M70 136 L76 130 L78 138 Z" />
      </g>
    </g>
  );
}

const HAZARD_ART: Record<HazardType, () => ReactNode> = {
  snake: Snake,
  spider: Spider,
  mummy: Mummy,
  fire: Fire,
  rockfall: Rockfall,
};

export function HazardCard({ hazard, className }: { hazard: HazardType; className?: string }) {
  return (
    <SpriteOr src={hazardSprite(hazard)} alt={`${HAZARD_NAME[hazard]} hazard`} className={className}>
      <HazardCardSvg hazard={hazard} className={className} />
    </SpriteOr>
  );
}

function HazardCardSvg({ hazard, className }: { hazard: HazardType; className?: string }) {
  const Art = HAZARD_ART[hazard];
  return (
    <CardFrame
      base={HAZARD_BASE}
      frame="#7A1D10"
      frameLit="#C2301C"
      frameShade="#4A1008"
      title={`${HAZARD_NAME[hazard]} hazard`}
      className={className}
    >
      <BackWall tone={HAZARD_WALL} groove="#0F0908" />
      <Art />
    </CardFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Artifact                                                            */
/* ------------------------------------------------------------------ */

export function ArtifactCard({ className }: { className?: string }) {
  return (
    <SpriteOr src={artifactSprite()} alt="Artifact" className={className}>
      <ArtifactCardSvg className={className} />
    </SpriteOr>
  );
}

function ArtifactCardSvg({ className }: { className?: string }) {
  return (
    <CardFrame
      base="#1A1208"
      frame="#8A6418"
      frameLit="#C99A28"
      frameShade="#5A400E"
      title="Artifact"
      className={className}
    >
      <BackWall tone="#1A1208" groove="#120C05" />

      {/* Flat rays fanning out behind the idol */}
      <g fill="#3C2C0E">
        <path d="M60 90 L26 14 L42 12 Z" />
        <path d="M60 90 L94 14 L78 12 Z" />
        <path d="M60 90 L12 42 L10 58 Z" />
        <path d="M60 90 L108 42 L110 58 Z" />
        <path d="M60 90 L14 84 L16 96 Z" />
        <path d="M60 90 L106 84 L104 96 Z" />
      </g>

      {/* Stepped headdress */}
      <path d="M28 44 H92 L86 58 H34 Z" fill="var(--gold-deep)" />
      <path d="M28 44 H92 L88 50 H32 Z" fill="#F6D067" />
      <rect x="36" y="30" width="9" height="14" fill="var(--gold-deep)" />
      <rect x="49" y="22" width="9" height="22" fill="var(--gold)" />
      <rect x="62" y="22" width="9" height="22" fill="var(--gold)" />
      <rect x="75" y="30" width="9" height="14" fill="var(--gold-deep)" />
      <rect x="49" y="22" width="9" height="4" fill="#F6D067" />
      <rect x="62" y="22" width="9" height="4" fill="#F6D067" />

      {/* Mask: lit left plane, shaded right plane */}
      <path d="M34 58 H86 L92 76 L82 122 L60 144 L38 122 L28 76 Z" fill="var(--gold)" />
      <path d="M60 58 H86 L92 76 L82 122 L60 144 Z" fill="var(--gold-deep)" />
      <path d="M34 58 H60 V70 L38 74 Z" fill="#F6D067" />

      {/* Ear discs */}
      <path d="M28 80 L20 74 L16 88 L26 94 Z" fill="var(--gold)" />
      <path d="M92 80 L100 74 L104 88 L94 94 Z" fill="var(--gold-deep)" />

      {/* Brow ridge */}
      <path d="M34 68 H86 L84 74 H36 Z" fill="#1A1208" />

      {/* Inlaid jade eyes, cut hard into the metal */}
      <path d="M38 78 L56 74 L54 92 L38 92 Z" fill="#1A1208" />
      <path d="M82 78 L64 74 L66 92 L82 92 Z" fill="#1A1208" />
      <path d="M42 80 L53 78 L52 88 L42 88 Z" fill="var(--gem)" />
      <path d="M78 80 L67 78 L68 88 L78 88 Z" fill="var(--gem-shade)" />
      <rect x="43" y="81" width="4" height="3" fill="var(--gem-lit)" />
      <rect x="69" y="81" width="4" height="3" fill="var(--gem-lit)" />

      {/* Nose ornament */}
      <path d="M60 92 L66 104 H54 Z" fill="var(--gold-deep)" />
      <path d="M60 92 L63 104 H57 Z" fill="#F6D067" />

      {/* Mouth with teeth */}
      <path d="M44 108 H76 L70 124 H50 Z" fill="#1A1208" />
      <g fill="#F6D067">
        <rect x="49" y="108" width="5" height="10" />
        <rect x="57" y="108" width="6" height="11" />
        <rect x="66" y="108" width="5" height="10" />
      </g>

      {/* Cheek frets */}
      <g fill="#1A1208">
        <rect x="34" y="98" width="9" height="3" />
        <rect x="34" y="104" width="5" height="3" />
        <rect x="78" y="98" width="9" height="3" />
        <rect x="82" y="104" width="5" height="3" />
      </g>

      {/* Pedestal */}
      <path d="M40 144 H80 L86 152 H34 Z" fill="var(--gold-deep)" />
      <path d="M34 152 H86 V158 H34 Z" fill="#5A400E" />
    </CardFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Card back                                                           */
/* ------------------------------------------------------------------ */

export function CardBack({ className }: { className?: string }) {
  return (
    <SpriteOr src={cardBackSprite()} alt="Face-down card" className={className}>
      <CardBackSvg className={className} />
    </SpriteOr>
  );
}

function CardBackSvg({ className }: { className?: string }) {
  return (
    <CardFrame
      base="#171310"
      frame="#5A400E"
      frameLit="#8A6418"
      frameShade="#3A2A08"
      title="Face-down card"
      className={className}
    >
      <BackWall tone="#171310" groove="#100C09" />

      {/* Meander band top and bottom */}
      <g fill="var(--gold-deep)">
        <path d="M16 18 H104 V22 H16 Z" />
        <path d="M16 146 H104 V150 H16 Z" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={`t${i}`} x={18 + i * 15} y="24" width="8" height="6" />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={`b${i}`} x={18 + i * 15} y="138" width="8" height="6" />
        ))}
      </g>

      {/* Central sun emblem, stepped */}
      <g>
        <path d="M60 48 L72 60 H48 Z" fill="var(--gold-deep)" />
        <path d="M60 120 L48 108 H72 Z" fill="var(--gold-deep)" />
        <path d="M28 84 L40 72 V96 Z" fill="var(--gold-deep)" />
        <path d="M92 84 L80 96 V72 Z" fill="var(--gold-deep)" />
        <rect x="42" y="66" width="36" height="36" fill="var(--gold-deep)" />
        <rect x="48" y="72" width="24" height="24" fill="#171310" />
        <path d="M60 74 L70 84 L60 94 L50 84 Z" fill="var(--gold)" />
        <path d="M60 74 L70 84 L60 84 Z" fill="#F6D067" />
      </g>

      {/* Stepped fret flanking the emblem */}
      <g fill="var(--gold-deep)">
        <path d="M20 60 H32 V64 H24 V80 H20 Z" />
        <path d="M100 60 H88 V64 H96 V80 H100 Z" />
        <path d="M20 108 H32 V104 H24 V88 H20 Z" />
        <path d="M100 108 H88 V104 H96 V88 H100 Z" />
      </g>
    </CardFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Dispatcher                                                          */
/* ------------------------------------------------------------------ */

export function CardArt({ card, className }: { card: PathCard; className?: string }) {
  if (card.kind === 'treasure') return <TreasureCard value={card.value} className={className} />;
  if (card.kind === 'hazard') return <HazardCard hazard={card.hazard} className={className} />;
  return <ArtifactCard className={className} />;
}
