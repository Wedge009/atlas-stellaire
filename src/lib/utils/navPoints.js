// Shared helpers for working with the gemini.json sector data.

// Resolves the flat (sx, sy) position to actually render.
export function resolveFlatPosition(navPoint) {
  return { sx: navPoint.sx, sy: navPoint.sy };
}

export function flattenSystems(data) {
  const systems = [];
  for (const quadrant of data.quadrants) {
    for (const system of quadrant.systems) {
      systems.push({ ...system, quadrantId: quadrant.id, quadrantName: quadrant.name });
    }
  }
  return systems;
}

export function findSystem(data, systemId) {
  for (const quadrant of data.quadrants) {
    const system = quadrant.systems.find((s) => s.id === systemId);
    if (system) return { ...system, quadrantId: quadrant.id, quadrantName: quadrant.name };
  }
  return null;
}

// Resolves a nav point's `dest` (a system id) to its display name.
export function systemName(data, systemId) {
  return findSystem(data, systemId)?.name ?? systemId;
}

const TYPE_STYLES = {
  jump: { shape: 'sphere', color: '#4dc8ff', emissive: '#0a3a55' },
  base: { shape: 'box', color: '#33cc55', emissive: '#114411' },
  point: { shape: 'dot', color: '#e0d060', emissive: '#4a3f10' },
};

const HIDDEN_COLOR = '#6a7a85';
const HIDDEN_EMISSIVE = '#1a2226';

// Returns the visual treatment for a nav point: shape by type, colour/dimming by visibility.
export function styleForNavPoint(navPoint) {
  const style = TYPE_STYLES[navPoint.type];
  const hidden = !navPoint.visibleOnMap;
  return {
    shape: style.shape,
    color: hidden ? HIDDEN_COLOR : style.color,
    emissive: hidden ? HIDDEN_EMISSIVE : style.emissive,
    dimmed: hidden,
  };
}

export function navPointLabel(navPoint, /** @type {any} */ data) {
  if (navPoint.dest) return `${navPoint.label}: Jump to ${systemName(data, navPoint.dest)}`;
  if (navPoint.baseName) return `${navPoint.label}: ${navPoint.baseName}`;
  return navPoint.label;
}
