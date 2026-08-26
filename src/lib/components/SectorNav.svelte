<script>
  let { data, selectedSystemId, topView, onSelect, onShowSector } = $props();
</script>

<nav class="sector-nav">
  <div class="title">GEMINI SECTOR</div>
  <button
    type="button"
    class="sector-map-btn"
    class:active={topView === 'sector'}
    onclick={() => onShowSector?.()}
  >
    SECTOR MAP
  </button>
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
              onclick={() => onSelect(system.id)}
            >
              {system.name}
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/each}
</nav>

<style>
  .sector-nav {
    width: 220px;
    height: 100%;
    overflow-y: auto;
    background: #05080a;
    border-right: 1px solid #331515;
    padding: 12px 10px;
  }
  .title {
    font-family: var(--font-display);
    font-size: 12px;
    color: var(--grid-red);
    text-shadow: 0 0 6px rgba(255, 60, 60, 0.6);
    margin-bottom: 14px;
    letter-spacing: 1px;
  }
  .sector-map-btn {
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
