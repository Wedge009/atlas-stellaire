// Shared helpers for working with the gemini.json sector data.

// Universal screen-projection formula, derived from pixel-measurement of
// real screenshots across 4 systems / 18 points (see project briefing).
// Used as a fallback flat position for nav points with no sx/sy in the data.
const PROJECTION = {
  xScale: 0.0007019,
  xOffset: 49.22,
  yScale: -0.0007092,
  yOffset: 49.49,
};

export function projectFallback(x, y) {
  return {
    sx: PROJECTION.xScale * x + PROJECTION.xOffset,
    sy: PROJECTION.yScale * y + PROJECTION.yOffset,
  };
}

// Resolves the flat (sx, sy) position to actually render, filling in a
// projected fallback when the data has none, and flagging that it's estimated.
export function resolveFlatPosition(navPoint) {
  if (navPoint.sx != null && navPoint.sy != null) {
    return { sx: navPoint.sx, sy: navPoint.sy, estimated: false };
  }
  const { sx, sy } = projectFallback(navPoint.x, navPoint.y);
  return { sx, sy, estimated: true };
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

const CORRECTED_COLORS = {
  base: { color: '#ffbb33', emissive: '#553300' },
  default: { color: '#ffdd66', emissive: '#553300' },
};

// Returns the visual treatment for a nav point: shape, color, and whether it
// should render with the "estimated position" (dashed) treatment.
export function styleForNavPoint(navPoint) {
  const type = navPoint.type || 'unknown';
  const shape = type === 'base' ? 'box' : type === 'point' ? 'dot' : type === 'jump' ? 'sphere' : 'ghost';
  const corrected = Boolean(navPoint.xyzCorrected || navPoint.destCorrected);
  const palette = corrected
    ? (type === 'base' ? CORRECTED_COLORS.base : CORRECTED_COLORS.default)
    : TYPE_COLORS[type] || TYPE_COLORS.unknown;
  return {
    shape,
    color: palette.color,
    emissive: palette.emissive,
    corrected,
    dimmed: type === 'unknown',
  };
}

export function navPointLabel(navPoint) {
  if (navPoint.dest) return `${navPoint.label} → ${navPoint.dest}`;
  if (navPoint.baseName) return `${navPoint.label}: ${navPoint.baseName}`;
  return navPoint.label;
}
