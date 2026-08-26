const BASE_TYPE_ICONS = {
  agricultural: '/assets/bases/agricultural.png',
  gaea: '/assets/bases/gaea.png',
  mining: '/assets/bases/mining.png',
  pirate: '/assets/bases/pirate.png',
  steltek: '/assets/bases/steltek.png',
  'new-constantinople': '/assets/bases/new-constantinople.png',
  'new-detroit': '/assets/bases/new-detroit.png',
  oxford: '/assets/bases/oxford.png',
  perry: '/assets/bases/perry.png',
  pleasure: '/assets/bases/pleasure.png',
  refinery: '/assets/bases/refinery.png',
};

export function baseTypeIcon(baseType) {
  return BASE_TYPE_ICONS[baseType] ?? null;
}
