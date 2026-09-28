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

  function handleKeydown(e) {
    if (e.key === 'Escape') onClose?.();
    else onKeydown?.(e);
  }

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) onClose?.();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="backdrop" role="presentation" onclick={onBackdropClick}>
  <div
    class="dialog"
    class:fill-width={fillWidth}
    style:min-width={minWidth}
    style:max-width={maxWidth}
    role="dialog"
    aria-modal="true"
    aria-label={label}
  >
    <button type="button" class="close-btn" onclick={onClose} aria-label={$t('common.close')}>&times;</button>
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
    background: var(--panel-bg);
    border: 1px solid var(--border-cyan);
    box-shadow: 0 0 10px rgba(60, 180, 255, 0.35), inset 0 0 20px rgba(0, 60, 90, 0.3);
    color: var(--text-cyan-bright);
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
    text-shadow: 0 0 6px rgba(255, 60, 60, 0.6);
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
