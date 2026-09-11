// Fetches the jump-transition webp once and caches the Blob for the life of the
// page, so repeated jumps don't re-request it over the network - each JumpTransition
// mount instead gets its own URL.createObjectURL() of the same bytes.
let blobPromise = null;

export function getJumpTransitionBlob() {
  if (!blobPromise) {
    const base = import.meta.env.BASE_URL;
    blobPromise = fetch(`${base}assets/transitions/jump.webp`).then((res) => res.blob());
  }
  return blobPromise;
}
