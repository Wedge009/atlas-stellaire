<script>
  import { shipSpritePath } from '../utils/encounters.js';
  import { shipName } from '../utils/ships.js';

  let { ships, onSelect, onJump } = $props();

  const SPRITE_SIZE = 2.2; // svg units (viewBox is 0-100)
  const RADIUS = 2.4;

  // Stable per-index offset so the cluster doesn't jitter across re-renders
  // (position depends only on index/total, never Math.random()).
  function offsetFor(i, total) {
    const angle = (i / Math.max(total, 1)) * Math.PI * 2 + (i % 2) * 0.5;
    const r = RADIUS * (0.5 + 0.5 * ((i * 37) % 5) / 4);
    return { dx: Math.cos(angle) * r, dy: Math.sin(angle) * r };
  }
</script>

<g class="encounter-sprites">
  {#each ships as s, i (i)}
    {@const { dx, dy } = offsetFor(i, ships.length)}
    <g
      class="ship-sprite-hit"
      onclick={onSelect}
      ondblclick={onJump}
      role="button"
      tabindex="-1"
      onkeydown={(e) => e.key === 'Enter' && onSelect?.()}
    >
      <title>{shipName(s.ship)}</title>
      <image
        href={shipSpritePath(s.ship)}
        x={dx - SPRITE_SIZE / 2}
        y={dy - SPRITE_SIZE / 2}
        width={SPRITE_SIZE}
        height={SPRITE_SIZE}
        class="ship-sprite"
      />
    </g>
  {/each}
</g>

<style>
  .ship-sprite {
    image-rendering: pixelated;
  }
  .ship-sprite-hit {
    cursor: pointer;
  }
</style>
