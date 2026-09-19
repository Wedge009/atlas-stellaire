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
  <div class="info">
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
          <button type="button" class="commodities-btn" onclick={() => (showCommodities = true)}>
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
  .info {
    min-width: 240px;
    max-width: 340px;
    background: var(--panel-bg);
    border: 1px solid var(--border-cyan);
    box-shadow: 0 0 10px rgba(60, 180, 255, 0.35), inset 0 0 20px rgba(0, 60, 90, 0.3);
    color: var(--text-cyan-bright);
    padding: 10px 14px;
    font-size: 18px;
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
    background: rgba(0, 20, 30, 0.4);
  }
  .info-text { min-width: 0; }
  .name {
    font-family: var(--font-display);
    font-size: 12px;
    color: #fff;
    margin-bottom: 8px;
    line-height: 1.5;
  }
  .row { color: var(--text-cyan); }
  .row.coords { margin-top: 6px; color: #668; }
  .row.muted { color: #6a8a99; font-size: 15px; }
  .encounters { margin-top: 8px; }
  .encounters summary { cursor: pointer; color: var(--text-amber); font-size: 15px; }
  .encounter-row { font-size: 14px; margin-top: 4px; }
  .commodities-btn {
    margin-top: 10px;
    font-size: 14px;
    border-color: var(--border-cyan);
    color: var(--text-cyan-bright);
    text-transform: uppercase;
  }
  .commodities-btn:hover {
    background: rgba(77, 200, 255, 0.15);
    color: #fff;
  }
</style>
