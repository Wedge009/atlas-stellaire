import { findSystem } from './navPoints.js';

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
// count.
//
// A `firstOf` encounter only happens at whichever of its candidate nav
// points the player reaches first. Where those are all in one system (Kroiz
// in Lynch B, Miggs in Lynch D), `pickFirstOf` chooses one - see
// pickFirstOf() below - and the others are left out. Where they're spread
// over several systems (RF Terrell B's messenger, at Troy or Famine), it's
// shown at all of them, as which system comes first is up to the player.
//
// An encounter with no ships at all is a nav point the mission clears of its
// regular encounters (eg Gaea in RF Informant A), so it maps to an empty
// list. Nav points whose ships are all left out above keep their regular
// encounters (and a system with no ships to show isn't marked on the sector
// map - see missionSystemIds()).
export function missionEncounters(mission, characters = {}, speedMultipliers = {}, pickFirstOf = (candidates) => candidates[0]) {
  const bySystem = new Map();
  for (const enc of mission?.encounters ?? []) {
    if (enc.firstOf && new Set(enc.firstOf.map((c) => c.system)).size === 1) {
      if (pickFirstOf(enc.firstOf).navPoint !== enc.navPoint) continue;
    }
    const navPoints = bySystem.get(enc.system) ?? new Map();
    if (!enc.ships.length) {
      if (!navPoints.has(enc.navPoint)) navPoints.set(enc.navPoint, []);
      bySystem.set(enc.system, navPoints);
      continue;
    }
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

// IDs of the systems where missionEncounters() places ships, for the sector
// map's mission marker - a system the mission only clears isn't one.
export function missionSystemIds(overrides) {
  return new Set([...overrides].filter(([, navPoints]) => [...navPoints.values()].some((ships) => ships.length)).map(([id]) => id));
}

// Chooses which of a single-system `firstOf` encounter's candidate nav
// points (all jump points, in practice) the player reaches first. If the
// plotted journey enters that system, that's the jump point it arrives by;
// otherwise (no journey, the system isn't on it or is where it starts, or it
// arrives by a jump point that isn't a candidate) it's a random pick, from a
// `seed` in [0, 1) that stays fixed for the rest of the visit. Only a
// system's first appearance in the journey counts.
export function pickFirstOf(candidates, journey, data, seed) {
  const systemId = candidates[0].system;
  const idx = journey?.hops.findIndex((h) => h.systemId === systemId) ?? -1;
  if (idx > 0 && data) {
    const prevSystemId = journey.hops[idx - 1].systemId;
    const entry = findSystem(data, systemId)?.navPoints.find((np) => np.dest === prevSystemId);
    const arrival = candidates.find((c) => c.navPoint === entry?.id);
    if (arrival) return arrival;
  }
  return candidates[Math.floor(seed * candidates.length)];
}
