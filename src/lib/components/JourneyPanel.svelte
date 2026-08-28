<script>
  import { journey, clearJourney } from '../stores/journey.js';
  import { findSystem } from '../utils/navPoints.js';

  let { data, selectedSystemId = null } = $props();

  let fromName = $derived(findSystem(data, $journey?.fromSystemId)?.name ?? $journey?.fromSystemId);
  let toName = $derived(findSystem(data, $journey?.toSystemId)?.name ?? $journey?.toSystemId);
  let totalJumps = $derived($journey ? $journey.hops.length - 1 : 0);
  let refuelStopNames = $derived(
    $journey
      ? $journey.hops
          .filter((h) => h.refuelStop)
          .map((h) => {
            const system = findSystem(data, h.systemId);
            const base = system?.navPoints.find((np) => np.id === h.refuelNavPointId);
            return base?.baseName ? `${base.baseName} (${system.name})` : (system?.name ?? h.systemId);
          })
      : []
  );

  // Progress is derived from wherever the player is currently looking, not a
  // separately-tracked "furthest reached" counter - so browsing to any
  // system on the route, in any order, shows correct progress instead of
  // only advancing on sequential jumps.
  let currentHopIndex = $derived(
    $journey ? $journey.hops.findIndex((h) => h.systemId === selectedSystemId) : -1
  );
</script>

{#if $journey}
  <div class="journey-panel">
    <div class="title">
      JOURNEY: {fromName}
      <span class="dest">
        <svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 12h16M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        {toName}
      </span>
    </div>
    {#if currentHopIndex !== -1}
      <div class="row">Leg {currentHopIndex} of {totalJumps} jumps</div>
    {:else}
      <div class="row muted">Currently off route &middot; {totalJumps} jumps total</div>
    {/if}
    {#if refuelStopNames.length}
      <div class="row muted">Refuel at: {refuelStopNames.join(', ')}</div>
    {/if}
    {#each $journey.warnings as w}
      <div class="row warning">{w.message}</div>
    {/each}
    <button type="button" class="clear-btn" onclick={clearJourney}>CLEAR JOURNEY</button>
  </div>
{/if}

<style>
  .journey-panel {
    min-width: 240px;
    max-width: 340px;
    background: var(--panel-bg);
    border: 1px solid var(--border-cyan);
    box-shadow: 0 0 10px rgba(60, 180, 255, 0.35), inset 0 0 20px rgba(0, 60, 90, 0.3);
    color: var(--text-cyan-bright);
    padding: 10px 14px;
    font-size: 18px;
  }
  .title {
    font-family: var(--font-display);
    font-size: 12px;
    color: #fff;
    margin-bottom: 8px;
    line-height: 1.7;
  }
  .dest {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }
  .arrow-icon {
    width: 12px;
    height: 12px;
    color: var(--text-amber);
    flex: 0 0 auto;
  }
  .row { color: var(--text-cyan); }
  .row.muted { color: #6a8a99; font-size: 15px; margin-top: 4px; }
  .row.warning { color: var(--text-amber); font-size: 15px; margin-top: 4px; }
  .clear-btn {
    margin-top: 10px;
    font-size: 11px;
    padding: 6px 10px;
  }
</style>
