<script>
  import { onMount } from 'svelte';
  import SectorNav from './lib/components/SectorNav.svelte';
  import SystemView from './lib/components/SystemView.svelte';
  import SectorMap from './lib/components/SectorMap.svelte';
  import About from './lib/components/About.svelte';
  import PlotJourneyDialog from './lib/components/PlotJourneyDialog.svelte';
  import JourneyPanel from './lib/components/JourneyPanel.svelte';
  import { findSystem } from './lib/utils/navPoints.js';
  import { journey } from './lib/stores/journey.js';

  let geminiData = $state(null);
  let selectedSystemId = $state(null);
  let topView = $state('sector'); // 'system' | 'sector'
  let showAbout = $state(false);
  let showPlotJourney = $state(false);
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
      onPlotJourney={() => (showPlotJourney = true)}
    />
    <div class="main-view">
      {#if topView === 'sector'}
        <SectorMap data={geminiData} {selectedSystemId} onSelect={goToSystem} />
      {:else if system}
        {#key system.id}
          <SystemView {system} data={geminiData} onJump={goToSystem} />
        {/key}
      {/if}
      {#if $journey}
        <div class="journey-overlay"><JourneyPanel data={geminiData} {selectedSystemId} /></div>
      {/if}
    </div>
  {:else}
    <div class="loading">LOADING SECTOR DATA&hellip;</div>
  {/if}
  {#if showAbout}
    <About onClose={() => (showAbout = false)} />
  {/if}
  {#if showPlotJourney}
    <PlotJourneyDialog
      data={geminiData}
      currentSystemId={selectedSystemId}
      onClose={() => (showPlotJourney = false)}
    />
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
  .journey-overlay {
    position: absolute;
    top: 70px;
    left: 18px;
    z-index: 20;
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
