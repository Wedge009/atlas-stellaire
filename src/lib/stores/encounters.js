import { writable, derived } from 'svelte/store';
import { rollEncounters, expandShips } from '../utils/encounters.js';
import { missionOverrides, firstOfSeed } from './storyMission.js';

// The regular random rolls for the currently-active system only (navPointId
// -> RolledShip[]). Not persistent - rolls are intentionally ephemeral per
// system visit. Kept separate from any story-mission override, so switching
// missions (or clearing one) while in a system brings back the same roll
// rather than re-rolling.
const regularRolls = writable({ systemId: null, rolls: new Map() });

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
export function rollForSystem(systemId, navPoints) {
  const rolls = new Map();
  for (const np of navPoints) {
    if (np.encounters?.length) rolls.set(np.id, rollEncounters(np));
  }
  // New firstOf pick first, so the new rolls never show with the old pick.
  firstOfSeed.set(Math.random());
  regularRolls.set({ systemId, rolls });
}
