<script>
  import { journey, clearJourney } from '../stores/journey.js';
  import { findSystem } from '../utils/navPoints.js';
  import { t } from '../i18n/index.js';

  let { data, selectedSystemId = null } = $props();

  // A system only the other game has is still named (see resolveSector).
  let fromName = $derived(nameOf($journey?.fromSystemId));
  let toName = $derived(nameOf($journey?.toSystemId));
  function nameOf(id) {
    return findSystem(data, id)?.name ?? data.otherGameSystems?.[id] ?? id;
  }

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
  <div class="journey-panel panel-frame info-panel">
    <div class="title name">
      <span class="caps">{$t('journeyPanel.titlePrefix')}</span> {fromName}
      <span class="dest">
        <svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 12h16M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        {toName}
      </span>
    </div>
    {#if !$journey.hops.length}
      <!-- No route: the warning below says why -->
    {:else if currentHopIndex !== -1}
      <div class="row">{$t('journeyPanel.legOfJumps', { current: currentHopIndex, total: totalJumps })}</div>
    {:else}
      <div class="row muted">{$t('journeyPanel.offRoute', { total: totalJumps })}</div>
    {/if}
    {#if refuelStopNames.length}
      <div class="row muted">{$t('journeyPanel.refuelAt', { names: refuelStopNames.join(', ') })}</div>
    {/if}
    {#each $journey.warnings as w}
      <div class="row warning">{$t(w.messageKey, w.params)}</div>
    {/each}
    <button type="button" class="clear-btn primary caps" onclick={clearJourney}>{$t('journeyPanel.clearJourney')}</button>
  </div>
{/if}

<style>
  .title {
    cursor: grab;
    touch-action: none;
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
  .row.muted { margin-top: 4px; }
  .row.warning { margin-top: 4px; }
  .clear-btn {
    margin-top: 10px;
    font-size: var(--font-size-button-small);
    padding: 6px 10px;
  }
</style>
