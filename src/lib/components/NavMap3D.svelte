<script>
  import { onMount, onDestroy } from 'svelte';
  import { createNavScene } from '../three/createNavScene.js';
  import { selectedNode } from '../stores/selection.js';

  let { points } = $props();

  let canvas;
  let container;
  let scene = null;
  let aligned = $state(false);
  let animating = $state(false);
  let resizeObserver;

  onMount(() => {
    scene = createNavScene({
      canvas,
      onSelect: (np) => selectedNode.set(np),
    });
    scene.setPoints(points);
    resize();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
  });

  onDestroy(() => {
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
  <button type="button" class="align-btn" onclick={toggleAlign} disabled={animating}>
    {aligned ? 'RETURN TO 3D VIEW' : 'ALIGN TO 2D VIEW'}
  </button>
  <div class="hint">drag to orbit &middot; scroll to zoom &middot; click a node</div>
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
    color: #446;
    font-size: 14px;
    pointer-events: none;
  }
</style>
