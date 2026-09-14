import * as THREE from 'three';

// Each encounter ship has 37 decoded rotation frames (frame00..frame36,
// see public/assets/ships/<ship>/), the same APPEARNC sprite set the 2D nav
// map uses frame00 of via shipSpritePath. Loaded lazily and cached per ship
// code, mirroring loadOriginalJumpFrameTextures/loadBaseModelTemplate in
// createNavScene.js - only ships that actually appear in the current
// system's rolled encounters pay for the fetch.
export const SHIP_FRAME_COUNT = 37;

const frameSetCache = new Map();

// The rotation-sprite set only stores azimuths 0-180deg and relies on a
// horizontal mirror for the other half (see encounterSprites3d.js). A
// THREE.Sprite can't be mirrored via a negative scale - the sprite vertex
// shader takes the *length* of the scale's model-matrix column
// (`vec2 scale = vec2(length(modelMatrix[0].xyz), ...)`), which silently
// discards the sign - so the mirrored half is instead pre-baked once per
// frame into its own canvas-backed texture here, alongside the normal one.
function makeFlippedTexture(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Resolves to { textures, flipped }, each a length-37 array of THREE.Texture
// - `flipped[i]` is `textures[i]` mirrored horizontally.
export function loadShipFrames(shipCode) {
  if (!frameSetCache.has(shipCode)) {
    const loader = new THREE.TextureLoader();
    const path = `${import.meta.env.BASE_URL}assets/ships/${shipCode.toLowerCase()}`;
    frameSetCache.set(
      shipCode,
      Promise.all(
        Array.from({ length: SHIP_FRAME_COUNT }, (_, i) =>
          loader.loadAsync(`${path}/frame${String(i).padStart(2, '0')}.png`).then((tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            return tex;
          })
        )
      ).then((textures) => ({
        textures,
        flipped: textures.map((tex) => makeFlippedTexture(tex.image)),
      }))
    );
  }
  return frameSetCache.get(shipCode);
}
