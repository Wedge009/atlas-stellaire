<script>
  import { get } from 'svelte/store';
  import Dialog from './Dialog.svelte';
  import { locale, availableLocales, t } from '../i18n/index.js';

  let { onClose } = $props();

  let selected = $state(get(locale));

  function apply(e) {
    e.preventDefault();
    locale.set(selected);
    onClose?.();
  }
</script>

<Dialog title={$t('common.language')} {onClose} minWidth="280px" maxWidth="420px">
  <form onsubmit={apply}>
    <label>
      <span>{$t('language.selectLabel')}</span>
      <select bind:value={selected}>
        {#each availableLocales as l (l.code)}
          <option value={l.code}>{l.label}</option>
        {/each}
      </select>
    </label>

    <button type="submit" class="apply-btn primary caps">{$t('common.apply')}</button>
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
  .apply-btn {
    margin-top: 8px;
  }
</style>
