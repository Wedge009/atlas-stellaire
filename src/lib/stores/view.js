import { persisted } from './persisted.js';

// Remembers which map view was last used ('2d' or '3d', and whether the 3D
// view was aligned to the flat 2D projection) so switching systems - via the
// sector menu or jump-point travel - keeps the same view instead of
// resetting to the 3D orbit default. Recorded so it also survives a reload.
export const viewMode = persisted('viewMode', '3d');
export const viewAligned = persisted('viewAligned', false);
