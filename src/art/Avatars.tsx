/**
 * Ten explorers. Flat planes, mitred corners, one hard shadow tone per figure —
 * each silhouette is distinct enough to tell apart at 24px on a phone.
 */

const CLOTH = [
  '#E3AE2E',
  '#2FB89A',
  '#E2452F',
  '#6F90F7',
  '#A97BE0',
  '#F79020',
  '#9C8F7D',
  '#6FBF3A',
  '#DCCBA2',
  '#E86FA6',
];

const CLOTH_SHADE = [
  '#A5761A',
  '#1A7B66',
  '#9C2618',
  '#33509F',
  '#6B48A0',
  '#A85C0C',
  '#645B4E',
  '#3E7F1F',
  '#A2946F',
  '#A34670',
];

const SKIN = ['#EFC29B', '#C98B5E', '#8E5A34', '#F3D6B6', '#6B4126', '#DFAE85', '#A9713F', '#F0C8A4', '#7C4E2C', '#C99A70'];
const SKIN_SHADE = ['#C99C74', '#A26B43', '#6E4326', '#D2B08F', '#4E2E19', '#B98A63', '#84542C', '#CCA37F', '#5C3720', '#A67953'];

export const AVATAR_COUNT = CLOTH.length;

/** Headgear, one per explorer, so nobody is mistaken for anybody else. */
function Headgear({ i, cloth, shade }: { i: number; cloth: string; shade: string }) {
  switch (i % 10) {
    case 0: // Wide-brim hat
      return (
        <g>
          <rect x="9" y="11" width="30" height="4" fill={shade} />
          <path d="M16 3 H32 V11 H16 Z" fill={cloth} />
          <rect x="16" y="8" width="16" height="3" fill={shade} />
        </g>
      );
    case 1: // Pith helmet
      return (
        <g>
          <path d="M15 11 L18 3 H30 L33 11 Z" fill={cloth} />
          <rect x="11" y="11" width="26" height="3" fill={shade} />
        </g>
      );
    case 2: // Knotted bandana
      return (
        <g>
          <path d="M14 11 H34 V16 H14 Z" fill={cloth} />
          <path d="M34 12 L41 9 L39 18 Z" fill={shade} />
        </g>
      );
    case 3: // Headband
      return (
        <g>
          <path d="M15 6 H33 V12 H15 Z" fill={shade} />
          <rect x="14" y="13" width="20" height="3" fill={cloth} />
        </g>
      );
    case 4: // Hood
      return (
        <g>
          <path d="M11 16 L17 3 H31 L37 16 V24 H33 V11 H15 V24 H11 Z" fill={cloth} />
          <path d="M11 16 L17 3 H23 L17 16 Z" fill={shade} />
        </g>
      );
    case 5: // Cap with a hard visor
      return (
        <g>
          <path d="M15 6 H33 V12 H15 Z" fill={cloth} />
          <path d="M33 12 H43 L43 15 H33 Z" fill={shade} />
        </g>
      );
    case 6: // Goggles pushed up
      return (
        <g>
          <rect x="14" y="9" width="20" height="5" fill={shade} />
          <rect x="16" y="10" width="6" height="3" fill={cloth} />
          <rect x="26" y="10" width="6" height="3" fill={cloth} />
          <path d="M15 5 H33 V9 H15 Z" fill={cloth} />
        </g>
      );
    case 7: // Feathered crown
      return (
        <g>
          <path d="M18 2 L21 11 L15 11 Z" fill={shade} />
          <path d="M24 0 L28 11 L20 11 Z" fill={cloth} />
          <path d="M30 2 L33 11 L27 11 Z" fill={shade} />
          <rect x="14" y="11" width="20" height="4" fill={cloth} />
        </g>
      );
    case 8: // Lamp helmet
      return (
        <g>
          <path d="M14 12 L17 4 H31 L34 12 Z" fill={cloth} />
          <rect x="21" y="4" width="6" height="5" fill={shade} />
          <rect x="22" y="5" width="4" height="3" fill="#FFD24A" />
        </g>
      );
    default: // Long braided hair
      return (
        <g>
          <path d="M14 8 H34 V14 H14 Z" fill={cloth} />
          <rect x="11" y="12" width="4" height="18" fill={shade} />
          <rect x="33" y="12" width="4" height="18" fill={shade} />
        </g>
      );
  }
}

export function Avatar({ index, className, title }: { index: number; className?: string; title?: string }) {
  const i = ((index % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT;
  const cloth = CLOTH[i];
  const shade = CLOTH_SHADE[i];
  const skin = SKIN[i];
  const skinShade = SKIN_SHADE[i];
  const label = title ?? `Explorer ${i + 1}`;

  return (
    // Sizing is left entirely to CSS so a caller's class always wins.
    <svg viewBox="0 0 48 48" className={`avatar${className ? ` ${className}` : ''}`} role="img" aria-label={label}>
      <title>{label}</title>
      <rect width="48" height="48" fill={shade} />
      <rect x="0" y="0" width="48" height="26" fill={cloth} opacity="0.22" />

      {/* Shoulders */}
      <path d="M4 48 L11 34 H37 L44 48 Z" fill={cloth} />
      <path d="M4 48 L11 34 H19 L14 48 Z" fill={shade} />

      {/* Neck */}
      <rect x="21" y="27" width="6" height="8" fill={skinShade} />

      {/* Head */}
      <path d="M15 10 H33 V26 L24 33 L15 26 Z" fill={skin} />
      <path d="M24 33 L33 26 V10 H24 Z" fill={skinShade} />

      <Headgear i={i} cloth={cloth} shade={shade} />

      {/* Eyes fixed on whatever is ahead */}
      <rect x="18" y="18" width="4" height="4" fill="#1C120E" />
      <rect x="26" y="18" width="4" height="4" fill="#1C120E" />
      {/* Set jaw */}
      <rect x="21" y="26" width="7" height="2" fill="#1C120E" opacity="0.75" />
    </svg>
  );
}
