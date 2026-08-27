<script>
  let { onClose } = $props();

  function onKeydown(e) {
    if (e.key === 'Escape') onClose?.();
  }

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) onClose?.();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="backdrop" role="presentation" onclick={onBackdropClick}>
  <div class="about" role="dialog" aria-modal="true" aria-label="About">
    <button type="button" class="close-btn" onclick={onClose} aria-label="Close">&times;</button>
    <div class="title">ATLAS STELLAIRE</div>
    <p class="summary">A nostalgic revisit of the Gemini sector from Wing Commander: Privateer.</p>
    <div class="row">Version {__APP_VERSION__} &middot; {__GIT_COMMIT__}</div>
    <div class="row">
      <a href="https://github.com/Wedge009/atlas-stellaire" target="_blank" rel="noopener noreferrer">
        github.com/Wedge009/atlas-stellaire
      </a>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .about {
    position: relative;
    min-width: 280px;
    max-width: 420px;
    background: var(--panel-bg);
    border: 1px solid var(--border-cyan);
    box-shadow: 0 0 10px rgba(60, 180, 255, 0.35), inset 0 0 20px rgba(0, 60, 90, 0.3);
    color: var(--text-cyan-bright);
    padding: 20px 24px;
  }
  .title {
    font-family: var(--font-display);
    font-size: 14px;
    color: var(--grid-red);
    text-shadow: 0 0 6px rgba(255, 60, 60, 0.6);
    letter-spacing: 1px;
    margin-bottom: 14px;
  }
  .summary {
    color: var(--text-cyan);
    font-size: 18px;
    line-height: 1.4;
    margin: 0 0 14px;
  }
  .row {
    color: var(--text-cyan);
    font-size: 16px;
    margin-bottom: 6px;
  }
  .row a {
    color: var(--text-amber);
  }
  .row a:hover {
    color: #fff;
  }
  .close-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 2px 8px;
    font-size: 14px;
    line-height: 1;
  }
</style>
