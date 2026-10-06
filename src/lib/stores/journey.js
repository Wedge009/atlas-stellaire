import { writable } from 'svelte/store';
import { findRoute, withRefuelStops } from '../utils/journey.js';
import { findSystem } from '../utils/navPoints.js';
import { persisted } from './persisted.js';

// The currently-plotted journey (or null). A plain top-level store, like
// selectedNode in selection.js, so it stays intact across sector-map
// <-> system-view navigation without any extra plumbing.
//
// There's no separate 'current leg' counter here: progress is derived live,
// wherever it's needed, from whichever system is currently being viewed and
// its position in `hops` - so browsing to any system on the route (in order,
// out of order, or backtracking) always shows correct progress, and viewing
// a system off the route just shows no progress rather than stale progress.
export const journey = writable(/** @type {any} */ (null));

// Only the inputs are recorded, not the calculated route - the route is a
// cheap, deterministic function of the sector data, so recalculating it on
// load (once the data is available) keeps it synchronised with the current data
// and current routing logic instead of replaying a possibly-stale result.
// The same goes for switching game (see App.svelte): the inputs are kept as
// entered, so a journey to Eden (Righteous Fire only) comes back on
// switching back, even though the base game can't plot it.
export const journeyInputs = persisted('journeyInputs', /** @type {any} */ (null));

export function plotJourney(data, inputs) {
  const { fromSystemId, toSystemId, refuelEnabled = true } = inputs;
  journeyInputs.set({ fromSystemId, toSystemId, targetNavPointId: inputs.targetNavPointId ?? null, refuelEnabled });

  // A destination point that's only in the other game (eg one of Blockade
  // Point Alpha's) leaves just the system as the destination.
  const toSystem = findSystem(data, toSystemId);
  const targetNavPointId = toSystem?.navPoints.some((np) => np.id === inputs.targetNavPointId)
    ? inputs.targetNavPointId
    : null;

  const route = findRoute(data, fromSystemId, toSystemId);
  if (!route) {
    // An end of the journey in a system only the other game has, or not yet
    // revealed by the story
    const missing = [fromSystemId, toSystemId].find((id) => data.otherGameSystems?.[id]);
    const hidden = [fromSystemId, toSystemId].find((id) => data.hiddenSystems?.[id]);
    journey.set({
      fromSystemId,
      toSystemId,
      targetNavPointId,
      refuelEnabled,
      hops: [],
      warnings: [
        missing
          ? { messageKey: 'journey.systemNotInGame', params: { system: data.otherGameSystems[missing] } }
          : hidden
            ? { messageKey: 'journey.systemNotRevealed', params: { system: data.hiddenSystems[hidden] } }
            : { messageKey: 'journey.noRouteExists' },
      ],
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
  journeyInputs.set(null);
}
