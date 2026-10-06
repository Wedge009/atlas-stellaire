<script>
  import { onMount, untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import { get } from 'svelte/store';
  import SectorNav from './lib/components/SectorNav.svelte';
  import SystemView from './lib/components/SystemView.svelte';
  import SectorMap from './lib/components/SectorMap.svelte';
  import About from './lib/components/About.svelte';
  import LanguageDialog from './lib/components/LanguageDialog.svelte';
  import PlotJourneyDialog from './lib/components/PlotJourneyDialog.svelte';
  import SearchDialog from './lib/components/SearchDialog.svelte';
  import StoryMissionDialog from './lib/components/StoryMissionDialog.svelte';
  import JourneyPanel from './lib/components/JourneyPanel.svelte';
  import JumpTransition from './lib/components/JumpTransition.svelte';
  import GameToggle from './lib/components/GameToggle.svelte';
  import { findSystem } from './lib/utils/navPoints.js';
  import { resolveSector } from './lib/utils/games.js';
  import { game } from './lib/stores/game.js';
  import { journey, journeyInputs, plotJourney } from './lib/stores/journey.js';
  import { jumpTransitionEnabled } from './lib/stores/settings.js';
  import { loadStoryMissions, sectorData, lockedByStory } from './lib/stores/storyMission.js';
  import { lastTopView, lastSystemId, journeyPanelPosition } from './lib/stores/ui.js';
  import { draggable } from './lib/actions/draggable.js';
  import { t, locale } from './lib/i18n/index.js';

  // gemini.json as loaded, covering both games, and as the current game
  // sees it at the active story mission - see resolveSector. Everything else
  // only ever gets the latter.
  let rawSectorData = $state.raw(null);
  let geminiData = $derived(rawSectorData ? resolveSector(rawSectorData, $game, $lockedByStory) : null);
  let selectedSystemId = $state(get(lastSystemId));
  let topView = $state(get(lastTopView)); // 'system' | 'sector'
  let showAbout = $state(false);
  let showLanguage = $state(false);
  let showPlotJourney = $state(false);
  let showSearch = $state(false);
  let showStoryMission = $state(false);
  let jumpTarget = $state(null);
  let system = $derived(geminiData ? findSystem(geminiData, selectedSystemId) : null);

  // Keeps the persisted 'last view' synchronised with whatever's currently shown,
  // so a reload can restore it.
  $effect(() => {
    lastTopView.set(topView);
    lastSystemId.set(selectedSystemId);
  });

  // index.html's <html lang> is a static template Vite serves as-is - it
  // can't reference the locale store itself, so this keeps it in sync at
  // run-time for assistive tech and browser features (spell-check, fonts).
  $effect(() => {
    document.documentElement.lang = $locale;
  });

  onMount(async () => {
    // Not awaited - the map doesn't need mission data to show, and any
    // active mission's ships just appear once it arrives.
    loadStoryMissions();
    const res = await fetch(`${import.meta.env.BASE_URL}data/gemini.json`);
    rawSectorData = await res.json();
  });

  // On loading, and on every game or story mission switch: the system being
  // viewed may not exist in this game (Eden is Righteous Fire's) or yet in the
  // story (Delta before Cross A), and a journey is re-plotted from its
  // remembered inputs, the same as after a reload.
  $effect(() => {
    const data = geminiData;
    if (!data) return;
    untrack(() => {
      sectorData.set(data);
      if (topView === 'system' && !findSystem(data, selectedSystemId)) {
        topView = 'sector';
        selectedSystemId = null;
      }
      const savedJourney = get(journeyInputs);
      if (savedJourney) plotJourney(data, savedJourney);
    });
  });

  function goToSystem(id) {
    if (geminiData && findSystem(geminiData, id)) {
      selectedSystemId = id;
      topView = 'system';
    }
  }

  function handleJump(id) {
    if (!$jumpTransitionEnabled) {
      goToSystem(id);
      return;
    }
    // Ignore re-jumps while a transition is already playing.
    if (jumpTarget === null) jumpTarget = id;
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
      onShowLanguage={() => (showLanguage = true)}
      onPlotJourney={() => (showPlotJourney = true)}
      onStoryMission={() => (showStoryMission = true)}
      onSearch={() => (showSearch = true)}
    />
    <div class="main-view">
      {#if topView === 'sector'}
        <SectorMap data={geminiData} {selectedSystemId} onSelect={goToSystem} />
        <!-- The system view has its own, among its other HUD controls -->
        <div class="sector-controls"><GameToggle /></div>
      {:else if system}
        <!-- Returning to the sector map cross-fades: the system view fades
             out over it. Moving between systems doesn't (the key block is
             inside), where the new system's points fade in instead. -->
        <div class="system-layer" out:fade={{ duration: 300 }}>
          {#key system.id}
            <SystemView {system} data={geminiData} onJump={handleJump} />
          {/key}
        </div>
      {/if}
      {#if jumpTarget !== null}
        {#key jumpTarget}
          <JumpTransition
            onSwap={() => goToSystem(jumpTarget)}
            onDone={() => (jumpTarget = null)}
          />
        {/key}
      {/if}
      {#if $journey}
        <div
          class="journey-overlay"
          use:draggable={{ positionStore: journeyPanelPosition, handle: '.title' }}
        >
          <JourneyPanel data={geminiData} {selectedSystemId} />
        </div>
      {/if}
    </div>
  {:else}
    <div class="loading">{$t('app.loadingSectorData')}</div>
  {/if}
  {#if showAbout}
    <About onClose={() => (showAbout = false)} />
  {/if}
  {#if showLanguage}
    <LanguageDialog onClose={() => (showLanguage = false)} />
  {/if}
  {#if showPlotJourney}
    <PlotJourneyDialog
      data={geminiData}
      currentSystemId={selectedSystemId}
      onClose={() => (showPlotJourney = false)}
    />
  {/if}
  {#if showStoryMission}
    <StoryMissionDialog onClose={() => (showStoryMission = false)} />
  {/if}
  {#if showSearch}
    <SearchDialog data={geminiData} onSelect={goToSystem} onClose={() => (showSearch = false)} />
  {/if}
</main>

<style>
  main {
    display: flex;
    width: 100%;
    height: 100%;
  }
  .main-view {
    flex: 1;
    position: relative;
    overflow: hidden;
  }
  .system-layer {
    position: absolute;
    inset: 0;
  }
  .sector-controls {
    position: absolute;
    top: 14px;
    right: 20px;
    z-index: 10;
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
    text-transform: uppercase;
    text-shadow: 0 0 6px rgba(100, 200, 255, 0.5);
  }
</style>
