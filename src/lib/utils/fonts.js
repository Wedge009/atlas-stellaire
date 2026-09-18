// Run as a side effect of importing this module - main.js imports it at boot,
// as early as possible, so it has the maximum head start before NavMap3D might
// need it to bake nav-point labels into a canvas texture (see makeLabel in
// three/createNavScene.js). A canvas bake is one-shot and never corrects
// itself if the font arrives late, so NavMap3D awaits this promise before
// creating its scene.
export const vt323Ready = document.fonts.load("34px 'VT323'").catch(() => {});
