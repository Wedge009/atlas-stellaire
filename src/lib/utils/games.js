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
//
// A jump point with `unlockedBy` (a story-missions.json mission ID) is
// story-locked: it's left out while `isLocked(unlockedBy)` - before that
// mission in the story (see storyLocked()) - as the game doesn't put it in
// space until then. A system no open jump then reaches (eg Delta before
// Cross A) is left out too, with every jump point into it, and listed in
// `hiddenSystems` (id -> name). Eden always stays, as Rikel's ordinary jump
// reaches it.
export function resolveSector(raw, gameId, isLocked = () => false) {
  const otherGameSystems = {};
  const inGame = [];
  for (const { systems } of raw.quadrants) {
    for (const system of systems) {
      if (system.game && system.game !== gameId) otherGameSystems[system.id] = system.name;
      else inGame.push(system);
    }
  }
  const hiddenSystems = unreachableSystems(inGame, gameId, isLocked);
  const quadrants = raw.quadrants.map(({ systems, ...quadrant }) => ({
    ...quadrant,
    systems: systems.flatMap(({ game, navPoints, ...system }) => {
      if (otherGameSystems[system.id] || hiddenSystems[system.id]) return [];
      return [{ ...system, navPoints: navPoints.flatMap((np) => resolveNavPoint(np, gameId, isLocked, hiddenSystems)) }];
    }),
  }));
  return { ...raw, quadrants, otherGameSystems, hiddenSystems };
}

// The systems (id -> name) no open jump reaches. Only a story-locked jump's
// destination can be cut off, so every other system is a starting point,
// and whatever open jumps lead to from there is reachable.
function unreachableSystems(systems, gameId, isLocked) {
  const inGame = (np) => !np.game || np.game === gameId;
  const lockedDests = new Set(systems.flatMap((s) => s.navPoints.filter((np) => np.unlockedBy && inGame(np)).map((np) => np.dest)));
  const byId = new Map(systems.map((s) => [s.id, s]));
  const reached = new Set(systems.filter((s) => !lockedDests.has(s.id)).map((s) => s.id));
  const queue = [...reached];
  while (queue.length) {
    for (const np of byId.get(queue.pop()).navPoints) {
      if (!np.dest || !inGame(np) || (np.unlockedBy && isLocked(np.unlockedBy))) continue;
      if (byId.has(np.dest) && !reached.has(np.dest)) {
        reached.add(np.dest);
        queue.push(np.dest);
      }
    }
  }
  return Object.fromEntries(systems.filter((s) => !reached.has(s.id)).map((s) => [s.id, s.name]));
}

function resolveNavPoint({ game, privateer, ...navPoint }, gameId, isLocked, hiddenSystems) {
  if (game && game !== gameId) return [];
  if (navPoint.unlockedBy && isLocked(navPoint.unlockedBy)) return [];
  if (navPoint.dest && hiddenSystems[navPoint.dest]) return [];
  if (gameId !== 'PRIV' || !privateer) return [navPoint];
  const resolved = { ...navPoint, ...privateer };
  // An empty override list means no encounters in the base game.
  if (resolved.encounters?.length === 0) delete resolved.encounters;
  return [resolved];
}
