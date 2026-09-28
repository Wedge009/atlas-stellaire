<script>
  import { untrack } from 'svelte';
  import Dialog from './Dialog.svelte';
  import { flattenSystems, findSystem } from '../utils/navPoints.js';
  import { plotJourney } from '../stores/journey.js';
  import { t } from '../i18n/index.js';

  let { data, currentSystemId = null, onClose } = $props();

  // Alphabetical rather than grouped-by-quadrant, since a player may not
  // remember which quadrant a system sits in - the quadrant pickers below are
  // just an optional narrowing filter over this same list.
  let allSystems = $derived([...flattenSystems(data)].sort((a, b) => a.name.localeCompare(b.name)));

  let fromQuadrantId = $state('');
  let toQuadrantId = $state('');
  // Only used as the form's initial default (this dialog is remounted fresh
  // each time it opens), not meant to track `currentSystemId` reactively.
  let fromSystemId = $state(untrack(() => currentSystemId ?? ''));
  let toSystemId = $state('');
  let targetNavPointId = $state('');
  let refuelEnabled = $state(true);

  let fromSystemOptions = $derived(
    fromQuadrantId ? allSystems.filter((s) => s.quadrantId === fromQuadrantId) : allSystems
  );
  let toSystemOptions = $derived(toQuadrantId ? allSystems.filter((s) => s.quadrantId === toQuadrantId) : allSystems);

  // Drop the selected system if a quadrant filter change leaves it out of range.
  $effect(() => {
    if (fromSystemId && !fromSystemOptions.some((s) => s.id === fromSystemId)) fromSystemId = '';
  });
  $effect(() => {
    if (toSystemId && !toSystemOptions.some((s) => s.id === toSystemId)) toSystemId = '';
  });

  let toSystem = $derived(toSystemId ? findSystem(data, toSystemId) : null);

  function submit(e) {
    e.preventDefault();
    if (!fromSystemId || !toSystemId) return;
    plotJourney(data, {
      fromSystemId,
      toSystemId,
      targetNavPointId: targetNavPointId || null,
      refuelEnabled,
    });
    onClose?.();
  }
</script>

<Dialog title={$t('common.plotJourney')} {onClose} maxWidth="640px">
  <form onsubmit={submit}>
    <div class="field-row">
      <label class="quadrant-field" for="from-quadrant">{$t('plotJourneyDialog.fromQuadrant')}</label>
      <label class="system-field" for="from-system">{$t('plotJourneyDialog.fromSystem')}</label>
      <select id="from-quadrant" class="quadrant-field" bind:value={fromQuadrantId}>
        <option value="">{$t('plotJourneyDialog.allQuadrants')}</option>
        {#each data.quadrants as quadrant (quadrant.id)}
          <option value={quadrant.id}>{quadrant.name}</option>
        {/each}
      </select>
      <select id="from-system" class="system-field" bind:value={fromSystemId} required>
        <option value="" disabled>{$t('plotJourneyDialog.selectSystem')}</option>
        {#each fromSystemOptions as system (system.id)}
          <option value={system.id}>{system.name}</option>
        {/each}
      </select>
    </div>

    <div class="field-row">
      <label class="quadrant-field" for="to-quadrant">{$t('plotJourneyDialog.toQuadrant')}</label>
      <label class="system-field" for="to-system">{$t('plotJourneyDialog.toSystem')}</label>
      <select id="to-quadrant" class="quadrant-field" bind:value={toQuadrantId}>
        <option value="">{$t('plotJourneyDialog.allQuadrants')}</option>
        {#each data.quadrants as quadrant (quadrant.id)}
          <option value={quadrant.id}>{quadrant.name}</option>
        {/each}
      </select>
      <select id="to-system" class="system-field" bind:value={toSystemId} required>
        <option value="" disabled>{$t('plotJourneyDialog.selectDestination')}</option>
        {#each toSystemOptions as system (system.id)}
          <option value={system.id}>{system.name}</option>
        {/each}
      </select>
    </div>

    {#if toSystem}
      <label>
        <span>{$t('plotJourneyDialog.destinationPoint')}</span>
        <select bind:value={targetNavPointId}>
          <option value="">{$t('plotJourneyDialog.anywhereInSystem')}</option>
          {#each toSystem.navPoints as np (np.id)}
            <option value={np.id}>{np.label}{np.baseName ? `: ${np.baseName}` : ''}</option>
          {/each}
        </select>
      </label>
    {/if}

    <label class="checkbox-row">
      <input type="checkbox" bind:checked={refuelEnabled} />
      <span>{$t('plotJourneyDialog.landForFuel')}</span>
    </label>

    <button type="submit" class="plot-btn confirm caps">{$t('plotJourneyDialog.plotRoute')}</button>
  </form>
</Dialog>

<style>
  form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: var(--font-size-body);
    color: var(--text-cyan);
  }
  .field-row {
    display: grid;
    grid-template-columns: 1fr 1.25fr;
    column-gap: 10px;
    row-gap: 4px;
  }
  .field-row label,
  .field-row select {
    font-size: var(--font-size-small);
  }
  label.checkbox-row {
    font-size: var(--font-size-small);
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }
  .plot-btn {
    margin-top: 8px;
  }
</style>
