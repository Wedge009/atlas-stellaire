const MARGIN = 8;

function clampToViewport(left, top, width, height) {
  const maxLeft = Math.max(MARGIN, window.innerWidth - width - MARGIN);
  const maxTop = Math.max(MARGIN, window.innerHeight - height - MARGIN);
  return {
    left: Math.min(Math.max(left, MARGIN), maxLeft),
    top: Math.min(Math.max(top, MARGIN), maxTop),
  };
}

function isInteractive(target) {
  return !!target.closest?.('button, a, input, select, textarea, summary');
}

// Makes `node` movable by pointer-dragging within its `handle` (a selector
// matched via event delegation against each event's target, rather than
// resolved once at mount - some panels only render their handle once their
// content later appears, eg InfoPanel's grip depends on a nav point being
// selected). Remembers the dropped position in the persisted `positionStore`
// ({left, top} in view-port px, or null for 'still at the default CSS-anchored
// corner') so it survives a reload.
//
// Positions are clamped to the current view-port both while dragging, on
// window resize, and whenever the panel's own content changes size (eg the
// Legend expanding out of its collapsed state) - so a panel dragged into a
// corner can't end up with content spilling off-screen after either the
// window or the panel itself grows. Double-clicking the handle clears the
// stored position, reverting the panel to its default corner.
export function draggable(node, { positionStore, handle }) {
  let dragging = false;
  let grabbedEl = null;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let hasPosition = false;

  function matchHandle(target) {
    if (!handle) return node;
    const el = target.closest(handle);
    return el && node.contains(el) ? el : null;
  }

  function place(left, top) {
    const rect = node.getBoundingClientRect();
    const clamped = clampToViewport(left, top, rect.width, rect.height);
    node.style.position = 'fixed';
    node.style.left = `${clamped.left}px`;
    node.style.top = `${clamped.top}px`;
    node.style.right = 'auto';
    node.style.bottom = 'auto';
    hasPosition = true;
    return clamped;
  }

  function resetToDefault() {
    node.style.position = '';
    node.style.left = '';
    node.style.top = '';
    node.style.right = '';
    node.style.bottom = '';
    hasPosition = false;
    positionStore.set(null);
  }

  function onPointerMove(e) {
    if (!dragging) return;
    place(startLeft + (e.clientX - startX), startTop + (e.clientY - startY));
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    if (grabbedEl) grabbedEl.style.cursor = '';
    grabbedEl = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    const rect = node.getBoundingClientRect();
    positionStore.set({ left: rect.left, top: rect.top });
  }

  function onPointerDown(e) {
    if (e.button !== 0 || isInteractive(e.target)) return;
    const handleEl = matchHandle(e.target);
    if (!handleEl) return;
    const rect = node.getBoundingClientRect();
    dragging = true;
    grabbedEl = handleEl;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    handleEl.style.cursor = 'grabbing';
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    e.preventDefault();
  }

  function onDoubleClick(e) {
    if (isInteractive(e.target) || !matchHandle(e.target)) return;
    resetToDefault();
  }

  function reclamp() {
    if (!hasPosition || dragging) return;
    const rect = node.getBoundingClientRect();
    positionStore.set(place(rect.left, rect.top));
  }

  // A persisted store re-emits its current value synchronously on subscribe,
  // so this both restores a saved position on mount and re-applies it (via
  // place(), which re-clamps) whenever the store changes later.
  const unsubscribe = positionStore.subscribe((pos) => {
    if (pos) place(pos.left, pos.top);
  });

  // Window resize isn't the only thing that can push a positioned panel
  // off-screen - the panel's own size can change too (eg Legend expanding
  // out of its collapsed state), so its own box is watched as well.
  const resizeObserver = new ResizeObserver(reclamp);
  resizeObserver.observe(node);

  node.addEventListener('pointerdown', onPointerDown);
  node.addEventListener('dblclick', onDoubleClick);
  window.addEventListener('resize', reclamp);

  return {
    destroy() {
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('dblclick', onDoubleClick);
      window.removeEventListener('resize', reclamp);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      resizeObserver.disconnect();
      unsubscribe();
    },
  };
}
