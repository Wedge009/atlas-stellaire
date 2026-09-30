<script>
  import { systemName } from '../utils/navPoints.js';
  import { shipName } from '../utils/ships.js';
  import { missionOverrides } from '../stores/storyMission.js';
  import { t } from '../i18n/index.js';

  let { data, system, maxHeight, onClose, onGoTo } = $props();

  let bases = $derived(system.navPoints.filter((np) => np.type === 'base'));

  let jumpDestinations = $derived(
    [...new Set(system.navPoints.filter((np) => np.dest).map((np) => np.dest))]
      .map((id) => systemName(data, id))
      .sort((a, b) => a.localeCompare(b))
  );

  let encounterShips = $derived(
    [
      ...new Set(
        system.navPoints.flatMap((np) => (np.encounters ?? []).flatMap((g) => g.ships.map((s) => s.ship)))
      ),
    ]
      .map(shipName)
      .sort((a, b) => a.localeCompare(b))
  );

  // Ships the active story mission fixes at any nav point in this system.
  let missionShips = $derived(
    [...new Set([...($missionOverrides.get(system.id)?.values() ?? [])].flat().map((s) => s.ship))]
      .map(shipName)
      .sort((a, b) => a.localeCompare(b))
  );

  let hasAsteroids = $derived(system.navPoints.some((np) => np.asteroids));
</script>

<div class="info panel-frame info-panel" style={maxHeight ? `max-height: ${maxHeight}px` : ''}>
  <button type="button" class="close-btn" aria-label={$t('common.close')} onclick={onClose}>&times;</button>
  <div class="name">{system.name}</div>
  <div class="row muted">{$t('common.quadrant', { name: system.quadrantName })}</div>

  {#if bases.length}
    <div class="section">
      <div class="section-title">{$t('common.bases')}</div>
      {#each bases as b (b.id)}
        <div class="row">{b.description ?? b.baseName}</div>
      {/each}
    </div>
  {/if}

  <div class="section">
    <div class="section-title">{$t('systemInfoPanel.jumpPoints')}</div>
    {#if jumpDestinations.length}
      {#each jumpDestinations as name}
        <div class="row">{name}</div>
      {/each}
    {:else}
      <div class="row muted">{$t('common.none')}</div>
    {/if}
  </div>

  {#if encounterShips.length}
    <div class="section">
      <div class="section-title">{$t('common.shipEncounters')}</div>
      <div class="row muted">{encounterShips.join(', ')}</div>
    </div>
  {/if}

  {#if missionShips.length}
    <div class="section">
      <div class="section-title">{$t('infoPanel.missionEncounter')}</div>
      <div class="row muted">{missionShips.join(', ')}</div>
    </div>
  {/if}

  {#if hasAsteroids}
    <div class="row warning">{$t('systemInfoPanel.hazardsAsteroids')}</div>
  {/if}

  <button type="button" class="goto-btn primary" onclick={onGoTo}>{$t('systemInfoPanel.goToSystem')}</button>
</div>

<style>
  .info {
    position: relative;
    max-width: 360px;
    overflow-y: auto;
  }
  .close-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 24px;
    height: 24px;
    line-height: 1;
    padding: 0;
    font-size: 32px;
    color: var(--text-cyan);
    cursor: pointer;
  }
  .close-btn:hover { color: var(--text-emphasis); }
  .name {
    font-weight: bold;
    padding-right: 20px;
    margin-bottom: 0;
  }
  .row {
    font-size: var(--font-size-body-secondary);
  }
  .row.warning { margin-top: 8px; }
  .section { margin-top: 8px; }
  .section-title {
    font-family: var(--font-display);
    font-size: var(--font-size-subheading);
    letter-spacing: 0.5px;
    color: var(--text-amber);
    margin-bottom: 3px;
    text-transform: capitalize;
  }
  .goto-btn {
    margin-top: 12px;
    width: 100%;
    font-size: var(--font-size-button);
    padding: 6px 10px;
    text-transform: uppercase;
  }
</style>
