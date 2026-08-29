import { writable } from 'svelte/store';

const PREFIX = 'atlas-stellaire:';

// A writable store that synchronises its value to localStorage under `key`,
// so it survives a page reload. Falls back to plain in-memory behaviour if
// localStorage is unavailable (private browsing, quota exceeded, etc.) - the
// UI just won't remember state across a reload in that case.
export function persisted(key, initial) {
  const storageKey = PREFIX + key;
  let startValue = initial;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) startValue = JSON.parse(stored);
  } catch {
    // Corrupted value or localStorage unavailable - use the default.
  }

  const store = writable(startValue);
  store.subscribe((value) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // localStorage unavailable - state just won't persist.
    }
  });
  return store;
}
