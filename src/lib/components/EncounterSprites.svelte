<script>
  import { shipSpritePath } from '../utils/encounters.js';
  import { shipName, shipSize } from '../utils/ships.js';

  let { ships, onSelect, onJump } = $props();

  // Base SVG size (viewBox is 0-100) for a Talon-class fighter; other ships
  // scale relative to it via shipSize() (see README.md 'Ship encounter
  // sprites' — the sprite bitmaps themselves are NOT drawn to scale).
  const BASE_SPRITE_SIZE = 1.6;
  const BASE_SHIP_SIZE = shipSize('TALMIL');
  const RADIUS = 2.4;

  function spriteSizeFor(shipId) {
    const size = shipSize(shipId);
    return size ? BASE_SPRITE_SIZE * (size / BASE_SHIP_SIZE) : BASE_SPRITE_SIZE;
  }

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
    {@const size = spriteSizeFor(s.ship)}
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
        x={dx - size / 2}
        y={dy - size / 2}
        width={size}
        height={size}
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
