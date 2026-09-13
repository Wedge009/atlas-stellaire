import { persisted } from './persisted.js';

// User-configurable view behaviour/visuals, exposed via the settings
// panel. Recorded so they survive a reload.
export const showHidden = persisted('showHidden', false);
export const idleRotationEnabled = persisted('idleRotationEnabled', true);
export const jumpTransitionEnabled = persisted('jumpTransitionEnabled', true);
export const skyboxEnabled = persisted('skyboxEnabled', true);
export const baseModelsEnabled = persisted('baseModelsEnabled', true);
export const originalJumpSphereEnabled = persisted('originalJumpSphereEnabled', true);
