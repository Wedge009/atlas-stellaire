import * as THREE from 'three';
import { spriteSizeFor } from '../utils/encounterLayout.js';
import { getGLTFLoader } from './gltfLoader.js';
import { createOrbitParams, orbitStateAt } from './encounterOrbit.js';

// Real-3D-model alternative to encounterSprites3d.js's rotation-based
// sprites - a parallel implementation, not a replacement (see
// createNavScene.js for which one is actually wired in). Each ship instance
// is a real glTF ship model following the same orbit (position/speed/plane,
// see encounterOrbit.js) as the sprite version, so switching between the
// two never relocates a ship - only how it's drawn changes. No
// frame-picking is needed here: the model's own local forwards/up axes are
// just rotated every tick to track the orbit's actual travel direction and
// (non-banking) plane normal, like any other oriented 3D object.

// Ship ID (gemini.json's internal sprite-file ID - see ships.js's
// SHIP_NAMES) -> the .glb converted from the same Origin ship sources via
// the station-model pipeline (assimp .3ds -> obj -> Blender ->
// gltf-transform Draco). Every model is verified in Blender to a shared
// nose-at-local-negative-Z/dorsal-at-local-+Y convention (LOCAL_FORWARD/LOCAL_UP
// below) before export, with that rotation baked in (Object > Apply >
// Rotation) - so no per-ship orientation guessing is needed here. NB the
// alignment itself must be done using *Blender's own* Z-up viewport axes,
// not glTF's Y-up ones: Blender's exporter converts
// (x,y,z)_blender -> (x,z,-y)_gltf on export (confirmed empirically), so in
// Blender's own viewport this means nose -> Blender's +Y (green) and
// dorsal/top -> Blender's own +Z (blue, its native up).
const SHIP_MODEL_FILES = {
  BRDSWORD: 'broadsword',
  CLUNKER: 'tarsus',
  DEMON: 'demon',
  DRALTHI: 'dralthi',
  DRAYMAN: 'drayman',
  FIGHTER: 'centurion',
  FRIGATE: 'paradigm',
  GLADIUS: 'gladius',
  GOTHRI: 'gothri',
  KAMEKH: 'kamekh',
  MERCHANT: 'galaxy',
  STILETTO: 'stiletto',
  TALMIL: 'talon-militia',
  TALPIR: 'talon-pirate',
  TALRELIG: 'talon-retro',
  TUG: 'orion',
};

// Every template is normalised to this longest-bbox-dimension size before
// any per-instance scaling - cancels out each source file's arbitrary export
// scale (they vary wildly, eg Broadsword's raw longest dimension is ~115
// units, Kamekh's ~4382), so the real relative hull size (spriteSizeFor,
// same SHIP_SIZES data the 2D/sprite-3D views use) is the only thing that
// determines an instance's final on-screen size.
const MODEL_UNIT_SIZE = 1;
const modelTemplateCache = new Map();

// Every ship model's own local forwards/up axes, per the shared authoring
// convention (see SHIP_MODEL_FILES above) - the same for every ship, so no
// per-model computation is needed.
export const LOCAL_UP = new THREE.Vector3(0, 1, 0);
export const LOCAL_FORWARD = new THREE.Vector3(0, 0, -1);

export function loadShipModelTemplate(shipId) {
  const file = SHIP_MODEL_FILES[shipId];
  if (!file) return null;
  if (!modelTemplateCache.has(shipId)) {
    modelTemplateCache.set(
      shipId,
      getGLTFLoader()
        .then((loader) => loader.loadAsync(`${import.meta.env.BASE_URL}assets/models/${file}.glb`))
        .then((gltf) => {
          const template = gltf.scene;
          const box = new THREE.Box3().setFromObject(template);
          const size = box.getSize(new THREE.Vector3());
          const longest = Math.max(size.x, size.y, size.z) || 1;
          template.scale.setScalar(MODEL_UNIT_SIZE / longest);
          // Re-centre after scaling, same reasoning as loadBaseModelTemplate
          // in createNavScene.js - these source files don't have a centred
          // pivot, and this template's local origin needs to be its own
          // visual centre for the orbit position to land where it looks
          // right.
          const scaledBox = new THREE.Box3().setFromObject(template);
          const center = scaledBox.getCenter(new THREE.Vector3());
          template.position.sub(center);
          // Bbox-centre recentring isn't the same as centring on a hull's
          // true left-right centreline, so an asymmetric model can end up
          // flying with a slight lateral offset from its nav-point anchor.
          // Left uncorrected: unlike the sprites (whose anchor has to sit
          // exactly on the texture's own registration point for
          // THREE.Sprite's mirroring to show correctly), a real mesh is
          // never mirrored, so this doesn't need the same precision.
          return { template, localForward: LOCAL_FORWARD, localUp: LOCAL_UP };
        })
    );
  }
  return modelTemplateCache.get(shipId);
}

// A loaded model's meshes carry no userData of their own, so click/hover
// ray-casting (which reads `hit.object.userData` expecting the navPoint)
// would silently break unless every descendant is stamped - same helper as
// createNavScene.js's own stampUserData for base models.
function stampUserData(object3d, np) {
  object3d.traverse((child) => { child.userData = np; });
}

function disposeInstance(group) {
  group.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  });
}

const tmpWorldRight = new THREE.Vector3();
const tmpLocalRight = new THREE.Vector3();
const tmpLocalBasis = new THREE.Matrix4();
const tmpWorldBasis = new THREE.Matrix4();
const tmpRotMatrix = new THREE.Matrix4();

// Quaternion mapping the model's own local forwards/up axes on to the given
// world forwards/up directions. Both pairs are unit and mutually orthogonal
// (guaranteed for the orbit's own forward/plane-normal, and by construction
// for LOCAL_FORWARD/LOCAL_UP). Built by expressing each orthonormal triple
// (forwards, up, and a third 'right' axis derived the same way on both sides
// via a cross product) as a basis matrix and composing world*local^-1 - this
// works out to a proper rotation regardless of which handedness the cross
// product happens to produce, since it's applied identically on both sides.
export function orientationQuaternion(worldForward, worldUp, localForward, localUp, outQuat) {
  tmpWorldRight.crossVectors(worldForward, worldUp);
  tmpLocalRight.crossVectors(localForward, localUp);
  tmpLocalBasis.makeBasis(tmpLocalRight, localUp, localForward).invert();
  tmpWorldBasis.makeBasis(tmpWorldRight, worldUp, worldForward);
  tmpRotMatrix.multiplyMatrices(tmpWorldBasis, tmpLocalBasis);
  outQuat.setFromRotationMatrix(tmpRotMatrix);
}

export function createEncounterModels3d({ scene, systemId }) {
  let visible = true;
  let entries = []; // one per ship instance
  let anchors = new Map(); // navPointId -> THREE.Group

  const startTime = performance.now();

  function disposeAll() {
    for (const entry of entries) disposeInstance(entry.group);
    for (const anchor of anchors.values()) scene.remove(anchor);
    anchors.clear();
    entries = [];
  }

  function setEncounterShips(rollsMap, nodes) {
    disposeAll();
    if (!rollsMap) return;

    for (const [navPointId, ships] of rollsMap) {
      if (!ships?.length) continue;
      const node = nodes.find((n) => n.np.id === navPointId);
      if (!node) continue;

      const anchor = new THREE.Group();
      anchor.position.copy(node.mesh.position);
      anchor.visible = visible;
      anchor.userData = { node };
      scene.add(anchor);
      anchors.set(navPointId, anchor);

      ships.forEach((s, i) => {
        const orbit = createOrbitParams({ systemId, navPointId, shipId: s.ship, instanceIndex: s.instanceIndex, shellIndex: i });
        const size = spriteSizeFor(s.ship);

        // group carries position/orientation/scale every tick; the loaded
        // instance (added once its template resolves) stays at local
        // identity underneath it.
        const group = new THREE.Group();
        group.scale.setScalar(size);
        anchor.add(group);

        const entry = { group, anchor, orbit, up: orbit.up, localForward: null, localUp: null };
        entries.push(entry);

        loadShipModelTemplate(s.ship)?.then(({ template, localForward, localUp }) => {
          const instance = template.clone(true);
          // Object3D.clone() only deep-clones the node hierarchy - materials
          // are shared by reference from the cached template, so two
          // instances of the same ship would otherwise share one material
          // (harmless today with no per-instance dimming/tinting, but cheap
          // to keep isolated in case that changes).
          instance.traverse((child) => {
            if (child.material) child.material = child.material.clone();
          });
          stampUserData(instance, node.np);
          group.add(instance);
          entry.localForward = localForward;
          entry.localUp = localUp;
        });
      });
    }
  }

  const tmpPosition = new THREE.Vector3();
  const tmpForward = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();

  function tick() {
    if (!visible || !entries.length) return;
    const t = (performance.now() - startTime) / 1000;

    // Anchors track their node's live position every tick (align/orbit
    // flight animation, or the per-frame idle spin) since they're siblings
    // of nodeGroup, not children of it.
    for (const anchor of anchors.values()) anchor.position.copy(anchor.userData.node.mesh.position);

    for (const entry of entries) {
      orbitStateAt(entry.orbit, t, tmpPosition, tmpForward);
      entry.group.position.copy(tmpPosition);
      if (entry.localForward) {
        orientationQuaternion(tmpForward, entry.up, entry.localForward, entry.localUp, tmpQuat);
        entry.group.quaternion.copy(tmpQuat);
      }
    }
  }

  function setVisible(v) {
    visible = v;
    for (const anchor of anchors.values()) anchor.visible = v;
  }

  function getPickableObjects() {
    return entries.map((e) => e.group);
  }

  function dispose() {
    disposeAll();
  }

  return { setEncounterShips, tick, setVisible, getPickableObjects, dispose };
}
