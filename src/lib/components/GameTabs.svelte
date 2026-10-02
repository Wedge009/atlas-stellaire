<script>
  import { game, gameSwitchLocked } from '../stores/game.js';
  import { GAMES } from '../utils/games.js';
  import { t } from '../i18n/index.js';

  // One tab per game, for dialogues whose content differs between them
  // (story missions, commodity prices). The tabs are just another way to
  // set the application-wide game, so picking one changes the map too.
</script>

<div class="tabs" role="tablist">
  {#each GAMES as g (g.id)}
    <button
      type="button"
      role="tab"
      aria-selected={$game === g.id}
      class="tab"
      class:active={$game === g.id}
      disabled={$gameSwitchLocked && $game !== g.id}
      title={$gameSwitchLocked ? $t('settings.waitForAnimation') : undefined}
      onclick={() => game.set(g.id)}
    >
      {g.label}
    </button>
  {/each}
</div>

<style>
  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 12px;
  }
  .tab {
    flex: 1;
    font-family: var(--font-body);
    font-size: var(--font-size-body-secondary);
    border: 1px solid var(--border-cyan);
    color: var(--text-cyan);
    padding: 6px 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .tab:hover { color: var(--text-emphasis); }
  .tab.active {
    color: var(--text-emphasis);
    background: var(--highlight-selected);
    box-shadow: var(--glow-cyan);
  }
</style>
