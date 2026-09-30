<script>
  import { untrack } from 'svelte';
  import Dialog from './Dialog.svelte';
  import { storyMissions, activeMissionId, activeMission } from '../stores/storyMission.js';
  import { MISSION_GAMES, gameLabel, missionName } from '../utils/storyMissions.js';
  import { t } from '../i18n/index.js';

  let { onClose } = $props();

  // Opens on the active mission's game, with it selected. Each tab keeps its
  // own selection while the dialogue is open, so flipping tabs to compare
  // briefings doesn't lose the other one. Not persisted - this dialogue is
  // remounted fresh each time it opens.
  const initial = untrack(() => $activeMission);
  let game = $state(initial?.game ?? MISSION_GAMES[0].id);
  let selectedByGame = $state(initial ? { [initial.game]: initial.id } : {});

  let missions = $derived($storyMissions.filter((m) => m.game === game));
  let selectedId = $derived(selectedByGame[game] ?? '');
  let selected = $derived(missions.find((m) => m.id === selectedId) ?? null);

  function select(e) {
    selectedByGame[game] = e.currentTarget.value;
  }
</script>

<Dialog title={$t('common.storyMission')} {onClose} fillWidth maxWidth="560px">
  <div class="tabs" role="tablist">
    {#each MISSION_GAMES as g (g.id)}
      <button
        type="button"
        role="tab"
        aria-selected={game === g.id}
        class="tab"
        class:active={game === g.id}
        onclick={() => (game = g.id)}
      >
        {g.label}
      </button>
    {/each}
  </div>

  <div class="body">
    <label>
      <span>{$t('storyMissionDialog.mission')}</span>
      <select value={selectedId} onchange={select}>
        <option value="" disabled>{$t('storyMissionDialog.selectMission')}</option>
        {#each missions as m (m.id)}
          <option value={m.id}>{missionName(m)}</option>
        {/each}
      </select>
    </label>

    <div class="field">
      <span class="field-label">{$t('storyMissionDialog.briefing')}</span>
      <div class="briefing">{selected?.briefing ?? ''}</div>
    </div>

    <div class="active-row">
      {$t('storyMissionDialog.activeMission', {
        mission: $activeMission ? `${gameLabel($activeMission.game)} ${missionName($activeMission)}` : $t('common.none'),
      })}
    </div>

    <div class="actions">
      <button
        type="button"
        class="primary caps"
        disabled={!selected || selected.id === $activeMissionId}
        onclick={() => activeMissionId.set(selected.id)}
      >
        {$t('common.apply')}
      </button>
      <button type="button" class="primary caps" disabled={!$activeMissionId} onclick={() => activeMissionId.set(null)}>
        {$t('storyMissionDialog.clear')}
      </button>
    </div>
  </div>
</Dialog>

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
  .body {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  label, .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: var(--font-size-body);
    color: var(--text-cyan);
  }
  .briefing {
    height: 180px;
    overflow-y: auto;
    padding: 6px 8px;
    border: 1px solid var(--border-cyan);
    color: var(--text-cyan-bright);
    font-size: var(--font-size-body-secondary);
    white-space: pre-wrap;
  }
  .active-row {
    color: var(--text-amber);
    font-size: var(--font-size-body-secondary);
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  .actions button { flex: 1; }
</style>
