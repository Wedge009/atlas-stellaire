<script>
  import Dialog from './Dialog.svelte';
  import GameTabs from './GameTabs.svelte';
  import { commoditiesForBase } from '../data/commodities.js';
  import { game } from '../stores/game.js';
  import { t } from '../i18n/index.js';

  let { baseType, baseLabel, onClose } = $props();

  let items = $derived(commoditiesForBase($game, baseType) ?? []);

  // Not persisted (unlike the game) - it's a transient viewing
  // preference, reset each time the dialogue is reopened.
  let sortColumn = $state(null); // 'name' | 'low' | 'high' | 'stock' | null (source order)
  let sortDirection = $state('asc');

  let sortedItems = $derived(
    sortColumn
      ? [...items].sort((a, b) => {
          const dir = sortDirection === 'asc' ? 1 : -1;
          // `stock` is only set on rows sold here; the rest sort below 0%
          return sortColumn === 'name'
            ? a.name.localeCompare(b.name) * dir
            : ((a[sortColumn] ?? -1) - (b[sortColumn] ?? -1)) * dir;
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
</script>

<Dialog title={$t('commoditiesDialog.title', { base: baseLabel })} label={$t('common.commodities')} {onClose} fillWidth maxWidth="560px">
  <GameTabs />

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
          <th class="col-price">
            <button type="button" class="sort-btn" onclick={() => toggleSort('stock')}>
              {$t('commoditiesDialog.stock')}
              <span class="sort-arrow" class:visible={sortColumn === 'stock'}>{sortDirection === 'asc' ? '▲' : '▼'}</span>
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
            <td class="col-price">{item.sold ? `${item.stock}%` : '–'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="legend">{$t('commoditiesDialog.soldHereNote')}</div>
</Dialog>

<style>
  .table-wrap {
    max-height: 360px;
    overflow-y: auto;
    border: 1px solid var(--border-cyan);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-body-secondary);
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
    font-size: var(--font-size-body-secondary);
    text-align: left;
    color: var(--text-amber);
    font-weight: normal;
    padding: 6px 10px;
    cursor: pointer;
    /* keep the sort arrow beside its label rather than wrapping below it */
    white-space: nowrap;
  }
  .sort-btn:hover { color: var(--text-emphasis); }
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
    color: var(--text-emphasis);
    background: var(--highlight-mark);
  }
  .col-price { text-align: right; }
  .legend {
    margin-top: 10px;
    padding: 4px 8px;
    font-size: var(--font-size-caption);
    color: var(--text-emphasis);
    background: var(--highlight-mark);
  }
</style>
