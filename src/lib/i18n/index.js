import { derived } from 'svelte/store';
import { persisted } from '../stores/persisted.js';
import en from './locales/en.js';

const dictionaries = { en };

// Only English exists today. Add a locale by dropping a new dictionary file
// next to en.js, registering it above, and adding an entry here - the
// Language button (see SectorNav.svelte) only renders once this list holds
// more than one locale, so it stays hidden until there's an actual choice
// to make.
export const availableLocales = [{ code: 'en', label: 'English' }];

export const locale = persisted('locale', 'en');

function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (match, key) => (key in params ? params[key] : match));
}

// A derived store of the translate function itself, so `$t('key', params)`
// in a component both reads the current locale reactively and formats in
// one step. Missing keys fall back to English, then to the raw key.
export const t = derived(locale, ($locale) => {
  const dict = dictionaries[$locale] ?? en;
  return (key, params) => interpolate(dict[key] ?? en[key] ?? key, params);
});
