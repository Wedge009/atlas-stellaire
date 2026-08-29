import { writable } from 'svelte/store';
import { persisted } from './persisted.js';

// The currently-selected nav point's raw data (or null). Shared by NavMap2D
// and NavMap3D so clicking a node in either view drives the same InfoPanel.
export const selectedNode = writable(/** @type {any} */ (null));

// Whether hidden/ambush points (visibleOnMap: false) are shown. Recorded so
// it survives a reload.
export const showHidden = persisted('showHidden', false);
