import { fade, slide } from 'svelte/transition';

// Fades and slides at once, so the space an element takes opens or closes
// smoothly as it fades - for content that appears, disappears or changes
// within a panel (the Legend's hidden points row, the Info Panel's
// encounters). Svelte's slide CSS has no trailing semicolon, hence the
// separator.
export function fadeSlide(node, params) {
  const s = slide(node, params);
  const f = fade(node, params);
  return { duration: params.duration, css: (t, u) => `${s.css(t, u)};${f.css(t, u)}` };
}
