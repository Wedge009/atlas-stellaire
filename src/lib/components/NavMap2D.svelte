<script>
  import { resolveFlatPosition, styleForNavPoint, navPointLabel } from '../utils/navPoints.js';
  import { selectedNode } from '../stores/selection.js';
  import { journey } from '../stores/journey.js';
  import { routeThroughSystem } from '../utils/journey.js';

  let { points, data, onJump, systemId = null } = $props();

  let display = $derived(
    points.map((np) => ({
      np,
      flat: resolveFlatPosition(np),
      style: styleForNavPoint(np),
    }))
  );

  // Which navPoint(s) in this system to highlight for the plotted journey,
  // and which point-to-point segments to draw as an arrow through it - see
  // routeThroughSystem in utils/journey.js (shared with the 3D view).
  let routeInfo = $derived(routeThroughSystem($journey, systemId, points));
  let routeArrow = $derived(
    routeInfo.segments.map((seg) => ({
      from: resolveFlatPosition(points.find((p) => p.id === seg.fromId)),
      to: resolveFlatPosition(points.find((p) => p.id === seg.toId)),
    }))
  );

  function isRouteHighlighted(np) {
    return np.id === routeInfo.leaveViaId || np.id === routeInfo.targetId || np.id === routeInfo.refuelId;
  }

  const gridLines = [10, 20, 30, 40, 50, 60, 70, 80, 90];

  function select(np) {
    selectedNode.set(np);
  }

  function jump(np) {
    if (np.dest) onJump?.(np.dest);
  }
</script>

<svg class="navmap2d" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
  <defs>
    <marker id="navmap2d-route-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" class="route-arrowhead" />
    </marker>
  </defs>
  <rect x="0" y="0" width="100" height="100" fill="#000" />
  {#each gridLines as g}
    <line x1={g} y1="0" x2={g} y2="100" class="grid" />
    <line x1="0" y1={g} x2="100" y2={g} class="grid" />
  {/each}
  <line x1="50" y1="0" x2="50" y2="100" class="grid-center" />
  <line x1="0" y1="50" x2="100" y2="50" class="grid-center" />

  <!-- Markers first, so the route arrow draws over them; labels are drawn
       last (after the route arrow) so nav point names stay legible on top. -->
  {#each display as d (d.np.id)}
    {@const isSelected = $selectedNode?.id === d.np.id}
    <g
      class="node-marker"
      transform="translate({d.flat.sx}, {d.flat.sy})"
      onclick={() => select(d.np)}
      ondblclick={() => jump(d.np)}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && select(d.np)}
    >
      {#if d.style.shape === 'box'}
        <rect x="-1.6" y="-1.6" width="3.2" height="3.2" fill={d.style.color} opacity={d.style.dimmed ? 0.5 : 1} />
      {:else}
        <circle r={d.style.shape === 'dot' ? 1.1 : 1.6} fill={d.style.color} opacity={d.style.dimmed ? 0.5 : 1} />
      {/if}
      {#if d.np.asteroids}
        <circle r="2.6" class="asteroid-ring" />
      {/if}
      {#if isRouteHighlighted(d.np)}
        <circle r="3.6" class="route-ring" />
      {/if}
      {#if isSelected}
        <circle r="3.2" class="select-ring" />
      {/if}
    </g>
  {/each}

  {#each routeArrow as seg, i (i)}
    <line
      x1={seg.from.sx}
      y1={seg.from.sy}
      x2={seg.to.sx}
      y2={seg.to.sy}
      class="route-line"
      marker-end="url(#navmap2d-route-arrow)"
    />
  {/each}

  {#each display as d (d.np.id)}
    <g
      class="node-label"
      transform="translate({d.flat.sx}, {d.flat.sy})"
      onclick={() => select(d.np)}
      ondblclick={() => jump(d.np)}
      role="button"
      tabindex="-1"
      onkeydown={(e) => e.key === 'Enter' && select(d.np)}
    >
      <text x="2.4" y="0.5" class="label">{navPointLabel(d.np, data)}</text>
    </g>
  {/each}
</svg>

<style>
  .navmap2d {
    width: 100%;
    height: 100%;
    display: block;
    background: #000;
    font-family: var(--font-body);
  }
  .grid { stroke: #551515; stroke-width: 0.15; }
  .grid-center { stroke: #992222; stroke-width: 0.2; }
  .node-marker, .node-label { cursor: pointer; }
  .route-line { stroke: #ffcc55; stroke-width: 0.5; stroke-dasharray: 1.2 0.8; opacity: 0.9; }
  .route-arrowhead { fill: #ffcc55; }
  .label {
    fill: #a8e8ff;
    font-size: 2.5px;
    paint-order: stroke;
    stroke: #000;
    stroke-width: 0.4px;
  }
  .select-ring {
    fill: none;
    stroke: #fff;
    stroke-width: 0.3;
  }
  .asteroid-ring {
    fill: none;
    stroke: #a0522d;
    stroke-width: 0.25;
    stroke-dasharray: 0.6 0.5;
  }
  .route-ring {
    fill: none;
    stroke: #ffcc55;
    stroke-width: 0.35;
    stroke-dasharray: 1 0.6;
  }
</style>
