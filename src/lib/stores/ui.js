import { persisted } from './persisted.js';

// Whether the side-bar is collapsed. Collapsed on narrow view-ports by default
// (matching the first-visit behaviour before this was remembered), but once
// the user has toggled it explicitly, that choice survives a reload regardless
// of view-port width.
export const sidebarCollapsed = persisted('sidebarCollapsed', window.innerWidth < 768);

// Which top-level view ('sector' | 'system') and, if 'system', which system
// was last open - restored on reload. `lastSystemId` is validated against
// the loaded data before use, since a reload may follow a data edit that
// removed the system.
export const lastTopView = persisted('lastTopView', 'sector');
export const lastSystemId = persisted('lastSystemId', /** @type {string | null} */ (null));
