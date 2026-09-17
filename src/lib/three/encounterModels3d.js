import * as THREE from 'three';
import { spriteSizeFor } from '../utils/encounterLayout.js';
import { getGLTFLoader } from './gltfLoader.js';
import { createOrbitParams, orbitStateAt } from './encounterOrbit.js';

// Real-3D-model alternative to encounterSprites3d.js's rotation-sprite
// billboards - a parallel implementation, not a replacement (see
// createNavScene.js for which one is actually wired in). Each ship instance
// is a real glTF ship model following the exact same orbit (position/speed/
// plane, see encounterOrbit.js) as the sprite version, so switching between
// the two never relocates a ship - only how it's drawn changes. No
// frame-picking is needed here: the model's own local forwards/up axes are
// just rotated every tick to track the orbit's actual travel direction and
// (non-banking) plane normal, like any other oriented 3D object.

// Ship ID (gemini.json's internal sprite-file id - see ships.js's
// SHIP_NAMES) -> the .glb converted from the same Origin ship sources via
// the station-model pipeline (assimp .3ds -> obj -> Blender ->
// gltf-transform Draco). All 16 measured Y-up already (their bounding box's
// smallest dimension is always Y).
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

export const LOCAL_UP = new THREE.Vector3(0, 1, 0);

// Ship models weren't authored to a shared nose-axis convention (some run
// their fuselage along local X, others along local Z), so which horizontal
// axis is 'forwards' is guessed per model from its own bounding box (the
// longer of X/Z) - a real guess, not a rule: it's wrong for any hull whose
// wingspan is wider than its fuselage is long (confirmed visually on
// Dralthi and Broadsword, both flying sideways/starboard-leading - their
// wings are wider than their fuselage, so the longer-axis guess picked the
// wing axis instead of the nose-tail one). FORWARD_AXIS_OVERRIDES below
// corrects those by ship ID. Which *end* of the (possibly overridden) axis
// is the nose (vs the tail) comes from a cheap pointiness heuristic: real
// vertex data near each end of the axis is checked for cross-sectional
// spread (perpendicular to the axis, ie in the up/right plane), and the
// narrower/tapered end is taken as the nose - also just a first-pass guess,
// see NOSE_SIGN_OVERRIDES below for hulls where it's been found backwards.
const FORWARD_AXIS_OVERRIDES = {
  DRALTHI: 'z',
  BRDSWORD: 'z',
  GOTHRI: 'z',
  GLADIUS: 'z',
};

function inferLocalForward(template, shipId) {
  const box = new THREE.Box3().setFromObject(template);
  const size = box.getSize(new THREE.Vector3());
  const axis = FORWARD_AXIS_OVERRIDES[shipId] ?? (size.x >= size.z ? 'x' : 'z');

  template.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  const samples = [];
  let min = Infinity, max = -Infinity;
  template.traverse((child) => {
    if (!child.isMesh) return;
    const posAttr = child.geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i).applyMatrix4(child.matrixWorld);
      const a = axis === 'x' ? v.x : v.z;
      const r = axis === 'x' ? v.z : v.x;
      if (a < min) min = a;
      if (a > max) max = a;
      samples.push(a, r, v.y);
    }
  });

  let sign = 1;
  if (isFinite(min) && isFinite(max) && max - min > 1e-6) {
    const range = max - min;
    const bandStart = min + range * 0.2, bandEnd = max - range * 0.2;
    let minR2 = 0, minN = 0, maxR2 = 0, maxN = 0;
    for (let i = 0; i < samples.length; i += 3) {
      const a = samples[i], r = samples[i + 1], y = samples[i + 2];
      const r2 = r * r + y * y;
      if (a <= bandStart) { minR2 += r2; minN++; }
      else if (a >= bandEnd) { maxR2 += r2; maxN++; }
    }
    // Narrower (smaller mean cross-sectional radius) end is the nose.
    if (minN && maxN && maxR2 / maxN > minR2 / minN) sign = -1;
  }

  return new THREE.Vector3(axis === 'x' ? sign : 0, 0, axis === 'z' ? sign : 0);
}

// inferLocalForward's pointiness heuristic gets the nose/tail end backwards
// for some hulls (confirmed visually: Paradigm/FRIGATE, Demon/DEMON and
// Dralthi/DRALTHI all flew tail-first) - rather than fight the heuristic
// further, just flip the sign for whichever ship IDs are found flying
// backwards.
const NOSE_SIGN_OVERRIDES = {
  FRIGATE: -1,
  DEMON: -1,
  DRALTHI: -1,
  TUG: -1,
};

// Full yaw/pitch/roll correction (degrees, applied on top of the axis/sign
// guesses above via applyOrientationCorrection) for hulls whose true
// nose-tail/dorsal lines aren't axis-aligned at all - a genuinely different
// problem from the 90/180deg axis-or-sign misses above, and not one the
// bounding-box/pointiness heuristics can detect (they only ever choose among
// +/-X, +/-Z and the fixed LOCAL_UP). Confirmed needed on Paradigm/FRIGATE
// (visibly not lined up with its actual direction of travel, on more than
// one axis). yawDeg rotates about the base up axis, pitchDeg about the
// resulting right axis, rollDeg about the resulting forwards axis - see
// applyOrientationCorrection.
export const SHIP_ORIENTATION_CORRECTIONS = {
  FRIGATE: { yawDeg: 37, pitchDeg: -15, rollDeg: 7 },
};

const tmpCorrRight = new THREE.Vector3();

// Rotates a (forwards, up) pair - assumed unit and mutually orthogonal - by
// an intrinsic yaw/pitch/roll sequence: yaw about `up`, then pitch about the
// resulting right axis (forwards x up... see orientationQuaternion for why
// the handedness of 'right' doesn't actually matter here), then roll about
// the resulting forwards axis. Returns a new {forwards, up} pair, still unit
// and mutually orthogonal. Used both to apply a baked-in
// SHIP_ORIENTATION_CORRECTIONS entry and, in the debug harness, to preview
// one live before baking it in.
export function applyOrientationCorrection(forward, up, { yawDeg = 0, pitchDeg = 0, rollDeg = 0 } = {}) {
  const outForward = forward.clone();
  const outUp = up.clone();
  if (yawDeg) {
    outForward.applyAxisAngle(outUp, (yawDeg * Math.PI) / 180);
  }
  if (pitchDeg) {
    tmpCorrRight.crossVectors(outForward, outUp).normalize();
    const rad = (pitchDeg * Math.PI) / 180;
    outForward.applyAxisAngle(tmpCorrRight, rad);
    outUp.applyAxisAngle(tmpCorrRight, rad);
  }
  if (rollDeg) {
    outUp.applyAxisAngle(outForward, (rollDeg * Math.PI) / 180);
  }
  return { forward: outForward, up: outUp };
}

// The axis/sign guesses only, before any SHIP_ORIENTATION_CORRECTIONS entry
// is applied - exported so the debug harness can preview a correction live
// from the same starting point loadShipModelTemplate itself bakes in from,
// rather than compounding a live preview on top of an already-corrected
// frame (which would make the sliders' final numbers not directly usable as
// a SHIP_ORIENTATION_CORRECTIONS entry).
export function computeUncorrectedLocalForward(template, shipId) {
  const localForward = inferLocalForward(template, shipId);
  if (NOSE_SIGN_OVERRIDES[shipId] === -1) localForward.negate();
  return localForward;
}

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
          // right and for the nose-detection sampling above to be meaningful.
          const scaledBox = new THREE.Box3().setFromObject(template);
          const center = scaledBox.getCenter(new THREE.Vector3());
          template.position.sub(center);
          // Bbox-centre recentring isn't the same as centring on a hull's
          // true left-right centreline, so an asymmetric model (confirmed on
          // Paradigm) can end up flying with a slight lateral offset from
          // its nav-point anchor. Left uncorrected for now: unlike the
          // sprites (whose anchor has to sit exactly on the texture's own
          // registration point for THREE.Sprite's mirroring to show
          // correctly), a real mesh is never mirrored, so this doesn't need
          // the same precision.
          const baseForward = computeUncorrectedLocalForward(template, shipId);
          const correction = SHIP_ORIENTATION_CORRECTIONS[shipId];
          const { forward: localForward, up: localUp } = correction
            ? applyOrientationCorrection(baseForward, LOCAL_UP, correction)
            : { forward: baseForward, up: LOCAL_UP.clone() };
          return { template, localForward, localUp };
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
// for localForward/localUp - see applyOrientationCorrection). Built by
// expressing each orthonormal triple (forward, up, and a third 'right' axis
// derived the same way on both sides via a cross product) as a basis matrix
// and composing world*local^-1 - this works out to a proper rotation
// regardless of which handedness the cross product happens to produce,
// since it's applied identically on both sides.
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
