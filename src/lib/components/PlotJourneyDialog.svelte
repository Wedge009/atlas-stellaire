<script>
  import { untrack } from 'svelte';
  import { flattenSystems, findSystem } from '../utils/navPoints.js';
  import { plotJourney } from '../stores/journey.js';

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

  function onKeydown(e) {
    if (e.key === 'Escape') onClose?.();
  }

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) onClose?.();
  }

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

<svelte:window onkeydown={onKeydown} />

<div class="backdrop" role="presentation" onclick={onBackdropClick}>
  <div class="dialog" role="dialog" aria-modal="true" aria-label="Plot Journey">
    <button type="button" class="close-btn" onclick={onClose} aria-label="Close">&times;</button>
    <div class="title">PLOT JOURNEY</div>

    <form onsubmit={submit}>
      <div class="field-row">
        <label class="quadrant-field" for="from-quadrant">From quadrant (optional)</label>
        <label class="system-field" for="from-system">From system</label>
        <select id="from-quadrant" class="quadrant-field" bind:value={fromQuadrantId}>
          <option value="">All quadrants</option>
          {#each data.quadrants as quadrant (quadrant.id)}
            <option value={quadrant.id}>{quadrant.name}</option>
          {/each}
        </select>
        <select id="from-system" class="system-field" bind:value={fromSystemId} required>
          <option value="" disabled>Select a system&hellip;</option>
          {#each fromSystemOptions as system (system.id)}
            <option value={system.id}>{system.name}</option>
          {/each}
        </select>
      </div>

      <div class="field-row">
        <label class="quadrant-field" for="to-quadrant">To quadrant (optional)</label>
        <label class="system-field" for="to-system">To system</label>
        <select id="to-quadrant" class="quadrant-field" bind:value={toQuadrantId}>
          <option value="">All quadrants</option>
          {#each data.quadrants as quadrant (quadrant.id)}
            <option value={quadrant.id}>{quadrant.name}</option>
          {/each}
        </select>
        <select id="to-system" class="system-field" bind:value={toSystemId} required>
          <option value="" disabled>Select a destination&hellip;</option>
          {#each toSystemOptions as system (system.id)}
            <option value={system.id}>{system.name}</option>
          {/each}
        </select>
      </div>

      {#if toSystem}
        <label>
          <span>Destination point (optional)</span>
          <select bind:value={targetNavPointId}>
            <option value="">Anywhere in system</option>
            {#each toSystem.navPoints as np (np.id)}
              <option value={np.id}>{np.label}{np.baseName ? `: ${np.baseName}` : ''}</option>
            {/each}
          </select>
        </label>
      {/if}

      <label class="checkbox-row">
        <input type="checkbox" bind:checked={refuelEnabled} />
        <span>Land for fuel within six jumps</span>
      </label>

      <button type="submit" class="plot-btn">PLOT ROUTE</button>
    </form>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .dialog {
    position: relative;
    min-width: 320px;
    max-width: 460px;
    background: var(--panel-bg);
    border: 1px solid var(--border-cyan);
    box-shadow: 0 0 10px rgba(60, 180, 255, 0.35), inset 0 0 20px rgba(0, 60, 90, 0.3);
    color: var(--text-cyan-bright);
    padding: 20px 24px;
  }
  .title {
    font-family: var(--font-display);
    font-size: 14px;
    color: var(--grid-red);
    text-shadow: 0 0 6px rgba(255, 60, 60, 0.6);
    letter-spacing: 1px;
    margin-bottom: 16px;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 16px;
    color: var(--text-cyan);
  }
  .field-row {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    column-gap: 10px;
    row-gap: 4px;
  }
  label.checkbox-row {
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }
  select {
    font-family: var(--font-body);
    font-size: 16px;
    background: rgba(5, 10, 15, 0.85);
    border: 1px solid var(--border-cyan);
    color: var(--text-cyan-bright);
    padding: 6px 8px;
  }
  input[type='checkbox'] {
    accent-color: var(--border-cyan);
  }
  .plot-btn {
    margin-top: 8px;
    border-color: var(--border-cyan);
    color: var(--text-cyan-bright);
    box-shadow: 0 0 8px rgba(60, 180, 255, 0.3);
  }
  .plot-btn:hover {
    background: rgba(77, 200, 255, 0.15);
    color: #fff;
  }
  .close-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 2px 8px;
    font-size: 14px;
    line-height: 1;
  }
</style>
