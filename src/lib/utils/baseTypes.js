const base = import.meta.env.BASE_URL;

const BASE_TYPE_ICONS = {
  agricultural: `${base}assets/bases/agricultural.png`,
  gaea: `${base}assets/bases/gaea.png`,
  mining: `${base}assets/bases/mining.png`,
  pirate: `${base}assets/bases/pirate.png`,
  steltek: `${base}assets/bases/steltek.png`,
  'new-constantinople': `${base}assets/bases/new-constantinople.png`,
  'new-detroit': `${base}assets/bases/new-detroit.png`,
  oxford: `${base}assets/bases/oxford.png`,
  perry: `${base}assets/bases/perry.png`,
  pleasure: `${base}assets/bases/pleasure.png`,
  refinery: `${base}assets/bases/refinery.png`,
};

export function baseTypeIcon(baseType) {
  return BASE_TYPE_ICONS[baseType] ?? null;
}
