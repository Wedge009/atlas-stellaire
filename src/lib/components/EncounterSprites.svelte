<script>
  import { shipSpritePath } from '../utils/encounters.js';
  import { shipName } from '../utils/ships.js';
  import { spriteSizeFor } from '../utils/encounterLayout.js';

  let { ships, onSelect, onJump } = $props();

  // Packs sprites of arbitrary (possibly very different) sizes around the
  // nav point with no overlap: seed each at an even angle a bit out from
  // centre, then relax pairs apart whenever they're closer than the sum of
  // their radii. Pure function of sizes/order, so it's deterministic - the
  // cluster doesn't jitter across re-renders, and a mixed Paradigm+Stiletto
  // escort naturally settles with the big hull in the middle and the
  // fighters fanned out clear of it, rather than everything sharing one
  // fixed ring radius regardless of size.
  function layoutCluster(sizes, { margin = 0.3, iterations = 30 } = {}) {
    const n = sizes.length;
    if (n === 0) return [];
    if (n === 1) return [{ dx: 0, dy: 0 }];

    const startRadius = Math.max(...sizes) * 0.4;
    const positions = sizes.map((_, i) => {
      const angle = (i / n) * Math.PI * 2;
      return { dx: Math.cos(angle) * startRadius, dy: Math.sin(angle) * startRadius };
    });

    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const minDist = (sizes[i] + sizes[j]) / 2 + margin;
          let ddx = positions[j].dx - positions[i].dx;
          let ddy = positions[j].dy - positions[i].dy;
          let dist = Math.hypot(ddx, ddy);
          if (dist === 0) {
            const angle = (i - j) * 0.7;
            ddx = Math.cos(angle);
            ddy = Math.sin(angle);
            dist = 1;
          }
          if (dist < minDist) {
            const push = (minDist - dist) / 2;
            const nx = ddx / dist;
            const ny = ddy / dist;
            positions[i].dx -= nx * push;
            positions[i].dy -= ny * push;
            positions[j].dx += nx * push;
            positions[j].dy += ny * push;
          }
        }
      }
    }
    return positions;
  }

  let sizes = $derived(ships.map((s) => spriteSizeFor(s.ship)));
  let positions = $derived(layoutCluster(sizes));
</script>

<g class="encounter-sprites">
  {#each ships as s, i (i)}
    {@const { dx, dy } = positions[i]}
    {@const size = sizes[i]}
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
