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
// systemId -> navPointId -> [{ship, count}], with matching ship codes merged
// (character names aren't shown yet, so a named Demon and two generic ones
// read as '3x Demon'). `firstOf` encounters depend on which nav point is
// reached first, so are skipped for now, as are nav points left with no
// ships - those keep their regular encounters.
export function missionEncounters(mission) {
  const bySystem = new Map();
  for (const enc of mission?.encounters ?? []) {
    if (enc.firstOf) continue;
    const counts = new Map();
    for (const ship of enc.ships) {
      if (presentOnArrival(ship)) counts.set(ship.ship, (counts.get(ship.ship) ?? 0) + ship.count);
    }
    if (!counts.size) continue;

    if (!bySystem.has(enc.system)) bySystem.set(enc.system, new Map());
    const navPoints = bySystem.get(enc.system);
    // No mission lists the same nav point twice today, but merge rather than
    // overwrite in case a future extraction does.
    for (const [ship, count] of navPoints.get(enc.navPoint) ?? []) {
      counts.set(ship, (counts.get(ship) ?? 0) + count);
    }
    navPoints.set(enc.navPoint, [...counts].map(([ship, count]) => ({ ship, count })));
  }
  return bySystem;
}
