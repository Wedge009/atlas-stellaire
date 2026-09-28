<script>
  import Dialog from './Dialog.svelte';
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

  // Escape is handled by Dialog.
  function onKeydown(e) {
    if (e.key === 'ArrowDown') {
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
</script>

<Dialog title={$t('common.search')} {onClose} {onKeydown} fillWidth>
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

  <button type="button" class="go-btn primary caps" disabled={activeIndex < 0} onclick={() => goTo(results[activeIndex])}>
    {$t('searchDialog.goTo')}
  </button>
</Dialog>

<style>
  .query-field {
    display: block;
    width: 100%;
    font-family: var(--font-body);
    font-size: var(--font-size-body);
    background: var(--control-bg);
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
    font-weight: normal;
    border-bottom: 1px solid var(--highlight-active);
    color: var(--text-cyan);
    padding: 6px 10px;
    cursor: pointer;
  }
  li:last-child .result-item { border-bottom: none; }
  .result-item:hover { color: var(--text-emphasis); background: var(--highlight-hover); }
  .result-item.active {
    color: var(--text-emphasis);
    background: var(--highlight-selected);
  }
  .result-name { font-size: var(--font-size-body); }
  .result-subtitle {
    font-size: var(--font-size-caption);
    color: var(--text-amber);
    letter-spacing: 0.5px;
  }
  .no-results {
    padding: 10px;
    font-size: var(--font-size-body-secondary);
    color: var(--text-cyan);
    opacity: 0.7;
  }
  .go-btn {
    display: block;
    width: 100%;
    margin-top: 16px;
  }
</style>
