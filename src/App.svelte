<script>
  import geminiData from './lib/data/gemini.json';
  import SectorNav from './lib/components/SectorNav.svelte';
  import SystemView from './lib/components/SystemView.svelte';
  import SectorMap from './lib/components/SectorMap.svelte';
  import { findSystem } from './lib/utils/navPoints.js';

  let selectedSystemId = $state(null);
  let topView = $state('sector'); // 'system' | 'sector'
  let system = $derived(findSystem(geminiData, selectedSystemId));

  function goToSystem(id) {
    if (findSystem(geminiData, id)) {
      selectedSystemId = id;
      topView = 'system';
    }
  }
</script>

<main>
  <SectorNav
    data={geminiData}
    {selectedSystemId}
    {topView}
    onSelect={goToSystem}
    onShowSector={() => (topView = 'sector')}
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
</style>
