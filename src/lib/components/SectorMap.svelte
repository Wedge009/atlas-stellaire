<script>
  import { sectorSystems, sectorEdges } from '../utils/navPoints.js';
  import { journey } from '../stores/journey.js';
  import SystemInfoPanel from './SystemInfoPanel.svelte';
  import { t } from '../i18n/index.js';

  let { data, selectedSystemId, onSelect } = $props();

  let panelSystem = $state(null);
  let panelStyle = $state('');
  let panelMaxHeight = $state(300);

  let systems = $derived(sectorSystems(data));
  let edges = $derived(sectorEdges(data));
  let systemsById = $derived(new Map(systems.map((s) => [s.id, s])));

  // Consecutive system-pairs along the plotted journey, in travel order, so
  // each segment can be drawn as a directional arrow on top of the plain
  // jump-lattice edges above.
  let routeSegments = $derived(
    $journey
      ? $journey.hops
          .slice(1)
          .map((hop, i) => ({ a: systemsById.get($journey.hops[i].systemId), b: systemsById.get(hop.systemId) }))
          .filter((seg) => seg.a && seg.b)
      : []
  );
  let refuelSystemIds = $derived(
    $journey ? new Set($journey.hops.filter((h) => h.refuelStop).map((h) => h.systemId)) : new Set()
  );

  // Quadrant tiles, laid out on their gridCol/gridRow (each tile is 100x100 units).
  let tiles = $derived(
    data.quadrants.map((q) => ({ q, x: q.gridCol * 100, y: q.gridRow * 100 }))
  );

  const gridLines = [10, 20, 30, 40, 50, 60, 70, 80, 90];

  function hasBase(system) {
    return system.navPoints.some((np) => np.type === 'base');
  }

  // Opens the floating info panel anchored near the click point, clamped so
  // it stays fully on-screen regardless of where in the viewport the system
  // sits. Vertically it anchors from whichever side (top or bottom of the
  // click point) has more room, so a system near the bottom of the map gets
  // a panel that grows upward instead of a cramped sliver capped at a fixed
  // height; `maxHeight` is passed through to the panel itself (rather than
  // just this wrapper) so its own overflow-y:auto is what actually clips it.
  function openPanel(system, event) {
    const margin = 12;
    const gap = 16;
    const panelWidth = 340;
    const rect = event.currentTarget?.getBoundingClientRect?.();
    const cx = event.clientX ?? rect?.left ?? window.innerWidth / 2;
    const cy = event.clientY ?? rect?.top ?? window.innerHeight / 2;

    let x = cx + gap;
    if (x + panelWidth + margin > window.innerWidth) x = cx - panelWidth - gap;
    x = Math.max(margin, x);

    const spaceBelow = window.innerHeight - cy - gap - margin;
    const spaceAbove = cy - gap - margin;

    let vertStyle;
    if (spaceBelow >= spaceAbove) {
      const top = Math.max(margin, cy + gap);
      panelMaxHeight = Math.max(80, window.innerHeight - top - margin);
      vertStyle = `top: ${top}px;`;
    } else {
      const bottom = Math.max(margin, window.innerHeight - cy + gap);
      panelMaxHeight = Math.max(80, cy - gap - margin);
      vertStyle = `bottom: ${bottom}px;`;
    }

    panelStyle = `left: ${x}px; ${vertStyle}`;
    panelSystem = system;
  }

  function closePanel() {
    panelSystem = null;
  }

  function goTo(system) {
    closePanel();
    onSelect?.(system.id);
  }
</script>

<svg class="sectormap" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
  <defs>
    <marker id="route-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" class="route-arrowhead" />
    </marker>
  </defs>
  <rect x="0" y="0" width="200" height="200" fill="#000" role="presentation" onclick={closePanel} />

  {#each tiles as tile (tile.q.id)}
    {#each gridLines as g}
      <line x1={tile.x + g} y1={tile.y} x2={tile.x + g} y2={tile.y + 100} class="grid" />
      <line x1={tile.x} y1={tile.y + g} x2={tile.x + 100} y2={tile.y + g} class="grid" />
    {/each}
  {/each}

  <!-- Quadrant borders, drawn on top of the fine grid. -->
  <line x1="100" y1="0" x2="100" y2="200" class="quadrant-border" />
  <line x1="0" y1="100" x2="200" y2="100" class="quadrant-border" />
  <rect x="0" y="0" width="200" height="200" class="sector-border" fill="none" />

  {#each tiles as tile (tile.q.id)}
    <text x={tile.x + 3} y={tile.y + 6} class="quadrant-label">{$t('common.quadrant', { name: tile.q.name })}</text>
  {/each}

  {#each edges as e (e.a.id + '|' + e.b.id)}
    <line x1={e.a.gx} y1={e.a.gy} x2={e.b.gx} y2={e.b.gy} class="edge" />
  {/each}

  <!-- Markers first, so the route line draws over them; labels are drawn
       last (after the route line) so system names stay legible on top. -->
  {#each systems as s (s.id)}
    {@const isSelected = s.id === selectedSystemId}
    {@const isRefuelStop = refuelSystemIds.has(s.id)}
    <g
      class="node-marker"
      transform="translate({s.gx}, {s.gy})"
      onclick={(e) => openPanel(s, e)}
      ondblclick={() => goTo(s)}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && goTo(s)}
    >
      {#if hasBase(s)}
        <rect x="-1.5" y="-1.5" width="3" height="3" class="dot dot-base" />
      {:else}
        <circle r="1.3" class="dot" />
      {/if}
      {#if isRefuelStop}
        <circle r="4" class="refuel-ring" />
      {/if}
      {#if isSelected}
        <circle r="3" class="select-ring" />
      {/if}
    </g>
  {/each}

  {#each routeSegments as seg, i (i)}
    <line x1={seg.a.gx} y1={seg.a.gy} x2={seg.b.gx} y2={seg.b.gy} class="route-line" marker-end="url(#route-arrow)" />
  {/each}

  {#each systems as s (s.id)}
    <g
      class="node-label"
      transform="translate({s.gx}, {s.gy})"
      onclick={(e) => openPanel(s, e)}
      ondblclick={() => goTo(s)}
      role="button"
      tabindex="-1"
      onkeydown={(e) => e.key === 'Enter' && goTo(s)}
    >
      <text x="2.2" y="0.6" class="label">{s.name}</text>
    </g>
  {/each}
</svg>

<svelte:window onkeydown={(e) => e.key === 'Escape' && closePanel()} />

{#if panelSystem}
  <div class="info-float" style={panelStyle}>
    <SystemInfoPanel
      {data}
      system={panelSystem}
      maxHeight={panelMaxHeight}
      onClose={closePanel}
      onGoTo={() => goTo(panelSystem)}
    />
  </div>
{/if}

<style>
  .sectormap {
    width: 100%;
    height: 100%;
    display: block;
    background: #000;
    font-family: var(--font-body);
  }
  .grid { stroke: #551515; stroke-width: 0.15; }
  .quadrant-border { stroke: var(--grid-red); stroke-width: 0.5; opacity: 0.8; }
  .sector-border { stroke: var(--grid-red); stroke-width: 0.5; opacity: 0.8; }
  .quadrant-label {
    fill: var(--text-amber);
    font-family: var(--font-display);
    font-size: 3px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }
  .edge { stroke: #4dc8ff; stroke-width: 0.15; opacity: 0.45; }
  .route-line { stroke: #ffcc55; stroke-width: 0.6; stroke-dasharray: 1.5 1; opacity: 0.9; }
  .route-arrowhead { fill: #ffcc55; }
  .refuel-ring { fill: none; stroke: #33cc55; stroke-width: 0.4; stroke-dasharray: 0.8 0.6; }
  .node-marker, .node-label { cursor: pointer; }
  .dot { fill: #33cc55; stroke: none; }
  .dot-base { fill: #33cc55; }
  .label {
    fill: #a8e8ff;
    font-size: 3px;
    paint-order: stroke;
    stroke: #000;
    stroke-width: 0.4px;
  }
  .select-ring {
    fill: none;
    stroke: #fff;
    stroke-width: 0.3;
  }
  .info-float {
    position: fixed;
    z-index: 30;
  }
</style>
