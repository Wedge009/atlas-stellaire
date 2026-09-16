import * as THREE from 'three';
import { shipMaxSpeed } from '../utils/ships.js';
import { spriteSizeFor } from '../utils/encounterLayout.js';
import { loadShipFrames } from './shipSpriteFrames.js';

// Reproduces the original engine's rotation-sprite scheme for a full 3D
// orientation: each ship flies a real nose-first circular orbit around its
// nav point (closed-form in time, no integrated state), and every tick picks
// a frame texture from where the camera sits relative to the ship's own body
// axes, plus an in-plane sprite rotation to keep the ship's 'up' aligned on
// screen.
//
// The 37 frames are a proper 2-parameter view-sphere sampling, in the ship's
// own body frame (forwards = nose/velocity, up = dorsal reference):
//   - 7 'elevation' levels from +90 deg (camera above, looking down the
//     dorsal axis) to -90 deg (camera below, looking up the ventral side),
//     30 deg apart: +90, +60, +30, 0 (level with the ship), -30, -60, -90.
//   - The two pole levels (+/-90) are a single frame each (0 and 36) - at a
//     true pole, azimuth around the nose axis is degenerate.
//   - The 5 non-pole levels each store 7 frames sampling azimuth (angle
//     around the ship's up axis, measured from 'camera in front of the
//     nose' = 0 deg to 'camera behind the ship' = 180 deg) in 30 deg steps:
//     0(nose-on), 30, 60, 90(profile), 120, 150, 180(rear-on). Azimuths past
//     180 deg (the other side) aren't stored separately - they're the same
//     frame horizontally mirrored, a common rotation-sprite space-saving
//     trick.
// Frame index = 1 + ringIndex*7 + azimuthIndex for the 5 rings (in the order
// above, top to bottom), or 0 / 36 for the poles.
const ELEVATION_RING_COUNT = 5;
const AZIMUTH_STEPS_PER_RING = 7; // 0,30,...,180 deg
const POLE_TOP_FRAME = 0;
const POLE_BOTTOM_FRAME = 36;
const STEP = Math.PI / 6; // 30 deg

// Cheap deterministic per-instance seeding (mulberry32 + a string hash) so
// orbit shape/phase/tilt stay stable across re-renders of the same
// system/nav-point/ship/instance, but vary across different instances -
// same spirit as EncounterSprites.svelte's layoutCluster, just for orbit
// shells instead of a static packed cluster.
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Orbit shells start clear of a node's own placeholder/model footprint and
// step outwards per-instance by a fixed amount (not by cumulative ship size -
// a single oversized hull like the Paradigm/FRIGATE would otherwise push
// every ship after it in the group out far enough to collide with
// neighbouring nav points). Sprite *visual* size still scales with
// spriteSizeFor - only orbit spacing is decoupled from it here.
const ORBIT_BASE_RADIUS = 5;
const ORBIT_SHELL_STEP = 2.2;
// Per-instance orbit-plane tilt off level, seeded per instance so a
// multi-ship encounter spreads through vertical space instead of every ship
// sharing one flat ring at the same height - concentric-only spacing reads
// as flat and needs more radius to avoid clipping than tilting instances
// into different planes does.
const MAX_ORBIT_TILT = Math.PI * 0.45; // ~81 deg, so orbits can run quite steep
// Tuned so real per-ship max speeds (200-500 kps, see ships.js) turn into a
// plausible-looking on-screen orbital speed - fast ship classes
// (Gladius/Centurion, 500) visibly lap slow ones (Frigate/Drayman, 200)
// rather than all orbiting at the same rate.
const SPEED_SCALE = 0.006;
// In-plane sprite rotation is a roll around the view axis to make a known
// reference direction within the current frame image line up with how it
// actually projects on screen. Away from the poles, that reference is the
// ship's dorsal 'up' axis (frame15's confirmed 'top of ship is up' pose);
// at the poles (frame 0/36) `up` points straight at/away from the camera and
// is degenerate there, so `forward` (the nose) is used instead, matching
// both poles' confirmed 'nose towards bottom of image' pose. Both are
// first-pass guesses at the baseline offset between 'aligned with screen
// up/down' and atan2(screenY, screenX) - expect to keep calibrating visually.
const UP_ROTATION_OFFSET = -Math.PI / 2;
const FORWARD_ROTATION_OFFSET = Math.PI / 2;
const AXIS_EPSILON = 1e-4;

function basisFromNormal(n) {
  const arbitrary = Math.abs(n.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(arbitrary, n).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();
  return { u, v };
}

const tmpCamQuat = new THREE.Quaternion();

// Screen right/up for sprite rotation, read directly off the camera's actual
// world orientation - this has to match what the GPU's sprite shader itself
// uses (view-space X/Y, ie the real camera's world-space right/up), or the
// computed rotation will disagree with what's actually rendered.
export function computeScreenBasis(camera, outRight, outUp) {
  camera.getWorldQuaternion(tmpCamQuat);
  outRight.set(1, 0, 0).applyQuaternion(tmpCamQuat);
  outUp.set(0, 1, 0).applyQuaternion(tmpCamQuat);
}

// Picks a (frameIndex, flipX) pair from the camera's view direction relative
// to the ship's own forwards/up axes - see the frame-grid comment above.
// `viewDir` is the normalised direction from ship to camera; `forward`/`up`
// are the ship's own unit body axes (forward = nose/velocity, up = dorsal
// reference, mutually perpendicular by construction of the orbit below).
export function pickFrame(viewDir, forward, up) {
  const elevation = Math.asin(Math.min(1, Math.max(-1, viewDir.dot(up))));
  let levelIdx = Math.round(elevation / STEP); // -3..3
  levelIdx = Math.min(3, Math.max(-3, levelIdx));

  if (levelIdx === 3) return { frameIndex: POLE_TOP_FRAME, flip: false, isPole: true };
  if (levelIdx === -3) return { frameIndex: POLE_BOTTOM_FRAME, flip: false, isPole: true };

  // Which physical side of the ship 'azimuth +90 / unflipped' corresponds to
  // is an arbitrary handedness choice that has to match the original
  // renderer's own convention for frame18 etc, not something that can be
  // derived from pure geometry, so this is forwards x up rather than up x
  // forwards.
  const right = new THREE.Vector3().crossVectors(forward, up);
  const perp = viewDir.clone().addScaledVector(up, -viewDir.dot(up));
  const perpLen = perp.length();
  if (perpLen < AXIS_EPSILON) return null; // degenerate - hold the previous frame

  perp.multiplyScalar(1 / perpLen);
  const beta = Math.atan2(perp.dot(right), perp.dot(forward)); // 0 = nose-on, +/-pi = rear-on
  const flip = beta < 0;
  const azimuthIdx = Math.min(AZIMUTH_STEPS_PER_RING - 1, Math.round(Math.abs(beta) / STEP));
  const ringIdx = ELEVATION_RING_COUNT === 5 ? 2 - levelIdx : 0; // level +60,+30,0,-30,-60 -> ring 0..4
  const frameIndex = 1 + ringIdx * AZIMUTH_STEPS_PER_RING + azimuthIdx;
  return { frameIndex, flip, isPole: false };
}

// Combines pickFrame() with the in-plane rotation needed to line up a known
// reference direction within that frame with how it actually projects on to
// the screen. Off the poles that reference is `up` (dorsal) - but `up` stays
// close to constant for a near-level orbit, so a ship viewed from
// near-directly above/below sits at (or very near) the pole frame for its
// *entire* orbit, and aligning on `up` there is degenerate (it points
// straight at/away from the camera) - which would mean the rotation never
// updates at all as the ship flies its circle. `forward` (the nose) is never
// degenerate at the poles - only at nose/tail-on views within a ring, where
// `up` is used instead - so switching basis exactly at the pole keeps the
// sprite's drawn heading tracking the ship's actual travel direction the
// whole way round. `screenRight`/`screenUp` come from computeScreenBasis().
// Returns null if pickFrame() itself was degenerate (hold the previous
// frame/flip/rotation entirely); `rotation` alone can be null within an
// otherwise-valid result (hold just the previous rotation).
export function resolveShipSprite(viewDir, forward, up, screenRight, screenUp) {
  const picked = pickFrame(viewDir, forward, up);
  if (!picked) return null;

  const refVector = picked.isPole ? forward : up;
  const rotationOffset = picked.isPole ? FORWARD_ROTATION_OFFSET : UP_ROTATION_OFFSET;
  const screenX = refVector.dot(screenRight);
  const screenY = refVector.dot(screenUp);
  const rotation = screenX * screenX + screenY * screenY > AXIS_EPSILON
    ? Math.atan2(screenY, screenX) + rotationOffset
    : null;

  return { frameIndex: picked.frameIndex, flip: picked.flip, rotation };
}

export function createEncounterSprites3d({ scene, systemId }) {
  let visible = true;
  let entries = []; // one per ship sprite instance
  let anchors = new Map(); // navPointId -> THREE.Group
  const startTime = performance.now();

  function disposeAll() {
    for (const anchor of anchors.values()) {
      anchor.traverse((child) => {
        if (child.isSprite) child.material.dispose();
      });
      scene.remove(anchor);
    }
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
        const seed = hashSeed(`${systemId}:${navPointId}:${s.ship}:${s.instanceIndex}`);
        const rand = mulberry32(seed);
        const size = spriteSizeFor(s.ship);
        const radius = ORBIT_BASE_RADIUS + i * ORBIT_SHELL_STEP;

        const tiltAngle = rand() * MAX_ORBIT_TILT;
        const tiltAxisAngle = rand() * Math.PI * 2;
        const tiltAxis = new THREE.Vector3(Math.cos(tiltAxisAngle), 0, Math.sin(tiltAxisAngle));
        const planeNormal = new THREE.Vector3(0, 1, 0).applyAxisAngle(tiltAxis, tiltAngle).normalize();
        const { u, v } = basisFromNormal(planeNormal);
        const phase = rand() * Math.PI * 2;
        const direction = rand() < 0.5 ? 1 : -1;
        const maxSpeed = shipMaxSpeed(s.ship) ?? 300;
        const angularSpeed = direction * (maxSpeed * SPEED_SCALE) / radius;

        const material = new THREE.SpriteMaterial({
          color: 0xffffff,
          transparent: true,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(size, size, 1);
        sprite.userData = node.np;
        anchor.add(sprite);

        const entry = {
          sprite, material, anchor, u, v, up: planeNormal, radius, phase, angularSpeed,
          frames: null, lastFrameIndex: -1, lastFlip: false,
        };
        entries.push(entry);
        loadShipFrames(s.ship).then((frames) => { entry.frames = frames; });
      });
    }
  }

  const tmpWorldPos = new THREE.Vector3();
  const tmpForward = new THREE.Vector3();
  const tmpViewDir = new THREE.Vector3();
  const tmpRight = new THREE.Vector3();
  const tmpUp = new THREE.Vector3();

  function tick(camera) {
    if (!visible || !entries.length) return;
    const t = (performance.now() - startTime) / 1000;
    computeScreenBasis(camera, tmpRight, tmpUp);

    // Anchors track their node's live position every tick (align/orbit flight
    // animation, or the per-frame idle spin) since they're siblings of
    // nodeGroup, not children of it.
    for (const anchor of anchors.values()) anchor.position.copy(anchor.userData.node.mesh.position);

    for (const entry of entries) {
      const angle = entry.phase + entry.angularSpeed * t;
      const cosA = Math.cos(angle), sinA = Math.sin(angle);
      entry.sprite.position.set(
        entry.u.x * cosA * entry.radius + entry.v.x * sinA * entry.radius,
        entry.u.y * cosA * entry.radius + entry.v.y * sinA * entry.radius,
        entry.u.z * cosA * entry.radius + entry.v.z * sinA * entry.radius
      );
      // Nose-first: forwards is the instantaneous direction of travel, ie
      // d/dangle of the position above, signed by orbit direction so ships
      // running the loop backwards (angularSpeed < 0) still face the way
      // they're actually moving.
      const dirSign = Math.sign(entry.angularSpeed) || 1;
      tmpForward
        .set(
          (-entry.u.x * sinA + entry.v.x * cosA) * dirSign,
          (-entry.u.y * sinA + entry.v.y * cosA) * dirSign,
          (-entry.u.z * sinA + entry.v.z * cosA) * dirSign
        )
        .normalize();

      if (!entry.frames) continue; // stay untextured (white) until loaded

      // sprite.position is anchor-local; the anchor sits at the node's world
      // position with no rotation/scale of its own, so world position is a
      // plain add.
      tmpWorldPos.copy(entry.anchor.position).add(entry.sprite.position);
      tmpViewDir.copy(camera.position).sub(tmpWorldPos).normalize();

      const resolved = resolveShipSprite(tmpViewDir, tmpForward, entry.up, tmpRight, tmpUp);
      if (!resolved) continue; // hold whatever the sprite last showed

      if (resolved.frameIndex !== entry.lastFrameIndex || resolved.flip !== entry.lastFlip) {
        entry.lastFrameIndex = resolved.frameIndex;
        entry.lastFlip = resolved.flip;
        entry.material.map = (resolved.flip ? entry.frames.flipped : entry.frames.textures)[resolved.frameIndex];
        entry.material.needsUpdate = true;
      }
      if (resolved.rotation !== null) entry.sprite.material.rotation = resolved.rotation;
    }
  }

  function setVisible(v) {
    visible = v;
    for (const anchor of anchors.values()) anchor.visible = v;
  }

  function getPickableObjects() {
    return entries.map((e) => e.sprite);
  }

  function dispose() {
    disposeAll();
  }

  return { setEncounterShips, tick, setVisible, getPickableObjects, dispose };
}
