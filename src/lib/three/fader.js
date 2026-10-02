// Opacity fades for groups of scene objects - nav point nodes and encounter
// ships coming or going (switching game, the hidden points setting), like
// the 2D views' Svelte fades.
//
// A fade scales every material's own opacity rather than setting it, so a
// dimmed hidden point or a translucent jump sprite fades to its usual look,
// not to full opacity. Materials are found by traversing the objects every
// frame, so a base or ship model that finishes loading mid-fade joins in
// (its usual opacity noted the first time it's seen). A finished fade puts
// every material back exactly as it was - after a fade-out, once its onDone
// has hidden or freed the objects.
export const FADE_MS = 300;

export function createFader() {
  // key -> { objects, from, to, start, bases: Map(material -> {opacity, transparent}), onDone }
  const fades = new Map();

  function forEachMaterial(objects, fn) {
    for (const object of objects) {
      object.traverse((child) => {
        if (!child.material) return;
        for (const m of Array.isArray(child.material) ? child.material : [child.material]) fn(m);
      });
    }
  }

  function apply(f, value) {
    forEachMaterial(f.objects, (m) => {
      let base = f.bases.get(m);
      if (!base) {
        base = { opacity: m.opacity, transparent: m.transparent };
        f.bases.set(m, base);
      }
      if (!m.transparent) {
        m.transparent = true;
        m.needsUpdate = true;
      }
      m.opacity = base.opacity * value;
    });
  }

  function restore(f) {
    for (const [m, base] of f.bases) {
      m.opacity = base.opacity;
      if (m.transparent !== base.transparent) {
        m.transparent = base.transparent;
        m.needsUpdate = true;
      }
    }
  }

  function currentValue(f, now) {
    const t = Math.min((now - f.start) / FADE_MS, 1);
    return f.from + (f.to - f.from) * t;
  }

  // Fades `objects` (scene objects, under one caller-chosen `key`) from
  // `from` to `to` (0 = invisible, 1 = their usual look), then calls
  // `onDone`. A key already fading carries on from where it's got to, so a
  // fade-in cut short by a fade-out never jumps back to fully visible.
  function fade(key, objects, from, to, onDone = null) {
    const now = performance.now();
    const existing = fades.get(key);
    const f = {
      objects,
      from: existing ? currentValue(existing, now) : from,
      to,
      start: now,
      bases: existing ? existing.bases : new Map(),
      onDone,
    };
    fades.set(key, f);
    apply(f, f.from);
  }

  function tick(now = performance.now()) {
    for (const [key, f] of fades) {
      const value = currentValue(f, now);
      apply(f, value);
      if (now - f.start < FADE_MS) continue;
      fades.delete(key);
      // A finished fade-out's objects are hidden or freed by onDone, so
      // putting their materials back as they were readies anything that's
      // shown again later (eg the grid lines) for its next fade.
      f.onDone?.();
      restore(f);
    }
  }

  // Ends `key`'s fade at once: back to its usual look, without its onDone.
  function cancel(key) {
    const f = fades.get(key);
    if (!f) return;
    restore(f);
    fades.delete(key);
  }

  function isFading(key) {
    return fades.has(key);
  }

  return { fade, tick, cancel, isFading };
}
