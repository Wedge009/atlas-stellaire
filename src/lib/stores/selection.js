import { writable } from 'svelte/store';

// The currently-selected nav point's raw data (or null). Shared by NavMap2D
// and NavMap3D so clicking a node in either view drives the same InfoPanel.
export const selectedNode = writable(/** @type {any} */ (null));
