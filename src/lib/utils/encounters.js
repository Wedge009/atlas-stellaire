// Rolls one nav point's encounter table once, expanding the winning group
// into one entry per ship instance (for one-sprite-per-ship rendering).
// `chance` values are treated as relative weights (normalised by their
// total) rather than assumed to sum to exactly 100.
export function rollEncounters(navPoint, rng = Math.random) {
  const groups = navPoint.encounters;
  if (!groups?.length) return [];

  const total = groups.reduce((sum, g) => sum + g.chance, 0);
  if (total <= 0) return [];

  let roll = rng() * total;
  const winner = groups.find((g) => (roll -= g.chance) < 0) ?? groups[groups.length - 1];

  const ships = [];
  for (const { ship, count } of winner.ships) {
    for (let i = 0; i < count; i++) {
      ships.push({ ship, instanceIndex: ships.length });
    }
  }
  return ships;
}

// Builds the public path to a ship's static first frame. Frame is hard-coded
// to 0.
export function shipSpritePath(shipCode) {
  return `${import.meta.env.BASE_URL}assets/ships/${shipCode.toLowerCase()}/frame00.png`;
}

// Sorts the raw encounter table for display (highest chance first). Pure -
// does not roll or mutate anything, unlike rollEncounters above.
export function sortedEncounterGroups(navPoint) {
  return [...(navPoint.encounters ?? [])].sort((a, b) => b.chance - a.chance);
}
