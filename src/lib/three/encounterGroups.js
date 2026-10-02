// The per-nav-point ship groups behind both 3D encounter renderers
// (encounterSprites3d.js, encounterModels3d.js): one anchor per nav point
// with ships, following its node.
//
// A nav point's group is kept as-is while its node and ships stay the same,
// so a game switch (or anything else that hands over a fresh rolls map) only
// rebuilds what changed - most systems' encounters are the same in both
// games. With `animate`, groups that come or go fade (see fader.js);
// without, they're swapped at once, as when the whole scene rebuilds.

// An encounter's ships, as a key that only changes when the ships do (a
// mission's ships are re-derived as new arrays, but the same ships).
function shipsKey(ships) {
  return ships.map((s) => `${s.ship}/${s.character ?? ''}/${s.speedMultiplier ?? 1}`).join(',');
}

// `build(navPointId, ships, node)` makes a group's { anchor, entries } and
// adds the anchor to the scene; `dispose(group)` frees and removes it.
export function createEncounterGroups({ fader, build, dispose }) {
  let groups = new Map(); // navPointId -> { anchor, entries, node, key }
  let leaving = new Set(); // groups fading out, still shown and ticking
  let held = new Set(); // new groups kept invisible until reveal()

  function remove(group, animate) {
    if (!animate) {
      fader.cancel(group);
      dispose(group);
      return;
    }
    leaving.add(group);
    fader.fade(group, [group.anchor], 1, 0, () => {
      leaving.delete(group);
      dispose(group);
    });
  }

  // `hold` builds new groups invisible, for reveal() to fade in later (eg
  // once their models have loaded).
  function update(rollsMap, nodes, animate = false, hold = false) {
    const next = new Map();
    for (const [navPointId, ships] of rollsMap ?? []) {
      if (!ships?.length) continue;
      const node = nodes.find((n) => n.np.id === navPointId);
      if (!node) continue;
      const key = shipsKey(ships);
      const old = groups.get(navPointId);
      if (old && old.node === node && old.key === key) {
        // The node's nav point may be a new object (the same point in the
        // other game), so picking a ship still selects the current one.
        old.anchor.traverse((child) => {
          if (child !== old.anchor) child.userData = node.np;
        });
        groups.delete(navPointId);
        next.set(navPointId, old);
        continue;
      }
      const group = { ...build(navPointId, ships, node), node, key };
      if (hold) {
        fader.hold(group, [group.anchor]);
        held.add(group);
      } else if (animate) {
        fader.fade(group, [group.anchor], 0, 1);
      }
      next.set(navPointId, group);
    }
    for (const old of groups.values()) {
      held.delete(old);
      remove(old, animate);
    }
    groups = next;
  }

  // Fades in the groups update() held back.
  function reveal() {
    for (const group of held) fader.fade(group, [group.anchor], 0, 1);
    held = new Set();
  }

  // Every group on show, leaving ones included (they still fly while fading).
  function* all() {
    yield* groups.values();
    yield* leaving;
  }

  // Only the groups that are staying, for picking.
  function current() {
    return groups.values();
  }

  function disposeAll() {
    for (const group of all()) {
      fader.cancel(group);
      dispose(group);
    }
    groups = new Map();
    leaving = new Set();
    held = new Set();
  }

  return { update, reveal, all, current, disposeAll };
}
