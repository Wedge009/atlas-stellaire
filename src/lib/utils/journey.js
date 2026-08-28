// Route planning over the sector's jump graph, for the "plot journey" feature.

import { flattenSystems } from './navPoints.js';

// Builds a directed jump graph: systemId -> [{ toId, viaNavPointId, hazard }].
// `viaNavPointId` is the id (unique only within its own system) of the jump
// navPoint used to leave. `hazard` is 1 if either end of the jump - the
// departure point or its reciprocal arrival point in the destination system -
// has asteroids present, used purely as a tie-break between equally-short
// routes.
function buildGraph(data) {
  const systems = flattenSystems(data);
  const byId = new Map(systems.map((s) => [s.id, s]));
  const graph = new Map(systems.map((s) => [s.id, []]));

  for (const s of systems) {
    for (const np of s.navPoints) {
      if (!np.dest) continue;
      const dest = byId.get(np.dest);
      if (!dest || dest.id === s.id) continue;
      const reciprocal = dest.navPoints.find((rnp) => rnp.dest === s.id);
      const hazard = np.asteroids || reciprocal?.asteroids ? 1 : 0;
      graph.get(s.id).push({ toId: dest.id, viaNavPointId: np.id, hazard });
    }
  }
  return { graph, byId };
}

function costLess(a, b) {
  if (a[0] !== b[0]) return a[0] < b[0];
  return a[1] < b[1];
}

// Shortest route between two systems, preferring fewer jumps first and, among
// equally-short routes, fewer asteroid-flagged jump points second. The sector
// graph is small (under 100 systems) so a simple O(V^2) Dijkstra variant is
// plenty fast - no need for a priority-queue implementation.
export function findRoute(data, fromSystemId, toSystemId) {
  const { graph, byId } = buildGraph(data);
  if (!byId.has(fromSystemId) || !byId.has(toSystemId)) return null;
  if (fromSystemId === toSystemId) return [{ systemId: fromSystemId, viaNavPointId: null }];

  const best = new Map([[fromSystemId, [0, 0]]]);
  const prev = new Map();
  const visited = new Set();
  const frontier = [{ id: fromSystemId, cost: [0, 0] }];

  while (frontier.length) {
    let minIdx = 0;
    for (let i = 1; i < frontier.length; i++) {
      if (costLess(frontier[i].cost, frontier[minIdx].cost)) minIdx = i;
    }
    const { id, cost } = frontier.splice(minIdx, 1)[0];
    if (visited.has(id)) continue;
    visited.add(id);
    if (id === toSystemId) break;

    for (const edge of graph.get(id) ?? []) {
      if (visited.has(edge.toId)) continue;
      const newCost = [cost[0] + 1, cost[1] + edge.hazard];
      const existing = best.get(edge.toId);
      if (!existing || costLess(newCost, existing)) {
        best.set(edge.toId, newCost);
        prev.set(edge.toId, { systemId: id, viaNavPointId: edge.viaNavPointId });
        frontier.push({ id: edge.toId, cost: newCost });
      }
    }
  }

  if (!best.has(toSystemId)) return null;

  const hops = [];
  let cur = toSystemId;
  while (cur !== fromSystemId) {
    const p = prev.get(cur);
    hops.unshift({ systemId: cur, viaNavPointId: p.viaNavPointId });
    cur = p.systemId;
  }
  hops.unshift({ systemId: fromSystemId, viaNavPointId: null });
  return hops;
}

function distance2(a, b) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
}

// Picks which base to land at when a system has more than one: the nearest
// to wherever the ship enters the system from, since that's the point it'll
// actually be flying from. Falls back to the first base if there's no entry
// point to measure from (shouldn't happen for a mid-route stop, but keeps
// this defensible stand-alone).
function nearestBase(system, entryPoint) {
  const bases = system.navPoints.filter((np) => np.type === 'base');
  if (bases.length <= 1 || !entryPoint) return bases[0] ?? null;
  return bases.reduce((best, b) => (distance2(b, entryPoint) < distance2(best, entryPoint) ? b : best));
}

// Inserts refuel stops into an already-computed route: a ship's tank is good
// for `tankJumps` jumps, and every base can be landed on to refuel (game-play
// simplification - even hostile/Derelict bases refuel the player). This is a
// simple heuristic, not a full constrained shortest-path search: it takes the
// route as given and, whenever the tank would run dry, scans backward for the
// nearest system with a base to mark as a mandatory stop. If none exists in
// range it records a warning instead of rerouting.
export function withRefuelStops(hops, data, tankJumps = 6) {
  const byId = new Map(flattenSystems(data).map((s) => [s.id, s]));
  const hasBase = (systemId) => byId.get(systemId)?.navPoints.some((np) => np.type === 'base') ?? false;

  const result = hops.map((h) => ({ ...h, refuelStop: false, refuelNavPointId: null }));
  const warnings = [];
  let lastRefuelIndex = 0; // the ship starts with a full tank at the origin

  for (let i = 1; i < result.length; i++) {
    if (i - lastRefuelIndex <= tankJumps) continue;

    // The tank only reaches lastRefuelIndex + tankJumps, so the stop must be
    // found no later than that - not at i itself, which is already one jump
    // past what the tank can reach.
    let stopIndex = null;
    for (let j = lastRefuelIndex + tankJumps; j > lastRefuelIndex; j--) {
      if (hasBase(result[j].systemId)) {
        stopIndex = j;
        break;
      }
    }

    if (stopIndex !== null) {
      const stopSystem = byId.get(result[stopIndex].systemId);
      const entryPoint = stopSystem.navPoints.find((np) => np.dest === result[stopIndex - 1].systemId);
      result[stopIndex].refuelStop = true;
      result[stopIndex].refuelNavPointId = nearestBase(stopSystem, entryPoint)?.id ?? null;
      lastRefuelIndex = stopIndex;
    } else {
      warnings.push({
        fromSystemId: result[lastRefuelIndex].systemId,
        toSystemId: result[i].systemId,
        message: `No landable base within tank range between ${byId.get(result[lastRefuelIndex].systemId)?.name ?? result[lastRefuelIndex].systemId} and ${byId.get(result[i].systemId)?.name ?? result[i].systemId}.`,
      });
      lastRefuelIndex = i; // avoid repeating the same warning for every subsequent leg
    }
  }

  return { hops: result, warnings };
}
