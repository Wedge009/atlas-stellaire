<script>
  // Frame data: public/assets/transitions/jump.webp is a loop=1 (one-shot)
  // re-encode of the decoded JUMP.PAK cutscene - 42 frames @ 80ms/frame.
  const ANIMATION_MS = 3360;
  const FADE_MS = 200;

  let { onSwap, onDone } = $props();

  let visible = $state(false);
  let src = $state(null);

  import { onMount } from 'svelte';
  import { getJumpTransitionBlob } from '../utils/jumpTransitionAsset.js';

  onMount(() => {
    requestAnimationFrame(() => (visible = true));

    // A fresh object URL per mount (always unique) makes the browser decode and
    // play the animation from frame 0 - reusing the same <img src> across jumps
    // left it frozen on the previous jump's last frame instead of replaying.
    let objectUrl = null;
    getJumpTransitionBlob().then((blob) => {
      objectUrl = URL.createObjectURL(blob);
      src = objectUrl;
    });

    const swapTimer = setTimeout(() => onSwap?.(), FADE_MS);
    const fadeOutTimer = setTimeout(() => (visible = false), ANIMATION_MS);
    const doneTimer = setTimeout(() => onDone?.(), ANIMATION_MS + FADE_MS);

    return () => {
      clearTimeout(swapTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(doneTimer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  });
</script>

<div class="jump-transition" class:visible style="--fade-ms: {FADE_MS}ms">
  {#if src}
    <img {src} alt="" />
  {/if}
</div>

<style>
  .jump-transition {
    position: absolute;
    inset: 0;
    z-index: 50;
    background: #000;
    opacity: 0;
    transition: opacity var(--fade-ms) linear;
    pointer-events: none;
  }
  .jump-transition.visible {
    opacity: 1;
  }
  .jump-transition img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    image-rendering: pixelated;
  }
</style>
