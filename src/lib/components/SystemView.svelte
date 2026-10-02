<script>
  import { untrack } from 'svelte';
  import { get } from 'svelte/store';
  import { fade } from 'svelte/transition';
  import NavMap2D from './NavMap2D.svelte';
  import NavMap3D from './NavMap3D.svelte';
  import InfoPanel from './InfoPanel.svelte';
  import Legend from './Legend.svelte';
  import SettingsPanel from './SettingsPanel.svelte';
  import GameToggle from './GameToggle.svelte';
  import { selectedNode } from '../stores/selection.js';
  import { showHidden } from '../stores/settings.js';
  import { viewMode, viewAligned } from '../stores/view.js';
  import { rollForSystem } from '../stores/encounters.js';
  import { gameSwitchLocked } from '../stores/game.js';
  import { infoPanelPosition, legendPanelPosition } from '../stores/ui.js';
  import { draggable } from '../actions/draggable.js';
  import { t } from '../i18n/index.js';

  let { system, data, onJump } = $props();

  let mapAnimating = $state(false);
  let mapLoading = $state(true);
  let mapFocused = $state(null);
  let navMap3D = $state();
  // Both the view-mode toggle and the settings menu only need to be locked while
  // the 3D<->2D alignment flight animation is actually in flight - switching mode
  // or rebuilding a toggled setting's effect (eg the node meshes) mid-flight would
  // fight the running animation. Once it settles into either end state (including
  // the aligned 2D projection), both are safe again.
  // The game switch too, since it rebuilds the nav points.
  let animationLocked = $derived($viewMode === '3d' && mapAnimating);

  $effect(() => {
    gameSwitchLocked.set(animationLocked);
    return () => gameSwitchLocked.set(false);
  });

  // A new system starts with nothing selected, so no stale node leaks in -
  // before the first render, like the encounter rolls below.
  selectedNode.set(null);

  // This visit's encounters are rolled before the first render - an effect
  // runs after it, which briefly showed the previous system's ships at any
  // nav point with the same ID. SystemView is remounted per system (see
  // App.svelte), so this runs once per visit.
  untrack(() => rollForSystem(system.id, system.navPoints));

  $effect(() => {
    // New nav points - this system in the other game (the first run is just
    // the ones rolled above): roll only what the game switch changed, and
    // keep the selection on the same point where it still exists, so its
    // info (eg the base's commodities) stays open.
    const navPoints = system.navPoints;
    untrack(() => {
      rollForSystem(system.id, navPoints, { keepUnchanged: true });
      const selected = get(selectedNode);
      if (selected) selectedNode.set(navPoints.find((np) => np.id === selected.id) ?? null);
    });
  });

  // 2D <-> 3D cross-fades: both views are shown for the switch, the 3D one
  // on top. Into 3D, the 2D map stays up until the scene has loaded (on the
  // first load of a session that takes a moment), then the scene fades in
  // over it (the .view-layer CSS transition) and the map goes. Out of 3D,
  // the scene fades out over the map.
  const VIEW_FADE_MS = 300;
  let show2d = $state(get(viewMode) === '2d');
  let show3d = $state(get(viewMode) === '3d');
  // The 3D scene's fade-out, during which switching back isn't offered (it
  // would revive the leaving scene, which never reports loading again).
  let leaving3d = $state(false);
  let viewSwitching = $derived((show2d && show3d) || leaving3d);

  $effect(() => {
    const mode = $viewMode;
    untrack(() => {
      if (mode === '2d') {
        show2d = true;
        if (show3d) {
          show3d = false;
          leaving3d = true;
          setTimeout(() => (leaving3d = false), VIEW_FADE_MS);
        }
      } else if (!show3d) {
        // Set before the new scene's first render, which would otherwise
        // show it at once over the 2D map with the last scene's value.
        mapLoading = true;
        show3d = true;
      }
    });
  });

  // The 2D map goes once the scene's fade-in has actually finished - a
  // timer started on loading can run out first, since the fade can start
  // late while the browser finishes building the scene.
  function onLayer3dFaded(e) {
    if (e.target === e.currentTarget && e.propertyName === 'opacity' && $viewMode === '3d' && !mapLoading) {
      show2d = false;
    }
  }

  let visiblePoints = $derived(
    system.navPoints.filter((np) => np.visibleOnMap || $showHidden)
  );
</script>

<div class="system-view">
  <div class="hud">
    <div class="hud-main">
      <div class="caps">{$t('systemView.systemLabel', { name: system.name })}</div>
      <div class="sub">{$t('common.quadrant', { name: system.quadrantName })} · {$t('common.geminiSector')}</div>
    </div>
    <div class="hud-controls">
      <div class="hud-controls-row">
        <GameToggle />
      </div>
      <div class="hud-controls-row">
        <button
          type="button"
          class="primary caps"
          disabled={animationLocked || viewSwitching}
          title={animationLocked || viewSwitching ? $t('settings.waitForAnimation') : undefined}
          onclick={() => ($viewMode = $viewMode === '2d' ? '3d' : '2d')}
        >
          {$viewMode === '2d' ? $t('systemView.view2d') : $t('common.view3d')}
        </button>
        <SettingsPanel locked={animationLocked} />
      </div>
      {#if $viewMode === '3d' && !mapLoading}
        <div class="hud-controls-row">
          <button
            type="button"
            class="primary caps"
            onclick={() => navMap3D?.toggleAlign()}
            disabled={mapAnimating || !!mapFocused}
            title={mapFocused ? $t('navMap3D.exitZoomFirst') : undefined}
          >
            {$viewAligned ? $t('navMap3D.alignedView') : $t('navMap3D.freeView')}
          </button>
        </div>
      {/if}
    </div>
  </div>

  <div class="viewport">
    {#if show2d}
      <div class="view-layer">
        <NavMap2D points={visiblePoints} {data} {onJump} systemId={system.id} />
      </div>
    {/if}
    {#if show3d}
      <!-- Hidden only while loading over the 2D map; with nothing beneath
           (opening a system in 3D), its loading message shows as before. -->
      <div
        class="view-layer"
        class:hidden={mapLoading && show2d}
        out:fade={{ duration: VIEW_FADE_MS }}
        ontransitionend={onLayer3dFaded}
      >
        <NavMap3D
          bind:this={navMap3D}
          points={visiblePoints}
          bind:aligned={$viewAligned}
          bind:animating={mapAnimating}
          bind:loading={mapLoading}
          bind:focused={mapFocused}
          {data}
          {onJump}
          systemId={system.id}
        />
      </div>
    {/if}
  </div>

  <div
    class="overlay-info"
    use:draggable={{ positionStore: infoPanelPosition, handle: '.drag-handle' }}
  >
    <InfoPanel
      {data}
      systemId={system.id}
      zoomAvailable={$viewMode === '3d' && !mapLoading && !$viewAligned}
      zoomedId={$viewMode === '3d' ? mapFocused?.id : null}
      locked={animationLocked}
      onZoom={(np) => navMap3D?.toggleFocus(np)}
      onTravel={onJump}
    />
  </div>
  <div
    class="overlay-legend"
    use:draggable={{ positionStore: legendPanelPosition, handle: '.legend-header' }}
  >
    <Legend showHidden={$showHidden} />
  </div>
</div>

<style>
  .system-view {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .hud {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    padding: 14px 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    z-index: 10;
    pointer-events: none;
  }
  .hud-main {
    font-family: var(--font-display);
    font-size: var(--font-size-heading);
    font-weight: bold;
    color: var(--grid-red);
    letter-spacing: 1px;
    text-shadow: var(--text-glow-red);
  }
  .hud-main .sub {
    font-family: var(--font-body);
    font-size: var(--font-size-body);
    font-weight: normal;
    color: var(--text-cyan);
    margin-top: 6px;
    text-shadow: var(--text-glow-cyan);
  }
  .hud-controls {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    pointer-events: all;
  }
  .hud-controls-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }
  .viewport {
    position: absolute;
    inset: 0;
  }
  .view-layer {
    position: absolute;
    inset: 0;
    transition: opacity 300ms linear;
  }
  .view-layer.hidden {
    opacity: 0;
    pointer-events: none;
  }
  .overlay-info {
    position: absolute;
    bottom: 18px;
    left: 18px;
    z-index: 15;
  }
  .overlay-legend {
    position: absolute;
    bottom: 18px;
    right: 18px;
    z-index: 15;
  }
</style>
