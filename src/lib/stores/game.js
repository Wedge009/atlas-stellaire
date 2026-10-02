import { writable } from 'svelte/store';
import { persisted } from './persisted.js';
import { GAMES, DEFAULT_GAME } from '../utils/games.js';

// Which game's data the whole application shows - the map, encounters, story
// missions and commodity prices. Remembered across a reload.
export const game = persisted('game', DEFAULT_GAME);

// A stale or hand-edited value falls back to the default.
game.update((id) => (GAMES.some((g) => g.id === id) ? id : DEFAULT_GAME));

// True while switching would disrupt something in progress - the system
// view's 3D alignment flight, like the settings menu (see SystemView). Every
// game switch (the HUD toggle, the dialogue tabs) honours it.
export const gameSwitchLocked = writable(false);
