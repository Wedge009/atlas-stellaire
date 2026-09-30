<script>
  import { t } from '../i18n/index.js';

  // Shared frame for modal dialogues: the back-drop, panel, title and close
  // button, plus closing on Escape or on a click outside the panel.
  let {
    title,
    // Accessible name, for when the visible title doesn't describe the dialogue
    label = title,
    onClose,
    // Optional extra key handling for the dialogue's contents - Escape is
    // handled here and never reaches it.
    onKeydown = undefined,
    minWidth = '320px',
    maxWidth = '460px',
    // Take up the full max-width rather than sizing to the contents
    fillWidth = false,
    children,
  } = $props();

  // Escape is caught in the capture phase and stopped there, so an open
  // dialogue gets it first and exclusively - otherwise the other window-level
  // Escape handlers underneath (eg the 3D map zooming out or unflattening, or
  // the sector map closing its panel) would all fire on the same key press.
  function handleEscape(e) {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    onClose?.();
  }

  function handleKeydown(e) {
    if (e.key !== 'Escape') onKeydown?.(e);
  }

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) onClose?.();
  }
</script>

<svelte:window onkeydowncapture={handleEscape} onkeydown={handleKeydown} />

<div class="backdrop" role="presentation" onclick={onBackdropClick}>
  <div
    class="dialog panel-frame"
    class:fill-width={fillWidth}
    style:min-width={minWidth}
    style:max-width={maxWidth}
    role="dialog"
    aria-modal="true"
    aria-label={label}
  >
    <button type="button" class="close-btn primary" onclick={onClose} aria-label={$t('common.close')}>&times;</button>
    <div class="title">{title}</div>
    {@render children?.()}
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
  .dialog {
    position: relative;
    padding: 20px 24px;
  }
  .dialog.fill-width {
    width: 100%;
  }
  .title {
    font-family: var(--font-display);
    font-size: var(--font-size-heading);
    font-weight: bold;
    color: var(--grid-red);
    text-shadow: var(--text-glow-red);
    letter-spacing: 1px;
    margin-bottom: 16px;
    text-transform: uppercase;
  }
  .close-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 2px 6px;
    font-size: 24px;
    line-height: 1;
  }
</style>
