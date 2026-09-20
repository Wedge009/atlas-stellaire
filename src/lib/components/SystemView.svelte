<script>
  import NavMap2D from './NavMap2D.svelte';
  import NavMap3D from './NavMap3D.svelte';
  import InfoPanel from './InfoPanel.svelte';
  import Legend from './Legend.svelte';
  import SettingsPanel from './SettingsPanel.svelte';
  import { selectedNode } from '../stores/selection.js';
  import { showHidden } from '../stores/settings.js';
  import { viewMode, viewAligned } from '../stores/view.js';
  import { rollForSystem } from '../stores/encounters.js';
  import { t } from '../i18n/index.js';

  let { system, data, onJump } = $props();

  let mapAnimating = $state(false);
  // Both the view-mode toggle and the settings menu only need to be locked while
  // the 3D<->2D alignment flight animation is actually in flight - switching mode
  // or rebuilding a toggled setting's effect (eg the node meshes) mid-flight would
  // fight the running animation. Once it settles into either end state (including
  // the aligned 2D projection), both are safe again.
  let animationLocked = $derived($viewMode === '3d' && mapAnimating);

  $effect(() => {
    // reset selection whenever the system changes so no stale node leaks in
    system.id;
    selectedNode.set(null);
    rollForSystem(system.navPoints);
  });

  let visiblePoints = $derived(
    system.navPoints.filter((np) => np.visibleOnMap || $showHidden)
  );
</script>

<div class="system-view">
  <div class="hud">
    <div class="hud-main">
      <div class="caps">{$t('systemView.systemLabel', { name: system.name })}</div>
      <div class="sub">{$t('common.quadrant', { name: system.quadrantName })} · Gemini Sector</div>
    </div>
    <div class="hud-controls">
      <button
        type="button"
        class="caps"
        disabled={animationLocked}
        title={animationLocked ? $t('settings.waitForAnimation') : undefined}
        onclick={() => ($viewMode = $viewMode === '2d' ? '3d' : '2d')}
      >
        {$viewMode === '2d' ? $t('systemView.view2d') : $t('common.view3d')}
      </button>
      <SettingsPanel locked={animationLocked} />
    </div>
  </div>

  <div class="viewport">
    {#if $viewMode === '2d'}
      <NavMap2D points={visiblePoints} {data} {onJump} systemId={system.id} />
    {:else}
      <NavMap3D points={visiblePoints} bind:aligned={$viewAligned} bind:animating={mapAnimating} {data} {onJump} systemId={system.id} />
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
    font-size: 14px;
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
    bottom: 18px;
    right: 18px;
    z-index: 15;
  }
</style>
