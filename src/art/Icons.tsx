/**
 * UI icons. All flat, all hard-edged, all drawn from straight segments and
 * mitred joins — no curves, no gradients. They inherit `currentColor` so they
 * re-tint with the theme for free.
 */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 24, className, children, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="butt"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      /* `glyph` pins the drawn size: an icon is the label, so it must never be
         squeezed by the flex box it sits in. */
      className={className ? `glyph ${className}` : 'glyph'}
      {...rest}
    >
      {children}
    </svg>
  );
}

export function GemIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 L20 11 L12 21 L4 11 Z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function ArtifactIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3 H18 V8 L15 11 V21 H9 V11 L6 8 Z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function SkullIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 3 H20 V14 L16 18 V21 H8 V18 L4 14 Z" fill="currentColor" stroke="none" />
      <rect x="7" y="8" width="3.5" height="4" fill="var(--surface)" stroke="none" />
      <rect x="13.5" y="8" width="3.5" height="4" fill="var(--surface)" stroke="none" />
    </Icon>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 7 L17 12 L12 17 L7 12 Z" fill="currentColor" stroke="none" />
      <path d="M12 1 V4 M12 20 V23 M1 12 H4 M20 12 H23 M4 4 L6 6 M18 18 L20 20 M20 4 L18 6 M6 18 L4 20" />
    </Icon>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {/* One angular crescent: a hex with a second, offset hex cut out of it. */}
      <path
        d="M13 2 L20 9 V15 L13 22 L6 15 V9 Z M19 0 L28 9 V15 L19 24 L12 15 V9 Z"
        fill="currentColor"
        stroke="none"
        fillRule="evenodd"
      />
    </Icon>
  );
}

export function PaletteIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="5" height="16" fill="currentColor" stroke="none" />
      <rect x="9.5" y="4" width="5" height="16" fill="currentColor" stroke="none" opacity="0.62" />
      <rect x="16" y="4" width="5" height="16" fill="currentColor" stroke="none" opacity="0.34" />
    </Icon>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 3 H11 V21 H3 Z" fill="currentColor" stroke="none" />
      <path d="M13 3 H21 V21 H13 Z" fill="currentColor" stroke="none" opacity="0.5" />
    </Icon>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="12" height="12" />
      <rect x="9" y="9" width="12" height="12" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 5 L19 19 M19 5 L5 19" strokeWidth={2.6} />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12 L10 18 L20 5" strokeWidth={3} />
    </Icon>
  );
}

export function DeckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="6" width="12" height="16" fill="currentColor" stroke="none" opacity="0.45" />
      <rect x="8" y="2" width="12" height="16" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function ExitIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 3 H12 V21 H3 Z" fill="currentColor" stroke="none" />
      <path d="M14 12 H22 M18 8 L22 12 L18 16" strokeWidth={2.4} />
    </Icon>
  );
}

export function OnwardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 12 H15 M11 6 L17 12 L11 18" strokeWidth={2.4} />
      <rect x="19" y="3" width="3" height="18" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function TentIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 L22 21 H2 Z" fill="currentColor" stroke="none" />
      <path d="M12 11 L17 21 H7 Z" fill="var(--surface)" stroke="none" />
    </Icon>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 3 H19 V9 L15 14 H9 L5 9 Z" fill="currentColor" stroke="none" />
      <path d="M11 14 H13 V18 H17 V21 H7 V18 H11 Z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

/**
 * Extra mode's mark: a hazard triangle carrying a warning bar.
 *
 * Drawn as an outline with a solid bang rather than a filled plate with holes
 * punched in it — this one has to sit on the surface, on a button and on the
 * accent fill, so it cannot assume what colour is behind it.
 */
export function RiskIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2 L23 21 H1 Z" strokeWidth={2.2} />
      <rect x="10.8" y="9" width="2.4" height="5.5" fill="currentColor" stroke="none" />
      <rect x="10.8" y="16.2" width="2.4" height="2.4" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2 L22 12 L12 22 L2 12 Z" />
      <path d="M12 6 V12 L16 15" strokeWidth={2.2} />
    </Icon>
  );
}
