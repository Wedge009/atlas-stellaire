<script>
  import { searchableEntries, searchEntries } from '../utils/navPoints.js';
  import { t } from '../i18n/index.js';

  let { data, onSelect, onClose } = $props();

  // Focuses the query field as soon as it's mounted, without tripping the
  // a11y-auto-focus lint rule (this dialogue only exists once the user has
  // explicitly opened it via the SEARCH button).
  function autofocus(node) {
    node.focus();
  }

  let entries = $derived(searchableEntries(data));
  let query = $state('');
  let results = $derived(searchEntries(entries, query));
  let activeIndex = $state(-1);

  // Any change to the result set invalidates whatever was previously highlighted.
  $effect(() => {
    results;
    activeIndex = -1;
  });

  function goTo(entry) {
    if (!entry) return;
    onSelect?.(entry.systemId);
    onClose?.();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      onClose?.();
    } else if (e.key === 'ArrowDown') {
      if (results.length) {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % results.length;
      }
    } else if (e.key === 'ArrowUp') {
      if (results.length) {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + results.length) % results.length;
      }
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) goTo(results[activeIndex]);
    }
  }

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) onClose?.();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="backdrop" role="presentation" onclick={onBackdropClick}>
  <div class="dialog" role="dialog" aria-modal="true" aria-label={$t('common.search')}>
    <button type="button" class="close-btn" onclick={onClose} aria-label={$t('common.close')}>&times;</button>
    <div class="title">{$t('common.search')}</div>

    <input
      type="text"
      class="query-field"
      placeholder={$t('searchDialog.placeholder')}
      use:autofocus
      bind:value={query}
    />

    {#if query.trim()}
      <ul class="results">
        {#each results as entry, i (entry.id)}
          <li>
            <button
              type="button"
              class="result-item"
              class:active={i === activeIndex}
              onclick={() => (activeIndex = i)}
              ondblclick={() => goTo(entry)}
            >
              <span class="result-name">{entry.name}</span>
              <span class="result-subtitle">
                {#if entry.kind === 'system'}
                  {$t('searchDialog.systemSubtitle', { quadrant: entry.quadrantName })}
                {:else}
                  {$t('searchDialog.baseSubtitle', { system: entry.systemName, quadrant: entry.quadrantName })}
                {/if}
              </span>
            </button>
          </li>
        {:else}
          <li class="no-results">{$t('searchDialog.noMatches')}</li>
        {/each}
      </ul>
    {/if}

    <button type="button" class="go-btn" disabled={activeIndex < 0} onclick={() => goTo(results[activeIndex])}>
      {$t('searchDialog.goTo')}
    </button>
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
    width: 100%;
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
  .query-field {
    display: block;
    width: 100%;
    font-family: var(--font-body);
    font-size: 18px;
    background: rgba(5, 10, 15, 0.85);
    border: 1px solid var(--border-cyan);
    color: var(--text-cyan-bright);
    padding: 8px 10px;
  }
  .query-field:focus {
    outline: none;
    box-shadow: 0 0 6px rgba(60, 180, 255, 0.5);
  }
  .results {
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
    max-height: 320px;
    overflow-y: auto;
    border: 1px solid var(--border-cyan);
  }
  .result-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    text-align: left;
    font-family: var(--font-body);
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(77, 200, 255, 0.15);
    box-shadow: none;
    color: var(--text-cyan);
    padding: 6px 10px;
    cursor: pointer;
  }
  li:last-child .result-item { border-bottom: none; }
  .result-item:hover { color: #fff; background: rgba(77, 200, 255, 0.08); }
  .result-item.active {
    color: #fff;
    background: rgba(77, 200, 255, 0.18);
  }
  .result-name { font-size: 17px; }
  .result-subtitle {
    font-size: 13px;
    color: var(--text-amber);
    letter-spacing: 0.5px;
  }
  .no-results {
    padding: 10px;
    font-size: 15px;
    color: var(--text-cyan);
    opacity: 0.7;
  }
  .go-btn {
    display: block;
    width: 100%;
    margin-top: 16px;
    border-color: var(--border-cyan);
    color: var(--text-cyan-bright);
    box-shadow: 0 0 8px rgba(60, 180, 255, 0.3);
    text-transform: uppercase;
  }
  .go-btn:hover:not(:disabled) {
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
