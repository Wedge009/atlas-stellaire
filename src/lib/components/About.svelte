<script>
  import Dialog from './Dialog.svelte';
  import { t } from '../i18n/index.js';

  let { onClose } = $props();
</script>

<Dialog title="Atlas Stellaire" label={$t('common.about')} {onClose} minWidth="280px" maxWidth="420px">
  <p class="summary">{$t('about.summary')}</p>
  <div class="row">{$t('about.version', { version: __APP_VERSION__, commit: __GIT_COMMIT__ })}</div>
  <div class="row">
    <a href="https://github.com/Wedge009/atlas-stellaire" target="_blank" rel="noopener noreferrer">
      github.com/Wedge009/atlas-stellaire
    </a>
  </div>
</Dialog>

<style>
  .summary {
    color: var(--text-cyan);
    font-size: var(--font-size-body-secondary);
    line-height: 1.4;
    margin: 0 0 14px;
  }
  .row {
    color: var(--text-cyan);
    font-size: var(--font-size-body);
    margin-bottom: 6px;
  }
  .row a {
    color: var(--text-amber);
  }
  .row a:hover {
    color: var(--text-emphasis);
  }
</style>
