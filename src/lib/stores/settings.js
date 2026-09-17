import { persisted } from './persisted.js';

// User-configurable view behaviour/visuals, exposed via the settings panel.
// Recorded so they survive a reload. Split into "Global" (affect both the 2D
// and 3D nav map views) and "3D View" (only meaningful in the 3D view) groups
// - see SettingsPanel.svelte.

// --- Global ---
export const showHidden = persisted('showHidden', false);
export const jumpTransitionEnabled = persisted('jumpTransitionEnabled', true);
export const skyboxEnabled = persisted('skyboxEnabled', true);
// 'none' | 'sprites' | 'models' - the 2D view only ever draws sprites (no
// real 3D models to fall back to there), so 'models' means "sprites in 2D,
// real 3D ship models in 3D" - see NavMap2D.svelte/NavMap3D.svelte.
export const encounterMode = persisted('encounterMode', 'sprites');

// --- 3D View only ---
export const idleRotationEnabled = persisted('idleRotationEnabled', true);
// 'none' (plain green cube placeholder) | 'models' (real station models)
export const baseModelStyle = persisted('baseModelStyle', 'models');
// 'none' (plain blue sphere placeholder) | 'sprites' (original Privateer
// JUMP.IFF sprite) | 'models' (Gemini Gold's animated orb texture)
export const jumpPointStyle = persisted('jumpPointStyle', 'sprites');
