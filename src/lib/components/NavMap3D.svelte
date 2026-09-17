<script>
  import { onMount, onDestroy } from 'svelte';
  import { selectedNode } from '../stores/selection.js';
  import { journey } from '../stores/journey.js';
  import {
    idleRotationEnabled,
    skyboxEnabled,
    baseModelsEnabled,
    originalJumpSphereEnabled,
    showEncounterSprites,
  } from '../stores/settings.js';
  import { encounterRolls } from '../stores/encounters.js';
  import { routeThroughSystem } from '../utils/journey.js';

  let { points, aligned = $bindable(false), animating = $bindable(false), data, onJump, systemId } = $props();

  // Which navPoint(s) to highlight and which entry -> [refuel base ->] exit
  // segments to draw as an arrow through this system - see routeThroughSystem
  // in utils/journey.js (shared with the 2D view).
  let routeInfo = $derived(routeThroughSystem($journey, systemId, points));
  let routeHighlightIds = $derived(
    new Set([routeInfo.leaveViaId, routeInfo.refuelId, routeInfo.targetId].filter(Boolean))
  );

  let canvas;
  let container;
  let scene = null;
  let resizeObserver;
  let loading = $state(true);
  let destroyed = false;
  // The navPoint currently focused-in on (see enterFocus/exitFocus in
  // createNavScene.js), or null for the regular whole-system view. Not for
  // binding further up - unlike `aligned`, there's no reason a base focus
  // should survive a reload, and a system switch already tears down and
  // rebuilds this whole component.
  let focused = $state(null);

  onMount(() => {
    // Three.js is loaded lazily so it isn't part of the initial bundle - the
    // sector map and 2D view never need it, and it only pays for itself once
    // a system's 3D view actually mounts.
    (async () => {
      const [{ createNavScene }] = await Promise.all([
        import('../three/createNavScene.js'),
        // Nav-point labels are baked once into a canvas texture (see
        // makeLabel in createNavScene.js), so VT323 must actually be loaded
        // before that bake happens - on a cold cache, canvas text silently
        // falls back to the browser's default font for both measurement and
        // rendering, and being a one-shot bake, it never corrects itself
        // once the font does arrive later.
        document.fonts.load("34px 'VT323'").catch(() => {}),
      ]);
      if (destroyed) return;
      scene = createNavScene({
        canvas,
        onSelect: (np) => selectedNode.set(np),
        onJump,
        onFocusBase: handleFocusBase,
        data,
        systemId,
        idleRotationEnabled: $idleRotationEnabled,
        skyboxEnabled: $skyboxEnabled,
        baseModelsEnabled: $baseModelsEnabled,
        originalJumpSphereEnabled: $originalJumpSphereEnabled,
        encounterSpritesEnabled: $showEncounterSprites,
      });
      scene.setPoints(points, routeHighlightIds, routeInfo.segments);
      scene.setEncounterShips($encounterRolls);
      loading = false;
      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);

      // If the caller remembers an aligned view (eg from before a system
      // switch), snap straight to it with no flight animation.
      if (aligned) scene.setAlignedInstant();
    })();
  });

  onDestroy(() => {
    destroyed = true;
    resizeObserver?.disconnect();
    scene?.dispose();
  });

  function resize() {
    if (!scene || !container) return;
    const { clientWidth, clientHeight } = container;
    scene.resize(clientWidth, clientHeight);
  }

  $effect(() => {
    // re-run whenever `points` or the route info changes (system switch,
    // hidden-toggle, or a journey plotted/advanced while this system is open)
    const current = points;
    const highlightIds = routeHighlightIds;
    const segments = routeInfo.segments;
    if (scene) scene.setPoints(current, highlightIds, segments);
  });

  $effect(() => {
    // Read the store value unconditionally (not after `scene?.`) so it's
    // tracked as a dependency even on the first run, while scene is still
    // null (createNavScene hasn't resolved yet) - otherwise the optional
    // chaining short-circuits before the store is ever read, and this
    // effect would never re-run once scene is actually assigned.
    const enabled = $idleRotationEnabled;
    scene?.setIdleRotationEnabled(enabled);
  });

  $effect(() => {
    const enabled = $skyboxEnabled;
    scene?.setSkyboxEnabled(enabled);
  });

  $effect(() => {
    const enabled = $baseModelsEnabled;
    scene?.setBaseModelsEnabled(enabled);
  });

  $effect(() => {
    const enabled = $originalJumpSphereEnabled;
    scene?.setOriginalJumpSphereEnabled(enabled);
  });

  $effect(() => {
    const enabled = $showEncounterSprites;
    scene?.setEncounterSpritesEnabled(enabled);
  });

  $effect(() => {
    const rolls = $encounterRolls;
    scene?.setEncounterShips(rolls);
  });

  function toggleAlign() {
    if (!scene || animating || focused) return;
    animating = true;
    if (!aligned) {
      scene.animateToAligned(() => { aligned = true; animating = false; });
    } else {
      scene.animateToOrbit(() => { aligned = false; animating = false; });
    }
  }

  // Called from createNavScene's own dblclick handler (ray-casting happens in
  // the three.js layer, not a Svelte DOM handler) whenever a base is
  // double-clicked - toggles focus off if it's the currently-focused base,
  // otherwise focuses it (re-targeting directly if a different base was
  // already focused).
  function handleFocusBase(np) {
    if (!scene || animating) return;
    if (focused?.id === np.id) { exitFocus(); return; }
    animating = true;
    scene.enterFocus(np, () => { focused = np; animating = false; });
  }

  function exitFocus() {
    if (!scene || animating || !focused) return;
    animating = true;
    scene.exitFocus(() => { focused = null; animating = false; });
  }

  function onWindowKeyDown(e) {
    if (e.key !== 'Escape') return;
    if (focused) exitFocus();
    else if (aligned) toggleAlign();
  }
</script>

<svelte:window onkeydown={onWindowKeyDown} />

<div class="navmap3d" bind:this={container}>
  <canvas bind:this={canvas}></canvas>
  {#if loading}
    <div class="loading">LOADING 3D ENGINE&hellip;</div>
  {:else}
    <button
      type="button"
      class="align-btn"
      onclick={toggleAlign}
      disabled={animating || !!focused}
      title={focused ? 'Exit base focus first (double-click the base or press Esc)' : undefined}
    >
      {aligned ? 'RETURN TO 3D VIEW' : 'ALIGN TO 2D VIEW'}
    </button>
    <div class="hint">
      {#if focused}
        inspecting {focused.baseName} &middot; drag to orbit &middot; scroll to zoom &middot; double-click or Esc to return
      {:else if aligned}
        click a node &middot; double-click a jump point to travel
      {:else}
        drag to orbit &middot; scroll to zoom &middot; click a node &middot; double-click a jump point to travel &middot; double-click a base to inspect
      {/if}
    </div>
  {/if}
</div>

<style>
  .navmap3d {
    position: relative;
    width: 100%;
    height: 100%;
  }
  canvas {
    width: 100%;
    height: 100%;
    display: block;
    cursor: grab;
  }
  canvas:active { cursor: grabbing; }
  .align-btn {
    position: absolute;
    top: 64px;
    right: 20px;
  }
  .hint {
    position: absolute;
    bottom: 12px;
    right: 16px;
    color: #668;
    font-size: 16px;
    pointer-events: none;
  }
  .loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    color: var(--text-cyan);
    letter-spacing: 1px;
    text-shadow: 0 0 6px rgba(100, 200, 255, 0.5);
    pointer-events: none;
  }
</style>
