import { shipSize } from './ships.js';

// Base SVG size (viewBox is 0-100) for a Talon-class fighter; other ships
// scale relative to it via shipSize() (see README.md 'Ship encounter
// sprites' - the sprite bitmaps themselves are NOT drawn to scale). Shared
// between the 2D SVG sprites and the 3D orbiting sprites so both views agree
// on each ship's relative on-screen size.
export const BASE_SPRITE_SIZE = 1.6;
const BASE_SHIP_SIZE = shipSize('TALMIL');

export function spriteSizeFor(shipId) {
  const size = shipSize(shipId);
  return size ? BASE_SPRITE_SIZE * (size / BASE_SHIP_SIZE) : BASE_SPRITE_SIZE;
}
