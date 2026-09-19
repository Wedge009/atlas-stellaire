<script>
  import { systemName } from '../utils/navPoints.js';
  import { shipName } from '../utils/ships.js';
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

  let hasAsteroids = $derived(system.navPoints.some((np) => np.asteroids));
</script>

<div class="info" style={maxHeight ? `max-height: ${maxHeight}px` : ''}>
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

  {#if hasAsteroids}
    <div class="row hazard">{$t('systemInfoPanel.hazardsAsteroids')}</div>
  {/if}

  <button type="button" class="goto-btn" onclick={onGoTo}>{$t('systemInfoPanel.goToSystem')}</button>
</div>

<style>
  .info {
    position: relative;
    min-width: 240px;
    max-width: 340px;
    background: var(--panel-bg);
    border: 1px solid var(--border-cyan);
    box-shadow: 0 0 10px rgba(60, 180, 255, 0.35), inset 0 0 20px rgba(0, 60, 90, 0.3);
    color: var(--text-cyan-bright);
    padding: 10px 14px;
    font-size: 18px;
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
    font-size: 16px;
    background: transparent;
    border: none;
    box-shadow: none;
    color: var(--text-cyan);
    cursor: pointer;
  }
  .close-btn:hover { color: #fff; }
  .name {
    font-family: var(--font-display);
    font-size: 12px;
    color: #fff;
    line-height: 1.5;
    padding-right: 20px;
  }
  .row { color: var(--text-cyan); }
  .row.muted { color: #6a8a99; font-size: 15px; }
  .row.hazard { color: var(--text-amber); font-size: 15px; margin-top: 8px; }
  .section { margin-top: 8px; }
  .section-title {
    font-family: var(--font-display);
    font-size: 11px;
    letter-spacing: 0.5px;
    color: var(--text-amber);
    margin-bottom: 3px;
    text-transform: capitalize;
  }
  .goto-btn {
    margin-top: 12px;
    width: 100%;
    font-size: 11px;
    padding: 6px 10px;
    text-transform: uppercase;
  }
</style>
