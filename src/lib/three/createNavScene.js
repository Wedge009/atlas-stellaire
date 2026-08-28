import * as THREE from 'three';
import { findSystem, resolveFlatPosition, styleForNavPoint, systemName } from '../utils/navPoints.js';
import { skyboxSpriteTexture } from '../utils/skyboxSprites.js';

const SCALE = 1 / 1000;
const FLAT_SPAN = 55;
const ROUTE_BEACON_HEIGHT = 5;

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
// click-to-select. Generalised from the proof-of-concept to take any
// system's navPoints array.
export function createNavScene({ canvas, onSelect, onJump, data, systemId }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x000000, 0.0035);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);

  scene.add(makeStars(1200, 900));

  const backdropGroup = new THREE.Group();
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

  const cameraLight = new THREE.PointLight(0xffffff, 5, 1000, 0);
  camera.add(cameraLight);
  scene.add(camera);
  scene.add(new THREE.AmbientLight(0x223344, 1.2));

  let nodes = [];
  let nodeGroup = new THREE.Group();
  scene.add(nodeGroup);

  // Route-line arrows live in their own group, separate from nodeGroup - the
  // idle-spin below only touches nodeGroup's meshes, and an arrowhead cone
  // needs an arbitrary orientation (whatever direction the segment points)
  // that the idle-spin's naive rotation.y increment would otherwise wreck.
  let routeLines = [];
  let routeLineGroup = new THREE.Group();
  scene.add(routeLineGroup);

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

  function setPoints(navPoints, routeHighlightIds = new Set(), routeSegments = []) {
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
      const mesh = new THREE.Mesh(geometry, material);
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
        const ringGeo = new THREE.RingGeometry(2.0, 2.5, 24);
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
    if (e.button !== 0) return;
    canvas.style.cursor = '';
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
  function pointerNodeTargets() {
    return nodes.flatMap((n) => [n.mesh, n.label]);
  }
  function setMouseFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }
  function onClick(e) {
    setMouseFromEvent(e);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(pointerNodeTargets());
    onSelect(hits.length ? hits[0].object.userData : null);
  }
  function onDblClick(e) {
    setMouseFromEvent(e);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(pointerNodeTargets());
    const np = hits.length ? hits[0].object.userData : null;
    if (np?.dest) onJump?.(np.dest);
  }
  function onHoverMove(e) {
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

  function resize(width, height) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  let rafId = null;
  function tick() {
    rafId = requestAnimationFrame(tick);
    if (!animating) nodeGroup.children.forEach((c) => { if (c instanceof THREE.Mesh) c.rotation.y += 0.01; });
    renderer.render(scene, camera);
  }
  tick();

  function dispose() {
    cancelAnimationFrame(rafId);
    clearNodes();
    clearRouteLines();
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
    resize,
    dispose,
    isAligned: () => aligned,
  };
}
