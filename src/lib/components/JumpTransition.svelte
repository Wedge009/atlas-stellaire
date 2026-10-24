<script>
  // Frame data: public/assets/transitions/jump.webp is a loop=1 (one-shot)
  // lossless encode of the decoded JUMP.PAK cutscene, with frame times measured
  // from the game (about 57-71ms a frame), ending on a white frame held 324ms.
  const ANIMATION_MS = 2627;
  const WHITE_MS = 324;
  const FADE_MS = 200;
  // Swap systems while the final white frame is on screen: rebuilding the
  // system view blocks the main thread, which stalls the animation if it
  // happens mid-streak, but a held white frame hides the stall.
  const SWAP_MS = ANIMATION_MS - WHITE_MS + 50;

  let { onSwap, onDone } = $props();

  let visible = $state(false);
  let src = $state(null);

  import { onMount } from 'svelte';
  import { getJumpTransitionBlob } from '../utils/jumpTransitionAsset.js';

  let timers = /** @type {ReturnType<typeof setTimeout>[]} */ ([]);

  // The timeline starts when the image has loaded and begins playing, not at
  // mount, so the first jump's fetch can't shift the swap off the white frame.
  function start() {
    timers.push(setTimeout(() => onSwap?.(), SWAP_MS));
    timers.push(setTimeout(() => (visible = false), ANIMATION_MS));
    timers.push(setTimeout(() => onDone?.(), ANIMATION_MS + FADE_MS));
  }

  // If the image can't be shown, still make the jump.
  function fail() {
    onSwap?.();
    visible = false;
    timers.push(setTimeout(() => onDone?.(), FADE_MS));
  }

  onMount(() => {
    requestAnimationFrame(() => (visible = true));

    // A fresh object URL per mount (always unique) makes the browser decode and
    // play the animation from frame 0 - reusing the same <img src> across jumps
    // left it frozen on the previous jump's last frame instead of replaying.
    let objectUrl = null;
    getJumpTransitionBlob()
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        src = objectUrl;
      })
      .catch(fail);

    return () => {
      timers.forEach(clearTimeout);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  });
</script>

<div class="jump-transition" class:visible style="--fade-ms: {FADE_MS}ms">
  {#if src}
    <img {src} alt="" onload={start} onerror={fail} />
  {/if}
</div>

<style>
  .jump-transition {
    position: absolute;
    inset: 0;
    z-index: 50;
    background: var(--bg);
    opacity: 0;
    transition: opacity var(--fade-ms) linear;
    pointer-events: none;
    overflow: hidden;
  }
  .jump-transition.visible {
    opacity: 1;
  }
  .jump-transition img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    image-rendering: pixelated;
    /* 320x200 VGA was shown on a 4:3 screen, so pixels were 1.2x taller than wide. */
    transform: scaleY(1.2);
  }
</style>
