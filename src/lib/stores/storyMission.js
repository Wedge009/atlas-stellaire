import { writable, derived, get } from 'svelte/store';
import { persisted } from './persisted.js';
import { journey } from './journey.js';
import { missionEncounters, pickFirstOf } from '../utils/storyMissions.js';

// Every story mission from story-missions.json, in file (ID) order. Empty
// until loadStoryMissions() resolves.
export const storyMissions = writable(/** @type {any[]} */ ([]));

// CAST name -> friendly character name (eg 'reis' -> 'Reismann'), for the
// named pilots and ships - see missionEncounters().
export const missionCharacters = writable(/** @type {Record<string, string>} */ ({}));

// Stats file -> top speed multiplier (eg 'ELITE' -> 1.25), for the few
// mission ships whose stats boost their hull's base speed.
export const missionSpeedMultipliers = writable(/** @type {Record<string, number>} */ ({}));

// The sector data (gemini.json), set once loaded - needed to work out which
// jump point a plotted journey enters a system by. See pickFirstOf().
export const sectorData = writable(/** @type {any} */ (null));

// Random number in [0, 1) for picking a `firstOf` encounter's nav point
// when the journey doesn't decide it. Re-drawn on each system visit
// (alongside the regular encounter rolls - see rollForSystem()), so the pick
// stays put while in a system, even across mission or journey changes.
export const firstOfSeed = writable(Math.random());

// ID of the active story mission, or null. Remembered across a reload.
export const activeMissionId = persisted('activeStoryMission', /** @type {string | null} */ (null));

export const activeMission = derived(
  [storyMissions, activeMissionId],
  ([$missions, $id]) => $missions.find((m) => m.id === $id) ?? null
);

// systemId -> navPointId -> [{ship, count}] for the active mission - see
// missionEncounters(). Empty when no mission is active. Follows the plotted
// journey too, whichever of the two is set first.
export const missionOverrides = derived(
  [activeMission, missionCharacters, missionSpeedMultipliers, journey, sectorData, firstOfSeed],
  ([$mission, $characters, $speedMultipliers, $journey, $data, $seed]) =>
    missionEncounters($mission, $characters, $speedMultipliers, (candidates) => pickFirstOf(candidates, $journey, $data, $seed))
);

export async function loadStoryMissions() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/story-missions.json`);
    const { characters, speedMultipliers, missions } = await res.json();
    missionCharacters.set(characters ?? {});
    missionSpeedMultipliers.set(speedMultipliers ?? {});
    storyMissions.set(missions);
    // A reload may follow a data edit that removed or renamed the mission.
    const id = get(activeMissionId);
    if (id && !missions.some((m) => m.id === id)) activeMissionId.set(null);
  } catch {
    // Missing or broken mission data only loses the story-mission feature -
    // the rest of the app still works.
  }
}
