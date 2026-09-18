<script>
  import { get } from 'svelte/store';
  import { locale, availableLocales, t } from '../i18n/index.js';

  let { onClose } = $props();

  let selected = $state(get(locale));

  function onKeydown(e) {
    if (e.key === 'Escape') onClose?.();
  }

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) onClose?.();
  }

  function apply(e) {
    e.preventDefault();
    locale.set(selected);
    onClose?.();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="backdrop" role="presentation" onclick={onBackdropClick}>
  <div class="dialog" role="dialog" aria-modal="true" aria-label={$t('common.language')}>
    <button type="button" class="close-btn" onclick={onClose} aria-label={$t('common.close')}>&times;</button>
    <div class="title">{$t('common.language')}</div>

    <form onsubmit={apply}>
      <label>
        <span>{$t('language.selectLabel')}</span>
        <select bind:value={selected}>
          {#each availableLocales as l (l.code)}
            <option value={l.code}>{l.label}</option>
          {/each}
        </select>
      </label>

      <button type="submit" class="apply-btn">{$t('language.apply')}</button>
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
    min-width: 280px;
    max-width: 420px;
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
    text-transform: uppercase;
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
  select {
    font-family: var(--font-body);
    font-size: 16px;
    background: rgba(5, 10, 15, 0.85);
    border: 1px solid var(--border-cyan);
    color: var(--text-cyan-bright);
    padding: 6px 8px;
  }
  .apply-btn {
    margin-top: 8px;
    border-color: var(--border-cyan);
    color: var(--text-cyan-bright);
    box-shadow: 0 0 8px rgba(60, 180, 255, 0.3);
    text-transform: uppercase;
  }
  .apply-btn:hover {
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
