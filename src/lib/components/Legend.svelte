<script>
  let { showHidden = false } = $props();
</script>

<div class="legend">
  <div><span class="sw sw-jump"></span>Jump Point</div>
  <div><span class="sw sw-base"></span>Base / Planet</div>
  <div><span class="sw sw-point"></span>Nav Point</div>
  {#if showHidden}
    <div><span class="sw sw-unknown"></span>Hidden / Unknown</div>
  {/if}
  <div><span class="sw sw-asteroid"></span>Asteroids Present</div>
</div>

<style>
  .legend {
    color: var(--text-cyan);
    font-size: 16px;
    background: var(--panel-bg);
    border: 1px solid #2a4a55;
    padding: 8px 12px;
    line-height: 1.6;
  }
  .sw {
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 6px;
    vertical-align: middle;
  }
  .sw-base { background: var(--sw-base); }
  .sw-jump { background: var(--sw-jump); border-radius: 50%; }
  .sw-point { background: var(--sw-point); border-radius: 50%; }
  .sw-unknown { background: var(--sw-unknown); border-radius: 50%; opacity: 0.6; }
  .sw-asteroid { background: transparent; border: 1px dashed #a0522d; border-radius: 50%; }
</style>
