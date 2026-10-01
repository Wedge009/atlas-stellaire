// Game titles are proper nouns, so are not translated. Keyed by
// story-missions.json's `game` field, in tab order.
export const MISSION_GAMES = [
  { id: 'PRIV', label: 'Privateer' },
  { id: 'RF', label: 'Righteous Fire' },
];

export function gameLabel(gameId) {
  return MISSION_GAMES.find((g) => g.id === gameId)?.label ?? gameId;
}

// Fixer's series name plus mission letter, eg 'Tayla B'.
export function missionName(mission) {
  return `${mission.series} ${mission.mission}`;
}

// Whether a mission ship is there without needing any in-flight event -
// either it has no trigger at all, or it only waits for a conversation to
// end (which always happens, so is treated as present on arrival). Anything
// else (kill waves, enterNav, ifAlive/ifDestroyed conditions...) is left to
// a later trigger-aware pass.
function presentOnArrival(ship) {
  const trigger = ship.trigger;
  if (!trigger) return true;
  return trigger.event === 'dialogueEnd' && Object.keys(trigger).every((k) => k === 'event' || k === 'character');
}

// The fixed encounters a mission puts in place of the regular random ones:
// systemId -> navPointId -> [{ship, count, character}]. A ship whose CAST
// name is in `characters` (story-missions.json's name map, eg 'reis' ->
// 'Reismann') stays its own entry with that friendly name; other ships of
// the same code are merged, so a generic special-purpose CAST name (eg
// 'confed1') reads like any other squadron. `firstOf` encounters depend on
// which nav point is reached first, so are skipped for now, as are nav
// points left with no ships - those keep their regular encounters (and
// their system gets no entry at all, so isn't marked on the sector map).
export function missionEncounters(mission, characters = {}) {
  const bySystem = new Map();
  for (const enc of mission?.encounters ?? []) {
    if (enc.firstOf) continue;
    const navPoints = bySystem.get(enc.system) ?? new Map();
    // Keyed by ship code plus friendly name, so only otherwise identical
    // ships merge. No mission lists the same nav point twice today, but
    // merge rather than overwrite in case a future extraction does.
    const merged = new Map((navPoints.get(enc.navPoint) ?? []).map((s) => [`${s.ship}|${s.character ?? ''}`, s]));
    for (const ship of enc.ships) {
      if (!presentOnArrival(ship)) continue;
      const character = characters[ship.character] ?? null;
      const key = `${ship.ship}|${character ?? ''}`;
      const prev = merged.get(key);
      merged.set(key, { ship: ship.ship, count: (prev?.count ?? 0) + ship.count, character });
    }
    if (!merged.size) continue;
    navPoints.set(enc.navPoint, [...merged.values()]);
    bySystem.set(enc.system, navPoints);
  }
  return bySystem;
}
