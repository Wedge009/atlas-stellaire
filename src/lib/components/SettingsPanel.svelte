<script>
  import {
    showHidden,
    jumpTransitionEnabled,
    skyboxEnabled,
    encounterMode,
    idleRotationEnabled,
    baseModelStyle,
    jumpPointStyle,
  } from '../stores/settings.js';

  // The whole menu is locked shut while the 3D<->2D alignment flight
  // animation is actually in progress - rebuilding a toggled setting's
  // effect (eg the node meshes) mid-flight would fight the running
  // animation. Safe again as soon as it settles into either end state.
  let { locked = false } = $props();

  let open = $state(false);
  let root;

  $effect(() => {
    if (locked) open = false;
  });

  function onWindowClick(e) {
    if (open && root && !root.contains(e.target)) open = false;
  }
  function onWindowKeydown(e) {
    if (e.key === 'Escape') open = false;
  }
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<div class="settings" bind:this={root}>
  <button
    type="button"
    class:active={open}
    disabled={locked}
    title={locked ? 'Wait for the alignment animation to finish' : undefined}
    onclick={() => (open = !open)}
  >
    SETTINGS
  </button>
  {#if open}
    <div class="panel">
      <div class="group-label">Global</div>

      <label class="checkbox-row">
        <input type="checkbox" checked={$showHidden} onchange={() => showHidden.update((v) => !v)} />
        <span>Show hidden points</span>
      </label>
      <label class="checkbox-row">
        <input
          type="checkbox"
          checked={$jumpTransitionEnabled}
          onchange={() => jumpTransitionEnabled.update((v) => !v)}
        />
        <span>Jump transition</span>
      </label>
      <label class="checkbox-row">
        <input type="checkbox" checked={$skyboxEnabled} onchange={() => skyboxEnabled.update((v) => !v)} />
        <span>Background sprites</span>
      </label>
      <label class="select-row">
        <span>Ship encounters</span>
        <select value={$encounterMode} onchange={(e) => encounterMode.set(e.currentTarget.value)}>
          <option value="none">None</option>
          <option value="sprites">Sprites</option>
          <option value="models">Models</option>
        </select>
      </label>

      <div class="group-label">3D View</div>

      <label class="checkbox-row">
        <input
          type="checkbox"
          checked={$idleRotationEnabled}
          onchange={() => idleRotationEnabled.update((v) => !v)}
        />
        <span>Idle rotation</span>
      </label>
      <label class="select-row">
        <span>Bases</span>
        <select value={$baseModelStyle} onchange={(e) => baseModelStyle.set(e.currentTarget.value)}>
          <option value="none">None</option>
          <option value="models">Models</option>
        </select>
      </label>
      <label class="select-row">
        <span>Jump points</span>
        <select value={$jumpPointStyle} onchange={(e) => jumpPointStyle.set(e.currentTarget.value)}>
          <option value="none">None</option>
          <option value="sprites">Sprites</option>
          <option value="models">Models</option>
        </select>
      </label>
    </div>
  {/if}
</div>

<style>
  .settings {
    position: relative;
  }
  .panel {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    background: var(--panel-bg);
    border: 1px solid #2a4a55;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    white-space: nowrap;
    color: var(--text-cyan);
    font-size: 16px;
    z-index: 20;
  }
  .group-label {
    font-size: 13px;
    letter-spacing: 1px;
    color: #5a8a99;
    text-transform: uppercase;
    border-bottom: 1px solid #2a4a55;
    padding-bottom: 3px;
    margin-top: 4px;
  }
  .group-label:first-child {
    margin-top: 0;
  }
  label.checkbox-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }
  label.select-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  input[type='checkbox'] {
    appearance: none;
    width: 16px;
    height: 16px;
    margin: 0;
    background: rgba(5, 10, 15, 0.85);
    border: 1px solid var(--border-cyan);
    display: inline-grid;
    place-content: center;
    cursor: pointer;
  }
  input[type='checkbox']::before {
    content: '';
    width: 12px;
    height: 12px;
    background: var(--border-cyan);
    transform: scale(0);
    transition: transform 0.1s ease-in-out;
  }
  input[type='checkbox']:checked::before {
    transform: scale(1);
  }
  select {
    background: rgba(5, 10, 15, 0.85);
    color: var(--text-cyan);
    border: 1px solid var(--border-cyan);
    font: inherit;
    font-size: 14px;
    padding: 2px 4px;
    cursor: pointer;
  }
</style>
