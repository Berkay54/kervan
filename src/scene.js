import * as THREE from 'three';
import gsap from 'gsap';

/*
  Konteyner terminali sahnesi
  - Instanced konteyner istifleri (deterministik, her yüklemede aynı düzen)
  - Bir RTG vinç: tıra yükleme / tırdan indirme döngüsü
  - Ana yolda akan tır trafiği
  - Kaydırma ve fare ile kamera hareketi
*/

const C = { L: 6, H: 2.6, W: 2.4 }; // 20' konteyner (ölçekli)
const PALETTE = ['#8a3d2b', '#2c4766', '#56664c', '#b3ad9f', '#6e2c30', '#3d5c6b', '#a8582a', '#d6d1c4', '#4a4f55', '#2f3a45'];

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function corrugation() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 512, 128);
  for (let x = 0; x < 512; x += 12) {
    const grd = g.createLinearGradient(x, 0, x + 12, 0);
    grd.addColorStop(0, '#cfcfcf'); grd.addColorStop(0.45, '#ffffff'); grd.addColorStop(1, '#b8b8b8');
    g.fillStyle = grd; g.fillRect(x, 0, 12, 128);
  }
  g.fillStyle = 'rgba(0,0,0,.38)';
  g.fillRect(0, 0, 512, 7); g.fillRect(0, 121, 512, 7); g.fillRect(0, 0, 10, 128); g.fillRect(502, 0, 10, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

function makeTruck(cabColor, mats) {
  const g = new THREE.Group();
  const cab = new THREE.MeshStandardMaterial({ color: cabColor, roughness: 0.45, metalness: 0.3 });
  box(7.2, 0.35, 2.3, mats.dark, 0.6, 1.2, 0, g);          // şasi
  box(2.3, 2.5, 2.4, cab, 4.6, 2.35, 0, g);                 // kabin
  box(0.05, 1.0, 2.0, mats.glass, 5.76, 2.95, 0, g);        // ön cam
  box(0.1, 0.25, 0.4, mats.lamp, 5.78, 1.35, 0.85, g);      // farlar
  box(0.1, 0.25, 0.4, mats.lamp, 5.78, 1.35, -0.85, g);
  box(0.1, 0.18, 0.3, mats.tail, -3.0, 1.2, 0.9, g);        // stop
  box(0.1, 0.18, 0.3, mats.tail, -3.0, 1.2, -0.9, g);
  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.45, 16);
  wheelGeo.rotateX(Math.PI / 2);
  [-2.2, -1.0, 4.4].forEach((wx) => {
    [1.0, -1.0].forEach((wz) => {
      const w = new THREE.Mesh(wheelGeo, mats.tyre);
      w.position.set(wx, 0.55, wz); w.castShadow = true;
      g.add(w);
    });
  });
  return g;
}

export function createScene(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const BG = new THREE.Color('#0e1318');
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, 70, 175);

  const camera = new THREE.PerspectiveCamera(30, 1, 1, 400);
  const target = new THREE.Vector3(0, 3.5, 2);

  // Işıklar — alçak, sıcak akşam güneşi + soğuk dolgu
  scene.add(new THREE.HemisphereLight('#9fb3c8', '#161b21', 0.8));
  const sun = new THREE.DirectionalLight('#ffd0a3', 3.0);
  sun.position.set(30, 55, 50);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 50, bottom: -50, near: 10, far: 200 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#6f93b8', 0.55);
  fill.position.set(50, 25, -40);
  scene.add(fill);

  const mats = {
    ground: new THREE.MeshStandardMaterial({ color: '#171c22', roughness: 1 }),
    asphalt: new THREE.MeshStandardMaterial({ color: '#111519', roughness: 0.95 }),
    paint: new THREE.MeshStandardMaterial({ color: '#d9d3c2', roughness: 0.8, emissive: '#3a362e', emissiveIntensity: 0.4 }),
    crane: new THREE.MeshStandardMaterial({ color: '#e8e3d6', roughness: 0.55, metalness: 0.25 }),
    accent: new THREE.MeshStandardMaterial({ color: '#ff5a1f', roughness: 0.5, metalness: 0.2 }),
    dark: new THREE.MeshStandardMaterial({ color: '#23292f', roughness: 0.7, metalness: 0.4 }),
    tyre: new THREE.MeshStandardMaterial({ color: '#0b0d10', roughness: 0.9 }),
    glass: new THREE.MeshStandardMaterial({ color: '#1b2733', roughness: 0.15, metalness: 0.6, emissive: '#22313f', emissiveIntensity: 0.5 }),
    lamp: new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffe2b0', emissiveIntensity: 2.2 }),
    tail: new THREE.MeshStandardMaterial({ color: '#ff3b2a', emissive: '#ff2a1a', emissiveIntensity: 1.6 }),
    cable: new THREE.MeshStandardMaterial({ color: '#2a2f35', roughness: 0.6, metalness: 0.6 }),
  };

  // Zemin
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), mats.ground);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(420, 140, '#222b34', '#1b222a');
  grid.position.y = 0.01;
  grid.material.transparent = true; grid.material.opacity = 0.55;
  scene.add(grid);

  // Yollar
  const LANE_Z = 8.2;
  const ROAD_Z = 17.5;
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(420, 3.6), mats.asphalt);
  lane.rotation.x = -Math.PI / 2; lane.position.set(0, 0.02, LANE_Z); lane.receiveShadow = true;
  scene.add(lane);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(420, 8), mats.asphalt);
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, ROAD_Z); road.receiveShadow = true;
  scene.add(road);

  const dashGeo = new THREE.BoxGeometry(3, 0.02, 0.18);
  const dashCount = 70;
  const dashes = new THREE.InstancedMesh(dashGeo, mats.paint, dashCount);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < dashCount; i++) {
    m4.makeTranslation(-210 + i * 6, 0.04, ROAD_Z);
    dashes.setMatrixAt(i, m4);
  }
  scene.add(dashes);
  [ROAD_Z - 3.85, ROAD_Z + 3.85, LANE_Z - 1.7, LANE_Z + 1.7].forEach((z) => {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(420, 0.02, 0.12), mats.paint);
    edge.position.set(0, 0.04, z); scene.add(edge);
  });

  // Konteyner istifleri
  const rand = rng(1998);
  const slots = [];
  const addBlock = (cols, rows, maxH, rule) => {
    cols.forEach((x) => rows.forEach((z) => {
      let h = rule ? rule(x, z) : Math.floor(rand() * (maxH + 1));
      for (let k = 0; k < h; k++) slots.push({ x, y: C.H / 2 + k * C.H, z, color: PALETTE[Math.floor(rand() * PALETTE.length)] });
    }));
  };
  const ROWS_A = [-4.05, -1.35, 1.35, 4.05];
  const STACK_Z = 1.35;
  // A bloğu — vincin altındaki sütun (x=0) en fazla 3 kat
  addBlock([-24, -16, -8, 8, 16, 24], ROWS_A, 4, () => 1 + Math.floor(rand() * 4));
  addBlock([0], ROWS_A, 3, (x, z) => (z === STACK_Z ? 2 : 1 + Math.floor(rand() * 3)));
  // B bloğu — arka
  addBlock([-29.7, -23.1, -16.5, -9.9, -3.3, 3.3, 9.9, 16.5, 23.1, 29.7], [-19.5, -16.8, -14.1, -11.4], 4, () => Math.floor(rand() * 5));
  // C bloğu — yolun ötesi
  addBlock([-36, -29.4, -22.8, -16.2, -9.6, -3, 3.6, 10.2, 16.8, 23.4, 30], [26, 28.7, 31.4], 3, () => Math.floor(rand() * 4));

  const corrTex = corrugation();
  const containerMat = new THREE.MeshStandardMaterial({ map: corrTex, roughness: 0.72, metalness: 0.18 });
  const containerGeo = new THREE.BoxGeometry(C.L, C.H - 0.04, C.W - 0.06);
  const yard = new THREE.InstancedMesh(containerGeo, containerMat, slots.length);
  yard.castShadow = true; yard.receiveShadow = true;
  const col = new THREE.Color();
  slots.forEach((s, i) => {
    m4.makeTranslation(s.x, s.y, s.z);
    yard.setMatrixAt(i, m4);
    yard.setColorAt(i, col.set(s.color));
  });
  scene.add(yard);

  // Taşınan konteyner (marka turuncusu)
  const cargo = new THREE.Mesh(containerGeo, new THREE.MeshStandardMaterial({ map: corrTex, color: '#ff5a1f', roughness: 0.6, metalness: 0.2 }));
  cargo.castShadow = true; cargo.receiveShadow = true;
  scene.add(cargo);

  // RTG vinç
  const crane = new THREE.Group();
  const Z1 = -7, Z2 = 11, TOP = 14.6, LX = 3.65;
  [Z1, Z2].forEach((z) => {
    box(8.6, 0.9, 1.1, mats.crane, 0, 0.75, z, crane);              // alt kiriş
    box(1.3, 0.9, 1.4, mats.dark, -LX, 0.45, z, crane);             // tekerlek bojisi
    box(1.3, 0.9, 1.4, mats.dark, LX, 0.45, z, crane);
    box(0.7, TOP, 0.7, mats.crane, -LX, TOP / 2 + 0.5, z, crane);   // ayaklar
    box(0.7, TOP, 0.7, mats.crane, LX, TOP / 2 + 0.5, z, crane);
    box(8.0, 1.0, 1.0, mats.accent, 0, TOP + 0.4, z, crane);        // üst travers
  });
  box(0.8, 1.4, Z2 - Z1 + 1.6, mats.crane, -LX, TOP + 0.9, (Z1 + Z2) / 2, crane); // ana kirişler
  box(0.8, 1.4, Z2 - Z1 + 1.6, mats.crane, LX, TOP + 0.9, (Z1 + Z2) / 2, crane);
  // çapraz destekler
  [-LX, LX].forEach((x) => {
    const brace = box(0.3, 0.3, 11, mats.crane, x, TOP - 3.4, Z2 - 3.6, crane);
    brace.rotation.x = -0.62;
  });
  // operatör kabini
  box(1.5, 1.6, 1.7, mats.crane, LX + 1.1, TOP - 2.2, Z2 - 0.2, crane);
  box(0.05, 1.0, 1.3, mats.glass, LX + 1.86, TOP - 2.1, Z2 - 0.2, crane);
  scene.add(crane);

  const trolley = new THREE.Group();
  box(8.0, 0.9, 2.6, mats.dark, 0, 0, 0, trolley);
  box(2.0, 0.9, 1.6, mats.crane, 2.4, 0.9, 0, trolley);
  trolley.position.y = TOP + 2.05;
  crane.add(trolley);

  const spreader = new THREE.Group();
  box(6.2, 0.35, 2.5, mats.accent, 0, 0.18, 0, spreader);
  box(1.6, 0.5, 1.2, mats.dark, 0, 0.6, 0, spreader);
  crane.add(spreader);

  const cables = [];
  [[-2.4, 0.8], [2.4, 0.8], [-2.4, -0.8], [2.4, -0.8]].forEach(([x, z]) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1, 0.07), mats.cable);
    c.userData = { x, z };
    crane.add(c); cables.push(c);
  });

  // Aydınlatma direkleri
  [[-12, 12], [12, 12], [-34, -6], [34, -6], [0, -25], [-26, 22], [26, 22]].forEach(([x, z]) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 20, 8), mats.dark);
    p.position.set(x, 10, z); p.castShadow = true; scene.add(p);
    box(2.4, 0.3, 0.9, mats.dark, x, 20, z, scene);
    const l = box(2.1, 0.08, 0.7, mats.lamp, x, 19.82, z, scene);
    l.castShadow = false;
  });

  // Yükleme tırı
  const loader = makeTruck('#e8e3d6', mats);
  loader.position.z = LANE_Z;
  scene.add(loader);

  // Trafik
  const traffic = [];
  const CAB_COLORS = ['#2c4766', '#8a3d2b', '#d6d1c4', '#3d5c6b', '#6e2c30'];
  for (let i = 0; i < 6; i++) {
    const dir = i % 2 === 0 ? 1 : -1;
    const t = makeTruck(CAB_COLORS[i % CAB_COLORS.length], mats);
    t.rotation.y = dir === 1 ? 0 : Math.PI;
    t.position.set(-120 + i * 42, 0, ROAD_Z + (dir === 1 ? 1.95 : -1.95));
    if (i % 3 !== 2) {
      const c = new THREE.Mesh(containerGeo, containerMat.clone());
      c.material.color.set(PALETTE[(i * 3) % PALETTE.length]);
      c.position.set(-0.4, 1.4 + C.H / 2, 0); c.castShadow = true;
      t.add(c);
    }
    scene.add(t);
    traffic.push({ mesh: t, dir, speed: 9 + (i % 3) * 2.5 });
  }

  // ——— Vinç döngüsü ———
  const BED = 1.4;
  const TOP_STACK = 3 * C.H;       // istifin üstündeki konteynerin üst yüzü
  const TOP_TRUCK = BED + C.H;      // tırdaki konteynerin üst yüzü
  const UP = 12.6;
  const FAR = 125;
  const s = { truckX: -FAR, trolleyZ: STACK_Z, spreaderY: UP, carry: 'stack' };

  let tl = null;
  if (!reducedMotion) {
    tl = gsap.timeline({ repeat: -1, defaults: { ease: 'power2.inOut' } });
    tl.call(() => { s.carry = 'stack'; })
      .set(s, { truckX: -FAR })
      .addLabel('a')
      .to(s, { truckX: 0, duration: 7, ease: 'power3.out' }, 'a')
      .to(s, { spreaderY: TOP_STACK, duration: 2.6 }, 'a+=1.2')
      .call(() => { s.carry = 'spreader'; })
      .to(s, { spreaderY: UP, duration: 2.4 }, '+=0.5')
      .to(s, { trolleyZ: LANE_Z, duration: 2.8 })
      .to(s, { spreaderY: TOP_TRUCK, duration: 2.6 })
      .call(() => { s.carry = 'truck'; })
      .to(s, { spreaderY: UP, duration: 2.2 }, '+=0.5')
      .to(s, { truckX: FAR, duration: 8, ease: 'power2.in' }, '<0.4')
      .set(s, { truckX: -FAR })
      .addLabel('b')
      .to(s, { truckX: 0, duration: 7, ease: 'power3.out' }, 'b')
      .to(s, { spreaderY: TOP_TRUCK, duration: 2.6 }, 'b+=4.6')
      .call(() => { s.carry = 'spreader'; })
      .to(s, { spreaderY: UP, duration: 2.4 }, '+=0.5')
      .to(s, { trolleyZ: STACK_Z, duration: 2.8 })
      .to(s, { spreaderY: TOP_STACK, duration: 2.6 })
      .call(() => { s.carry = 'stack'; })
      .to(s, { spreaderY: UP, duration: 2.2 }, '+=0.5')
      .to(s, { truckX: FAR, duration: 8, ease: 'power2.in' }, '<0.4');
  } else {
    s.truckX = 0; s.trolleyZ = LANE_Z; s.spreaderY = UP;
  }

  function updateRig() {
    trolley.position.z = s.trolleyZ;
    spreader.position.set(0, s.spreaderY, s.trolleyZ);
    const top = TOP + 1.6, bottom = s.spreaderY + 0.8;
    cables.forEach((c) => {
      c.scale.y = Math.max(0.01, top - bottom);
      c.position.set(c.userData.x, (top + bottom) / 2, s.trolleyZ + c.userData.z);
    });
    loader.position.x = s.truckX;
    if (s.carry === 'stack') cargo.position.set(0, 2 * C.H + C.H / 2, STACK_Z);
    else if (s.carry === 'spreader') cargo.position.set(0, s.spreaderY - C.H / 2, s.trolleyZ);
    else cargo.position.set(s.truckX - 0.4, BED + C.H / 2, LANE_Z);
  }

  // ——— Kamera ———
  const view = { az: 0.78, el: 0.5, r: 82 };
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  let progress = 0, sp = 0;

  function onPointer(e) {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }
  window.addEventListener('pointermove', onPointer, { passive: true });

  let w = 1, h = 1;
  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    w = Math.max(1, rect.width); h = Math.max(1, rect.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const wide = w > 900;
    view.r = wide ? 96 : 120;
    if (wide) camera.setViewOffset(w, h, -w * 0.17, h * 0.03, w, h);
    else camera.setViewOffset(w, h, 0, -h * 0.16, w, h);
    camera.updateProjectionMatrix();
    if (reducedMotion) render(0);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);

  function placeCamera() {
    sp += (progress - sp) * 0.08;
    pointer.sx += (pointer.x - pointer.sx) * 0.04;
    pointer.sy += (pointer.y - pointer.sy) * 0.04;
    const az = view.az + sp * 0.55 + pointer.sx * 0.08;
    const el = view.el + sp * 0.12 - pointer.sy * 0.04;
    const r = view.r - sp * 18;
    camera.position.set(
      target.x + r * Math.cos(el) * Math.sin(az),
      target.y + r * Math.sin(el),
      target.z + r * Math.cos(el) * Math.cos(az)
    );
    camera.lookAt(target.x, target.y - sp * 2, target.z);
  }

  function render(dt) {
    traffic.forEach((t) => {
      t.mesh.position.x += t.dir * t.speed * dt;
      if (t.mesh.position.x > 130) t.mesh.position.x = -130;
      if (t.mesh.position.x < -130) t.mesh.position.x = 130;
    });
    updateRig();
    placeCamera();
    renderer.render(scene, camera);
  }

  let raf = 0, visible = true, last = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (visible) render(dt);
  }

  resize();
  if (reducedMotion) {
    sp = progress; pointer.sx = 0;
    render(0);
  } else {
    raf = requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (tl) tl.paused(!visible);
  });
  io.observe(canvas);

  return {
    setProgress(p) { progress = p; },
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      window.removeEventListener('pointermove', onPointer);
      if (tl) tl.kill();
      renderer.dispose();
    },
  };
}
