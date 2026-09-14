import { writable } from 'svelte/store';
import { rollEncounters } from '../utils/encounters.js';

// navPointId -> RolledShip[], scoped to the currently-active system only.
// Not persistent - rolls are intentionally ephemeral per system visit.
export const encounterRolls = writable(new Map());

// Rolls every nav point with encounters in the given system's navPoints
// list and replaces the whole map in one go. Nav point IDs are only unique
// within a system, so the map is rebuilt wholesale rather than merged.
export function rollForSystem(navPoints) {
  const next = new Map();
  for (const np of navPoints) {
    if (np.encounters?.length) next.set(np.id, rollEncounters(np));
  }
  encounterRolls.set(next);
}
