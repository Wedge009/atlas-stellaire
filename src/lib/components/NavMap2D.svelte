<script>
  import { resolveFlatPosition, styleForNavPoint, navPointLabel } from '../utils/navPoints.js';
  import { selectedNode } from '../stores/selection.js';

  let { points } = $props();

  let display = $derived(
    points.map((np) => ({
      np,
      flat: resolveFlatPosition(np),
      style: styleForNavPoint(np),
    }))
  );

  const gridLines = [10, 20, 30, 40, 50, 60, 70, 80, 90];

  function select(np) {
    selectedNode.set(np);
  }
</script>

<svg class="navmap2d" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
  <rect x="0" y="0" width="100" height="100" fill="#000" />
  {#each gridLines as g}
    <line x1={g} y1="0" x2={g} y2="100" class="grid" />
    <line x1="0" y1={g} x2="100" y2={g} class="grid" />
  {/each}
  <line x1="50" y1="0" x2="50" y2="100" class="grid-center" />
  <line x1="0" y1="50" x2="100" y2="50" class="grid-center" />

  {#each display as d (d.np.id)}
    {@const isSelected = $selectedNode?.id === d.np.id}
    <g
      class="node"
      transform="translate({d.flat.sx}, {d.flat.sy})"
      onclick={() => select(d.np)}
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
      {#if isSelected}
        <circle r="3.2" class="select-ring" />
      {/if}
      <text x="2.4" y="0.5" class="label">{navPointLabel(d.np)}</text>
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
  .node { cursor: pointer; }
  .label {
    fill: #a8e8ff;
    font-size: 2.4px;
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
</style>
