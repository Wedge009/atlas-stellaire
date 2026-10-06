<script>
  import { selectedNode } from '../stores/selection.js';
  import { baseTypeIcon } from '../utils/baseTypes.js';
  import { systemName } from '../utils/navPoints.js';
  import { sortedEncounterGroups } from '../utils/encounters.js';
  import { shipName, shipLabel } from '../utils/ships.js';
  import { hasCommodityData } from '../data/commodities.js';
  import { missionOverrides } from '../stores/storyMission.js';
  import { encountersExpanded } from '../stores/ui.js';
  import CommoditiesDialog from './CommoditiesDialog.svelte';
  import { fadeSlide } from '../utils/transitions.js';
  import { t } from '../i18n/index.js';

  let {
    data,
    // Nav point IDs are only unique within a system, so this is needed to
    // look up the active story mission's fixed encounters.
    systemId,
    // Zoom only works in the free (non-aligned) 3D view - the button stays in
    // place but disabled elsewhere, so the panel's layout doesn't shift.
    zoomAvailable = false,
    // ID of the nav point the 3D view is currently zoomed in on, if any.
    zoomedId = null,
    // true while a 3D alignment/zoom animation is in progress
    locked = false,
    onZoom,
    onTravel,
  } = $props();

  let showCommodities = $state(false);

  // The active story mission's fixed ships here, which replace the regular
  // encounter table entirely.
  // A named character is a single ship, so reads as eg 'Paradigm: Reismann'
  // without a count.
  function missionShipLabel({ ship, count, character }) {
    return character ? shipLabel(ship, character) : `${count}× ${shipName(ship)}`;
  }

  let missionShips = $derived($selectedNode ? $missionOverrides.get(systemId)?.get($selectedNode.id) : null);

  // The encounter rows, as keys that change only when they do (eg switching
  // game where RF changed the table), so the rows can fade across.
  let missionShipsKey = $derived(JSON.stringify(missionShips ?? null));
  let encountersKey = $derived(JSON.stringify($selectedNode?.encounters ?? null));
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
        {#if d.asteroids}
          <div class="row muted">{$t('infoPanel.asteroidField', { count: d.asteroids })}</div>
        {/if}
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
        <!-- For the same point, a change in its encounters fades: just the
             rows when the table changes (so a collapsed section shows no
             change), the whole section when it appears, goes, or switches
             between the regular table and a story mission's ships. Local
             transitions, so selecting another point (rebuilding the outer
             key block) changes the panel at once. -->
        {#key d.id}
          {#if missionShips}
            <div class="encounters" transition:fadeSlide={{ duration: 300 }}>
              <div class="mission-title">{$t('infoPanel.missionEncounter')}</div>
              {#key missionShipsKey}
                <div transition:fadeSlide={{ duration: 300 }}>
                  {#each missionShips as s, i (i)}
                    <div class="row muted encounter-row">{missionShipLabel(s)}</div>
                  {:else}
                    <div class="row muted encounter-row">{$t('infoPanel.missionCleared')}</div>
                  {/each}
                </div>
              {/key}
            </div>
          {:else if d.encounters?.length}
            <details class="encounters" bind:open={$encountersExpanded} transition:fadeSlide={{ duration: 300 }}>
              <summary>{$t('infoPanel.encounterProbability')}</summary>
              {#key encountersKey}
                <div transition:fadeSlide={{ duration: 300 }}>
                  {#each sortedEncounterGroups(d) as g}
                    <div class="row muted encounter-row">
                      {Math.round(g.chance)}% — {g.ships.map((s) => `${s.count}× ${shipName(s.ship)}`).join(' + ')}
                    </div>
                  {/each}
                </div>
              {/key}
            </details>
          {/if}
        {/key}
        <!-- Zoom always comes first so it sits in the same place for every
             node type. -->
        <div class="actions">
          <button
            type="button"
            class="primary"
            class:active={zoomedId === d.id}
            aria-pressed={zoomedId === d.id}
            disabled={!zoomAvailable || locked}
            title={locked ? $t('settings.waitForAnimation') : !zoomAvailable ? $t('infoPanel.zoomUnavailable') : undefined}
            onclick={() => onZoom?.(d)}
          >
            {$t('infoPanel.zoom')}
          </button>
          {#if d.baseName && hasCommodityData(d.baseType)}
            <button type="button" class="primary" onclick={() => (showCommodities = true)}>
              {$t('common.commodities')}
            </button>
          {/if}
          {#if d.dest}
            <button
              type="button"
              class="primary"
              disabled={locked}
              title={locked ? $t('settings.waitForAnimation') : undefined}
              onclick={() => onTravel?.(d.dest)}
            >
              {$t('infoPanel.travel')}
            </button>
          {/if}
        </div>
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
  .encounters summary, .mission-title { color: var(--text-amber); font-size: var(--font-size-body-secondary); }
  .encounters summary { cursor: pointer; }
  .encounter-row { font-size: var(--font-size-small); margin-top: 4px; }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }
  .actions button {
    font-size: var(--font-size-button);
    text-transform: uppercase;
  }
</style>
