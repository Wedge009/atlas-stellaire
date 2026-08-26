import * as THREE from 'three';
import { resolveFlatPosition, styleForNavPoint } from '../utils/navPoints.js';

const SCALE = 1 / 1000;
const FLAT_SPAN = 55;

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
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
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
// click-to-select. Generalized from the Troy proof-of-concept to take any
// system's navPoints array.
export function createNavScene({ canvas, onSelect }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x000000, 0.0035);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);

  scene.add(makeStars(1200, 900));

  const grid = new THREE.GridHelper(160, 16, 0x992222, 0x551515);
  grid.material.opacity = 0.55;
  grid.material.transparent = true;
  scene.add(grid);

  scene.add(new THREE.PointLight(0xffcc66, 1.4, 200));
  scene.add(new THREE.AmbientLight(0x223344, 1.2));

  let nodes = [];
  let nodeGroup = new THREE.Group();
  scene.add(nodeGroup);

  function clearNodes() {
    for (const n of nodes) {
      n.mesh.geometry.dispose();
      n.mesh.material.dispose();
      n.dropLine.geometry.dispose();
      n.dropMat.dispose();
      n.spoke.geometry.dispose();
      n.spokeMat.dispose();
      n.label.material.map.dispose();
      n.label.material.dispose();
    }
    nodeGroup.clear();
    nodes = [];
  }

  function setPoints(navPoints) {
    clearNodes();
    for (const np of navPoints) {
      const flat = resolveFlatPosition(np);
      const style = styleForNavPoint(np);
      const pos3d = new THREE.Vector3(np.x * SCALE, np.y * SCALE, np.z * SCALE);
      const pos2d = new THREE.Vector3(((flat.sx - 50) / 50) * FLAT_SPAN, 0, ((flat.sy - 50) / 50) * FLAT_SPAN);

      let geometry;
      if (style.shape === 'box') geometry = new THREE.BoxGeometry(2.6, 2.6, 2.6);
      else if (style.shape === 'dot') geometry = new THREE.SphereGeometry(1.0, 14, 14);
      else if (style.shape === 'ghost') geometry = new THREE.SphereGeometry(1.2, 12, 12);
      else geometry = new THREE.SphereGeometry(1.6, 16, 16);

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(style.color),
        emissive: new THREE.Color(style.emissive),
        roughness: 0.5,
        transparent: style.dimmed,
        opacity: style.dimmed ? 0.5 : 1,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(pos3d);
      mesh.userData = np;
      nodeGroup.add(mesh);

      const dropGeo = new THREE.BufferGeometry().setFromPoints([pos3d.clone(), new THREE.Vector3(pos3d.x, 0, pos3d.z)]);
      const dropMat = new THREE.LineDashedMaterial({ color: 0x335566, dashSize: 0.8, gapSize: 0.6, transparent: true, opacity: 1 });
      const dropLine = new THREE.Line(dropGeo, dropMat);
      dropLine.computeLineDistances();
      nodeGroup.add(dropLine);

      const spokeGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), pos3d.clone()]);
      const spokeMat = new THREE.LineBasicMaterial({ color: 0x2266aa, transparent: true, opacity: 0.5 });
      const spoke = new THREE.Line(spokeGeo, spokeMat);
      nodeGroup.add(spoke);

      const labelText = np.label + (np.dest ? `: Jump to ${np.dest}` : (np.baseName ? `: ${np.baseName}` : ''));
      const label = makeLabel(labelText, '#a8e8ff');
      label.position.copy(pos3d).add(new THREE.Vector3(0, 2.8, 0));
      nodeGroup.add(label);

      nodes.push({ np, mesh, dropLine, dropMat, spoke, spokeMat, label, pos3d, pos2d });
    }
  }

  function updateAuxLines(n) {
    const p = n.mesh.position;
    n.dropLine.geometry.setFromPoints([p.clone(), new THREE.Vector3(p.x, 0, p.z)]);
    n.dropLine.computeLineDistances();
    n.spoke.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), p.clone()]);
    n.label.position.copy(p).add(new THREE.Vector3(0, 2.8, 0));
  }

  // --- orbit camera ---
  let radius = 180, theta = Math.PI / 4, phi = Math.PI / 3.2;
  let savedRadius = radius, savedTheta = theta, savedPhi = phi;
  let interactionLocked = false;

  function orbitCameraPosition(r, t, p) {
    return new THREE.Vector3(r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t));
  }
  function updateCameraFromOrbit() {
    camera.up.set(0, 1, 0);
    camera.position.copy(orbitCameraPosition(radius, theta, phi));
    camera.lookAt(0, 0, 0);
  }
  updateCameraFromOrbit();

  let dragging = false, lastX = 0, lastY = 0, lastTouchDist = null;

  function onMouseDown(e) {
    if (!interactionLocked && !aligned) { dragging = true; lastX = e.clientX; lastY = e.clientY; }
  }
  function onMouseUp() { dragging = false; }
  function onMouseMove(e) {
    if (!dragging || interactionLocked || aligned) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    theta -= dx * 0.005;
    phi = Math.min(Math.max(phi - dy * 0.005, 0.2), Math.PI - 0.2);
    updateCameraFromOrbit();
  }
  function onWheel(e) {
    if (interactionLocked || aligned) return;
    e.preventDefault();
    radius = Math.min(Math.max(radius + e.deltaY * 0.05, 20), 220);
    updateCameraFromOrbit();
  }
  function onTouchStart(e) {
    if (interactionLocked || aligned) return;
    if (e.touches.length === 1) { dragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }
  }
  function onTouchEnd() { dragging = false; lastTouchDist = null; }
  function onTouchMove(e) {
    if (interactionLocked) return;
    e.preventDefault();
    if (e.touches.length === 1 && dragging && !aligned) {
      const dx = e.touches[0].clientX - lastX, dy = e.touches[0].clientY - lastY;
      lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
      theta -= dx * 0.006;
      phi = Math.min(Math.max(phi - dy * 0.006, 0.2), Math.PI - 0.2);
      updateCameraFromOrbit();
    } else if (e.touches.length === 2 && !aligned) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (lastTouchDist !== null) {
        radius = Math.min(Math.max(radius - (dist - lastTouchDist) * 0.15, 20), 220);
        updateCameraFromOrbit();
      }
      lastTouchDist = dist;
    }
  }

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  function onClick(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(nodes.map((n) => n.mesh));
    onSelect(hits.length ? hits[0].object.userData : null);
  }

  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('touchstart', onTouchStart);
  canvas.addEventListener('touchend', onTouchEnd);
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('click', onClick);

  let aligned = false, animating = false;

  function animateToAligned(onDone) {
    if (animating) return;
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
      camera.position.lerpVectors(camStart, camEnd, e);
      camera.up.lerpVectors(upStart, upEnd, e).normalize();
      camera.lookAt(0, 0, 0);
      if (t < 1) requestAnimationFrame(step);
      else { animating = false; interactionLocked = false; aligned = true; onDone && onDone(); }
    }
    requestAnimationFrame(step);
  }

  function animateToOrbit(onDone) {
    if (animating) return;
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

  function resize(width, height) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  let rafId = null;
  function tick() {
    rafId = requestAnimationFrame(tick);
    if (!aligned && !animating) nodeGroup.children.forEach((c) => { if (c.isMesh) c.rotation.y += 0.01; });
    renderer.render(scene, camera);
  }
  tick();

  function dispose() {
    cancelAnimationFrame(rafId);
    clearNodes();
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchend', onTouchEnd);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('click', onClick);
    renderer.dispose();
  }

  return {
    setPoints,
    animateToAligned,
    animateToOrbit,
    resize,
    dispose,
    isAligned: () => aligned,
  };
}
