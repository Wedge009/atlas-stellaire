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

// Global sector-map position for a system: its quadrant tile (100 units square,
// placed by gridCol/gridRow) offset by the system's own local sx/sy.
export function sectorPosition(quadrant, system) {
  return { gx: quadrant.gridCol * 100 + system.sx, gy: quadrant.gridRow * 100 + system.sy };
}

// Flattens every system across all quadrants with its resolved global position.
export function sectorSystems(data) {
  const systems = [];
  for (const quadrant of data.quadrants) {
    for (const system of quadrant.systems) {
      const { gx, gy } = sectorPosition(quadrant, system);
      systems.push({ ...system, quadrantId: quadrant.id, quadrantName: quadrant.name, gx, gy });
    }
  }
  return systems;
}

// Unique jump routes between systems (from nav point `dest` links), each with
// both end-points' resolved global positions - ready to draw as sector-map lines.
export function sectorEdges(data) {
  const byId = new Map(sectorSystems(data).map((s) => [s.id, s]));
  const seen = new Set();
  const edges = [];
  for (const a of byId.values()) {
    for (const np of a.navPoints) {
      if (!np.dest) continue;
      const b = byId.get(np.dest);
      if (!b || a.id === b.id) continue;
      const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ a, b });
    }
  }
  return edges;
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
