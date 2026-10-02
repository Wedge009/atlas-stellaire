<script>
  import { onMount, onDestroy, untrack } from 'svelte';
  import { selectedNode } from '../stores/selection.js';
  import { journey } from '../stores/journey.js';
  import { legendCollapsed } from '../stores/ui.js';
  import {
    idleRotationEnabled,
    skyboxEnabled,
    showGridLines,
    baseModelStyle,
    jumpPointStyle,
    encounterMode,
  } from '../stores/settings.js';
  import { encounterRolls } from '../stores/encounters.js';
  import { routeThroughSystem } from '../utils/journey.js';
  import { fontReady } from '../utils/fonts.js';
  import { systemName } from '../utils/navPoints.js';
  import { t } from '../i18n/index.js';

  let {
    points,
    aligned = $bindable(false),
    animating = $bindable(false),
    loading = $bindable(true),
    focused = $bindable(null),
    // Fade the scene in once it's ready, as on arriving in a system. Off when
    // the parent fades it in itself (the 2D -> 3D cross-fade, see SystemView).
    fadeIn = true,
    data,
    onJump,
    systemId,
  } = $props();

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
  let destroyed = false;

  // The bottom-right hint line, composed from short reusable phrases.
  let hintText = $derived(
    focused
      ? [
          inspectingText(focused),
          $t('navMap3D.hintDragOrbit'),
          $t('navMap3D.hintScrollZoom'),
          $t('navMap3D.hintEscReturn'),
        ].join(' · ')
      : aligned
        ? [$t('navMap3D.hintClickPoint'), $t('navMap3D.hintJumpTravel')].join(' · ')
        : [
            $t('navMap3D.hintDragOrbit'),
            $t('navMap3D.hintScrollZoom'),
            $t('navMap3D.hintClickPoint'),
            $t('navMap3D.hintPointZoom'),
          ].join(' · ')
  );

  function inspectingText(np) {
    if (np.baseName) return $t('navMap3D.hintInspecting', { name: np.baseName });
    if (np.dest) return $t('navMap3D.hintInspectingJump', { system: systemName(data, np.dest) });
    return $t('navMap3D.hintInspecting', { name: np.label });
  }

  onMount(() => {
    // A fresh scene always starts zoomed out - clear any focus left bound in
    // the parent from before a 2D<->3D mode switch unmounted the old scene.
    focused = null;
    // Likewise loading, which the parent waits on to cross-fade from the 2D
    // map (see SystemView) - it's still false from any earlier scene.
    loading = true;
    // Three.js is loaded lazily so it isn't part of the initial bundle - the
    // sector map and 2D view never need it, and it only pays for itself once
    // a system's 3D view actually mounts.
    (async () => {
      // fontReady was run at application boot (see utils/fonts.js), not
      // here, so it has the maximum head start - but this scene's canvas-
      // baked labels still need to wait on it before creating the scene,
      // since the bake is one-time and never corrects itself if the font
      // arrives late.
      const [{ createNavScene }] = await Promise.all([
        import('../three/createNavScene.js'),
        fontReady,
        // Let the browser paint this view (the loading message) first -
        // building the scene holds it up, which otherwise left the previous
        // system frozen on screen until the new one was ready.
        new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve))),
      ]);
      if (destroyed) return;
      scene = createNavScene({
        canvas,
        onSelect: (np) => selectedNode.set(np),
        onJump,
        onFocusNode: toggleFocus,
        data,
        systemId,
        idleRotationEnabled: $idleRotationEnabled,
        skyboxEnabled: $skyboxEnabled,
        gridLinesEnabled: $showGridLines,
        baseModelsEnabled: $baseModelStyle === 'models',
        jumpPointStyle: $jumpPointStyle,
        encounterMode: $encounterMode,
        translate: $t,
      });
      scene.setPoints(points, routeHighlightIds, routeInfo.segments);
      scene.setEncounterShips($encounterRolls);
      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);

      // If the caller remembers an aligned view (eg from before a system
      // switch), snap straight to it with no flight animation.
      if (aligned) scene.setAlignedInstant();

      // Only report loaded once the scene has settled (models in, shaders
      // compiled, first frames drawn): the cross-fade from the 2D map (see
      // SystemView) starts then, and would otherwise run its course while
      // the browser is busy with that work, showing as a jump instead.
      await scene.whenReady();
      if (destroyed) return;
      loading = false;
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
    // hidden-toggle, game switch, or a journey plotted/advanced while this
    // system is open)
    const current = points;
    const highlightIds = routeHighlightIds;
    const segments = routeInfo.segments;
    // The current game's sector, for naming jump destinations in labels -
    // read here so it's always up to date before the points it goes with.
    const sector = data;
    if (scene) {
      scene.setData(sector);
      scene.setPoints(current, highlightIds, segments);
    }
  });

  $effect(() => {
    // A zoomed-in point that's gone or moved (hidden points turned off, or
    // a switch to the other game) zooms back out; otherwise it follows the
    // point's new data.
    const current = points;
    untrack(() => {
      if (!focused || animating) return;
      const same = current.find((np) => np.id === focused.id);
      if (same && same.x === focused.x && same.y === focused.y && same.z === focused.z) focused = same;
      else exitFocus();
    });
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
    const enabled = $showGridLines;
    scene?.setGridLinesEnabled(enabled);
  });

  $effect(() => {
    const style = $baseModelStyle;
    scene?.setBaseModelsEnabled(style === 'models');
  });

  $effect(() => {
    const style = $jumpPointStyle;
    scene?.setJumpPointStyle(style);
  });

  $effect(() => {
    const mode = $encounterMode;
    scene?.setEncounterMode(mode);
  });

  $effect(() => {
    const rolls = $encounterRolls;
    scene?.setEncounterShips(rolls);
  });

  $effect(() => {
    // $t itself (not just $locale) so this also catches a hot-swapped
    // dictionary, not only a locale switch.
    const translateFn = $t;
    scene?.setTranslate(translateFn);
  });

  // Exported so SystemView's HUD can drive it directly (the button itself now
  // lives there, grouped with the other top-right controls, rather than
  // floating at a fixed offset here where a long, multi-line system name can
  // grow the title underneath it).
  export function toggleAlign() {
    if (!scene || animating || focused) return;
    animating = true;
    if (!aligned) {
      scene.animateToAligned(() => { aligned = true; animating = false; });
    } else {
      scene.animateToOrbit(() => { aligned = false; animating = false; });
    }
  }

  // Called from createNavScene's own dblclick handler (ray-casting happens in
  // the three.js layer, not a Svelte DOM handler) and from the info panel's
  // Zoom button, for any nav point type - toggles focus off if it's the
  // currently-focused point, otherwise focuses it (re-targeting directly if a
  // different point was already focused). Zooming isn't available in the
  // flattened aligned view; the scene would silently refuse, leaving
  // `animating` stuck, so that's guarded here too.
  export function toggleFocus(np) {
    if (!scene || animating || aligned) return;
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
  <canvas bind:this={canvas} class:fading-in={fadeIn && loading}></canvas>
  {#if loading}
    <div class="loading">{$t('navMap3D.loading')}</div>
  {:else}
    <div class="hint" class:legend-collapsed={$legendCollapsed}>{hintText}</div>
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
  /* Hidden until the scene's ready (see whenReady), then faded in. */
  canvas { transition: opacity 300ms linear; }
  canvas.fading-in { opacity: 0; }
  .hint {
    position: absolute;
    bottom: 12px;
    left: 16px;
    /* Left-anchored with a capped width, rather than right-anchored, so that
       wrapping on to extra lines (a longer translation, a narrow view-port)
       never reaches into the legend's corner - the two no longer share a
       right edge to collide along, however tall the hint grows. The reserved
       width tracks the legend's collapsed/expanded state (see legend-collapsed
       below) so it isn't permanently sized for the wider, expanded case. */
    max-width: calc(100% - 230px);
    color: var(--text-dim);
    font-size: var(--font-size-body-secondary);
    pointer-events: none;
  }
  .hint.legend-collapsed {
    /* The legend's collapsed pill is much narrower than its expanded panel -
       give the hint the extra width back rather than reserving worst-case
       space for a panel that isn't actually showing. */
    max-width: calc(100% - 170px);
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
    text-shadow: var(--text-glow-cyan);
    text-transform: uppercase;
    pointer-events: none;
  }
</style>
