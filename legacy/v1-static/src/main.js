import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { makeMaterials } from './materials.js';
import { createLobbyAudio, createHolidayAudio } from './audio.js';
import { makeLandscape } from './landscape.js';
import { makeSeasons } from './seasons.js';
import { makeEditor, CATALOG, SWATCHES, FLOOR_SWATCHES, PAINTS } from './editor.js';
import { makeFurnitureKit } from './furniture.js';
import { buildHouse, BASE, CEIL, W, D } from '../data/house.js';

// ---------------- renderer / scene ----------------
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdce4e6);

const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 600);
camera.position.set(46, 52, -52);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(-W / 2, 13, D / 2 - 4);
orbit.maxPolarAngle = Math.PI * 0.495;
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;

// ---------------- lights ----------------
const hemi = new THREE.HemisphereLight(0xd6e4ee, 0xa8a49a, 0.62);
scene.add(hemi);
const ambient = new THREE.AmbientLight(0xfff4e4, 0.38);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xfff2dd, 2.3);
sun.position.set(52, 78, -46);
sun.target.position.set(-W / 2, 8, D / 2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -62; sun.shadow.camera.right = 62;
sun.shadow.camera.top = 62; sun.shadow.camera.bottom = -62;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 260;
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

// ---------------- house ----------------
const M = makeMaterials();
const K = makeFurnitureKit(M);
const H = buildHouse(M, K);

for (let i = 0; i < 4; i++) H.levels[i].add(H.furn[i]);

// Mirrored root: the plan-space data is built in image coordinates, which are
// left-handed relative to three.js world space — flip x so the house matches
// the real blueprints (portico on the west, media room east, etc.).
const world = new THREE.Group();
world.scale.x = -1;
world.add(H.site, H.roof, H.optional, ...H.levels);

const land = makeLandscape(M);
world.add(land.ground);
scene.add(land.sky);
const evAll = [...H.evLights, ...land.evening];
const seasons = makeSeasons(M, land, world);

// ---------------- layout editor ----------------
const styleBar = document.getElementById('styleBar');
const roomBar = document.getElementById('roomBar');
const catalogEl = document.getElementById('catalog');
const editor = makeEditor({
  scene, camera, renderer, orbit, H, M, K, BASE,
  getFloor: () => curFloor,
  setFloor: f => { curFloor = String(f); syncFloorButtons(); applyFloor(); },
  onUI(u) {
    if ('selected' in u) {
      styleBar.style.display = u.selected ? 'block' : 'none';
      if (u.selected) {
        document.getElementById('styleName').textContent = u.selected.kind === 'modSofa' ? 'modular sofa' : u.selected.kind;
        document.getElementById('rowAccent').style.display = u.selected.hasAccent ? 'flex' : 'none';
        document.getElementById('rowSofa').style.display = u.selected.modular ? 'flex' : 'none';
      }
    }
    if ('room' in u) {
      roomBar.style.display = u.room ? 'block' : 'none';
      if (u.room) document.getElementById('roomName').textContent = u.room.name;
      if (!u.room) editor.beginPaint?.(null);
    }
    if ('dims' in u) {
      const el = document.getElementById('dimHUD');
      if (!u.dims) { el.style.display = 'none'; return; }
      const ftIn = v => {
        if (v == null) return '—';
        const ft = Math.floor(v), inch = Math.round((v - ft) * 12);
        return inch === 12 ? `${ft + 1}'0"` : `${ft}'${inch}"`;
      };
      el.textContent =
        `${u.dims.kind}  ${ftIn(u.dims.w)} × ${ftIn(u.dims.d)}   ·   ` +
        `N ${ftIn(u.dims.N)}  S ${ftIn(u.dims.S)}  E ${ftIn(u.dims.E)}  W ${ftIn(u.dims.W)}`;
      el.style.display = 'block';
    }
    if ('paint' in u) {
      for (const c of document.querySelectorAll('#chipsWall .chip')) {
        c.classList.toggle('paintOn', c.dataset.paint === u.paint);
      }
    }
  },
});
editor.applyOverrides();   // restore saved layout (positions, added pieces, finishes, floors)

const btnEdit = document.getElementById('btnEdit');
const editHint = document.getElementById('editHint');
function setEditMode(on) {
  if (on && curFloor === 'all') {
    curFloor = String(editor.focusedRoom?.level ?? 1);
    syncFloorButtons(); applyFloor();
  }
  editor.setEnabled(on);
  btnEdit.classList.toggle('active', on);
  editHint.style.display = on ? 'block' : 'none';
  if (!on) catalogEl.style.display = 'none';
  updateAutoOrbit();
}
btnEdit.onclick = () => setEditMode(!editor.enabled);
document.getElementById('btnCatalog').onclick = () => {
  if (!editor.enabled) setEditMode(true);
  const open = catalogEl.style.display !== 'block';
  catalogEl.style.display = open ? 'block' : 'none';
  if (open) buildThumbs();
};
document.getElementById('btnResetFloor').onclick = () => editor.resetFloor(curFloor);
document.getElementById('btnExportLayout').onclick = () => editor.exportLayout();
const layoutFile = document.getElementById('layoutFile');
document.getElementById('btnImportLayout').onclick = () => layoutFile.click();
layoutFile.onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  try { editor.importLayout(JSON.parse(await f.text())); }
  catch { alert('Not a valid layout JSON file.'); }
  layoutFile.value = '';
};
document.getElementById('btnExitRoom').onclick = () => editor.exitRoom();

// named layout slots
const layoutSlots = document.getElementById('layoutSlots');
function refreshSlots(pick) {
  const names = editor.listLayouts();
  layoutSlots.innerHTML = '';
  const ph = document.createElement('option');
  ph.value = ''; ph.textContent = names.length ? 'Saved layouts…' : 'No saved layouts';
  layoutSlots.appendChild(ph);
  for (const n of names) {
    const o = document.createElement('option');
    o.value = o.textContent = n;
    if (n === pick) o.selected = true;
    layoutSlots.appendChild(o);
  }
}
refreshSlots();
document.getElementById('btnSaveLayout').onclick = () => {
  const name = prompt('Name this layout:', layoutSlots.value || 'My layout');
  if (!name) return;
  editor.saveLayoutAs(name.trim());
  refreshSlots(name.trim());
};
document.getElementById('btnLoadLayout').onclick = () => {
  if (layoutSlots.value) editor.loadLayout(layoutSlots.value);
};
document.getElementById('btnDelLayout').onclick = () => {
  if (!layoutSlots.value) return;
  if (confirm(`Delete layout “${layoutSlots.value}”?`)) {
    editor.deleteLayout(layoutSlots.value);
    refreshSlots();
  }
};

// catalog drawer (thumbnails render lazily on first open)
const thumbImgs = [];
for (const [cat, items] of CATALOG) {
  const h = document.createElement('h5');
  h.textContent = cat;
  catalogEl.appendChild(h);
  for (const [kind, label, args] of items) {
    const b = document.createElement('button');
    b.className = 'catItem';
    const img = document.createElement('img');
    img.alt = '';
    thumbImgs.push([img, kind, label, args]);
    const sp = document.createElement('span');
    sp.textContent = label;
    b.append(img, sp);
    b.onclick = () => editor.beginPlace(kind, label, args);
    catalogEl.appendChild(b);
  }
}

// hanging fixtures get short cords in thumbnails so the piece fills the frame
const THUMB_ARGS = {
  'pendant': [0.6, 0.5, 2.2], 'linearChandelier': [5, 0.6, 2.6], 'lantern': [1.5, 0.5, 2.8],
  'chandelierTiered': [0.5, 2.6], 'chandelierCrystal': [0.7, 3], 'chandelierSputnik': [1.3, 3.2],
};
let thumbsDone = false;
function buildThumbs() {
  if (thumbsDone) return;
  thumbsDone = true;
  const tr = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  tr.setSize(132, 99);
  const ts = new THREE.Scene();
  ts.add(new THREE.HemisphereLight(0xfffdf5, 0x8a8378, 1.25));
  const dl = new THREE.DirectionalLight(0xffffff, 1.7);
  dl.position.set(4, 7, 5);
  ts.add(dl);
  const tc = new THREE.PerspectiveCamera(34, 132 / 99, 0.01, 200);
  for (const [img, kind, label, args] of thumbImgs) {
    try {
      const item = K[kind](...(THUMB_ARGS[kind] || args || []));
      ts.add(item);
      const bb = new THREE.Box3().setFromObject(item);
      const c = bb.getCenter(new THREE.Vector3());
      const s = bb.getSize(new THREE.Vector3());
      const dist = Math.max(s.x, s.y, s.z) * 1.75 + 0.5;
      tc.position.set(c.x + dist * 0.72, c.y + dist * 0.55, c.z + dist * 0.72);
      tc.lookAt(c);
      tr.render(ts, tc);
      img.src = tr.domElement.toDataURL();
      ts.remove(item);
    } catch { /* leave placeholder background */ }
  }
  tr.dispose();
}


// finish swatch chips
function buildChips(el, list, onPick) {
  const none = document.createElement('button');
  none.className = 'chip none';
  none.title = 'Reset to original';
  none.onclick = () => onPick(null);
  el.appendChild(none);
  for (const [key, name] of list) {
    const c = document.createElement('button');
    c.className = 'chip';
    c.title = name;
    c.style.background = '#' + (M[key]?.color?.getHexString?.() || '999');
    c.onclick = () => onPick(key);
    el.appendChild(c);
  }
}
buildChips(document.getElementById('chipsP'), SWATCHES, k => editor.styleSelected('p', k));
buildChips(document.getElementById('chipsA'), SWATCHES, k => editor.styleSelected('a', k));
buildChips(document.getElementById('chipsFloor'), FLOOR_SWATCHES, k => editor.setRoomFloor(k));

// wall paint chips: pick a color, then click walls to coat that side; hatched chip = unpaint
{
  const el = document.getElementById('chipsWall');
  const none = document.createElement('button');
  none.className = 'chip none';
  none.dataset.paint = 'reset';
  none.title = 'Remove paint (then click walls)';
  none.onclick = () => editor.beginPaint('reset');
  el.appendChild(none);
  for (const [key, name, hex] of PAINTS) {
    const c = document.createElement('button');
    c.className = 'chip';
    c.dataset.paint = key;
    c.title = name;
    c.style.background = '#' + hex.toString(16).padStart(6, '0');
    c.onclick = () => editor.beginPaint(key);
    el.appendChild(c);
  }
}

// modular sofa configurator
for (const b of document.querySelectorAll('#rowSofa .sofaBtn')) {
  b.onclick = () => editor.modifySofa(b.dataset.op);
}
// universal per-axis resize (any selected piece)
for (const b of document.querySelectorAll('#rowSize .sofaBtn')) {
  b.onclick = () => editor.resizeSelected(b.dataset.ax, Number(b.dataset.dir));
}

const labelGroup = new THREE.Group();
for (const arr of H.labels) for (const sp of arr) labelGroup.add(sp);
world.add(labelGroup);
scene.add(world);

// ---------------- state / UI ----------------
let curFloor = 'all';
let evening = false;
let walking = false;
let walkFloor = 0;

function applyFloor() {
  const n = curFloor === 'all' ? 3 : Number(curFloor);
  for (let i = 0; i < 4; i++) H.levels[i].visible = i <= n;
  H.roof.visible = curFloor === 'all';
  if (H.tray) H.tray.visible = walking || curFloor === 'all';   // loft tray only from inside / full view
  // ceiling decoration (beams, T&G, canopies) hides when its own floor is peeled open
  H.ceilings.forEach((g, i) => { g.visible = walking || curFloor === 'all' || Number(curFloor) !== i; });
  updateLabels();
  updateAutoOrbit();
}

// ---------------- aerial auto-orbit (All view only) ----------------
const optAutoOrbit = document.getElementById('optAutoOrbit');
const AERIAL_POS = new THREE.Vector3(56, 60, -62);
const AERIAL_TGT = new THREE.Vector3(-W / 2, 13, D / 2 - 4);
let flyT = 0;
const flyFrom = new THREE.Vector3(), flyFromTgt = new THREE.Vector3();
function startFly() {
  flyT = 0.0001;
  flyFrom.copy(camera.position);
  flyFromTgt.copy(orbit.target);
}
const orbitSpeed = document.getElementById('orbitSpeed');
function updateAutoOrbit() {
  const active = optAutoOrbit.checked && curFloor === 'all' && !walking &&
    !(typeof editor !== 'undefined' && editor.enabled);
  orbit.autoRotate = active;
  orbit.autoRotateSpeed = parseFloat(orbitSpeed.value);
  if (active && (camera.position.y < 28 || camera.position.distanceTo(AERIAL_TGT) < 55)) {
    startFly();   // too low / too close for an aerial: glide out to the showcase framing
  }
}
optAutoOrbit.onchange = updateAutoOrbit;
orbitSpeed.oninput = updateAutoOrbit;
renderer.domElement.addEventListener('pointerdown', () => { flyT = 0; });

function updateLabels() {
  const on = document.getElementById('optLabels').checked;
  for (let i = 0; i < 4; i++) {
    const vis = on && curFloor !== 'all' && Number(curFloor) === i;
    for (const sp of H.labels[i]) sp.visible = vis;
  }
}

document.getElementById('floors').addEventListener('click', e => {
  const btn = e.target.closest('.fbtn');
  if (!btn) return;
  document.querySelectorAll('.fbtn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  curFloor = btn.dataset.floor;
  applyFloor();
});

function setScene(eve) {
  evening = eve;
  document.getElementById('btnDay').classList.toggle('active', !eve);
  document.getElementById('btnEve').classList.toggle('active', eve);
  land.setNight(eve);
  if (eve) {
    scene.background = new THREE.Color(0x0a111d);
    scene.fog = new THREE.Fog(0x0d1522, 200, 480);
    sun.position.set(85, 185, -175);          // moonlight from the moon's corner of the sky
    sun.intensity = 0.28; sun.color.set(0xa9bcd8);
    hemi.intensity = 0.09; ambient.intensity = 0.14;
    for (const l of evAll) l.intensity = l.userData.evening;
    M.warmGlow.emissiveIntensity = 1.5;
    M.onyx.emissiveIntensity = 1.1;
    M.screenGlow.emissiveIntensity = 1.0;
    renderer.toneMappingExposure = 1.25;
  } else {
    scene.background = new THREE.Color(0xdce4e6);
    scene.fog = new THREE.Fog(0xdde7ea, 220, 500);
    sun.position.set(52, 78, -46);
    sun.intensity = 2.3; sun.color.set(0xfff2dd);
    hemi.intensity = 0.62; ambient.intensity = 0.38;
    for (const l of evAll) l.intensity = 0;
    M.warmGlow.emissiveIntensity = 0.15;
    M.onyx.emissiveIntensity = 0.2;
    M.screenGlow.emissiveIntensity = 0.5;
    renderer.toneMappingExposure = 1.05;
  }
}
document.getElementById('btnDay').onclick = () => setScene(false);
document.getElementById('btnEve').onclick = () => setScene(true);

// ---------------- lobby music ----------------
const lobby = createLobbyAudio();
const btnSound = document.getElementById('btnSound');
btnSound.onclick = () => {
  holiday.stop();
  btnSound.classList.toggle('active', lobby.toggle());
};
// begin softly on the first interaction — walking into the lobby.
// Deferred + guarded so it never talks over holiday music.
addEventListener('pointerdown', function autoStart() {
  removeEventListener('pointerdown', autoStart);
  setTimeout(() => {
    if (!lobby.on && !holiday.active) {
      lobby.start();
      btnSound.classList.add('active');
    }
  }, 250);
});

document.getElementById('optLabels').onchange = updateLabels;
document.getElementById('optFurn').onchange = e => {
  for (const f of H.furn) f.visible = e.target.checked;
};
document.getElementById('optSpiral').onchange = e => {
  H.optional.visible = e.target.checked;
};
document.getElementById('collapse').onclick = () =>
  document.getElementById('panel').classList.toggle('min');

// ---------------- seasons ----------------
const rowSnow = document.getElementById('rowSnow');
const rowXmas = document.getElementById('rowXmas');
const rowHween = document.getElementById('rowHween');
const optSnowing = document.getElementById('optSnowing');
const optXmas = document.getElementById('optXmas');
const optHween = document.getElementById('optHween');
const holiday = createHolidayAudio();
// Hard defaults on load: summer, no holiday modes, no holiday music — only the
// lobby track may auto-start. (Also defeats browser form-state restoration.)
optSnowing.checked = optXmas.checked = optHween.checked = false;
rowSnow.style.display = rowXmas.style.display = rowHween.style.display = 'none';
document.querySelectorAll('.sbtn').forEach(b => b.onclick = () => {
  document.querySelectorAll('.sbtn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  const s = b.dataset.season;
  seasons.setSeason(s);
  rowSnow.style.display = rowXmas.style.display = s === 'winter' ? 'flex' : 'none';
  rowHween.style.display = s === 'fall' ? 'flex' : 'none';
  optSnowing.checked = optXmas.checked = optHween.checked = false;
  holiday.stop();
});
optSnowing.onchange = e => seasons.setSnowing(e.target.checked);
optXmas.onchange = e => {
  seasons.setXmas(e.target.checked);
  if (e.target.checked) {
    optSnowing.checked = true;                 // Christmas auto-enables snowfall
    seasons.setSnowing(true);
    lobby.stop();
    btnSound.classList.remove('active');
    holiday.start('xmas');
  } else {
    holiday.stop();
  }
};
optHween.onchange = e => {
  seasons.setHalloween(e.target.checked);
  if (e.target.checked) {
    lobby.stop();
    btnSound.classList.remove('active');
    holiday.start('halloween');
  } else {
    holiday.stop();
  }
};

// ---------------- garage doors ----------------
let garageOpen = false;
const btnGarage = document.getElementById('btnGarage');
btnGarage.onclick = () => {
  garageOpen = !garageOpen;
  btnGarage.classList.toggle('active', garageOpen);
  btnGarage.textContent = garageOpen ? 'Close garage' : 'Open garage';
};
// chimney smoke: puffs rise, drift with the breeze, swell, and fade
function smokeStep(dt) {
  if (!H.smoke || !H.roof.visible) return;
  for (const puff of H.smoke.children) {
    puff.userData.age += dt * 0.2;
    if (puff.userData.age > 1) puff.userData.age -= 1;
    const a = puff.userData.age;
    puff.position.set(
      Math.sin(a * 6 + puff.userData.drift) * (0.25 + a * 1.4) + a * 2.4,
      a * 8,
      Math.cos(a * 5 + puff.userData.drift) * (0.25 + a * 1.1)
    );
    const sc = 0.9 + a * 3.6;
    puff.scale.set(sc, sc, 1);
    puff.material.opacity = a < 0.12 ? (a / 0.12) * 0.5 : 0.5 * (1 - (a - 0.12) / 0.88);
  }
}

function garageStep(dt) {
  // tilt the door up and back under the garage ceiling (pivot is at the head)
  const target = garageOpen ? 1.45 : 0;
  for (const gd of H.garageDoors) {
    gd.rotation.x += (target - gd.rotation.x) * Math.min(1, dt * 2.5);
  }
}

// ---------------- walk mode ----------------
const plc = new PointerLockControls(camera, renderer.domElement);
const keys = {};
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (walking && (e.code === 'KeyQ' || e.code === 'KeyE')) {
    walkFloor = Math.max(0, Math.min(3, walkFloor + (e.code === 'KeyE' ? 1 : -1)));
    camera.position.y = BASE[walkFloor] + 5.4;
    curFloor = String(walkFloor);
    syncFloorButtons();
    applyFloor();
  }
});
addEventListener('keyup', e => keys[e.code] = false);

function syncFloorButtons() {
  document.querySelectorAll('.fbtn').forEach(b =>
    b.classList.toggle('active', b.dataset.floor === curFloor));
}

const btnWalk = document.getElementById('btnWalk');
const btnOrbit = document.getElementById('btnOrbit');

btnWalk.onclick = () => {
  if (editor.enabled) setEditMode(false);   // leave edit mode before walking
  walking = true;
  walkFloor = curFloor === 'all' ? 0 : Number(curFloor);
  curFloor = String(walkFloor);
  syncFloorButtons();
  applyFloor();
  camera.position.set(-8, BASE[walkFloor] + 5.4, 17.7);
  camera.lookAt(-20, BASE[walkFloor] + 5.4, 17.7);
  orbit.enabled = false;
  plc.lock();
  btnWalk.classList.add('active');
  btnOrbit.classList.remove('active');
  if (!evening) ambient.intensity = 0.55;
};

plc.addEventListener('unlock', () => {
  if (!walking) return;
  walking = false;
  orbit.enabled = true;
  btnWalk.classList.remove('active');
  btnOrbit.classList.add('active');
  if (!evening) ambient.intensity = 0.32;
  applyFloor();
});
btnOrbit.onclick = () => { if (walking) plc.unlock(); };

const vel = new THREE.Vector3();
function walkStep(dt) {
  const speed = keys['ShiftLeft'] || keys['ShiftRight'] ? 22 : 11;
  const f = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);
  const r = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
  vel.x += (f !== 0 || r !== 0 ? 1 : 0);
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  fwd.y = 0; fwd.normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
  const move = new THREE.Vector3()
    .addScaledVector(fwd, f)
    .addScaledVector(right, r);
  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed * dt);
    camera.position.add(move);
  }
  camera.position.y = BASE[walkFloor] + 5.4;
  // soft clamp to site (world x is mirrored: house spans -W..0)
  camera.position.x = Math.max(-(W + 14), Math.min(14, camera.position.x));
  camera.position.z = Math.max(-14, Math.min(D + 16, camera.position.z));
}

// ---------------- compass ----------------
// Calibration (per Jonathan): the FRONT DOOR faces SOUTH.
// World axes: south = +x, north = -x, east = -z (side street), west = +z (alley/garage).
const roseEl = document.getElementById('rose');
const compassDir = new THREE.Vector3();
function updateCompass() {
  camera.getWorldDirection(compassDir);
  const bearing = Math.atan2(-compassDir.z, -compassDir.x);  // 0 = facing north
  roseEl.style.transform = `rotate(${(-bearing * 180 / Math.PI).toFixed(1)}deg)`;
}

// ---------------- room hover tag ----------------
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tag = document.getElementById('roomtag');
let hoverCooldown = 0;
addEventListener('pointermove', e => {
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
});
function hoverCheck() {
  if (walking) { tag.style.display = 'none'; return; }
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects(H.floorPicks.filter(m => {
    let p = m.parent;
    while (p) { if (!p.visible) return false; p = p.parent; }
    return true;
  }), false);
  if (hits.length && hits[0].object.userData.room) {
    tag.textContent = hits[0].object.userData.room;
    tag.style.display = 'block';
  } else {
    tag.style.display = 'none';
  }
}

// ---------------- loop ----------------
const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  land.tick(dt);
  editor.tick(dt);
  seasons.tick(dt, evening);
  smokeStep(dt);
  garageStep(dt);
  if (flyT > 0 && !walking) {
    flyT = Math.min(1, flyT + dt / 1.5);
    const e = flyT * flyT * (3 - 2 * flyT);
    camera.position.lerpVectors(flyFrom, AERIAL_POS, e);
    orbit.target.lerpVectors(flyFromTgt, AERIAL_TGT, e);
    if (flyT >= 1) flyT = 0;
  }
  if (walking) walkStep(dt);
  else orbit.update();
  hoverCooldown -= dt;
  if (hoverCooldown <= 0) { hoverCheck(); hoverCooldown = 0.12; }
  updateCompass();
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

applyFloor();
setScene(false);
tick();

// debug/driver API
window.CH = {
  camera, orbit, setScene, lobby, editor, H, THREE,
  setFloor(f) { curFloor = String(f); syncFloorButtons(); applyFloor(); },
  view(px, py, pz, tx, ty, tz) {
    camera.position.set(px, py, pz);
    orbit.target.set(tx, ty, tz);
    orbit.update();
  },
};
