<script>
  import {
    showHidden,
    showGridLines,
    jumpTransitionEnabled,
    skyboxEnabled,
    encounterMode,
    idleRotationEnabled,
    baseModelStyle,
    jumpPointStyle,
  } from '../stores/settings.js';
  import { t } from '../i18n/index.js';

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
    class="primary caps"
    class:active={open}
    disabled={locked}
    title={locked ? $t('settings.waitForAnimation') : undefined}
    onclick={() => (open = !open)}
  >
    {$t('settings.button')}
  </button>
  {#if open}
    <div class="panel">
      <div class="group-label">{$t('settings.global')}</div>

      <label class="checkbox-row">
        <input type="checkbox" checked={$showHidden} onchange={() => showHidden.update((v) => !v)} />
        <span>{$t('settings.showHiddenPoints')}</span>
      </label>
      <label class="checkbox-row">
        <input type="checkbox" checked={$showGridLines} onchange={() => showGridLines.update((v) => !v)} />
        <span>{$t('settings.showGridLines')}</span>
      </label>
      <label class="checkbox-row">
        <input
          type="checkbox"
          checked={$jumpTransitionEnabled}
          onchange={() => jumpTransitionEnabled.update((v) => !v)}
        />
        <span>{$t('settings.jumpTransition')}</span>
      </label>
      <label class="checkbox-row">
        <input type="checkbox" checked={$skyboxEnabled} onchange={() => skyboxEnabled.update((v) => !v)} />
        <span>{$t('settings.backgroundSprites')}</span>
      </label>
      <label class="select-row">
        <span>{$t('common.shipEncounters')}</span>
        <select value={$encounterMode} onchange={(e) => encounterMode.set(e.currentTarget.value)}>
          <option value="none">{$t('common.none')}</option>
          <option value="sprites">{$t('settings.sprites')}</option>
          <option value="models">{$t('settings.models')}</option>
        </select>
      </label>

      <div class="group-label">{$t('common.view3d')}</div>

      <label class="checkbox-row">
        <input
          type="checkbox"
          checked={$idleRotationEnabled}
          onchange={() => idleRotationEnabled.update((v) => !v)}
        />
        <span>{$t('settings.idleRotation')}</span>
      </label>
      <label class="select-row">
        <span>{$t('common.bases')}</span>
        <select value={$baseModelStyle} onchange={(e) => baseModelStyle.set(e.currentTarget.value)}>
          <option value="none">{$t('common.none')}</option>
          <option value="models">{$t('settings.models')}</option>
        </select>
      </label>
      <label class="select-row">
        <span>{$t('settings.jumpPoints')}</span>
        <select value={$jumpPointStyle} onchange={(e) => jumpPointStyle.set(e.currentTarget.value)}>
          <option value="none">{$t('common.none')}</option>
          <option value="sprites">{$t('settings.sprites')}</option>
          <option value="models">{$t('settings.models')}</option>
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
    border: 1px solid var(--border-dim);
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    white-space: nowrap;
    color: var(--text-cyan);
    font-size: var(--font-size-body-secondary);
    z-index: 20;
  }
  .group-label {
    letter-spacing: 1px;
    color: var(--text-label);
    text-transform: uppercase;
    border-bottom: 1px solid var(--border-dim);
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
  select {
    background: var(--control-bg);
    color: var(--text-cyan);
    border: 1px solid var(--border-cyan);
    font: inherit;
    font-size: var(--font-size-small);
    padding: 2px 4px;
    cursor: pointer;
  }
</style>
