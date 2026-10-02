// The two games the application covers, keyed by the IDs gemini.json and
// story-missions.json use. Game titles are proper nouns, so are not
// translated. In chronological order, which is also tab order.
export const GAMES = [
  { id: 'PRIV', label: 'Privateer' },
  { id: 'RF', label: 'Righteous Fire' },
];

export const DEFAULT_GAME = 'RF';

export function gameLabel(gameId) {
  return GAMES.find((g) => g.id === gameId)?.label ?? gameId;
}

// gemini.json is Righteous Fire's map, with the base game's differences
// marked in place (see README.md, "Game differences"):
// - `game: 'RF' | 'PRIV'` on a system or nav point: only in that game
// - `privateer: {...}` on a nav point: fields that replace RF's in the base
//   game (its encounter table, where RF changed it)
// Returns the sector as `gameId` sees it, in the same shape as before the
// markup existed, so nothing downstream needs to know about it. Systems
// left out are listed in `otherGameSystems` (id -> name), so a remembered
// journey to one can still be named.
export function resolveSector(raw, gameId) {
  const otherGameSystems = {};
  const quadrants = raw.quadrants.map(({ systems, ...quadrant }) => ({
    ...quadrant,
    systems: systems.flatMap(({ game, navPoints, ...system }) => {
      if (game && game !== gameId) {
        otherGameSystems[system.id] = system.name;
        return [];
      }
      return [{ ...system, navPoints: navPoints.flatMap((np) => resolveNavPoint(np, gameId)) }];
    }),
  }));
  return { ...raw, quadrants, otherGameSystems };
}

function resolveNavPoint({ game, privateer, ...navPoint }, gameId) {
  if (game && game !== gameId) return [];
  if (gameId !== 'PRIV' || !privateer) return [navPoint];
  const resolved = { ...navPoint, ...privateer };
  // An empty override list means no encounters in the base game.
  if (resolved.encounters?.length === 0) delete resolved.encounters;
  return [resolved];
}
