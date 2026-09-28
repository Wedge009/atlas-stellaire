<script>
  import { slide } from 'svelte/transition';
  import { sidebarCollapsed, collapsedQuadrants } from '../stores/ui.js';
  import { t, availableLocales } from '../i18n/index.js';

  let {
    data,
    selectedSystemId,
    topView,
    onSelect,
    onShowSector,
    onShowAbout,
    onShowLanguage,
    onPlotJourney,
    onSearch,
  } = $props();

  function selectSystem(id) {
    onSelect(id);
    if (window.innerWidth < 768) $sidebarCollapsed = true;
  }

  function toggleQuadrant(id) {
    $collapsedQuadrants = $collapsedQuadrants.includes(id)
      ? $collapsedQuadrants.filter((qid) => qid !== id)
      : [...$collapsedQuadrants, id];
  }
</script>

<nav class="sector-nav" class:collapsed={$sidebarCollapsed}>
  <button
    type="button"
    class="collapse-toggle primary"
    aria-label={$sidebarCollapsed ? $t('nav.expandSidebar') : $t('nav.collapseSidebar')}
    onclick={() => ($sidebarCollapsed = !$sidebarCollapsed)}
  >
    {$sidebarCollapsed ? '»' : '«'}
  </button>
  {#if !$sidebarCollapsed}
    <!-- The sidebar sizes to its content, and CSS can't transition to or
         from an auto width, so Svelte's slide measures and animates it.
         .nav-content keeps its natural width while .nav-clip clips it, so
         the text doesn't re-wrap mid-slide. -->
    <div class="nav-clip" transition:slide={{ axis: 'x', duration: 150 }}>
      <div class="nav-content">
        <div class="nav-header">
          <div class="title">{$t('common.geminiSector')}</div>
          <button
            type="button"
            class="sector-map-btn primary caps"
            class:active={topView === 'sector'}
            onclick={() => onShowSector?.()}
          >
            {$t('nav.sectorMap')}
          </button>
          <button type="button" class="plot-journey-btn primary caps" onclick={() => onPlotJourney?.()}>
            {$t('common.plotJourney')}
          </button>
          <button type="button" class="search-btn primary caps" onclick={() => onSearch?.()}>
            {$t('common.search')}
          </button>
        </div>
        <div class="nav-scroll">
          {#each data.quadrants as quadrant (quadrant.id)}
            <div class="quadrant">
              <button
                type="button"
                class="quadrant-name"
                aria-expanded={!$collapsedQuadrants.includes(quadrant.id)}
                aria-label={$collapsedQuadrants.includes(quadrant.id)
                  ? $t('nav.expandQuadrant', { name: quadrant.name })
                  : $t('nav.collapseQuadrant', { name: quadrant.name })}
                onclick={() => toggleQuadrant(quadrant.id)}
              >
                <span class="quadrant-arrow">{$collapsedQuadrants.includes(quadrant.id) ? '▸' : '▾'}</span>
                {quadrant.name}
              </button>
              {#if !$collapsedQuadrants.includes(quadrant.id)}
                <ul>
                  {#each quadrant.systems as system (system.id)}
                    <li>
                      <button
                        type="button"
                        class="system-btn"
                        class:active={system.id === selectedSystemId}
                        onclick={() => selectSystem(system.id)}
                      >
                        {system.name}
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          {/each}
        </div>
        <div class="nav-footer">
          {#if availableLocales.length > 1}
            <button type="button" class="language-btn primary caps" onclick={() => onShowLanguage?.()}>
              {$t('common.language')}
            </button>
          {/if}
          <button type="button" class="about-btn primary caps" onclick={() => onShowAbout?.()}>{$t('common.about')}</button>
        </div>
      </div>
    </div>
  {/if}
</nav>

<style>
  .sector-nav {
    position: relative;
    flex: 0 0 auto;
    height: 100%;
    display: flex;
    background: #05080a;
  }
  .nav-clip {
    display: flex;
    overflow: hidden;
    border-right: 1px solid var(--border-red-dim);
  }
  .nav-content {
    width: max-content;
    max-width: 320px;
    display: flex;
    flex-direction: column;
  }
  .collapse-toggle {
    position: absolute;
    top: 50%;
    right: -1px;
    transform: translate(100%, -50%);
    z-index: 30;
    padding: 6px 8px;
    line-height: 1;
  }
  .collapsed .collapse-toggle {
    right: auto;
    left: 0;
    transform: translateY(-50%);
  }
  .nav-header {
    flex: 0 0 auto;
    padding: 12px 10px 0;
  }
  .nav-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 0 10px 12px;
  }
  .nav-footer {
    flex: 0 0 auto;
    padding: 10px;
    border-top: 1px solid var(--border-red-dim);
  }
  .language-btn {
    display: block;
    width: 100%;
    margin-bottom: 8px;
  }
  .about-btn {
    display: block;
    width: 100%;
  }
  .title {
    font-family: var(--font-display);
    font-size: var(--font-size-heading);
    font-weight: bold;
    color: var(--grid-red);
    text-shadow: var(--text-glow-red);
    margin-bottom: 14px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .sector-map-btn {
    display: block;
    width: 100%;
    margin-bottom: 8px;
  }
  .plot-journey-btn {
    display: block;
    width: 100%;
    margin-bottom: 8px;
  }
  .search-btn {
    display: block;
    width: 100%;
    margin-bottom: 16px;
  }
  .quadrant { margin-bottom: 16px; }
  .quadrant-name {
    display: block;
    width: 100%;
    text-align: left;
    font-family: var(--font-display);
    font-size: var(--font-size-heading);
    color: var(--text-amber);
    padding: 0;
    margin-bottom: 6px;
    letter-spacing: 1px;
    cursor: pointer;
  }
  .quadrant-name:hover { color: var(--text-emphasis); }
  .quadrant-arrow {
    display: inline-block;
    width: 1em;
  }
  ul { list-style: none; margin: 0; padding: 0; }
  li { margin-bottom: 3px; }
  .system-btn {
    display: block;
    width: 100%;
    text-align: left;
    font-family: var(--font-body);
    font-size: var(--font-size-button-small);
    padding: 4px 8px;
    border: 1px solid transparent;
    color: var(--text-cyan);
    cursor: pointer;
  }
  .system-btn:hover { color: var(--text-emphasis); background: var(--highlight-hover); }
  .system-btn.active {
    color: var(--text-emphasis);
    background: var(--highlight-selected);
    border-color: var(--border-cyan);
  }
</style>
