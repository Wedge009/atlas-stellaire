<script>
  import { onMount, onDestroy } from 'svelte';
  import { selectedNode } from '../stores/selection.js';

  let { points, aligned = $bindable(false), animating = $bindable(false), data, onJump } = $props();

  let canvas;
  let container;
  let scene = null;
  let resizeObserver;
  let loading = $state(true);
  let destroyed = false;

  onMount(() => {
    // Three.js is loaded lazily so it isn't part of the initial bundle - the
    // sector map and 2D view never need it, and it only pays for itself once
    // a system's 3D view actually mounts.
    (async () => {
      const { createNavScene } = await import('../three/createNavScene.js');
      if (destroyed) return;
      scene = createNavScene({
        canvas,
        onSelect: (np) => selectedNode.set(np),
        onJump,
        data,
      });
      scene.setPoints(points);
      loading = false;
      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);

      // If the caller remembers an aligned view (eg from before a system
      // switch), snap straight to it with no flight animation.
      if (aligned) scene.setAlignedInstant();
    })();
  });

  onDestroy(() => {
    destroyed = true;
    resizeObserver?.disconnect();
    scene?.dispose();
  });

  function resize() {
    if (!scene || !container) return;
    const { clientWidth, clientHeight } = container;
    scene.resize(clientWidth, clientHeight);
  }

  $effect(() => {
    // re-run whenever `points` changes (system switch or hidden-toggle)
    const current = points;
    if (scene) scene.setPoints(current);
  });

  function toggleAlign() {
    if (!scene || animating) return;
    animating = true;
    if (!aligned) {
      scene.animateToAligned(() => { aligned = true; animating = false; });
    } else {
      scene.animateToOrbit(() => { aligned = false; animating = false; });
    }
  }
</script>

<div class="navmap3d" bind:this={container}>
  <canvas bind:this={canvas}></canvas>
  {#if loading}
    <div class="loading">LOADING 3D ENGINE&hellip;</div>
  {:else}
    <button type="button" class="align-btn" onclick={toggleAlign} disabled={animating}>
      {aligned ? 'RETURN TO 3D VIEW' : 'ALIGN TO 2D VIEW'}
    </button>
    <div class="hint">
      {aligned
        ? 'click a node · double-click a jump point to travel'
        : 'drag to orbit · scroll to zoom · click a node · double-click a jump point to travel'}
    </div>
  {/if}
</div>

<style>
  .navmap3d {
    position: relative;
    width: 100%;
    height: 100%;
  }
  canvas {
    width: 100%;
    height: 100%;
    display: block;
    cursor: grab;
  }
  canvas:active { cursor: grabbing; }
  .align-btn {
    position: absolute;
    top: 64px;
    right: 20px;
  }
  .hint {
    position: absolute;
    bottom: 12px;
    right: 16px;
    color: #668;
    font-size: 16px;
    pointer-events: none;
  }
  .loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    color: var(--text-cyan);
    letter-spacing: 1px;
    text-shadow: 0 0 6px rgba(100, 200, 255, 0.5);
    pointer-events: none;
  }
</style>
