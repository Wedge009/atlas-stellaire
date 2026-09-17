import * as THREE from 'three';
import { shipMaxSpeed } from '../utils/ships.js';

// Orbit physics shared by both ambient ship-encounter renderers
// (encounterSprites3d.js's sprites and encounterModels3d.js's real glTF
// ships) - both need to agree on exactly where/how fast a given ship
// instance flies, or switching between them would visibly relocate ships.

// Orbit shells start clear of a node's own placeholder/model footprint and
// step outwards per-instance by a fixed amount (not by cumulative ship size -
// a single oversized hull like the Paradigm/FRIGATE would otherwise push
// every ship after it in the group out far enough to collide with
// neighbouring nav points).
export const ORBIT_BASE_RADIUS = 5;
export const ORBIT_SHELL_STEP = 2.2;
// Per-instance orbit-plane tilt off level, seeded per instance so a
// multi-ship encounter spreads through vertical space instead of every ship
// sharing one flat ring at the same height - concentric-only spacing reads
// as flat and needs more radius to avoid clipping than tilting instances
// into different planes does.
export const MAX_ORBIT_TILT = Math.PI * 0.45; // ~81 deg, so orbits can run quite steep
// Tuned so real per-ship max speeds (200-500 kps, see ships.js) turn into a
// plausible-looking on-screen orbital speed - fast ship classes
// (Gladius/Centurion, 500) visibly lap slow ones (Frigate/Drayman, 200)
// rather than all orbiting at the same rate.
export const SPEED_SCALE = 0.006;

// Cheap deterministic per-instance seeding (mulberry32 + a string hash) so
// orbit shape/phase/tilt stay stable across re-renders of the same
// system/nav-point/ship/instance, but vary across different instances - same
// spirit as EncounterSprites.svelte's layoutCluster, just for orbit shells
// instead of a static packed cluster.
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

function basisFromNormal(n) {
  const arbitrary = Math.abs(n.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(arbitrary, n).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();
  return { u, v };
}

// Builds one ship instance's deterministic orbit parameters: the tilted
// orbit plane (as an orthonormal u/v basis plus its normal, used as the
// ship's constant 'up'/dorsal reference since it doesn't bank), radius,
// starting phase and signed angular speed (real per-ship max speed divided
// by radius, direction randomised per instance).
export function createOrbitParams({ systemId, navPointId, shipId, instanceIndex, shellIndex }) {
  const seed = hashSeed(`${systemId}:${navPointId}:${shipId}:${instanceIndex}`);
  const rand = mulberry32(seed);
  const radius = ORBIT_BASE_RADIUS + shellIndex * ORBIT_SHELL_STEP;

  const tiltAngle = rand() * MAX_ORBIT_TILT;
  const tiltAxisAngle = rand() * Math.PI * 2;
  const tiltAxis = new THREE.Vector3(Math.cos(tiltAxisAngle), 0, Math.sin(tiltAxisAngle));
  const planeNormal = new THREE.Vector3(0, 1, 0).applyAxisAngle(tiltAxis, tiltAngle).normalize();
  const { u, v } = basisFromNormal(planeNormal);
  const phase = rand() * Math.PI * 2;
  const direction = rand() < 0.5 ? 1 : -1;
  const maxSpeed = shipMaxSpeed(shipId) ?? 300;
  const angularSpeed = direction * (maxSpeed * SPEED_SCALE) / radius;

  return { u, v, up: planeNormal, radius, phase, angularSpeed };
}

// Anchor-local position and unit forward (instantaneous direction of travel)
// at time t, written into the caller-supplied vectors to avoid per-tick
// allocation across (potentially many) ship instances. Forward is nose-first:
// d/dangle of the position, signed by orbit direction so ships running the
// loop backwards (angularSpeed < 0) still face the way they're actually
// moving.
export function orbitStateAt(params, t, outPosition, outForward) {
  const angle = params.phase + params.angularSpeed * t;
  const cosA = Math.cos(angle), sinA = Math.sin(angle);
  outPosition.set(
    params.u.x * cosA * params.radius + params.v.x * sinA * params.radius,
    params.u.y * cosA * params.radius + params.v.y * sinA * params.radius,
    params.u.z * cosA * params.radius + params.v.z * sinA * params.radius
  );
  const dirSign = Math.sign(params.angularSpeed) || 1;
  outForward.set(
    (-params.u.x * sinA + params.v.x * cosA) * dirSign,
    (-params.u.y * sinA + params.v.y * cosA) * dirSign,
    (-params.u.z * sinA + params.v.z * cosA) * dirSign
  ).normalize();
}
