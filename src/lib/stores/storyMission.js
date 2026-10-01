import { writable, derived, get } from 'svelte/store';
import { persisted } from './persisted.js';
import { missionEncounters } from '../utils/storyMissions.js';

// Every story mission from story-missions.json, in file (ID) order. Empty
// until loadStoryMissions() resolves.
export const storyMissions = writable(/** @type {any[]} */ ([]));

// CAST name -> friendly character name (eg 'reis' -> 'Reismann'), for the
// named pilots and ships - see missionEncounters().
export const missionCharacters = writable(/** @type {Record<string, string>} */ ({}));

// ID of the active story mission, or null. Remembered across a reload.
export const activeMissionId = persisted('activeStoryMission', /** @type {string | null} */ (null));

export const activeMission = derived(
  [storyMissions, activeMissionId],
  ([$missions, $id]) => $missions.find((m) => m.id === $id) ?? null
);

// systemId -> navPointId -> [{ship, count}] for the active mission - see
// missionEncounters(). Empty when no mission is active.
export const missionOverrides = derived(
  [activeMission, missionCharacters],
  ([$mission, $characters]) => missionEncounters($mission, $characters)
);

export async function loadStoryMissions() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/story-missions.json`);
    const { characters, missions } = await res.json();
    missionCharacters.set(characters ?? {});
    storyMissions.set(missions);
    // A reload may follow a data edit that removed or renamed the mission.
    const id = get(activeMissionId);
    if (id && !missions.some((m) => m.id === id)) activeMissionId.set(null);
  } catch {
    // Missing or broken mission data only loses the story-mission feature -
    // the rest of the app still works.
  }
}
