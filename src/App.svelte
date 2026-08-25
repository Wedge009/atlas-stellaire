<script>
  import geminiData from './lib/data/gemini.json';
  import SectorNav from './lib/components/SectorNav.svelte';
  import SystemView from './lib/components/SystemView.svelte';
  import { findSystem } from './lib/utils/navPoints.js';

  let selectedSystemId = $state('troy');
  let system = $derived(findSystem(geminiData, selectedSystemId));
</script>

<main>
  <SectorNav data={geminiData} {selectedSystemId} onSelect={(id) => (selectedSystemId = id)} />
  <div class="main-view">
    {#if system}
      {#key system.id}
        <SystemView {system} />
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
