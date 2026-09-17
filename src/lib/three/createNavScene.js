import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { findSystem, resolveFlatPosition, styleForNavPoint, systemName } from '../utils/navPoints.js';
import { skyboxSpriteTexture } from '../utils/skyboxSprites.js';
import { createEncounterSprites3d } from './encounterSprites3d.js';
import { createEncounterModels3d } from './encounterModels3d.js';
import { getGLTFLoader } from './gltfLoader.js';

// Two interchangeable renderers for the ambient ship-encounter ships, same
// five-function interface (setEncounterShips/tick/setVisible/
// getPickableObjects/dispose) - swap which factory is used here to compare
// the original 2D rotation-sprite billboards against real orbiting 3D ship
// models. Sprite implementation is left fully intact in encounterSprites3d.js.
const createEncounterShips3d = createEncounterModels3d;

// Real extracted-and-decimated station models for specific baseTypes, keyed
// the same way navPoints' own `baseType` field is. Anything not listed here
// keeps the plain placeholder box/sphere below. Loaded once per baseType and
// cloned per node instance - GLTFLoader is async, so a node using one of these
// starts as an empty group and the model fades in once its (shared, cached)
// load promise resolves.
const BASE_MODEL_PATHS = {
  // zUp: true means the source model came out of the BFXM/LightWave pipeline
  // (Z-up) and needs the -90deg X correction below - the planetary sphere
  // was built fresh for this project already Y-up, so it doesn't. Original
  // models were from Gemini Gold, current Origin models are mostly oriented
  // Y-up.
  refinery: { path: `${import.meta.env.BASE_URL}assets/models/refinery.glb`, zUp: false },
  agricultural: { path: `${import.meta.env.BASE_URL}assets/models/agricultural.glb`, zUp: false },
  pleasure: { path: `${import.meta.env.BASE_URL}assets/models/pleasure.glb`, zUp: false },
  oxford: { path: `${import.meta.env.BASE_URL}assets/models/oxford.glb`, zUp: false },
  gaea: { path: `${import.meta.env.BASE_URL}assets/models/gaea.glb`, zUp: false },
  'new-detroit': { path: `${import.meta.env.BASE_URL}assets/models/new-detroit.glb`, zUp: false },
  mining: { path: `${import.meta.env.BASE_URL}assets/models/mining.glb`, zUp: false },
  // Pirate bases re-use the same mining_base unit/mesh
  pirate: { path: `${import.meta.env.BASE_URL}assets/models/mining.glb`, zUp: false },
  'new-constantinople': { path: `${import.meta.env.BASE_URL}assets/models/new-constantinople.glb`, zUp: false },
  perry: { path: `${import.meta.env.BASE_URL}assets/models/perry.glb`, zUp: false },
  steltek: { path: `${import.meta.env.BASE_URL}assets/models/steltek.glb`, zUp: true },
};
// Model-space units don't match the plain box/sphere placeholders' hand-picked
// sizes, so each model is rescaled to roughly the same on-screen footprint as
// the 2.6-unit placeholder box (diagonal ~4.5) rather than rendered 'to scale'
// - a real station is km-sized next to the tens-of-units nav point spacing,
// so 'to scale' would be an invisible speck, same reasoning as the box/sphere
// placeholders it replaces.
const BASE_MODEL_TARGET_SIZE = 4.5;
const modelTemplateCache = new Map();
function loadBaseModelTemplate(baseType) {
  const config = BASE_MODEL_PATHS[baseType];
  if (!config) return null;
  if (!modelTemplateCache.has(baseType)) {
    modelTemplateCache.set(
      baseType,
      getGLTFLoader().then((loader) => loader.loadAsync(config.path)).then((gltf) => {
        const template = gltf.scene;
        // Source model is Z-up (BFXM/LightWave convention) - this scene is
        // Y-up. Rotate -90 about X so model-space Z (the tank ring's
        // turret/dome axis) becomes world +Y, matching the placeholder
        // box/sphere it replaces having no inherent 'up' of its own.
        if (config.zUp) template.rotation.x = -Math.PI / 2;
        const box = new THREE.Box3().setFromObject(template);
        const size = box.getSize(new THREE.Vector3());
        const longest = Math.max(size.x, size.y, size.z) || 1;
        template.scale.setScalar(BASE_MODEL_TARGET_SIZE / longest);
        // Some source files (this project has no control over how the
        // original artist created them) don't have a centred pivot - the
        // mesh's own local origin can sit well outside its bounding-box
        // centre. Left alone, idle-spin rotation happens around that
        // off-centre origin instead of the model's visual middle, so an
        // asymmetric model sweeps through a wide arc rather than spinning in
        // place (confirmed on the mining/pirate asteroid model: its centroid
        // sat 374 units from local origin, ~35% of its own longest
        // dimension). Re-centre after scaling so every model rotates about
        // its own visual centre regardless of how it was originally pivoted.
        const scaledBox = new THREE.Box3().setFromObject(template);
        const center = scaledBox.getCenter(new THREE.Vector3());
        template.position.sub(center);
        return template;
      })
    );
  }
  return modelTemplateCache.get(baseType);
}

// A loaded model's meshes carry no userData of their own, so click/hover
// raycasting (which reads `hit.object.userData` expecting the navPoint) would
// silently break on real models unless every descendant is stamped too.
function stampUserData(object3d, np) {
  object3d.traverse((child) => { child.userData = np; });
}

// Disposal for a node's visual mesh, which is a plain THREE.Mesh (the
// box/sphere placeholders), a THREE.Group wrapping a cloned GLTF model (no
// .geometry/.material of its own, so it must be traversed), or a THREE.Sprite
// (the real jump-sphere sprites). A Sprite's `.geometry` is not its
// own - three.js gives every Sprite instance the same lazily-created static
// quad (see Sprite.js), so calling .dispose() on it would destroy the GPU
// buffer backing every other sprite in the scene too (labels included).
// Only the material - genuinely per-instance - gets disposed for a Sprite.
function disposeNodeMesh(mesh) {
  mesh.traverse((child) => {
    if (child.geometry && !child.isSprite) child.geometry.dispose();
    if (child.material) child.material.dispose();
  });
}

// Gemini Gold's jump-point animation: a 7-frame sequence played as a
// ping-pong loop (1..7 then back down to 2) at 150ms/frame. Neither the
// individual JPEGs nor a static fall-back have any alpha channel or radial
// fall-off so the 'glowing orb' look isn't a masked sprite, it's additive
// blending (alpha="ONE ONE"): dark areas add nothing, so background shows
// through unchanged, while the swirling bright areas glow on top.
// THREE.AdditiveBlending on the material reproduces this exactly - see
// setPoints below, where jump points get this instead of the plain
// placeholder sphere whenever base models are enabled.
const JUMP_FRAME_COUNT = 7;
const JUMP_FRAME_SEQUENCE = [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
const JUMP_FRAME_INTERVAL_MS = 150;
let jumpTexturesPromise = null;
function loadJumpFrameTextures() {
  if (!jumpTexturesPromise) {
    const loader = new THREE.TextureLoader();
    jumpTexturesPromise = Promise.all(
      Array.from({ length: JUMP_FRAME_COUNT }, (_, i) =>
        loader.loadAsync(`${import.meta.env.BASE_URL}assets/animations/jump/frame${String(i + 1).padStart(2, '0')}.jpg`)
      )
    );
  }
  return jumpTexturesPromise;
}

// The real DATA/APPEARNC/JUMP.IFF frames, decoded straight from the game data
// rather than Gemini Gold's reinterpretation above: 9 frames, each already a
// complete but sparse/noisy fuzzy-sphere image with genuine per-pixel alpha
// (the undrawn ~1/4-1/3 of each frame IS the 'heavy transparency', not an
// additive glow over a dark image). Offered as an alternative style toggled
// from Settings rather than replacing Gemini Gold's outright.
const ORIGINAL_JUMP_FRAME_COUNT = 9;
const ORIGINAL_JUMP_FRAME_SEQUENCE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1];
let originalJumpTexturesPromise = null;
function loadOriginalJumpFrameTextures() {
  if (!originalJumpTexturesPromise) {
    const loader = new THREE.TextureLoader();
    originalJumpTexturesPromise = Promise.all(
      Array.from({ length: ORIGINAL_JUMP_FRAME_COUNT }, (_, i) =>
        loader.loadAsync(`${import.meta.env.BASE_URL}assets/animations/jump-original/frame${String(i).padStart(2, '0')}.png`)
      )
    );
  }
  return originalJumpTexturesPromise;
}

const SCALE = 1 / 1000;
const FLAT_SPAN = 55;
const ORIGIN = new THREE.Vector3(0, 0, 0);
const ROUTE_BEACON_HEIGHT = 5;
// Idle per-frame spin applied uniformly to every node's mesh/model (radians,
// assumed ~60fps) - it's the same rate for a plain box/sphere and a detailed
// model, but a symmetric placeholder barely reads as rotating at all while an
// asymmetric station model makes the same angular speed look much faster.
const NODE_IDLE_SPIN_SPEED = 0.002;

// After this long with no user interaction, the orbit camera drifts slowly
// around Y on its own. AUTO_ROTATE_SPEED is radians/frame at an assumed
// ~60fps, tuned for a lazy ~2-minute revolution rather than anything dizzying.
const IDLE_ROTATE_DELAY_MS = 30000;
const AUTO_ROTATE_SPEED = 0.0009;

// A system's SUNS/GLXY sky-box chunk (gemini.json `skybox`) gives each backdrop
// object's raw in-game co-ordinates, which sit on a completely different scale
// to the flight-sim nav space above - they're not navigable positions, just a
// direction the sprite sits in the sky. So the raw values are only ever used as a
// direction, normalised out at a fixed backdrop radius, never scaled/placed
// like a real nav point.
const BACKDROP_RADIUS = 600;
const BACKDROP_SIZE = 50;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function makeLabel(text, color) {
  const cnv = document.createElement('canvas');
  const ctx = cnv.getContext('2d');
  const fontSize = 34;
  ctx.font = `${fontSize}px 'VT323', monospace`;
  const w = Math.max(160, ctx.measureText(text).width + 24);
  cnv.width = w;
  cnv.height = fontSize + 16;
  ctx.font = `${fontSize}px 'VT323', monospace`;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.textBaseline = 'top';
  ctx.fillText(text, 4, 4);
  const tex = new THREE.CanvasTexture(cnv);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: true, depthWrite: false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set((cnv.width / cnv.height) * 4, 4, 1);
  return sprite;
}

function makeStars(count, spread) {
  const g = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
  }
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: 0x556677, size: 1.1, sizeAttenuation: true }));
}

// Factory wrapping the imperative Three.js nav-map scene: orbit camera,
// align/unalign animation between real 3D position and flat sx/sy layout,
// click-to-select. Generalised from the proof-of-concept to take any
// system's navPoints array.
export function createNavScene({
  canvas,
  onSelect,
  onJump,
  onFocusBase,
  data,
  systemId,
  idleRotationEnabled = true,
  skyboxEnabled = true,
  baseModelsEnabled = true,
  originalJumpSphereEnabled = true,
  encounterSpritesEnabled = true,
}) {
  let idleRotationOn = idleRotationEnabled;
  // Resolved once here (rather than per-node) so tick() below can swap frames
  // synchronously every 150ms without awaiting anything - jumpMaterials that
  // exist before this resolves just render untextured white until it does.
  let jumpTextures = null;
  let originalJumpTextures = null;
  let jumpAnimStartTime = performance.now();
  let lastJumpFrameIdx = -1;
  loadJumpFrameTextures().then((textures) => { jumpTextures = textures; });
  loadOriginalJumpFrameTextures().then((textures) => { originalJumpTextures = textures; });
  let baseModelsOn = baseModelsEnabled;
  let originalJumpOn = originalJumpSphereEnabled;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x000000, 0.0035);
  // Near/far chosen to fit what's actually in the scene rather than leaving
  // generous defaults: orbit radius is clamped to 20-220 (below), the
  // sky-box backdrop sits at BACKDROP_RADIUS (600), and the starfield spans a
  // 900-unit cube (~780 from origin at the corners) - nothing is ever nearer
  // than ~15 units or further than ~1000. WebGL's depth buffer is non-linear
  // and front-loaded near the camera, so the old 0.1/2000 pair (a 20,000:1
  // ratio) wasted precision on a range nothing ever occupies, starving it at
  // the distances models actually render at - symptom was faint z-fighting
  // on some models' geometry when viewed from further away. This pair is a
  // 1000:1 ratio instead, a 20x improvement, with margin on both ends.
  const camera = new THREE.PerspectiveCamera(50, 1, 1, 1000);

  // Gives glTF-imported PBR materials (KHR_materials_specular/IOR, baked in by
  // Blender's exporter from imported .3ds Ks/Ns values) something to reflect -
  // without this, scene.environment is unset and those materials render
  // near-black regardless of their base colour/alpha, since they lean on
  // environment lighting rather than the scene's plain point/ambient lights.
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  pmremGenerator.dispose();

  scene.add(makeStars(1200, 900));

  const backdropGroup = new THREE.Group();
  backdropGroup.visible = skyboxEnabled;
  scene.add(backdropGroup);
  const textureLoader = new THREE.TextureLoader();
  const skybox = findSystem(data, systemId)?.skybox ?? [];
  for (const obj of skybox) {
    const iconPath = skyboxSpriteTexture(obj.name);
    if (!iconPath) continue;
    const direction = new THREE.Vector3(obj.x, obj.y, obj.z).normalize();
    const sprite = new THREE.Sprite();
    sprite.visible = false;
    sprite.position.copy(direction.multiplyScalar(BACKDROP_RADIUS));
    backdropGroup.add(sprite);
    textureLoader.load(iconPath, (texture) => {
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.colorSpace = THREE.SRGBColorSpace;
      // Sky-box objects sit outside the scene's local fog volume (they read as
      // being at optical infinity), otherwise FogExp2 at this radius blends
      // the sprite almost entirely into the black background before it's
      // visible.
      sprite.material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, fog: false });
      const aspect = texture.image.width / texture.image.height;
      sprite.scale.set(BACKDROP_SIZE * aspect, BACKDROP_SIZE, 1);
      sprite.visible = true;
    });
  }

  const grid = new THREE.GridHelper(160, 16, 0x992222, 0x551515);
  grid.material.opacity = 0.55;
  grid.material.transparent = true;
  scene.add(grid);

  const cameraLight = new THREE.PointLight(0xffffff, 2, 1000);
  camera.add(cameraLight);
  scene.add(camera);
  scene.add(new THREE.AmbientLight(0x223344, 1.2));

  let nodes = [];
  let nodeGroup = new THREE.Group();
  scene.add(nodeGroup);

  // Ambient ship-encounter sprites: added straight to `scene`, not
  // nodeGroup, so their own orbit motion isn't compounded by the per-node
  // idle-spin below (see encounterSprites3d.js's tick(), which re-centres
  // each nav point's anchor on the node's live position every frame instead).
  const encounterShips3d = createEncounterShips3d({ scene, systemId });
  encounterShips3d.setVisible(encounterSpritesEnabled);
  let lastEncounterRolls = null;

  // Every jump-point orb's material, tracked separately from `nodes` so
  // tick() can swap their shared `.map` each animation frame without having
  // to filter the full node list every frame. Rebuilt alongside `nodes` in
  // setPoints/clearNodes - materials themselves are disposed there already
  // (via disposeNodeMesh), this array just stops referencing them.
  let jumpMaterials = [];

  // Route-line arrows live in their own group, separate from nodeGroup - the
  // idle-spin below only touches nodeGroup's meshes, and an arrowhead cone
  // needs an arbitrary orientation (whatever direction the segment points)
  // that the idle-spin's naive rotation.y increment would otherwise wreck.
  let routeLines = [];
  let routeLineGroup = new THREE.Group();
  scene.add(routeLineGroup);

  function clearNodes() {
    for (const n of nodes) {
      disposeNodeMesh(n.mesh);
      n.dropLine.geometry.dispose();
      n.dropMat.dispose();
      n.spoke.geometry.dispose();
      n.spokeMat.dispose();
      n.label.material.map.dispose();
      n.label.material.dispose();
      if (n.asteroidRing) {
        n.asteroidRing.geometry.dispose();
        n.asteroidRing.material.dispose();
      }
      if (n.routeBeacon) {
        n.routeBeacon.geometry.dispose();
        n.routeBeacon.material.dispose();
      }
    }
    nodeGroup.clear();
    nodes = [];
    jumpMaterials = [];
  }

  function clearRouteLines() {
    for (const r of routeLines) {
      r.lineGeo.dispose();
      r.lineMat.dispose();
      r.coneGeo.dispose();
      r.coneMat.dispose();
    }
    routeLineGroup.clear();
    routeLines = [];
  }

  // Rebuilds the entry -> [refuel base ->] exit arrow through this system,
  // from the already-built node positions - so it must run after the main
  // per-point loop in setPoints below, and again after any animation moves
  // those positions (see updateRouteLines).
  function buildRouteLines(routeSegments) {
    clearRouteLines();
    for (const seg of routeSegments) {
      const fromNode = nodes.find((n) => n.np.id === seg.fromId);
      const toNode = nodes.find((n) => n.np.id === seg.toId);
      if (!fromNode || !toNode) continue;

      const lineGeo = new THREE.BufferGeometry();
      const lineMat = new THREE.LineDashedMaterial({ color: 0xffcc55, dashSize: 1.2, gapSize: 0.8, transparent: true, opacity: 0.9, fog: false });
      const line = new THREE.Line(lineGeo, lineMat);
      routeLineGroup.add(line);

      const coneGeo = new THREE.ConeGeometry(0.5, 1.4, 10);
      const coneMat = new THREE.MeshBasicMaterial({ color: 0xffcc55, transparent: true, opacity: 0.95, fog: false });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      routeLineGroup.add(cone);

      routeLines.push({ fromNode, toNode, line, lineMat, lineGeo, cone, coneGeo, coneMat });
    }
    updateRouteLines();
  }

  // An arrowhead cone points 1.6 units back from the exit point along the
  // segment direction, clear of that node's own sphere/box geometry - the
  // same "don't bury the arrowhead in the target" idea as the SVG marker's
  // refX in the 2D/sector views.
  const ARROWHEAD_GAP = 1.6;

  function updateRouteLines() {
    for (const r of routeLines) {
      const fromPos = r.fromNode.mesh.position;
      const toPos = r.toNode.mesh.position;
      r.line.geometry.setFromPoints([fromPos.clone(), toPos.clone()]);
      r.line.computeLineDistances();

      const dir = toPos.clone().sub(fromPos);
      const dist = dir.length();
      if (dist < 0.001) {
        r.cone.visible = false;
        continue;
      }
      r.cone.visible = true;
      dir.normalize();
      r.cone.position.copy(fromPos).addScaledVector(dir, Math.max(dist - ARROWHEAD_GAP, dist * 0.5));
      r.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    }
  }

  // Cached so setBaseModelsEnabled below can force a rebuild with the same
  // points/route it was last called with - unlike idle-rotation/sky-box
  // (bare flag flips read every frame or on next render), swapping models
  // for placeholders changes actual node geometry and needs setPoints to
  // run again.
  let lastNavPoints = [], lastRouteHighlightIds = new Set(), lastRouteSegments = [];

  function setPoints(navPoints, routeHighlightIds = new Set(), routeSegments = []) {
    lastNavPoints = navPoints;
    lastRouteHighlightIds = routeHighlightIds;
    lastRouteSegments = routeSegments;
    clearNodes();
    // Nodes must be built in whatever layout (orbit vs flat-aligned) is
    // currently active, since `setPoints` can be re-invoked (eg the
    // hidden-points toggle, or a redundant re-run right after mount) while
    // already aligned - it must not silently snap back to the 3D layout.
    const initialOpacity = aligned ? 0.12 : 1;
    for (const np of navPoints) {
      const flat = resolveFlatPosition(np);
      const style = styleForNavPoint(np);
      const pos3d = new THREE.Vector3(np.x * SCALE, np.y * SCALE, np.z * SCALE);
      const pos2d = new THREE.Vector3(((flat.sx - 50) / 50) * FLAT_SPAN, 0, ((flat.sy - 50) / 50) * FLAT_SPAN);
      const initialPos = aligned ? pos2d : pos3d;

      const modelTemplate = (baseModelsOn && np.baseType) ? loadBaseModelTemplate(np.baseType) : null;

      let mesh;
      if (modelTemplate) {
        // Starts as an empty group at the right position/userData so
        // ray-casting and disposal work immediately - the actual model gets
        // added as a child once the (cached, shared) load resolves.
        mesh = new THREE.Group();
        modelTemplate.then((template) => {
          const instance = template.clone(true);
          // Object3D.clone() only deep-clones the node hierarchy - materials
          // and geometry are shared by reference from the cached template,
          // so two nodes using the same model (eg two refinery bases in one
          // system) would otherwise dim/undim each other. Give this instance
          // its own material copies.
          instance.traverse((child) => {
            if (child.material) child.material = child.material.clone();
          });
          if (style.dimmed) {
            instance.traverse((child) => {
              if (child.material) { child.material.transparent = true; child.material.opacity = 0.5; }
            });
          }
          stampUserData(instance, np);
          mesh.add(instance);
        });
      } else if (style.shape === 'sphere' && originalJumpOn) {
        // The original jump sphere, independent of the 3D base-models toggle -
        // unlike Gemini Gold's orb below, this doesn't need a loaded model
        // file to compare against, so it's shown whenever this style is on even
        // with base models off. The real JUMP.IFF frames are a face-on 2D sprite
        // (that's how the original 3Space engine drew it too). A camera-facing
        // THREE.Sprite always shows the frame face-on regardless of view angle,
        // matching how it actually rendered. Normal alpha blending, not
        // additive - the (feathered) sparse undrawn pixels are real transparency,
        // not a glow to add on top of a dark back-drop. But the drawn pixels
        // themselves are still fully opaque per-frame (this VGA-era format
        // has no real per-pixel alpha gradient beyond the mask) - baseOpacity
        // caps the whole sprite well under 1 so it still reads as translucent
        // rather than a solid disc.
        const baseOpacity = 0.35;
        const material = new THREE.SpriteMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: style.dimmed ? baseOpacity * 0.5 : baseOpacity,
          depthWrite: false,
          fog: false,
        });
        jumpMaterials.push(material);
        loadOriginalJumpFrameTextures().then((textures) => {
          material.map = textures[0];
          material.needsUpdate = true;
        });
        mesh = new THREE.Sprite(material);
        // Sized to roughly the same on-screen footprint as the 1.6-radius
        // sphere it replaces (diameter 3.2), corrected for the source
        // frames' own non-square 89x73 aspect ratio so the sprite isn't
        // squashed into an oval.
        mesh.scale.set(3.2 * (89 / 73), 3.2, 1);
      } else if (baseModelsOn && style.shape === 'sphere') {
        // Gemini Gold's jump-point look: an additively-blended animated orb
        // rather than the plain lit sphere below. White base colour so the
        // frame texture's own blue reads unmodified, matching the real asset
        // rather than re-tinting it through style.color.
        const material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: style.dimmed ? 0.5 : 1,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
        });
        jumpMaterials.push(material);
        loadJumpFrameTextures().then((textures) => {
          material.map = textures[0];
          material.needsUpdate = true;
        });
        mesh = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 16), material);
      } else {
        let geometry;
        if (style.shape === 'box') geometry = new THREE.BoxGeometry(2.6, 2.6, 2.6);
        else if (style.shape === 'dot') geometry = new THREE.SphereGeometry(1.0, 14, 14);
        else geometry = new THREE.SphereGeometry(1.6, 16, 16);

        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(style.color),
          emissive: new THREE.Color(style.emissive),
          roughness: 0.5,
          transparent: style.dimmed,
          opacity: style.dimmed ? 0.5 : 1,
        });
        mesh = new THREE.Mesh(geometry, material);
      }
      mesh.position.copy(initialPos);
      mesh.userData = np;
      nodeGroup.add(mesh);

      const dropGeo = new THREE.BufferGeometry().setFromPoints([initialPos.clone(), new THREE.Vector3(initialPos.x, 0, initialPos.z)]);
      const dropMat = new THREE.LineDashedMaterial({ color: 0x335566, dashSize: 0.8, gapSize: 0.6, transparent: true, opacity: initialOpacity });
      const dropLine = new THREE.Line(dropGeo, dropMat);
      dropLine.computeLineDistances();
      nodeGroup.add(dropLine);

      const spokeGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), initialPos.clone()]);
      const spokeMat = new THREE.LineBasicMaterial({ color: 0x2266aa, transparent: true, opacity: initialOpacity * 0.5 });
      const spoke = new THREE.Line(spokeGeo, spokeMat);
      nodeGroup.add(spoke);

      const labelText = np.label + (np.dest ? `: Jump to ${systemName(data, np.dest)}` : (np.baseName ? `: ${np.baseName}` : ''));
      const label = makeLabel(labelText, '#a8e8ff');
      label.position.copy(initialPos).add(new THREE.Vector3(0, 2.8, 0));
      label.userData = np;
      nodeGroup.add(label);

      let asteroidRing = null;
      if (np.asteroids) {
        // A real model's footprint (BASE_MODEL_TARGET_SIZE-normalised, ~4.5
        // units across) is much wider than the plain placeholder box/sphere
        // the ring was originally sized for - widen it so the ring clears the
        // model instead of cutting through it.
        const [ringInner, ringOuter] = modelTemplate ? [3.2, 3.8] : [2.0, 2.5];
        const ringGeo = new THREE.RingGeometry(ringInner, ringOuter, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xa0522d, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
        asteroidRing = new THREE.Mesh(ringGeo, ringMat);
        asteroidRing.rotation.x = -Math.PI / 2;
        asteroidRing.position.copy(initialPos);
        nodeGroup.add(asteroidRing);
      }

      // The route marker is a vertical beacon rather than a ring, so it can't
      // be mistaken for the (also amber-ish) flat asteroid ring lying on the
      // ground plane - and being a cylinder aligned on its own spin axis, the
      // idle rotation below doesn't make it visibly "turn" the way a ring
      // would.
      let routeBeacon = null;
      if (routeHighlightIds.has(np.id)) {
        const beaconGeo = new THREE.CylinderGeometry(0.15, 0.15, ROUTE_BEACON_HEIGHT, 8);
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffee66, transparent: true, opacity: 0.9, fog: false });
        routeBeacon = new THREE.Mesh(beaconGeo, beaconMat);
        routeBeacon.position.copy(initialPos).add(new THREE.Vector3(0, ROUTE_BEACON_HEIGHT / 2, 0));
        nodeGroup.add(routeBeacon);
      }

      nodes.push({ np, mesh, dropLine, dropMat, spoke, spokeMat, label, asteroidRing, routeBeacon, pos3d, pos2d });
    }

    buildRouteLines(routeSegments);
    if (lastEncounterRolls) encounterShips3d.setEncounterShips(lastEncounterRolls, nodes);
  }

  function updateAuxLines(n) {
    const p = n.mesh.position;
    n.dropLine.geometry.setFromPoints([p.clone(), new THREE.Vector3(p.x, 0, p.z)]);
    n.dropLine.computeLineDistances();
    n.spoke.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), p.clone()]);
    n.label.position.copy(p).add(new THREE.Vector3(0, 2.8, 0));
    if (n.asteroidRing) n.asteroidRing.position.copy(p);
    if (n.routeBeacon) n.routeBeacon.position.copy(p).add(new THREE.Vector3(0, ROUTE_BEACON_HEIGHT / 2, 0));
  }

  // --- orbit camera ---
  // Orbit radius has two clamp ranges depending on whether the camera is
  // circling the whole system (pivot at the origin) or focused in on a
  // single base (pivot moved to that base's position, see enterFocus below)
  // - a base model is only ~4.5 units across, so the system-wide 20-220
  // range would either clip through it or view it from a km away.
  const ORBIT_RADIUS_MIN = 20, ORBIT_RADIUS_MAX = 220;
  const FOCUS_RADIUS_MIN = 6, FOCUS_RADIUS_MAX = 25, FOCUS_RADIUS_DEFAULT = 10;
  let radius = 180, theta = Math.PI / 4, phi = Math.PI / 3.2;
  let savedRadius = radius, savedTheta = theta, savedPhi = phi;
  // Orbit pivot: the origin for the whole-system view, or a focused base's
  // world position while zoomed in on it (see enterFocus/exitFocus). Kept as
  // a live vector (rather than always literally the origin) so the same
  // orbitCameraPosition/lookAt maths serves both.
  let target = new THREE.Vector3(0, 0, 0);
  let focused = false;
  let interactionLocked = false;
  let lastInteractionAt = performance.now();
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  function markActivity() { lastInteractionAt = performance.now(); }

  function orbitCameraPosition(r, t, p) {
    return new THREE.Vector3(r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t));
  }
  function updateCameraFromOrbit() {
    camera.up.set(0, 1, 0);
    camera.position.copy(orbitCameraPosition(radius, theta, phi)).add(target);
    camera.lookAt(target);
  }
  updateCameraFromOrbit();

  let dragging = false, lastX = 0, lastY = 0, lastTouchDist = null;

  function onMouseDown(e) {
    if (e.button !== 0) return;
    markActivity();
    canvas.style.cursor = '';
    if (!interactionLocked && !aligned) { dragging = true; lastX = e.clientX; lastY = e.clientY; }
  }
  function onMouseUp() { dragging = false; }
  function onMouseMove(e) {
    if (!dragging || interactionLocked || aligned) return;
    markActivity();
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    theta += dx * 0.005;
    phi = Math.min(Math.max(phi - dy * 0.005, 0.2), Math.PI - 0.2);
    updateCameraFromOrbit();
  }
  function onWheel(e) {
    if (interactionLocked || aligned) return;
    markActivity();
    e.preventDefault();
    const min = focused ? FOCUS_RADIUS_MIN : ORBIT_RADIUS_MIN;
    const max = focused ? FOCUS_RADIUS_MAX : ORBIT_RADIUS_MAX;
    radius = Math.min(Math.max(radius + e.deltaY * 0.05, min), max);
    updateCameraFromOrbit();
  }
  function onTouchStart(e) {
    if (interactionLocked || aligned) return;
    markActivity();
    if (e.touches.length === 1) { dragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }
  }
  function onTouchEnd() { dragging = false; lastTouchDist = null; }
  function onTouchMove(e) {
    if (interactionLocked) return;
    markActivity();
    e.preventDefault();
    if (e.touches.length === 1 && dragging && !aligned) {
      const dx = e.touches[0].clientX - lastX, dy = e.touches[0].clientY - lastY;
      lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
      theta += dx * 0.006;
      phi = Math.min(Math.max(phi - dy * 0.006, 0.2), Math.PI - 0.2);
      updateCameraFromOrbit();
    } else if (e.touches.length === 2 && !aligned) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (lastTouchDist !== null) {
        const min = focused ? FOCUS_RADIUS_MIN : ORBIT_RADIUS_MIN;
        const max = focused ? FOCUS_RADIUS_MAX : ORBIT_RADIUS_MAX;
        radius = Math.min(Math.max(radius - (dist - lastTouchDist) * 0.15, min), max);
        updateCameraFromOrbit();
      }
      lastTouchDist = dist;
    }
  }

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  function pointerNodeTargets() {
    return nodes.flatMap((n) => [n.mesh, n.label]).concat(encounterShips3d.getPickableObjects());
  }
  function setMouseFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }
  function onClick(e) {
    markActivity();
    setMouseFromEvent(e);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(pointerNodeTargets());
    onSelect(hits.length ? hits[0].object.userData : null);
  }
  function onDblClick(e) {
    markActivity();
    setMouseFromEvent(e);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(pointerNodeTargets());
    const np = hits.length ? hits[0].object.userData : null;
    if (np?.dest) { onJump?.(np.dest); return; }
    // Bases don't make sense to zoom into from the flattened 2D-aligned
    // projection (they sit flush on the ground plane there) - the caller
    // (NavMap3D) also disables the align toggle while focused, this is the
    // defensive/entry-point half of that same rule.
    if (np?.baseName && !aligned) onFocusBase?.(np);
  }
  function onHoverMove(e) {
    // Plain cursor movement over the canvas (no click, drag, zoom or touch)
    // deliberately does not reset the idle timer - otherwise the auto-rotate
    // would almost never get a chance to start whenever the pointer merely
    // rests near the view.
    if (dragging || animating) return;
    setMouseFromEvent(e);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(pointerNodeTargets());
    canvas.style.cursor = hits.length ? 'pointer' : '';
  }

  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousemove', onHoverMove);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('touchstart', onTouchStart);
  canvas.addEventListener('touchend', onTouchEnd);
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('dblclick', onDblClick);

  let aligned = false, animating = false;

  function animateToAligned(onDone) {
    // Base-focus and the flattened 2D-aligned projection are mutually
    // exclusive views (a focused base sits flush on the ground plane once
    // flattened) - NavMap3D already disables its align toggle while
    // focused, this guard is the defensive back-stop in the scene itself.
    if (animating || focused) return;
    markActivity();
    animating = true;
    interactionLocked = true;
    savedRadius = radius; savedTheta = theta; savedPhi = phi;
    const startPositions = nodes.map((n) => n.mesh.position.clone());
    const endPositions = nodes.map((n) => n.pos2d.clone());
    const camStart = camera.position.clone(), upStart = camera.up.clone();
    const camEnd = new THREE.Vector3(0, 120, 0.001), upEnd = new THREE.Vector3(0, 0, -1);
    const duration = 1400, t0 = performance.now();
    function step(now) {
      const t = Math.min((now - t0) / duration, 1);
      const e = easeInOutCubic(t);
      nodes.forEach((n, i) => {
        n.mesh.position.lerpVectors(startPositions[i], endPositions[i], e);
        const op = 1 + (0.12 - 1) * e;
        n.dropMat.opacity = op; n.spokeMat.opacity = op * 0.5;
        updateAuxLines(n);
      });
      updateRouteLines();
      camera.position.lerpVectors(camStart, camEnd, e);
      camera.up.lerpVectors(upStart, upEnd, e).normalize();
      camera.lookAt(0, 0, 0);
      if (t < 1) requestAnimationFrame(step);
      else {
        // Reset the idle spin so a box-shaped node's on-screen orientation
        // is always the same in the aligned view, however long it spun for.
        nodes.forEach((n) => n.mesh.rotation.set(0, 0, 0));
        animating = false; interactionLocked = false; aligned = true; onDone && onDone();
      }
    }
    requestAnimationFrame(step);
  }

  // Snaps directly to the aligned/flat layout with no animation, for mounting
  // a fresh system already in the aligned view (no orbit-to-flat flight).
  function setAlignedInstant() {
    nodes.forEach((n) => {
      n.mesh.position.copy(n.pos2d);
      n.dropMat.opacity = 0.12;
      n.spokeMat.opacity = 0.06;
      updateAuxLines(n);
    });
    updateRouteLines();
    camera.position.set(0, 120, 0.001);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);
    aligned = true;
  }

  function animateToOrbit(onDone) {
    if (animating) return;
    markActivity();
    animating = true;
    interactionLocked = true;
    const startPositions = nodes.map((n) => n.mesh.position.clone());
    const endPositions = nodes.map((n) => n.pos3d.clone());
    const camStart = camera.position.clone(), upStart = camera.up.clone();
    const camEnd = orbitCameraPosition(savedRadius, savedTheta, savedPhi), upEnd = new THREE.Vector3(0, 1, 0);
    const duration = 1400, t0 = performance.now();
    function step(now) {
      const t = Math.min((now - t0) / duration, 1);
      const e = easeInOutCubic(t);
      nodes.forEach((n, i) => {
        n.mesh.position.lerpVectors(startPositions[i], endPositions[i], e);
        const op = 0.12 + (1 - 0.12) * e;
        n.dropMat.opacity = op; n.spokeMat.opacity = op * 0.5;
        updateAuxLines(n);
      });
      updateRouteLines();
      camera.position.lerpVectors(camStart, camEnd, e);
      camera.up.lerpVectors(upStart, upEnd, e).normalize();
      camera.lookAt(0, 0, 0);
      if (t < 1) requestAnimationFrame(step);
      else {
        animating = false; interactionLocked = false; aligned = false;
        radius = savedRadius; theta = savedTheta; phi = savedPhi;
        updateCameraFromOrbit();
        onDone && onDone();
      }
    }
    requestAnimationFrame(step);
  }

  // Zooms in on a single base: moves the orbit pivot from the origin to the
  // base's own position and dollies the radius down into FOCUS_RADIUS range,
  // keeping the current theta/phi (viewing angle) throughout rather than
  // animating them too - it reads as 'pushing in on what you're already
  // looking at' instead of snapping to some other angle. Can be called again
  // with a different base while already focused (re-targets base-to-base
  // without returning to the system view first); savedRadius is only
  // captured on the first entry so a later exitFocus still restores the
  // original system-wide zoom level.
  function enterFocus(np, onDone) {
    if (animating || aligned) return;
    const node = nodes.find((n) => n.np === np);
    if (!node) return;
    markActivity();
    animating = true;
    interactionLocked = true;
    if (!focused) savedRadius = radius;
    const targetStart = target.clone();
    const targetEnd = node.pos3d.clone();
    const radiusStart = radius;
    const duration = 1200, t0 = performance.now();
    function step(now) {
      const t = Math.min((now - t0) / duration, 1);
      const e = easeInOutCubic(t);
      target.lerpVectors(targetStart, targetEnd, e);
      radius = radiusStart + (FOCUS_RADIUS_DEFAULT - radiusStart) * e;
      updateCameraFromOrbit();
      if (t < 1) requestAnimationFrame(step);
      else { animating = false; interactionLocked = false; focused = true; onDone?.(); }
    }
    requestAnimationFrame(step);
  }

  // Reverses enterFocus: pivot glides back to the origin and radius back to
  // whatever it was before the system's first focus entry, again holding the
  // current theta/phi rather than restoring an old angle.
  function exitFocus(onDone) {
    if (animating || !focused) return;
    markActivity();
    animating = true;
    interactionLocked = true;
    const targetStart = target.clone();
    const radiusStart = radius;
    const duration = 1200, t0 = performance.now();
    function step(now) {
      const t = Math.min((now - t0) / duration, 1);
      const e = easeInOutCubic(t);
      target.lerpVectors(targetStart, ORIGIN, e);
      radius = radiusStart + (savedRadius - radiusStart) * e;
      updateCameraFromOrbit();
      if (t < 1) requestAnimationFrame(step);
      else { animating = false; interactionLocked = false; focused = false; target.set(0, 0, 0); onDone?.(); }
    }
    requestAnimationFrame(step);
  }

  function resize(width, height) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  let rafId = null;
  function tick() {
    rafId = requestAnimationFrame(tick);
    if (!animating) nodeGroup.children.forEach((c) => { if (c instanceof THREE.Mesh || c instanceof THREE.Group) c.rotation.y += NODE_IDLE_SPIN_SPEED; });
    if (jumpMaterials.length) {
      const textures = originalJumpOn ? originalJumpTextures : jumpTextures;
      const sequence = originalJumpOn ? ORIGINAL_JUMP_FRAME_SEQUENCE : JUMP_FRAME_SEQUENCE;
      if (textures) {
        const step = Math.floor((performance.now() - jumpAnimStartTime) / JUMP_FRAME_INTERVAL_MS) % sequence.length;
        if (step !== lastJumpFrameIdx) {
          lastJumpFrameIdx = step;
          const texture = textures[sequence[step]];
          for (const mat of jumpMaterials) { mat.map = texture; mat.needsUpdate = true; }
        }
      }
    }
    if (
      idleRotationOn && !animating && !aligned && !dragging && !interactionLocked && !prefersReducedMotion &&
      performance.now() - lastInteractionAt > IDLE_ROTATE_DELAY_MS
    ) {
      theta -= AUTO_ROTATE_SPEED;
      updateCameraFromOrbit();
    }
    encounterShips3d.tick(camera);
    renderer.render(scene, camera);
  }
  tick();

  function dispose() {
    cancelAnimationFrame(rafId);
    clearNodes();
    clearRouteLines();
    encounterShips3d.dispose();
    for (const sprite of backdropGroup.children) {
      if (!(sprite instanceof THREE.Sprite)) continue;
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousemove', onHoverMove);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchend', onTouchEnd);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('click', onClick);
    canvas.removeEventListener('dblclick', onDblClick);
    renderer.dispose();
  }

  return {
    setPoints,
    animateToAligned,
    animateToOrbit,
    setAlignedInstant,
    enterFocus,
    exitFocus,
    resize,
    dispose,
    isAligned: () => aligned,
    isFocused: () => focused,
    setIdleRotationEnabled: (v) => { idleRotationOn = v; },
    setSkyboxEnabled: (v) => { backdropGroup.visible = v; },
    setBaseModelsEnabled: (v) => {
      baseModelsOn = v;
      setPoints(lastNavPoints, lastRouteHighlightIds, lastRouteSegments);
    },
    setOriginalJumpSphereEnabled: (v) => {
      originalJumpOn = v;
      lastJumpFrameIdx = -1;
      setPoints(lastNavPoints, lastRouteHighlightIds, lastRouteSegments);
    },
    setEncounterShips: (rollsMap) => {
      lastEncounterRolls = rollsMap;
      encounterShips3d.setEncounterShips(rollsMap, nodes);
    },
    setEncounterSpritesEnabled: (v) => encounterShips3d.setVisible(v),
  };
}
