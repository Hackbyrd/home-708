import * as THREE from 'three';

// Layout editor v2:
// select / drag (snap 0.5', Alt = free) / R rotate 45° (,/. = ±15°) / F flip / D duplicate /
// ⌫ remove / Ctrl-Z undo · click-to-place catalog · primary+accent finish swatches per piece ·
// double-click a room = fitted bird's-eye focus (Esc exits) with per-room flooring swatches.
// Everything persists to localStorage and exports/imports as JSON.

const STORE_V2 = 'cityhome-layout-v2';
const STORE_V1 = 'cityhome-layout-v1';
const EXCLUDE = new Set(['warmGlow', 'fire', 'screenGlow', 'glass', 'glassRail', 'waterGlass', 'mirror', 'onyx']);

export const SWATCHES = [
  ['linenCream', 'Linen'], ['velvetChar', 'Charcoal'], ['velvetSlate', 'Slate'],
  ['leatherCamel', 'Camel'], ['leatherCognac', 'Cognac'], ['shearling', 'Shearling'],
  ['greige', 'Greige'], ['plum', 'Plum'], ['white', 'White'],
  ['walnut', 'Walnut'], ['oakWood', 'Oak'], ['teak', 'Teak'],
  ['iron', 'Iron Ore'], ['matBlack', 'Black'], ['blackSteel', 'Steel'],
  ['brass', 'Brass'], ['bronze', 'Bronze'], ['graphite', 'Graphite'], ['green', 'Green'],
];
export const FLOOR_SWATCHES = [
  ['oakFloor', 'Oak'], ['stoneFloor', 'Stone'], ['tileWhite', 'Tile'],
  ['slate', 'Slate'], ['pavers', 'Pavers'], ['greige', 'Carpet'], ['rubber', 'Rubber'],
];
// wall paint palette (keyed hex — persisted by key)
export const PAINTS = [
  ['cream', 'Swiss Coffee', 0xf1ece0], ['greigeP', 'Greige', 0xc9c1b2], ['clay', 'Clay', 0xb59f8a],
  ['sage', 'Sage', 0x9aa58e], ['olive', 'Olive', 0x6f7257], ['terracotta', 'Terracotta', 0xb3674c],
  ['plumP', 'Plum', 0x5c4457], ['navy', 'Hale Navy', 0x3a4757], ['inkBlue', 'Ink Blue', 0x2c3947],
  ['ironOre', 'Iron Ore', 0x434342], ['charcoal', 'Charcoal', 0x33342f], ['blush', 'Blush', 0xd9b8a7],
];
const PAINT_HEX = Object.fromEntries(PAINTS.map(([k, , h]) => [k, h]));
export const CATALOG = [
  ['Chairs', [
    ['chair', 'Armchair · camel', []], ['chairLinen', 'Armchair · linen', []],
    ['chairShearling', 'Armchair · shearling', []], ['swivel', 'Swivel chair', []],
    ['diningChair', 'Dining chair', []], ['officeChair', 'Task chair', []],
    ['stool', 'Counter stool', []], ['lounger', 'Lounger', []],
  ]],
  ['Sofas & Seating', [
    ['modSofa', 'Modular sofa', [['seat', 'seat', 'corner', 'seat'], 3.2, 3.4]],
    ['sofa', "Sofa 8'", [8, 3.4]], ['sofa', "Sofa 10'", [10, 3.5]],
    ['sectionalL', 'Sectional', [11, 8, 3.3]], ['bench', 'Bench', [4]],
    ['ottoman', 'Ottoman', []], ['pouf', 'Pouf', []],
  ]],
  ['Tables & Desks', [
    ['table', "Dining 9'", [9, 3.7, 2.5]], ['table', "Table 6'", [6, 3.2, 2.5]],
    ['roundTable', 'Round table', [2, 2.5]], ['roundTable', 'Side table', [0.9, 1.9]],
    ['coffeeTable', 'Coffee table', [4.5, 2.8]], ['gameTable', 'Game table', [4.5]],
    ['desk', "Desk 6'", [6]],
  ]],
  ['Bedroom', [
    ['bed', 'Bed · King', [6.33, 7.2]], ['bed', 'Bed · Queen', [5, 6.8]],
    ['nightstand', 'Nightstand', []], ['dresser', "Dresser 6'", [6]],
    ['wardrobe', 'Wardrobe', []],
  ]],
  ['TV & Media  (click a wall)', [
    ['tv', 'TV 65"', [5.5]], ['tv', 'TV 85"', [6.9]],
    ['console', 'TV console', []], ['sideboard', 'Sideboard', []],
    ['builtinWall', 'Built-in wall', [8, 8]], ['bookshelf', 'Bookshelf', []],
    ['barCounter', 'Bar counter', [7]],
  ]],
  ['Lighting', [
    ['chandelierTiered', 'Chandelier · tiered', []], ['chandelierCrystal', 'Chandelier · crystal', []],
    ['chandelierSputnik', 'Chandelier · sputnik', []],
    ['pendant', 'Pendant', [0.6, 6.5, 10]], ['linearChandelier', 'Linear chandelier', [5, 6.2, 10]],
    ['lantern', 'Lantern', [1.5, 7.5, 10]],
    ['floorLamp', 'Floor lamp', []], ['tableLamp', 'Table lamp', []],
  ]],
  ['Kitchen & Bath', [
    ['island', 'Island', [7.5, 3.8]], ['cabinetRun', "Cabinets 8'", [8]],
    ['upperRun', "Upper cabinets 8'", [8]],
    ['vanity', 'Vanity · double', [6, true]], ['vanity', 'Vanity · single', [3.5, false]],
    ['tub', 'Soaking tub', []], ['shower', 'Shower', [4, 4]],
    ['toilet', 'Toilet', []], ['washerDryer', 'Washer/Dryer', []],
  ]],
  ['Walls & Windows  (click a wall)', [
    ['art', 'Wall art', [3, 3.8]], ['art', 'Wall art · large', [5, 4.5]],
    ['mirrorPanel', 'Mirror', [4, 7]],
    ['drape', 'Drapery panel', [1.8, 8.5]], ['drape', 'Drapery · wide', [3.4, 8.5]],
  ]],
  ['Plants & Decor', [
    ['plant', 'Plant · small', [3.5]], ['plant', 'Plant', [6]], ['plant', 'Plant · tall', [8.5]],
    ['rug', 'Rug 8×10', [8, 10]], ['rug', 'Rug 9×12', [9, 12]], ['rug', 'Runner 10×3', [10, 3]],
    ['piano', 'Grand piano', []], ['rack', 'Power rack', []],
    ['rower', 'Rower', []], ['car', 'Car', [0x3d4650]],
  ]],
];

// kinds that mount against a wall (or window): standoff from the wall face +
// vertical anchor from the clicked height above the floor
const WALL_KINDS = {
  art: { off: 0.10, y: (h, a) => Math.max(0.6, h - (a?.[1] ?? 3.8) / 2) },
  tv: { off: 0.12, y: h => Math.min(7, Math.max(2.2, h)) },
  drape: { off: 0.25, y: () => 0 },
  mirrorPanel: { off: 0.5, y: () => 0 },
  console: { off: 0.75, y: () => 0 },
  sideboard: { off: 0.9, y: () => 0 },
  builtinWall: { off: 0.72, y: () => 0 },
  cabinetRun: { off: 1.15, y: () => 0 },
  upperRun: { off: 0.65, y: h => Math.max(3.5, h - 1.3) },
  bookshelf: { off: 0.7, y: () => 0 },
};

export function makeEditor({ scene, camera, renderer, orbit, H, M, K, BASE, getFloor, setFloor, onUI, onChange }) {
  let enabled = false;
  let selected = null;
  let dragging = false;
  let helper = null;
  let pending = null;          // catalog item waiting for click-to-place
  let pendingPaint = null;     // wall paint key waiting for wall clicks ('reset' = unpaint)
  let ghost = null;            // translucent preview that follows the cursor
  let roomFocus = null;        // { prevPos, prevTgt, key, name }
  let aidCounter = 0;
  let bobT = 0;
  const worldRoot = H.levels[0].parent;   // mirrored plan-space root

  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  const plane = new THREE.Plane();
  const UP = new THREE.Vector3(0, 1, 0);
  const hit = new THREE.Vector3();
  const grab = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  // camera tween (room focus / restore)
  const fly = { t: 0, fromP: new THREE.Vector3(), toP: new THREE.Vector3(), fromT: new THREE.Vector3(), toT: new THREE.Vector3() };
  function flyTo(p, t) {
    fly.t = 0.0001;
    fly.fromP.copy(camera.position); fly.toP.copy(p);
    fly.fromT.copy(orbit.target); fly.toT.copy(t);
  }

  // ---------------- persistent state ----------------
  let state = { edits: {}, added: [], rooms: {}, walls: {} };
  try {
    const v2 = localStorage.getItem(STORE_V2);
    if (v2) state = JSON.parse(v2);
    else {
      const v1 = localStorage.getItem(STORE_V1);
      if (v1) state.edits = JSON.parse(v1);
    }
  } catch { /* fresh start */ }
  state.walls = state.walls || {};
  for (const e of state.added) aidCounter = Math.max(aidCounter, parseInt(e.aid.slice(1), 10) || 0);
  const snapshot = () => JSON.parse(JSON.stringify(state));
  const save = () => {
    localStorage.setItem(STORE_V2, JSON.stringify(state));
    onChange?.(snapshot());
  };

  const undoStack = [];
  function pushUndo() {
    undoStack.push(JSON.stringify(state));
    if (undoStack.length > 60) undoStack.shift();
  }

  // ---------------- finish slots (WeakMaps: clone-safe) ----------------
  const meshSlot = new WeakMap();   // mesh -> { src, slot }
  const itemSlots = new WeakMap();  // item -> { p, a }
  const matNames = new Map();
  for (const [k, v] of Object.entries(M)) if (v && v.isMaterial) matNames.set(v, k);

  function analyzeSlots(item) {
    if (itemSlots.has(item)) return itemSlots.get(item);
    const counts = new Map();
    item.traverse(o => {
      if (!o.isMesh || !o.material) return;
      const name = matNames.get(o.material);
      if (name && EXCLUDE.has(name)) return;
      counts.set(o.material, (counts.get(o.material) || 0) + 1);
    });
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const slots = { p: sorted[0]?.[0] || null, a: sorted[1]?.[0] || null };
    item.traverse(o => {
      if (!o.isMesh) return;
      if (o.material === slots.p) meshSlot.set(o, { src: o.material, slot: 'p' });
      else if (o.material === slots.a) meshSlot.set(o, { src: o.material, slot: 'a' });
    });
    itemSlots.set(item, slots);
    return slots;
  }

  function applyFinish(item, slot, matKey) {
    analyzeSlots(item);
    const target = matKey && M[matKey] ? M[matKey].clone() : null;
    item.traverse(o => {
      const ms = meshSlot.get(o);
      if (ms && ms.slot === slot) o.material = target || ms.src;
    });
  }

  // ---------------- item helpers ----------------
  const blueprintItems = () => H.furn.flatMap(g => g.children.filter(c => c.userData.id && !c.userData.aid));
  const allItems = () => H.furn.flatMap(g => g.children.filter(c => c.userData.id));
  const findById = id => allItems().find(c => c.userData.id === id);

  const sizeOr = v => (Math.abs(v - 1) > 0.001 ? +v.toFixed(3) : undefined);
  function poseOf(item) {
    return {
      x: item.position.x, z: item.position.z,
      y: +(item.position.y - BASE[item.userData.level]).toFixed(3),
      rot: item.rotation.y, flip: item.scale.x < 0 || undefined,
      sx: sizeOr(Math.abs(item.scale.x)), sy: sizeOr(item.scale.y), sz: sizeOr(item.scale.z),
      hidden: !item.visible || undefined,
    };
  }
  function record(item) {
    if (item.userData.aid) {
      const entry = state.added.find(e => e.aid === item.userData.aid);
      if (entry) Object.assign(entry, poseOf(item), { mat: entry.mat, accent: entry.accent });
    } else {
      state.edits[item.userData.id] = { ...state.edits[item.userData.id], ...poseOf(item) };
    }
    save();
  }
  function recordFinish(item, slot, matKey) {
    const fieldName = slot === 'p' ? 'mat' : 'accent';
    if (item.userData.aid) {
      const entry = state.added.find(e => e.aid === item.userData.aid);
      if (entry) entry[fieldName] = matKey || undefined;
    } else {
      const e = state.edits[item.userData.id] = state.edits[item.userData.id] || {};
      e[fieldName] = matKey || undefined;
    }
    save();
  }

  function spawnFromEntry(entry) {
    let item = null;
    if (entry.src) {
      const srcItem = findById(entry.src);
      if (srcItem) item = srcItem.clone(true);
    } else if (K[entry.kind]) {
      item = K[entry.kind](...(entry.args || []));
    }
    if (!item) return null;
    const defY = entry.kind === 'tv' ? 4.5 : entry.kind === 'upperRun' ? 4.8 : 0;
    item.position.set(entry.x, BASE[entry.level] + (entry.y ?? defY), entry.z);
    item.rotation.y = entry.rot || 0;
    item.scale.set((entry.flip ? -1 : 1) * (entry.sx ?? 1), entry.sy ?? 1, entry.sz ?? 1);
    item.visible = !entry.hidden;
    item.userData.id = entry.aid;
    item.userData.aid = entry.aid;
    item.userData.kind = entry.kind || 'copy';
    item.userData.level = entry.level;
    item.userData.home = { x: entry.x, z: entry.z, rot: entry.rot || 0 };
    if (entry.mat) applyFinish(item, 'p', entry.mat);
    if (entry.accent) applyFinish(item, 'a', entry.accent);
    H.furn[entry.level].add(item);
    item.updateMatrixWorld(true);   // pickable immediately, even before the next rendered frame
    return item;
  }

  function removeSpawnedItem(item) {
    item.parent?.remove(item);
  }

  // ---------------- full-state reconcile (used by undo/import/load) ----------------
  function applyState() {
    deselect();
    // spawned items: remove all, respawn from state
    for (const it of allItems()) if (it.userData.aid) removeSpawnedItem(it);
    // blueprint items
    for (const it of blueprintItems()) {
      // capture the factory height once (some pieces get y-adjusted after place())
      if (it.userData.homeY === undefined) it.userData.homeY = it.position.y;
      const o = state.edits[it.userData.id];
      const h = it.userData.home;
      it.position.x = o?.x ?? h.x;
      it.position.z = o?.z ?? h.z;
      it.position.y = o?.y != null ? BASE[it.userData.level] + o.y : it.userData.homeY;
      it.rotation.y = o?.rot ?? h.rot;
      it.scale.set((o?.flip ? -1 : 1) * (o?.sx ?? 1), o?.sy ?? 1, o?.sz ?? 1);
      it.visible = !o?.hidden;
      if (o?.mat || o?.accent || itemSlots.has(it)) {
        applyFinish(it, 'p', o?.mat || null);
        applyFinish(it, 'a', o?.accent || null);
      }
    }
    for (const entry of state.added) spawnFromEntry(entry);
    // room flooring
    for (const fp of H.floorPicks) {
      const rf = state.rooms[`${fp.userData.level}|${fp.userData.room}`];
      fp.material = rf?.floor && M[rf.floor] ? M[rf.floor] : fp.userData.srcFloorMat;
    }
    state.walls = state.walls || {};   // older snapshots/undo frames may predate wall paint
    applyWallPaints();
  }

  // ---------------- selection ----------------
  function deselect() {
    if (helper) { scene.remove(helper); helper.geometry?.dispose?.(); helper = null; }
    selected = null;
    onUI?.({ selected: null, dims: null });
  }
  function select(item) {
    deselect();
    selected = item;
    helper = new THREE.BoxHelper(item, 0xb08d57);
    scene.add(helper);
    const slots = analyzeSlots(item);
    onUI?.({
      selected: {
        kind: item.userData.kind || 'piece',
        hasAccent: !!slots.a,
        modular: item.userData.kind === 'modSofa' && !!item.userData.aid,
        pMat: matNames.get(slots.p) || null,
        aMat: matNames.get(slots.a) || null,
      },
    });
    reportDims();
  }
  const refreshHelper = () => helper && selected && helper.update();

  function setPointer(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
  }

  function visibleFloorPicks() {
    return H.floorPicks.filter(m => {
      let p = m;
      while (p) { if (p.visible === false) return false; p = p.parent; }
      return true;
    });
  }

  function pickItem(cycle = false) {
    const floor = getFloor();
    const groups = floor === 'all' ? H.furn : [H.furn[Number(floor)]];
    const meshes = groups.flatMap(g => (g ? g.children.filter(c => c.userData.id && c.visible) : []));
    // In All view, architecture occludes the pick (no grabbing furniture through the
    // roof/floors). In a floor view the candidate list is already that floor only, and
    // same-floor walls shouldn't get in the way of a bird's-eye click.
    const blockers = floor === 'all' ? H.levels.filter(l => l.visible) : [];
    if (floor === 'all' && H.roof?.visible) blockers.push(H.roof);
    const hits = ray.intersectObjects([...meshes, ...blockers], true);
    const items = [];
    for (const h of hits) {
      let node = h.object;
      while (node && !node.userData.id) node = node.parent;
      if (node) { if (!items.includes(node)) items.push(node); continue; }
      break;                       // hit architecture — everything beyond is occluded
    }
    if (!items.length) return null;
    // Alt-click digs to the piece underneath (e.g. the rug under a sofa)
    if (cycle && selected && items.includes(selected)) return items[(items.indexOf(selected) + 1) % items.length];
    return items[0];
  }

  // ---------------- dimensions readout ----------------
  const dimRay = new THREE.Raycaster();
  const bb3 = new THREE.Box3();
  function wallHitFilter(hits) {
    const furnSet = new Set(H.furn);
    for (const h of hits) {
      if (!h.face || h.object.userData.room) continue;
      let p = h.object, inFurn = false;
      while (p) { if (furnSet.has(p)) { inFurn = true; break; } p = p.parent; }
      if (inFurn) continue;
      const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
      if (Math.abs(n.y) > 0.45) continue;
      return h;
    }
    return null;
  }
  function reportDims() {
    if (!selected) { onUI?.({ dims: null }); return; }
    bb3.setFromObject(selected);
    const size = bb3.getSize(tmp.clone());
    const c = bb3.getCenter(new THREE.Vector3());
    c.y = BASE[selected.userData.level] + Math.min(3, size.y / 2);
    const lvl = H.levels[selected.userData.level];
    const dirs = { S: [1, 0], N: [-1, 0], W: [0, 1], E: [0, -1] };   // compass in world axes
    const out = { w: size.x, d: size.z, kind: selected.userData.kind };
    for (const [label, [dx, dz]] of Object.entries(dirs)) {
      dimRay.set(c, new THREE.Vector3(dx, 0, dz));
      dimRay.far = 45;
      const h = wallHitFilter(dimRay.intersectObjects(lvl ? [lvl] : [], true));
      const half = Math.abs(dx) ? size.x / 2 : size.z / 2;
      out[label] = h ? Math.max(0, h.distance - half) : null;
    }
    onUI?.({ dims: out });
  }

  // ---------------- modular-sofa append marker ----------------
  let endMarker = null;
  function ensureEndMarker() {
    if (endMarker) return endMarker;
    endMarker = new THREE.Group();
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.85, 12),
      new THREE.MeshBasicMaterial({ color: 0xb08d57, transparent: true, opacity: 0.9, depthTest: false }),
    );
    cone.rotation.x = Math.PI;              // point down at the append spot
    cone.renderOrder = 999;
    endMarker.add(cone);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.65, 0.06, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xb08d57, transparent: true, opacity: 0.7, depthTest: false }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -3.2;
    ring.renderOrder = 999;
    endMarker.add(ring);
    endMarker.visible = false;
    scene.add(endMarker);
    return endMarker;
  }
  function updateEndMarker(bob = 0) {
    const show = enabled && selected?.userData.kind === 'modSofa' && selected.userData.chainEnd;
    if (!show) { if (endMarker) endMarker.visible = false; return; }
    const m = ensureEndMarker();
    const entry = selected.userData.aid ? state.added.find(en => en.aid === selected.userData.aid) : null;
    const ce = (entry?.end === 'head' ? selected.userData.chainStart : null) || selected.userData.chainEnd;
    tmp.set(ce.x, 4.4 + Math.sin(bob * 3) * 0.18, ce.z);
    m.position.copy(selected.localToWorld(tmp.clone()));
    m.visible = true;
  }

  // ---------------- ghost preview ----------------
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0xb08d57, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
  function killGhost() {
    if (!ghost) return;
    ghost.parent?.remove(ghost);
    ghost = null;
  }
  function makeGhost() {
    killGhost();
    if (!pending || !K[pending.kind]) return;
    ghost = K[pending.kind](...(pending.args || []));
    ghost.traverse(o => { if (o.isMesh) o.material = ghostMat; });
    ghost.visible = false;
    worldRoot.add(ghost);
  }
  function moveGhost() {
    if (!ghost) return;
    const wk = WALL_KINDS[pending.kind];
    if (wk) {
      const w = pickWall();
      if (w) {
        const floor = getFloor();
        let level = floor === 'all' ? 0 : Number(floor);
        if (floor === 'all') for (let i = 3; i >= 0; i--) if (w.point.y >= BASE[i] - 0.1) { level = i; break; }
        const local = worldRoot.worldToLocal(w.point.clone());
        const nl = worldRoot.worldToLocal(w.point.clone().add(w.normal)).sub(local).normalize();
        ghost.position.set(local.x + nl.x * wk.off, BASE[level] + wk.y(Math.max(0, w.point.y - BASE[level]), pending.args), local.z + nl.z * wk.off);
        ghost.rotation.y = Math.atan2(nl.x, nl.z);
        ghost.visible = true;
        return;
      }
    }
    const hits = ray.intersectObjects(visibleFloorPicks(), false);
    if (hits.length) {
      const fp = hits[0].object;
      const local = worldRoot.worldToLocal(hits[0].point.clone());
      ghost.position.set(Math.round(local.x * 2) / 2, BASE[fp.userData.level], Math.round(local.z * 2) / 2);
      ghost.rotation.y = 0;
      ghost.visible = true;
    } else {
      ghost.visible = false;
    }
  }

  // walls + window glass of the visible floor(s); returns { point, normal } or null
  function pickWall() {
    const floor = getFloor();
    const groups = floor === 'all' ? H.levels : [H.levels[Number(floor)]];
    const furnSet = new Set(H.furn);
    const hits = ray.intersectObjects(groups.filter(g => g && g.visible), true);
    for (const h of hits) {
      if (!h.face) continue;
      let p = h.object, inFurn = false;
      while (p) { if (furnSet.has(p)) { inFurn = true; break; } p = p.parent; }
      if (inFurn || h.object.userData.room) continue;      // skip furniture + floor picks
      const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
      if (Math.abs(n.y) > 0.45) continue;                  // floors/ceilings/roofs
      if (n.dot(ray.ray.direction) > 0) n.negate();        // face the camera side
      let obj = h.object;
      if (obj.userData.paint) obj = obj.parent;            // clicked an existing paint coat
      return { point: h.point, normal: n, object: obj };
    }
    return null;
  }

  // ---------------- wall paint (per wall, per side; openings stay put) ----------------
  let wallGroupCache = null;
  function wallGroups() {
    if (!wallGroupCache) {
      wallGroupCache = new Map();
      for (const lv of H.levels) lv.traverse(o => { if (o.userData.wallId) wallGroupCache.set(o.userData.wallId, o); });
    }
    return wallGroupCache;
  }
  function clearPaint(group) {
    const coats = [];
    group.traverse(o => { if (o.userData.paint) coats.push(o); });
    for (const c of coats) { c.parent.remove(c); c.geometry.dispose(); c.material.dispose(); }
  }
  function paintGroup(group, side, srcName, paintKey) {
    const srcMat = M[srcName];
    group.traverse(o => {
      if (!o.isMesh || o.userData.paint || o.material !== srcMat) return;
      const p = o.geometry?.parameters;
      if (!p || p.width == null || p.height == null) return;
      const coat = new THREE.Mesh(
        new THREE.PlaneGeometry(p.width, p.height),
        new THREE.MeshStandardMaterial({ color: PAINT_HEX[paintKey] ?? 0xffffff, roughness: 0.93, side: THREE.DoubleSide }),
      );
      coat.position.z = side * ((p.depth ?? 0.4) / 2 + 0.02);
      coat.userData.paint = true;
      o.add(coat);
    });
  }
  function applyWallPaints() {
    for (const g of wallGroups().values()) clearPaint(g);
    for (const [key, e] of Object.entries(state.walls)) {
      const wid = key.slice(0, key.lastIndexOf('|'));
      const side = key.endsWith('|+') ? 1 : -1;
      const g = wallGroups().get(wid);
      if (g && e?.paint) paintGroup(g, side, e.src || 'wall', e.paint);
    }
  }
  function paintWallFromHit(w) {
    let g = w.object;
    while (g && !g.userData.wallId) g = g.parent;
    if (!g) return false;
    // which side was clicked, in the segment mesh's own frame (all segments share one rotation)
    const p0 = w.object.worldToLocal(w.point.clone());
    const p1 = w.object.worldToLocal(w.point.clone().add(w.normal));
    const side = (p1.z - p0.z) >= 0 ? 1 : -1;
    const srcName = matNames.get(w.object.material) || 'wall';
    const key = `${g.userData.wallId}|${side > 0 ? '+' : '-'}`;
    pushUndo();
    if (pendingPaint === 'reset') delete state.walls[key];
    else state.walls[key] = { paint: pendingPaint, src: srcName };
    save();
    clearPaint(g);
    for (const [k, e] of Object.entries(state.walls)) {
      if (!k.startsWith(g.userData.wallId + '|')) continue;
      paintGroup(g, k.endsWith('|+') ? 1 : -1, e.src || 'wall', e.paint);
    }
    return true;
  }

  // ---------------- pointer handlers ----------------
  function onDown(e) {
    // editing requires Edit layout mode — browsing clicks must never move furniture
    if (e.button !== 0 || !enabled) return;
    setPointer(e);
    // wall paint mode
    if (pendingPaint) {
      const w = pickWall();
      if (w) paintWallFromHit(w);
      e.preventDefault(); e.stopPropagation();
      return;
    }
    // click-to-place
    if (pending) {
      let placed = null;   // { level, x, z, y, rot }
      const wk = WALL_KINDS[pending.kind];
      if (wk) {
        const w = pickWall();
        if (w) {
          const floor = getFloor();
          let level = floor === 'all' ? 0 : Number(floor);
          if (floor === 'all') for (let i = 3; i >= 0; i--) if (w.point.y >= BASE[i] - 0.1) { level = i; break; }
          const fg = H.furn[level];
          const local = fg.worldToLocal(w.point.clone());
          const nl = fg.worldToLocal(w.point.clone().add(w.normal)).sub(local).normalize();
          placed = {
            level,
            x: local.x + nl.x * wk.off,
            z: local.z + nl.z * wk.off,
            y: +wk.y(Math.max(0, w.point.y - BASE[level]), pending.args).toFixed(2),
            rot: Math.atan2(nl.x, nl.z),
          };
        }
      }
      if (!placed) {
        const hits = ray.intersectObjects(visibleFloorPicks(), false);
        if (hits.length) {
          const fp = hits[0].object;
          const level = fp.userData.level;
          const local = H.furn[level].worldToLocal(hits[0].point.clone());
          placed = { level, x: Math.round(local.x * 2) / 2, z: Math.round(local.z * 2) / 2, rot: 0 };
        }
      }
      if (placed) {
        pushUndo();
        const entry = { aid: `a${++aidCounter}`, kind: pending.kind, args: pending.args, ...placed };
        state.added.push(entry);
        save();
        const item = spawnFromEntry(entry);
        if (item) select(item);
        if (!e.shiftKey) setPending(null);       // hold Shift to keep placing
      }
      e.preventDefault(); e.stopPropagation();
      return;
    }
    const item = pickItem(e.altKey);
    if (!item) { deselect(); return; }
    pushUndo();
    select(item);
    item.getWorldPosition(tmp);
    plane.setFromNormalAndCoplanarPoint(UP, tmp);
    if (ray.ray.intersectPlane(plane, hit)) grab.subVectors(hit, tmp);
    dragging = true;
    orbit.enabled = false;
    e.preventDefault(); e.stopPropagation();
  }

  function onMove(e) {
    if (!enabled) return;
    if (pending && !dragging) {          // ghost preview follows the cursor
      setPointer(e);
      moveGhost();
      return;
    }
    if (!dragging || !selected) return;
    setPointer(e);
    if (!ray.ray.intersectPlane(plane, hit)) return;
    hit.sub(grab);
    const local = selected.parent.worldToLocal(hit.clone());
    if (e.altKey) {
      selected.position.x = local.x;
      selected.position.z = local.z;
    } else {
      selected.position.x = Math.round(local.x * 2) / 2;   // 6" grid
      selected.position.z = Math.round(local.z * 2) / 2;
    }
    refreshHelper();
    reportDims();
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    orbit.enabled = true;
    if (selected) record(selected);
  }

  function onDblClick(e) {
    setPointer(e);
    const hits = ray.intersectObjects(visibleFloorPicks(), false);
    if (!hits.length) return;
    focusRoom(hits[0].object);
  }

  // ---------------- room focus ----------------
  function focusRoom(fp) {
    const bbox = new THREE.Box3().setFromObject(fp);
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const span = Math.max(size.x / Math.min(camera.aspect, 1.6), size.z) || 10;
    const dist = (span / 2) / Math.tan((camera.fov * Math.PI) / 360) * 1.2 + 4;
    if (!roomFocus) {
      roomFocus = { prevPos: camera.position.clone(), prevTgt: orbit.target.clone() };
    }
    roomFocus.key = `${fp.userData.level}|${fp.userData.room}`;
    roomFocus.name = fp.userData.room;
    roomFocus.level = fp.userData.level;
    flyTo(new THREE.Vector3(center.x, center.y + dist, center.z + dist * 0.12), center);
    onUI?.({ room: { name: fp.userData.room, key: roomFocus.key, floorMat: state.rooms[roomFocus.key]?.floor || null } });
  }
  function exitRoom() {
    if (!roomFocus) return;
    flyTo(roomFocus.prevPos, roomFocus.prevTgt);
    roomFocus = null;
    onUI?.({ room: null });
  }
  function setRoomFloor(matKey) {
    if (!roomFocus) return;
    pushUndo();
    if (matKey) state.rooms[roomFocus.key] = { ...state.rooms[roomFocus.key], floor: matKey };
    else delete state.rooms[roomFocus.key];
    save();
    for (const fp of H.floorPicks) {
      if (`${fp.userData.level}|${fp.userData.room}` !== roomFocus.key) continue;
      fp.material = matKey && M[matKey] ? M[matKey] : fp.userData.srcFloorMat;
    }
  }

  // ---------------- keyboard ----------------
  function onKey(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      if (enabled && undoStack.length) {
        state = JSON.parse(undoStack.pop());
        save();
        applyState();
      }
      e.preventDefault();
      return;
    }
    if (e.key === 'Escape') {
      if (pendingPaint) setPaint(null);
      else if (pending) setPending(null);
      else if (selected) deselect();
      else if (roomFocus) exitRoom();
      return;
    }
    if (!enabled || !selected) return;
    const step = e.shiftKey ? 0.1 : 0.5;
    switch (e.key) {
      case 'r': pushUndo(); selected.rotation.y += Math.PI / 4; refreshHelper(); record(selected); break;
      case 'R': pushUndo(); selected.rotation.y -= Math.PI / 4; refreshHelper(); record(selected); break;
      case ',': pushUndo(); selected.rotation.y += Math.PI / 12; refreshHelper(); record(selected); break;
      case '.': pushUndo(); selected.rotation.y -= Math.PI / 12; refreshHelper(); record(selected); break;
      case 'f': case 'F':
        pushUndo();
        selected.scale.x *= -1;
        refreshHelper(); record(selected);
        break;
      case 'd': case 'D': {
        pushUndo();
        const src = selected;
        const entry = {
          aid: `a${++aidCounter}`,
          level: src.userData.level,
          x: src.position.x + 1.5, z: src.position.z + 1.5,
          rot: src.rotation.y, flip: src.scale.x < 0 || undefined,
          sx: sizeOr(Math.abs(src.scale.x)), sy: sizeOr(src.scale.y), sz: sizeOr(src.scale.z),
        };
        if (src.userData.aid) {
          const srcEntry = state.added.find(en => en.aid === src.userData.aid);
          Object.assign(entry, { kind: srcEntry?.kind, args: srcEntry?.args, mat: srcEntry?.mat, accent: srcEntry?.accent });
        } else {
          entry.src = src.userData.id;
        }
        state.added.push(entry);
        save();
        const copy = spawnFromEntry(entry);
        if (copy) select(copy);
        break;
      }
      case 'Backspace': case 'Delete':
        pushUndo();
        if (selected.userData.aid) {
          state.added = state.added.filter(en => en.aid !== selected.userData.aid);
          removeSpawnedItem(selected);
        } else {
          selected.visible = false;
          record(selected);
        }
        save();
        deselect();
        e.preventDefault();
        break;
      case 'ArrowLeft': nudge(-step, 0); e.preventDefault(); break;
      case 'ArrowRight': nudge(step, 0); e.preventDefault(); break;
      case 'ArrowUp': nudge(0, -step); e.preventDefault(); break;
      case 'ArrowDown': nudge(0, step); e.preventDefault(); break;
      case 'PageUp':                                   // raise (art, TVs, cabinets…)
        pushUndo();
        selected.position.y += e.shiftKey ? 0.1 : 0.25;
        refreshHelper(); record(selected);
        e.preventDefault();
        break;
      case 'PageDown': {                               // lower (not below the floor)
        pushUndo();
        const floorY = BASE[selected.userData.level];
        selected.position.y = Math.max(floorY, selected.position.y - (e.shiftKey ? 0.1 : 0.25));
        refreshHelper(); record(selected);
        e.preventDefault();
        break;
      }
    }
  }

  function nudge(dxScreen, dzScreen) {
    if (!selected) return;
    pushUndo();
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0; fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, UP);
    const delta = right.multiplyScalar(dxScreen).addScaledVector(fwd, -dzScreen);
    selected.getWorldPosition(tmp);
    tmp.add(delta);
    const local = selected.parent.worldToLocal(tmp.clone());
    selected.position.x = local.x;
    selected.position.z = local.z;
    refreshHelper();
    record(selected);
    reportDims();
  }

  function setPending(p) {
    pending = p;
    if (p) pendingPaint = null;
    renderer.domElement.style.cursor = p ? 'crosshair' : '';
    onUI?.({ pending: p ? p.label : null });
    makeGhost();
  }
  function setPaint(key) {
    pendingPaint = key;
    if (key) { pending = null; killGhost(); }
    renderer.domElement.style.cursor = key ? 'crosshair' : '';
    onUI?.({ paint: key });
  }

  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('dblclick', onDblClick);
  addEventListener('pointermove', onMove);
  addEventListener('pointerup', onUp);
  addEventListener('keydown', onKey);

  // ---------------- named layout slots ----------------
  const STORE_SLOTS = 'cityhome-layout-slots';
  const readSlots = () => { try { return JSON.parse(localStorage.getItem(STORE_SLOTS) || '{}'); } catch { return {}; } };
  const writeSlots = s => localStorage.setItem(STORE_SLOTS, JSON.stringify(s));

  return {
    applyOverrides: applyState,
    getState: snapshot,
    get enabled() { return enabled; },
    get focusedRoom() { return roomFocus; },
    get selection() { return selected ? { id: selected.userData.id, kind: selected.userData.kind } : null; },
    clearSelection: deselect,
    listLayouts: () => Object.keys(readSlots()).sort(),
    saveLayoutAs(name) {
      if (!name) return;
      const s = readSlots();
      s[name] = JSON.parse(JSON.stringify(state));
      writeSlots(s);
    },
    loadLayout(name) {
      const s = readSlots();
      if (!s[name]) return false;
      pushUndo();
      state = JSON.parse(JSON.stringify(s[name]));
      for (const e2 of state.added) aidCounter = Math.max(aidCounter, parseInt(e2.aid.slice(1), 10) || 0);
      save();
      applyState();
      return true;
    },
    deleteLayout(name) {
      const s = readSlots();
      delete s[name];
      writeSlots(s);
    },
    setEnabled(b) {
      enabled = b;
      if (!b) { setPending(null); setPaint(null); deselect(); dragging = false; orbit.enabled = true; }
    },
    tick(dt) {
      if (fly.t > 0) {
        fly.t = Math.min(1, fly.t + dt / 1.1);
        const e2 = fly.t * fly.t * (3 - 2 * fly.t);
        camera.position.lerpVectors(fly.fromP, fly.toP, e2);
        orbit.target.lerpVectors(fly.fromT, fly.toT, e2);
        if (fly.t >= 1) fly.t = 0;
      }
      bobT += dt;
      updateEndMarker(bobT);
    },
    beginPlace(kind, label, args) { setPending({ kind, label, args }); },
    beginPaint: setPaint,
    // resize any selected piece along its own axes ('x' width / 'z' depth / 'y' height)
    resizeSelected(axis, dir) {
      if (!selected) return;
      pushUndo();
      if (axis === 'reset') {
        selected.scale.set(selected.scale.x < 0 ? -1 : 1, 1, 1);
      } else {
        const f = dir > 0 ? 1.1 : 1 / 1.1;
        const clamp = v => Math.min(3, Math.max(0.4, v));
        const axes = axis === 'xz' ? ['x', 'z'] : [axis];   // 'xz' keeps the footprint's shape
        for (const ax of axes) {
          const cur = ax === 'x' ? Math.abs(selected.scale.x) : selected.scale[ax];
          const next = clamp(cur * f);
          if (ax === 'x') selected.scale.x = (selected.scale.x < 0 ? -1 : 1) * next;
          else selected.scale[ax] = next;
        }
      }
      refreshHelper();
      record(selected);
      reportDims();
    },
    // reconfigure the selected modular sofa: add/remove modules, resize
    modifySofa(op) {
      if (!selected?.userData.aid || selected.userData.kind !== 'modSofa') return;
      const entry = state.added.find(en => en.aid === selected.userData.aid);
      if (!entry) return;
      pushUndo();
      let [mods, w = 3.2, d = 3.4] = entry.args || [];
      mods = [...(mods || ['seat', 'seat'])];
      const atHead = entry.end === 'head';
      if (op === 'flipEnd') {
        entry.end = atHead ? undefined : 'head';
        save();
        return;                                // marker jumps; no rebuild needed
      }
      if (op === 'pop') {
        if (mods.length > 1) {
          const removed = atHead ? mods.shift() : mods.pop();
          // a leading corner re-aims the whole chain; counter-rotate so the sofa stays put
          if (atHead && removed === 'corner') entry.rot = (entry.rot || 0) - Math.PI / 2;
        }
      } else if (op === 'w+') w = Math.min(4.4, w + 0.4);
      else if (op === 'w-') w = Math.max(2.4, w - 0.4);
      else if (op === 'd+') d = Math.min(4.6, d + 0.3);
      else if (op === 'd-') d = Math.max(2.8, d - 0.3);
      else if (atHead) {                       // 'seat' | 'chaise' | 'corner' | 'ottoman'
        mods.unshift(op);
        if (op === 'corner') entry.rot = (entry.rot || 0) + Math.PI / 2;
      } else {
        mods.push(op);
      }
      entry.args = [mods, w, d];
      save();
      removeSpawnedItem(selected);
      const item = spawnFromEntry(entry);
      if (item) select(item);
    },
    styleSelected(slot, matKey) {
      if (!selected) return;
      pushUndo();
      applyFinish(selected, slot, matKey);
      recordFinish(selected, slot, matKey);
    },
    setRoomFloor,
    exitRoom,
    resetFloor(floor) {
      pushUndo();
      const lv = floor === 'all' ? [0, 1, 2, 3] : [Number(floor)];
      for (const it of allItems()) {
        if (!lv.includes(it.userData.level)) continue;
        if (it.userData.aid) {
          state.added = state.added.filter(en => en.aid !== it.userData.aid);
          removeSpawnedItem(it);
        } else if (state.edits[it.userData.id]) {
          delete state.edits[it.userData.id];
        }
      }
      for (const key of Object.keys(state.rooms)) {
        if (lv.includes(Number(key.split('|')[0]))) delete state.rooms[key];
      }
      for (const key of Object.keys(state.walls || {})) {
        if (lv.includes(Number(key.split('|')[0]))) delete state.walls[key];
      }
      save();
      applyState();
    },
    exportLayout() {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'city-home-layout.json';
      a.click();
      URL.revokeObjectURL(a.href);
    },
    importLayout(json) {
      pushUndo();
      if (json.edits || json.added || json.rooms || json.walls) {
        state = { edits: json.edits || {}, added: json.added || [], rooms: json.rooms || {}, walls: json.walls || {} };
      } else {
        state.edits = { ...state.edits, ...json };   // v1 file
      }
      for (const e2 of state.added) aidCounter = Math.max(aidCounter, parseInt(e2.aid.slice(1), 10) || 0);
      save();
      applyState();
    },
  };
}
