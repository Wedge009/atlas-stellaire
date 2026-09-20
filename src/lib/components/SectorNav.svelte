<script>
  import { sidebarCollapsed } from '../stores/ui.js';
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
</script>

<nav class="sector-nav" class:collapsed={$sidebarCollapsed}>
  <button
    type="button"
    class="collapse-toggle"
    aria-label={$sidebarCollapsed ? $t('nav.expandSidebar') : $t('nav.collapseSidebar')}
    onclick={() => ($sidebarCollapsed = !$sidebarCollapsed)}
  >
    {$sidebarCollapsed ? '»' : '«'}
  </button>
  {#if !$sidebarCollapsed}
    <div class="nav-header">
      <div class="title">{$t('common.geminiSector')}</div>
      <button
        type="button"
        class="sector-map-btn caps"
        class:active={topView === 'sector'}
        onclick={() => onShowSector?.()}
      >
        {$t('nav.sectorMap')}
      </button>
      <button type="button" class="plot-journey-btn caps" onclick={() => onPlotJourney?.()}>
        {$t('common.plotJourney')}
      </button>
      <button type="button" class="search-btn caps" onclick={() => onSearch?.()}>
        {$t('common.search')}
      </button>
    </div>
    <div class="nav-scroll">
      {#each data.quadrants as quadrant (quadrant.id)}
        <div class="quadrant">
          <div class="quadrant-name">{quadrant.name}</div>
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
        </div>
      {/each}
    </div>
    <div class="nav-footer">
      {#if availableLocales.length > 1}
        <button type="button" class="language-btn caps" onclick={() => onShowLanguage?.()}>
          {$t('common.language')}
        </button>
      {/if}
      <button type="button" class="about-btn caps" onclick={() => onShowAbout?.()}>{$t('common.about')}</button>
    </div>
  {/if}
</nav>

<style>
  .sector-nav {
    position: relative;
    width: 220px;
    flex: 0 0 auto;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #05080a;
    border-right: 1px solid #331515;
    transition: width 0.15s ease;
  }
  .sector-nav.collapsed {
    width: 0;
    border-right: none;
  }
  .collapse-toggle {
    position: absolute;
    top: 50%;
    right: -1px;
    transform: translate(100%, -50%);
    z-index: 30;
    padding: 6px 8px;
    font-size: 12px;
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
    border-top: 1px solid #331515;
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
    font-size: 12px;
    color: var(--grid-red);
    text-shadow: 0 0 6px rgba(255, 60, 60, 0.6);
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
    font-family: var(--font-display);
    font-size: 12px;
    color: var(--text-amber);
    margin-bottom: 6px;
    letter-spacing: 1px;
  }
  ul { list-style: none; margin: 0; padding: 0; }
  li { margin-bottom: 3px; }
  .system-btn {
    display: block;
    width: 100%;
    text-align: left;
    font-family: var(--font-body);
    font-size: 16px;
    padding: 4px 8px;
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-cyan);
    box-shadow: none;
    cursor: pointer;
  }
  .system-btn:hover { color: #fff; background: rgba(77, 200, 255, 0.08); }
  .system-btn.active {
    color: #fff;
    background: rgba(77, 200, 255, 0.18);
    border-color: var(--border-cyan);
  }
</style>
