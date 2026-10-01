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

// Where a mission ship goes in the map's picture of a nav point. This is a
// map, not a play-through simulation, so it shows what's there in general
// rather than every ship that will ever spawn:
// - 'arrival' - no trigger, or one that fires as soon as the player gets
//   there or always happens anyway: a conversation ending (dialogueEnd),
//   entering the nav point (enterNav), or a character jumping in after
//   fleeing elsewhere (departed - Menesch at Freyja in RF Monte D)
// - 'wave' - a reinforcement wave (kills), only shown if it brings a new
//   hull type - see missionEncounters()
// - null - not shown: spawns on a character's destruction (more of the
//   same in practice), or conditional on a character surviving. Where a
//   spawn depends on an earlier fight, the character is assumed to have
//   been destroyed (or to have otherwise gone), eg Riordian's wing never
//   shows at Pentonville Nav 2 in Tayla D, just the pirates that take its
//   place.
const ARRIVAL_EVENTS = new Set(['dialogueEnd', 'enterNav', 'departed']);

function showAs(ship) {
  const trigger = ship.trigger;
  if (!trigger) return 'arrival';
  if (trigger.ifAlive) return null;
  if (trigger.event === 'kills') return 'wave';
  return ARRIVAL_EVENTS.has(trigger.event) ? 'arrival' : null;
}

// The fixed encounters a mission puts in place of the regular random ones:
// systemId -> navPointId -> [{ship, count, character, speedMultiplier}]. A
// ship whose CAST name is in `characters` (story-missions.json's name map, eg
// 'reis' -> 'Reismann') stays its own entry with that friendly name; other
// ships of the same code are merged, so a generic special-purpose CAST name
// (eg 'confed1') reads like any other squadron. Likewise a ship whose stats
// file is in `speedMultipliers` (eg RF's elite Salthi) stays apart from
// standard ones of its hull, carrying the factor on its base top speed.
//
// Reinforcement waves of a hull already there are left out, but the first
// wave of each new hull is shown alongside the arrival ships (eg Cross C's
// Kamekh), to represent what's at the nav point rather than give an exact
// count. `firstOf` encounters depend on which nav point is reached first,
// so are skipped for now, as are nav points left with no ships - those keep
// their regular encounters (and their system gets no entry at all, so isn't
// marked on the sector map).
export function missionEncounters(mission, characters = {}, speedMultipliers = {}) {
  const bySystem = new Map();
  for (const enc of mission?.encounters ?? []) {
    if (enc.firstOf) continue;
    const navPoints = bySystem.get(enc.system) ?? new Map();
    // Keyed by ship code plus friendly name and speed, so only otherwise
    // identical ships merge. No mission lists the same nav point twice today,
    // but merge rather than overwrite in case a future extraction does.
    const merged = new Map((navPoints.get(enc.navPoint) ?? []).map((s) => [`${s.ship}|${s.character ?? ''}|${s.speedMultiplier ?? 1}`, s]));
    const add = (ship) => {
      const character = characters[ship.character] ?? null;
      const speedMultiplier = speedMultipliers[ship.stats] ?? 1;
      const key = `${ship.ship}|${character ?? ''}|${speedMultiplier}`;
      const prev = merged.get(key);
      merged.set(key, { ship: ship.ship, count: (prev?.count ?? 0) + ship.count, character, speedMultiplier });
    };

    for (const ship of enc.ships) {
      if (showAs(ship) === 'arrival') add(ship);
    }
    const hulls = new Set([...merged.values()].map((s) => s.ship));
    const waves = enc.ships.filter((ship) => showAs(ship) === 'wave').sort((a, b) => a.trigger.kills - b.trigger.kills);
    for (const ship of waves) {
      if (hulls.has(ship.ship)) continue;
      hulls.add(ship.ship);
      add(ship);
    }

    if (!merged.size) continue;
    navPoints.set(enc.navPoint, [...merged.values()]);
    bySystem.set(enc.system, navPoints);
  }
  return bySystem;
}
