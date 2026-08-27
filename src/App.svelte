<script>
  import { onMount } from 'svelte';
  import SectorNav from './lib/components/SectorNav.svelte';
  import SystemView from './lib/components/SystemView.svelte';
  import SectorMap from './lib/components/SectorMap.svelte';
  import About from './lib/components/About.svelte';
  import { findSystem } from './lib/utils/navPoints.js';

  let geminiData = $state(null);
  let selectedSystemId = $state(null);
  let topView = $state('sector'); // 'system' | 'sector'
  let showAbout = $state(false);
  let system = $derived(geminiData ? findSystem(geminiData, selectedSystemId) : null);

  onMount(async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}data/gemini.json`);
    geminiData = await res.json();
  });

  function goToSystem(id) {
    if (geminiData && findSystem(geminiData, id)) {
      selectedSystemId = id;
      topView = 'system';
    }
  }
</script>

<main>
  {#if geminiData}
    <SectorNav
      data={geminiData}
      {selectedSystemId}
      {topView}
      onSelect={goToSystem}
      onShowSector={() => (topView = 'sector')}
      onShowAbout={() => (showAbout = true)}
    />
    <div class="main-view">
      {#if topView === 'sector'}
        <SectorMap data={geminiData} {selectedSystemId} onSelect={goToSystem} />
      {:else if system}
        {#key system.id}
          <SystemView {system} data={geminiData} onJump={goToSystem} />
        {/key}
      {/if}
    </div>
  {:else}
    <div class="loading">LOADING SECTOR DATA&hellip;</div>
  {/if}
  {#if showAbout}
    <About onClose={() => (showAbout = false)} />
  {/if}
</main>

<style>
  main {
    display: flex;
    width: 100vw;
    height: 100vh;
  }
  .main-view {
    flex: 1;
    position: relative;
    overflow: hidden;
  }
  .loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    font-family: var(--font-display);
    color: var(--text-cyan);
    letter-spacing: 1px;
    text-shadow: 0 0 6px rgba(100, 200, 255, 0.5);
  }
</style>
