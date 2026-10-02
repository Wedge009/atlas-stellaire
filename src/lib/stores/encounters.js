import { writable, derived, get } from 'svelte/store';
import { rollEncounters, expandShips } from '../utils/encounters.js';
import { missionOverrides, firstOfSeed } from './storyMission.js';

// The regular random rolls for the currently-active system only (navPointId
// -> RolledShip[]). Not persistent - rolls are intentionally ephemeral per
// system visit. Kept separate from any story-mission override, so switching
// missions (or clearing one) while in a system brings back the same roll
// rather than re-rolling. `tables` records each roll's encounter table, so a
// game switch can tell which ones it changed.
const regularRolls = writable({ systemId: null, rolls: new Map(), tables: new Map() });

// navPointId -> RolledShip[] actually shown: the regular rolls, with any
// nav points the active story mission fixes swapped for its ships.
export const encounterRolls = derived([regularRolls, missionOverrides], ([$regular, $overrides]) => {
  const fixed = $overrides.get($regular.systemId);
  if (!fixed) return $regular.rolls;
  const next = new Map($regular.rolls);
  for (const [navPointId, ships] of fixed) next.set(navPointId, expandShips(ships));
  return next;
});

// Rolls every nav point with encounters in the given system's navPoints
// list and replaces the whole map in one go. Nav point IDs are only unique
// within a system, so the map is rebuilt wholesale rather than merged.
//
// `keepUnchanged` is for the same system in the other game: a nav point
// whose encounter table is the same keeps its roll (the same array, so views
// can tell it's unchanged), as does the firstOf pick, so only what the
// switch actually changed re-rolls. Most systems are the same in both games.
export function rollForSystem(systemId, navPoints, { keepUnchanged = false } = {}) {
  const previous = get(regularRolls);
  const keep = keepUnchanged && previous.systemId === systemId;
  const rolls = new Map();
  const tables = new Map();
  for (const np of navPoints) {
    if (!np.encounters?.length) continue;
    const table = JSON.stringify(np.encounters);
    const kept = keep && previous.tables.get(np.id) === table ? previous.rolls.get(np.id) : null;
    rolls.set(np.id, kept ?? rollEncounters(np));
    tables.set(np.id, table);
  }
  // New firstOf pick first, so the new rolls never show with the old pick.
  if (!keep) firstOfSeed.set(Math.random());
  regularRolls.set({ systemId, rolls, tables });
}
