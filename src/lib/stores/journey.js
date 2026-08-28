import { writable } from 'svelte/store';
import { findRoute, withRefuelStops } from '../utils/journey.js';

// The currently-plotted journey (or null). A plain top-level store, like
// selectedNode/showHidden in selection.js, so it stays intact across
// sector-map <-> system-view navigation without any extra plumbing.
//
// There's no separate "current leg" counter here: progress is derived live,
// wherever it's needed, from whichever system is currently being viewed and
// its position in `hops` - so browsing to any system on the route (in order,
// out of order, or backtracking) always shows correct progress, and viewing
// a system off the route just shows no progress rather than stale progress.
export const journey = writable(/** @type {any} */ (null));

export function plotJourney(data, { fromSystemId, toSystemId, targetNavPointId = null, refuelEnabled = true }) {
  const route = findRoute(data, fromSystemId, toSystemId);
  if (!route) {
    journey.set({
      fromSystemId,
      toSystemId,
      targetNavPointId,
      refuelEnabled,
      hops: [],
      warnings: [{ message: 'No jump route exists between these systems.' }],
    });
    return;
  }

  const { hops, warnings } = refuelEnabled
    ? withRefuelStops(route, data)
    : { hops: route.map((h) => ({ ...h, refuelStop: false })), warnings: [] };

  journey.set({ fromSystemId, toSystemId, targetNavPointId, refuelEnabled, hops, warnings });
}

export function clearJourney() {
  journey.set(null);
}
