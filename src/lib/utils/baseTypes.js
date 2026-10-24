const base = import.meta.env.BASE_URL;

const BASE_TYPE_ICONS = {
  agricultural: `${base}assets/bases/agricultural.png`,
  gaea: `${base}assets/bases/agricultural.png`,
  mining: `${base}assets/bases/mining.png`,
  pirate: `${base}assets/bases/mining.png`,
  steltek: `${base}assets/bases/steltek.png`,
  'new-constantinople': `${base}assets/bases/new-constantinople.png`,
  'new-detroit': `${base}assets/bases/new-detroit.png`,
  oxford: `${base}assets/bases/pleasure.png`,
  perry: `${base}assets/bases/perry.png`,
  pleasure: `${base}assets/bases/pleasure.png`,
  refinery: `${base}assets/bases/refinery.png`,
};

// Most of the icons are 320x200 VGA art drawn for a 4:3 screen, where each
// pixel was 1.2x taller than wide. These few were drawn for square pixels
// instead - their round shapes already read as round without the stretch.
const VGA_PIXEL_ASPECT = 1.2;
const SQUARE_PIXEL_ICONS = new Set([
  BASE_TYPE_ICONS.agricultural,
  BASE_TYPE_ICONS.perry,
  BASE_TYPE_ICONS.pleasure,
]);

export function baseTypeIcon(baseType) {
  return BASE_TYPE_ICONS[baseType] ?? null;
}

// How much taller than wide each of the icon's pixels should be drawn.
export function baseTypeIconPixelAspect(baseType) {
  return SQUARE_PIXEL_ICONS.has(BASE_TYPE_ICONS[baseType]) ? 1 : VGA_PIXEL_ASPECT;
}
