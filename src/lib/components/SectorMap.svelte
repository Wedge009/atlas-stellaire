<script>
  import { sectorSystems, sectorEdges } from '../utils/navPoints.js';
  import { journey } from '../stores/journey.js';

  let { data, selectedSystemId, onSelect } = $props();

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

  function select(system) {
    onSelect?.(system.id);
  }
</script>

<svg class="sectormap" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
  <defs>
    <marker id="route-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" class="route-arrowhead" />
    </marker>
  </defs>
  <rect x="0" y="0" width="200" height="200" fill="#000" />

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
    <text x={tile.x + 3} y={tile.y + 6} class="quadrant-label">{tile.q.name.toUpperCase()} QUADRANT</text>
  {/each}

  {#each edges as e (e.a.id + '|' + e.b.id)}
    <line x1={e.a.gx} y1={e.a.gy} x2={e.b.gx} y2={e.b.gy} class="edge" />
  {/each}

  {#each routeSegments as seg, i (i)}
    <line x1={seg.a.gx} y1={seg.a.gy} x2={seg.b.gx} y2={seg.b.gy} class="route-line" marker-end="url(#route-arrow)" />
  {/each}

  {#each systems as s (s.id)}
    {@const isSelected = s.id === selectedSystemId}
    {@const isRefuelStop = refuelSystemIds.has(s.id)}
    <g
      class="node"
      transform="translate({s.gx}, {s.gy})"
      onclick={() => select(s)}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && select(s)}
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
      <text x="2.2" y="0.6" class="label">{s.name}</text>
    </g>
  {/each}
</svg>

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
  }
  .edge { stroke: #4dc8ff; stroke-width: 0.15; opacity: 0.45; }
  .route-line { stroke: #ffcc55; stroke-width: 0.6; stroke-dasharray: 1.5 1; opacity: 0.9; }
  .route-arrowhead { fill: #ffcc55; }
  .refuel-ring { fill: none; stroke: #33cc55; stroke-width: 0.4; stroke-dasharray: 0.8 0.6; }
  .node { cursor: pointer; }
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
</style>
