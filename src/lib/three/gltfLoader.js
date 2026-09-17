// Shared, lazily-loaded GLTFLoader (+ DRACOLoader) - GLTFLoader and everything
// it pulls in is only worth its ~90KB if something actually needs to load a
// glTF model, so it's fetched as its own chunk on first use rather than
// bundled in eagerly. Both the base/station models (createNavScene.js) and
// the ship-encounter models (encounterModels3d.js) share this one promise/
// loader instance rather than each wiring up their own DRACOLoader.
let gltfLoaderPromise = null;
export function getGLTFLoader() {
  if (!gltfLoaderPromise) {
    gltfLoaderPromise = Promise.all([
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/loaders/DRACOLoader.js'),
    ]).then(([{ GLTFLoader }, { DRACOLoader }]) => {
      // Note for author only: models are exported through gltf-transform's
      // Draco rather than Blender's own glTF exporter - Blender's Draco
      // support depends on a pre-built library Ubuntu's package doesn't
      // install, so compression happens as a separate post-processing step
      // instead.
      //
      // Decoder files are resolved straight out of the three package (via
      // Vite's asset-URL handling for `new URL(..., import.meta.url)`) rather
      // than a manually-maintained copy, so they always match whatever three
      // version is actually installed.
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath({
        js: new URL('three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js', import.meta.url).href,
        wasm: new URL('three/examples/jsm/libs/draco/gltf/draco_decoder.wasm', import.meta.url).href,
      });
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);
      return loader;
    });
  }
  return gltfLoaderPromise;
}
