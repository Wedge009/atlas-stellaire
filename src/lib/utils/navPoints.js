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

const TYPE_COLORS = {
  jump: { color: '#4dc8ff', emissive: '#0a3a55' },
  base: { color: '#33cc55', emissive: '#114411' },
  point: { color: '#e0d060', emissive: '#4a3f10' },
  unknown: { color: '#6a7a85', emissive: '#1a2226' },
};

// Returns the visual treatment for a nav point: shape and color.
export function styleForNavPoint(navPoint) {
  const type = navPoint.type || 'unknown';
  const shape = type === 'base' ? 'box' : type === 'point' ? 'dot' : type === 'jump' ? 'sphere' : 'ghost';
  const palette = TYPE_COLORS[type] || TYPE_COLORS.unknown;
  return {
    shape,
    color: palette.color,
    emissive: palette.emissive,
    dimmed: type === 'unknown',
  };
}

export function navPointLabel(navPoint) {
  if (navPoint.dest) return `${navPoint.label}: Jump to ${navPoint.dest}`;
  if (navPoint.baseName) return `${navPoint.label}: ${navPoint.baseName}`;
  return navPoint.label;
}
