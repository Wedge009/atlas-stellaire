<script>
  import { commoditiesForBase } from '../data/commodities.js';
  import { lastCommoditiesRuleset } from '../stores/commodities.js';
  import { t } from '../i18n/index.js';

  let { baseType, baseLabel, onClose } = $props();

  // Game titles are proper nouns, so are not translated.
  const RULESETS = [
    { id: 'privateer', label: 'Privateer' },
    { id: 'righteousFire', label: 'Righteous Fire' },
  ];

  let items = $derived(commoditiesForBase($lastCommoditiesRuleset, baseType) ?? []);

  // Not persisted (unlike the rule-set tab) - it's a transient viewing
  // preference, reset each time the dialogue is reopened.
  let sortColumn = $state(null); // 'name' | 'low' | 'high' | null (source order)
  let sortDirection = $state('asc');

  let sortedItems = $derived(
    sortColumn
      ? [...items].sort((a, b) => {
          const dir = sortDirection === 'asc' ? 1 : -1;
          return sortColumn === 'name'
            ? a.name.localeCompare(b.name) * dir
            : (a[sortColumn] - b[sortColumn]) * dir;
        })
      : items
  );

  function toggleSort(column) {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'asc';
    }
  }

  function onKeydown(e) {
    if (e.key === 'Escape') onClose?.();
  }

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) onClose?.();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="backdrop" role="presentation" onclick={onBackdropClick}>
  <div class="dialog" role="dialog" aria-modal="true" aria-label={$t('common.commodities')}>
    <button type="button" class="close-btn" onclick={onClose} aria-label={$t('common.close')}>&times;</button>
    <div class="title">{$t('commoditiesDialog.title', { base: baseLabel })}</div>

    <div class="tabs" role="tablist">
      {#each RULESETS as ruleset (ruleset.id)}
        <button
          type="button"
          role="tab"
          aria-selected={$lastCommoditiesRuleset === ruleset.id}
          class="tab"
          class:active={$lastCommoditiesRuleset === ruleset.id}
          onclick={() => lastCommoditiesRuleset.set(ruleset.id)}
        >
          {ruleset.label}
        </button>
      {/each}
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="col-name">
              <button type="button" class="sort-btn" onclick={() => toggleSort('name')}>
                {$t('commoditiesDialog.commodity')}
                <span class="sort-arrow" class:visible={sortColumn === 'name'}>{sortDirection === 'asc' ? '▲' : '▼'}</span>
              </button>
            </th>
            <th class="col-price">
              <button type="button" class="sort-btn" onclick={() => toggleSort('low')}>
                {$t('commoditiesDialog.low')}
                <span class="sort-arrow" class:visible={sortColumn === 'low'}>{sortDirection === 'asc' ? '▲' : '▼'}</span>
              </button>
            </th>
            <th class="col-price">
              <button type="button" class="sort-btn" onclick={() => toggleSort('high')}>
                {$t('commoditiesDialog.high')}
                <span class="sort-arrow" class:visible={sortColumn === 'high'}>{sortDirection === 'asc' ? '▲' : '▼'}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each sortedItems as item (item.name)}
            <tr class:sold={item.sold}>
              <td class="col-name">{item.name}</td>
              <td class="col-price">{item.low}</td>
              <td class="col-price">{item.high}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="legend">{$t('commoditiesDialog.soldHereNote')}</div>
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
  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 12px;
  }
  .tab {
    flex: 1;
    font-family: var(--font-body);
    font-size: 15px;
    background: transparent;
    border: 1px solid var(--border-cyan);
    color: var(--text-cyan);
    box-shadow: none;
    padding: 6px 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .tab:hover { color: #fff; }
  .tab.active {
    color: #fff;
    background: rgba(77, 200, 255, 0.18);
    box-shadow: 0 0 8px rgba(60, 180, 255, 0.3);
  }
  .table-wrap {
    max-height: 360px;
    overflow-y: auto;
    border: 1px solid var(--border-cyan);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 15px;
  }
  thead {
    position: sticky;
    top: 0;
    background: var(--panel-bg);
  }
  th {
    text-align: left;
    padding: 0;
    border-bottom: 1px solid var(--border-cyan);
  }
  .sort-btn {
    display: block;
    width: 100%;
    font-family: var(--font-body);
    font-size: 15px;
    text-align: left;
    color: var(--text-amber);
    font-weight: normal;
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 6px 10px;
    cursor: pointer;
  }
  .sort-btn:hover { color: #fff; }
  .col-price .sort-btn { text-align: right; }
  .sort-arrow {
    display: inline-block;
    width: 1em;
    font-size: 11px;
    visibility: hidden;
  }
  .sort-arrow.visible { visibility: visible; }
  td {
    padding: 4px 10px;
    color: var(--text-cyan);
    border-bottom: 1px solid rgba(77, 200, 255, 0.1);
  }
  tr.sold td {
    color: #fff;
    background: rgba(77, 200, 255, 0.12);
  }
  .col-price { text-align: right; }
  .legend {
    margin-top: 10px;
    padding: 4px 8px;
    font-size: 13px;
    color: #fff;
    background: rgba(77, 200, 255, 0.12);
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
