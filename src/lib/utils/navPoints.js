// Shared helpers for working with the gemini.json sector data.

// Scale from a nav point's real in-game X/Y units to the 0-100 flat map
// space, fitted against the sector's original hand-placed layout (see
// project history) and confirmed against every non-estimated nav point.
const FLAT_SCALE = 0.0007;

// Projects a nav point's real 3D position down to a flat 2D map: an
// orthographic top-down view along the game's Z-axis, using its X/Y
// in-game co-ordinates directly.
export function resolveFlatPosition(navPoint) {
  return { sx: 50 + FLAT_SCALE * navPoint.x, sy: 50 - FLAT_SCALE * navPoint.y };
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

// Scale from a system's real in-game quadrant-local X/Y units (qx, qy - raw
// int16 values straight from the game's QUADRANT.IFF) to the sector map's
// continuous grid space, where each quadrant tile is 100 units square. Every
// quadrant shares the same co-ordinate origin at the point where all four
// tiles meet, so a single pair of scales (with no per-quadrant branching)
// places a system correctly regardless of which quadrant it's in: negative
// qx/qy sit in the west/south tiles, positive in the east/north tiles.
const SECTOR_SCALE = { x: 94 / 137, y: 94 / 140 };

// Global sector-map position for a system, projected directly from its real
// quadrant-local co-ordinates rather than a separately hand-placed layout.
export function sectorPosition(system) {
  return { gx: 100 + SECTOR_SCALE.x * system.qx, gy: 100 + SECTOR_SCALE.y * system.qy };
}

// Flattens every system across all quadrants with its resolved global position.
export function sectorSystems(data) {
  const systems = [];
  for (const quadrant of data.quadrants) {
    for (const system of quadrant.systems) {
      const { gx, gy } = sectorPosition(system);
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
