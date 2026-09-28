<script>
  import { selectedNode } from '../stores/selection.js';
  import { baseTypeIcon } from '../utils/baseTypes.js';
  import { systemName } from '../utils/navPoints.js';
  import { sortedEncounterGroups } from '../utils/encounters.js';
  import { shipName } from '../utils/ships.js';
  import { hasCommodityData } from '../data/commodities.js';
  import CommoditiesDialog from './CommoditiesDialog.svelte';
  import { t } from '../i18n/index.js';

  let { data } = $props();

  let showCommodities = $state(false);
</script>

{#if $selectedNode}
  {@const d = $selectedNode}
  {@const icon = d.baseName ? baseTypeIcon(d.baseType) : null}
  <div class="info panel-frame info-panel">
    <div class="drag-handle" aria-hidden="true"><span class="grip"></span></div>
    <div class="info-body">
      {#if icon}
        <img class="base-icon" src={icon} alt={d.baseType} />
      {/if}
      <div class="info-text">
        <div class="name">{d.label}{#if d.dest}: {$t('infoPanel.jumpTo', { system: systemName(data, d.dest) })}{/if}</div>
        <div class="row">{d.description}</div>
        <div class="row coords">{$t('infoPanel.coords', { x: d.x, y: d.y, z: d.z })}</div>
        {#if d.baseName && d.facilities}
          {@const facilityList = [
            d.facilities.merchantsGuild ? $t('infoPanel.merchantsGuild') : null,
            d.facilities.mercenariesGuild ? $t('infoPanel.mercenariesGuild') : null,
            d.facilities.shipDealer ? $t('infoPanel.shipDealer') : null,
          ].filter(Boolean)}
          <div class="row muted">
            {facilityList.join(' · ')}
          </div>
        {/if}
        {#if d.encounters?.length}
          {@const groups = sortedEncounterGroups(d)}
          <details class="encounters">
            <summary>{$t('infoPanel.encounterProbability')}</summary>
            {#each groups as g}
              <div class="row muted encounter-row">
                {Math.round(g.chance)}% — {g.ships.map((s) => `${s.count}× ${shipName(s.ship)}`).join(' + ')}
              </div>
            {/each}
          </details>
        {/if}
        {#if d.baseName && hasCommodityData(d.baseType)}
          <button type="button" class="commodities-btn primary" onclick={() => (showCommodities = true)}>
            {$t('common.commodities')}
          </button>
        {/if}
      </div>
    </div>
  </div>
  {#if showCommodities}
    <CommoditiesDialog baseType={d.baseType} baseLabel={d.baseName} onClose={() => (showCommodities = false)} />
  {/if}
{/if}

<style>
  .drag-handle {
    display: flex;
    justify-content: center;
    margin: -10px -14px 8px;
    padding: 5px 0;
    cursor: grab;
    touch-action: none;
  }
  .grip {
    width: 32px;
    height: 4px;
    border-radius: 2px;
    background: var(--border-cyan);
    opacity: 0.6;
  }
  .info-body {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  .base-icon {
    flex: 0 0 auto;
    width: 6rem;
    height: 6rem;
    object-fit: contain;
    image-rendering: pixelated;
  }
  .info-text { min-width: 0; }
  .row.coords { margin-top: 6px; color: var(--text-dim); }
  .encounters { margin-top: 8px; }
  .encounters summary { cursor: pointer; color: var(--text-amber); font-size: var(--font-size-body-secondary); }
  .encounter-row { font-size: var(--font-size-small); margin-top: 4px; }
  .commodities-btn {
    margin-top: 10px;
    font-size: var(--font-size-button-large);
    text-transform: uppercase;
  }
</style>
