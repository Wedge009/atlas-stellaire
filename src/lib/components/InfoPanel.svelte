<script>
  import { selectedNode } from '../stores/selection.js';
  import { baseTypeIcon } from '../utils/baseTypes.js';
  import { systemName } from '../utils/navPoints.js';
  import { sortedEncounterGroups } from '../utils/encounters.js';
  import { shipName } from '../utils/ships.js';

  let { data } = $props();
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
        <div class="name">{d.label}{#if d.dest}: Jump to {systemName(data, d.dest)}{/if}</div>
        <div class="row">{d.description}</div>
        <div class="row coords">X {d.x}&nbsp; Y {d.y}&nbsp; Z {d.z}</div>
        {#if d.baseName && d.facilities}
          {@const facilityList = [
            d.facilities.merchantsGuild ? 'Merchants Guild' : null,
            d.facilities.mercenariesGuild ? 'Mercenaries Guild' : null,
            d.facilities.shipDealer ? 'Ship Dealer' : null,
          ].filter(Boolean)}
          <div class="row muted">
            {facilityList.join(' · ')}
          </div>
        {/if}
        {#if d.encounters?.length}
          {@const groups = sortedEncounterGroups(d)}
          <details class="encounters">
            <summary>Encounter Probability</summary>
            {#each groups as g}
              <div class="row muted encounter-row">
                {Math.round(g.chance)}% — {g.ships.map((s) => `${s.count}× ${shipName(s.ship)}`).join(' + ')}
              </div>
            {/each}
          </details>
        {/if}
      </div>
    </div>
  </div>
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
</style>
