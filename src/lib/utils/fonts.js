// Run as a side effect of importing this module - main.js imports it at boot,
// as early as possible, so it has the maximum head start before NavMap3D might
// need it to bake nav-point labels into a canvas texture (see makeLabel in
// three/createNavScene.js). A canvas bake is one-shot and never corrects
// itself if the font arrives late, so NavMap3D awaits this promise before
// creating its scene.
// three/createNavScene.js bakes its labels with LABEL_FONT_FAMILY, so sharing
// it here keeps the font waited on and the font baked from being the same one.
export const LABEL_FONT_FAMILY = 'Kode Mono';
export const fontReady = document.fonts.load(`128px '${LABEL_FONT_FAMILY}'`).catch(() => {});
