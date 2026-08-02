/**
 * Optional custom sprite overrides.
 *
 * Every piece of art in the game has a hand-authored SVG fallback in `art/`.
 * Dropping a file into `public/sprites/` under the matching name below replaces
 * that art at runtime — no code change, no rebuild of the art.
 *
 * Paths here carry no extension: `SpriteOr` tries `.svg` then `.png`, so either
 * format works. Vite serves `public/` verbatim, so these are plain absolute
 * URLs, and a missing file simply leaves the built-in art on screen.
 */
import { type HazardType } from '../../shared/types.js';

/** BASE_URL is '/' on the Worker and '/MnbGold/' on GitHub Pages. */
const BASE = `${import.meta.env.BASE_URL}sprites`;

/** Card faces are drawn at a 120 x 168 aspect (5:7). */
export const CARD_ASPECT = 120 / 168;

export const hazardSprite = (hazard: HazardType) => `${BASE}/hazards/${hazard}`;
export const treasureSprite = (value: number) => `${BASE}/treasures/treasure-${value}`;
export const artifactSprite = () => `${BASE}/artifact`;
export const cardBackSprite = () => `${BASE}/card-back`;
export const avatarSprite = (index: number) => `${BASE}/explorers/explorer-${index + 1}`;
