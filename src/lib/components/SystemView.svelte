<script>
  import NavMap2D from './NavMap2D.svelte';
  import NavMap3D from './NavMap3D.svelte';
  import InfoPanel from './InfoPanel.svelte';
  import Legend from './Legend.svelte';
  import { selectedNode, showHidden } from '../stores/selection.js';
  import { viewMode, viewAligned } from '../stores/view.js';

  let { system, data, onJump } = $props();

  let mapAnimating = $state(false);
  // While the 3D view is aligned (or animating to/from aligned) to the 2D projection,
  // switching mode or toggling hidden points would unmount/redraw NavMap3D mid-transition
  // and mangle the projection. Lock from the moment the transition starts, not just once
  // it settles, so there's no window to click through mid-animation.
  let alignLocked = $derived($viewMode === '3d' && ($viewAligned || mapAnimating));

  $effect(() => {
    // reset selection whenever the system changes so no stale node leaks in
    system.id;
    selectedNode.set(null);
  });

  let visiblePoints = $derived(
    system.navPoints.filter((np) => np.visibleOnMap || $showHidden)
  );
</script>

<div class="system-view">
  <div class="hud">
    <div class="hud-main">
      <div>SYSTEM: {system.name.toUpperCase()}</div>
      <div class="sub">{system.quadrantName} Quadrant &middot; Gemini Sector</div>
    </div>
    <div class="hud-controls">
      <button
        type="button"
        class:active={$viewMode === '2d'}
        disabled={alignLocked}
        title={alignLocked ? 'Return to 3D view before switching to 2D view' : undefined}
        onclick={() => ($viewMode = '2d')}
      >
        2D VIEW
      </button>
      <button type="button" class:active={$viewMode === '3d'} onclick={() => ($viewMode = '3d')}>3D VIEW</button>
      <button
        type="button"
        class:active={$showHidden}
        disabled={alignLocked}
        title={alignLocked ? 'Return to 3D view to change this' : undefined}
        onclick={() => showHidden.update((v) => !v)}
      >
        {$showHidden ? 'HIDE HIDDEN' : 'SHOW HIDDEN'}
      </button>
    </div>
  </div>

  <div class="viewport">
    {#if $viewMode === '2d'}
      <NavMap2D points={visiblePoints} {data} {onJump} />
    {:else}
      <NavMap3D points={visiblePoints} bind:aligned={$viewAligned} bind:animating={mapAnimating} {data} {onJump} />
    {/if}
  </div>

  <div class="overlay-info"><InfoPanel {data} /></div>
  <div class="overlay-legend"><Legend showHidden={$showHidden} /></div>
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
    font-size: 13px;
    color: var(--grid-red);
    letter-spacing: 1px;
    text-shadow: 0 0 6px rgba(255, 60, 60, 0.6);
  }
  .hud-main .sub {
    font-family: var(--font-body);
    font-size: 16px;
    color: var(--text-cyan);
    margin-top: 6px;
    text-shadow: 0 0 5px rgba(100, 200, 255, 0.5);
  }
  .hud-controls {
    display: flex;
    gap: 8px;
    pointer-events: all;
  }
  .viewport {
    position: absolute;
    inset: 0;
  }
  .overlay-info {
    position: absolute;
    bottom: 18px;
    left: 18px;
    z-index: 15;
  }
  .overlay-legend {
    position: absolute;
    bottom: 36px;
    right: 18px;
    z-index: 15;
  }
</style>
