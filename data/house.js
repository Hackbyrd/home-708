import * as THREE from 'three';
import { wall, slab, rect, box, mainStair, stairGuard, voidOrbs, stairHole, spiralStair, railing, label } from '../src/parts.js';
import { CORE, FOOTPRINT, HOUSE, OPTIONAL, ROOMS, TERRACES, VOIDS, extents } from './blueprint.js';

// ============================================================
// THE CITY HOME w/ GEORGETOWN PACKAGE — traced from Wormald plans
// Units: feet. x: west->east (0..31.6). z: front/south -> rear/north (0..57.7). y: up.
// Levels: 0 Ground (y0), 1 Main (y11), 2 Upper (y22), 3 Penthouse (y32)
// ============================================================

export const W = HOUSE.width, D = HOUSE.depth;
export const BASE = HOUSE.base;
export const CEIL = HOUSE.ceiling;

const roomExtents = floor => Object.fromEntries(
  Object.entries(floor).map(([name, definition]) => [name, extents(definition)]),
);
const between = (a, b) => (a + b) / 2;

export function buildHouse(M, K) {
  const levels = [new THREE.Group(), new THREE.Group(), new THREE.Group(), new THREE.Group()];
  const furn = [new THREE.Group(), new THREE.Group(), new THREE.Group(), new THREE.Group()];
  // ceiling-mounted decoration (beams, T&G, canopies) — hidden when its own floor is peeled open
  const ceilings = [new THREE.Group(), new THREE.Group(), new THREE.Group(), new THREE.Group()];
  ceilings.forEach((g, i) => levels[i].add(g));
  const roof = new THREE.Group();
  const optional = new THREE.Group(); // spiral stair stack
  const labels = [[], [], [], []];
  let tray = null;
  let smoke = null;
  const evLights = [];
  const floorPicks = []; // room floor meshes for hover naming

  const EXT = h => [{ mat: M.brick, t: 0.28, off: -0.21 }, { mat: M.wall, t: 0.42, off: 0.14 }];
  const EXTM = m => [{ mat: m, t: 0.28, off: -0.21 }, { mat: M.wall, t: 0.42, off: 0.14 }];  // alt exterior cladding
  const INT = [{ mat: M.wall, t: 0.4, off: 0 }];
  const garageDoors = [];

  // axis-aligned wall helper: openings use absolute coordinate `pos` along the wall axis
  const wallCounts = {};
  function mkWall(level, a, b, ops = [], layers = null, h = null, mats = {}) {
    const height = h ?? CEIL[level];
    const horiz = a[1] === b[1];
    const openings = ops.map(o => ({ ...o, at: horiz ? Math.abs(o.pos - a[0]) : Math.abs(o.pos - a[1]) }));
    const ly = layers ?? INT;
    const isExt = ly.length > 1;
    const g = wall(a, b, height, openings, ly, BASE[level],
      mats.glass ?? M.glass, mats.frame ?? M.bronze,
      mats.trim ?? (isExt ? M.trimStone : null),          // bluestone sills + lintels vs white brick
      mats.leaf ?? (isExt ? ly[ly.length - 1].mat : null)); // door leaves on exterior walls only — interior doorways stay open
    // stable identity so the editor can persist per-side wall paint
    const wid = `${level}|${a[0]},${a[1]}-${b[0]},${b[1]}`;
    wallCounts[wid] = (wallCounts[wid] || 0) + 1;
    g.userData.wallId = wallCounts[wid] > 1 ? `${wid}#${wallCounts[wid]}` : wid;
    levels[level].add(g);
    return g;
  }
  const win = (pos, w = 3.2, h = 5, sill = 2.4) => ({ pos, w, h, sill, type: 'window' });
  const door = (pos, w = 3, h = 8) => ({ pos, w, h, sill: 0, type: 'door' });
  const gdoor = (pos, w = 4, h = 8) => ({ pos, w, h, sill: 0, type: 'glassdoor' });
  const arch = (pos, w = 5, h = 8.7) => ({ pos, w, h, sill: 0, type: 'arch' });

  const idCounts = {};
  function place(level, item, x, z, rotY = 0) {
    item.position.x += x; item.position.z += z;
    item.position.y += BASE[level];
    if (rotY) item.rotation.y = rotY;
    // stable identity + factory pose, for the layout editor
    const kind = item.userData.kind || 'item';
    const key = `${level}|${kind}|${x.toFixed(1)},${z.toFixed(1)}`;
    idCounts[key] = (idCounts[key] || 0) + 1;
    item.userData.id = idCounts[key] > 1 ? `${key}#${idCounts[key]}` : key;
    item.userData.level = level;
    item.userData.editable = true;
    item.userData.home = { x: item.position.x, z: item.position.z, rot: item.rotation.y };
    furn[level].add(item);
    return item;
  }

  function evLight(level, x, y, z, intensity = 14, dist = 24, color = 0xffc98a) {
    const l = new THREE.PointLight(color, 0, dist, 1.8);
    l.position.set(x, BASE[level] + y, z);
    l.userData.evening = intensity;
    levels[level].add(l);
    evLights.push(l);
  }

  // swagged string lights between two world-space points
  function swag(group, p1, p2, sag) {
    const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
    const n = Math.max(6, Math.round(dist / 1.15));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), M.warmGlow);
      bulb.position.set(
        p1[0] + (p2[0] - p1[0]) * t,
        p1[1] + (p2[1] - p1[1]) * t - sag * 4 * t * (1 - t),
        p1[2] + (p2[2] - p1[2]) * t
      );
      group.add(bulb);
    }
  }

  function roomFloor(level, r, mat, name) {
    const m = slab(r, [], 0.1, BASE[level] + 0.07, mat);
    m.castShadow = false;
    m.userData.room = name;
    m.userData.level = level;
    m.userData.srcFloorMat = mat;
    levels[level].add(m);
    floorPicks.push(m);
  }

  function lab(level, text, x, z) { labels[level].push(label(text, x, BASE[level] + 7.6, z)); }

  function elevatorCloset(level) {
    const E = CORE.elevator;
    mkWall(level, [E.x0, E.z0], [E.x0, E.z1 - 0.2]);
    mkWall(level, [E.x0, E.z1], [E.x1, E.z1]);
    // bronze elevator doors + call plate on the hall face
    levels[level].add(box(0.12, 7, 1.5, M.bronze, 25.94, BASE[level] + 3.5, 27.75));
    levels[level].add(box(0.12, 7, 1.5, M.bronze, 25.94, BASE[level] + 3.5, 29.25));
    levels[level].add(box(0.1, 0.35, 3.3, M.blackSteel, 25.95, BASE[level] + 7.2, 28.5, false));
    levels[level].add(box(0.08, 0.45, 0.25, M.brass, 25.92, BASE[level] + 3.5, 30.05, false));
  }

  // ==================================================================
  // GROUND & SITE
  // ==================================================================
  const site = new THREE.Group();
  // (lawn, streets, driveway, fence & planting live in src/landscape.js)
  site.add(box(11.4, 0.42, 6.2, M.paverRed, -9.6, -1.66, 17.6, false));           // brick-paver walk: gate -> entry steps
  site.add(box(W + 2, 1.6, D + 2, M.concrete, W / 2, -0.85, D / 2));              // foundation skirt
  // gray fieldstone watertable around the base
  site.add(box(W + 0.6, 2.6, 0.5, M.fieldstone, W / 2, -0.2, -0.1, false));       // front
  site.add(box(0.5, 2.6, 14.5, M.fieldstone, -0.1, -0.2, 7.2, false));            // west, south of entry
  site.add(box(0.5, 2.6, 25.4, M.fieldstone, -0.1, -0.2, 33.5, false));           // west, north of entry
  site.add(box(0.5, 2.6, D + 0.4, M.fieldstone, W + 0.1, -0.2, D / 2, false));    // east
  // tiny stair up into the recessed entry vestibule
  site.add(box(1.5, 0.6, 6.4, M.trimStone, -3.2, -1.2, 17.6));                    // tread 1
  site.add(box(1.5, 1.1, 6.4, M.trimStone, -1.8, -0.95, 17.6));                   // tread 2
  site.add(box(1.5, 1.55, 6.4, M.trimStone, -0.4, -0.73, 17.6));                  // tread 3 -> vestibule floor

  // ==================================================================
  // LEVEL 0 — GROUND / ENTRY
  // ==================================================================
  {
    const L = 0, E = EXT(), ch = CEIL[0], R = roomExtents(ROOMS.entry);
    slabAdd(0, [FOOTPRINT.full], [], M.subfloor);
    // exterior walls (CCW: inside is +lateral)
    mkWall(L, [0, 0.35], [W, 0.35], [win(4.5), win(9), win(21), win(26)], E, ch, { frame: M.blackSteel });
    // blind "fake window" panel centered on the east facade (per photo)
    levels[L].add(box(3, 4.4, 0.12, M.plaster, 15.5, 4.3, -0.05, false));
    levels[L].add(box(3.6, 0.28, 0.5, M.trimStone, 15.5, 1.95, -0.16));
    const blindArch = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.22, 6, 14, Math.PI), M.paverRed);
    blindArch.rotation.y = Math.PI;
    blindArch.position.set(15.5, 6.55, -0.1);
    levels[L].add(blindArch);
    mkWall(L, [31.25, 0.35], [31.25, 57.35], [win(5.5), win(18, 3, 4.5, 3.5), win(30, 3, 4, 3.5), win(50, 4, 3, 4.5)], E, ch);
    mkWall(L, [31.6, 57.35], [0, 57.35], [
      { pos: 21, w: 16, h: 7.5, sill: 0, type: 'arch' },
      { pos: 6.5, w: 9, h: 7.5, sill: 0, type: 'arch' },
    ], E, ch);
    // wood-tone garage doors — pivot at the head so they tilt up & tuck inside
    for (const [dx, dw] of [[21, 16], [6.5, 9]]) {
      const gd = new THREE.Group();                       // pivot at door head
      gd.add(box(dw - 0.3, 7.3, 0.3, M.oakDoor, 0, -3.68, 0));
      for (let ry = 0.55; ry < 6.6; ry += 1.45) gd.add(box(dw - 0.7, 0.16, 0.1, M.walnut, 0, -ry, 0.2));
      gd.position.set(dx, 7.42, 57.2);
      levels[L].add(gd);
      garageDoors.push(gd);
    }
    // three coach sconces on the garage facade: left corner, center, right corner
    for (const sx of [1.2, 12.75, 30.4]) {
      levels[L].add(box(0.4, 0.8, 0.4, M.matBlack, sx, 6.2, 57.85));
      levels[L].add(box(0.2, 0.4, 0.2, M.warmGlow, sx, 6.15, 57.95, false));
      evLight(L, sx, 6, 58.3, 5, 9);
    }
    // south facade, ground floor: big square window each side of the door + two in the left section
    mkWall(L, [0.35, 57.35], [0.35, 20.6], [win(50, 4, 3, 4.5), win(38.5, 3.2, 4.5, 2.8), win(25.5, 4.5, 4.5, 2.6)], E, ch);
    mkWall(L, [0.35, 14.6], [0.35, 0.35], [win(8, 4.5, 4.5, 2.6)], E, ch);

    // ---- recessed entry vestibule (per plan: portico carved INTO the floor plate) ----
    mkWall(L, [4.6, 14.8], [0.15, 14.8], [], E, ch);                     // south cheek, brick faces the recess
    mkWall(L, [0.15, 20.4], [4.6, 20.4], [], E, ch);                     // north cheek
    mkWall(L, [4.6, 20.4], [4.6, 14.8], [gdoor(17.6, 3.6, 8)], E, ch);   // back wall + glazed entry
    // ---- stained-oak entry door: arched glass lite + raised panels ----
    levels[L].add(box(0.16, 8, 0.5, M.oakDoor, 4.42, 4, 15.95));
    levels[L].add(box(0.16, 8, 0.5, M.oakDoor, 4.42, 4, 19.25));
    levels[L].add(box(0.16, 2.7, 3.4, M.oakDoor, 4.42, 1.35, 17.6));
    levels[L].add(box(0.16, 0.55, 3.4, M.oakDoor, 4.42, 7.72, 17.6));
    const doorArch = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.16, 18, 1, false, 0, Math.PI), M.oakDoor);
    doorArch.rotation.z = Math.PI / 2;
    doorArch.position.set(4.42, 6.45, 17.6);
    doorArch.castShadow = true;
    levels[L].add(doorArch);
    levels[L].add(box(0.08, 0.95, 2.5, M.oakDoor, 4.3, 0.95, 17.6));     // raised panels
    levels[L].add(box(0.08, 0.85, 2.5, M.oakDoor, 4.3, 2.2, 17.6));
    levels[L].add(box(0.1, 1.0, 0.12, M.matBlack, 4.28, 3.3, 16.5));     // black handleset
    // ---- vestibule finishes: taupe paint (matches the real house) ----
    levels[L].add(box(4.35, 0.24, 5.5, M.stoneFloor, 2.35, 0.12, 17.6));  // stone pad
    levels[L].add(box(4.55, 0.35, 5.9, M.taupe, 2.4, 9.45, 17.6, false)); // soffit
    levels[L].add(box(3.95, 9.3, 0.1, M.taupe, 2.45, 4.65, 15.22));       // cheek faces
    levels[L].add(box(3.95, 9.3, 0.1, M.taupe, 2.45, 4.65, 19.98));
    levels[L].add(box(0.09, 9.2, 1.1, M.taupe, 4.36, 4.6, 15.3));         // back-wall flanks + header
    levels[L].add(box(0.09, 9.2, 1.1, M.taupe, 4.36, 4.6, 19.9));
    levels[L].add(box(0.09, 1.25, 5.7, M.taupe, 4.36, 8.75, 17.6));
    levels[L].add(box(0.75, 10.1, 0.6, M.taupe, -0.05, 4.35, 14.75));     // taupe pilaster jambs
    levels[L].add(box(0.75, 10.1, 0.6, M.taupe, -0.05, 4.35, 20.45));
    // ceiling light in the recess
    levels[L].add(box(0.5, 0.12, 0.5, M.warmGlow, 2.4, 9.2, 17.6, false));
    evLight(L, 2.4, 8.7, 17.6, 7, 9);
    // ---- "the cove": bell-curved standing-seam hood ----
    const hoodG = new THREE.Group();
    hoodG.add(box(2.9, 1.0, 7.7, M.taupe, -0.95, 8.35, 17.6));            // fascia band
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 3.0, 24, 1, true, 0, Math.PI), M.hoodMetal);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(-0.95, 8.85, 17.6);
    barrel.castShadow = true;
    hoodG.add(barrel);
    const tympanum = new THREE.Mesh(new THREE.CircleGeometry(3.28, 24, 0, Math.PI), M.hoodMetal);
    tympanum.rotation.y = -Math.PI / 2;
    tympanum.position.set(-2.42, 8.85, 17.6);
    hoodG.add(tympanum);
    for (const [ez, tilt] of [[13.85, 0.42], [21.35, -0.42]]) {           // flared eave wings
      const wing = box(3.3, 0.16, 2.1, M.hoodMetal, -0.95, 8.9, ez);
      wing.rotation.x = tilt;
      hoodG.add(wing);
    }
    hoodG.add(box(0.5, 0.7, 0.45, M.matBlack, -0.35, 7.55, 14.4));        // brackets
    hoodG.add(box(0.5, 0.7, 0.45, M.matBlack, -0.35, 7.55, 20.8));
    levels[L].add(hoodG);
    // ---- black coach lanterns on the brick, flanking the entry ----
    for (const lz of [13.4, 21.8]) {
      const lampBody = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.26, 0.9, 6), M.matBlack);
      lampBody.position.set(-0.42, 6.6, lz);
      lampBody.castShadow = true;
      levels[L].add(lampBody);
      const lampCap = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.32, 6), M.matBlack);
      lampCap.position.set(-0.42, 7.2, lz);
      levels[L].add(lampCap);
      levels[L].add(box(0.17, 0.42, 0.17, M.warmGlow, -0.42, 6.55, lz, false));
      levels[L].add(box(0.45, 0.08, 0.08, M.matBlack, -0.15, 7.0, lz, false));
      evLight(L, -0.7, 6.4, lz, 6, 9);
    }
    // white-brick accent wall in the gallery (behind the console + mirror)
    levels[L].add(box(7, 9.6, 0.16, M.brick, 4.9, BASE[L] + 4.8, 21.62, false));

    // interior
    const officeMediaX = between(R.office.x1, R.media.x0);
    mkWall(L, [officeMediaX, R.office.z0], [officeMediaX, R.media.z1]);               // office/media wall center
    mkWall(L, [R.office.x0, R.office.z1], [R.gallery.x1, R.office.z1], [gdoor(10.5, 6)]);
    mkWall(L, [R.media.x0, R.media.z1], [R.media.x1, R.media.z1], [gdoor(18.5, 6)]);
    mkWall(L, [R.gallery.x1, R.office.z1], [R.gallery.x1, R.gallery.z1], [arch(17.7, 7, 9)]);
    mkWall(L, [R.gallery.x0, R.gallery.z1], [R.gallery.x1, R.gallery.z1], [gdoor(8, 6)]);
    mkWall(L, [R.studio.x1, R.studio.z0], [R.studio.x1, R.studio.z1], [door(23.5)]);
    mkWall(L, [R.bath3.x0, R.bath3.z0], [R.bath3.x1, R.bath3.z0]);
    mkWall(L, [R.bath3.x1, R.bath3.z0], [R.bath3.x1, R.bath3.z1], [door(27.3, 2.6)]);
    mkWall(L, [R.bath3.x0, R.bath3.z1], [R.bath3.x1, R.bath3.z1]);
    mkWall(L, [R.rearHall.x0, R.rearHall.z0], [R.rearHall.x1, R.rearHall.z0], [arch(18.9, 4.5)]);
    elevatorCloset(L);
    mkWall(L, [R.mechanical.x0, R.mechanical.z0], [R.mechanical.x1, R.mechanical.z0], [door(15), door(20.5)]);
    mkWall(L, [17.8, R.mechanical.z0], [17.8, R.mechanical.z1]);
    mkWall(L, [R.garage.x0, R.garage.z0], [R.garage.x1, R.garage.z0], [door(20.5)], INT, ch);

    levels[L].add(mainStair(BASE[L], HOUSE.rises[L], M.oakWood, M.blackSteel));

    // ---- waterfall wall (Center Hall signature) ----
    const wf = new THREE.Group();
    wf.add(box(6.6, 9.4, 0.35, M.flutedBlack, 23.9, 4.7, 25.9));                   // fluted stone backer
    wf.add(box(5, 8.6, 0.12, M.waterGlass, 23.9, 4.6, 25.55));                     // glass water sheet
    wf.add(box(0.7, 9.4, 0.15, M.mirror, 20.45, 4.7, 25.7));                       // mirror flanks
    wf.add(box(0.7, 9.4, 0.15, M.mirror, 27.35, 4.7, 25.7));
    wf.add(box(6.6, 0.35, 1.3, M.marqina, 23.9, 0.18, 25.15));                     // basin grate
    const wfGlow = box(5, 0.15, 0.15, M.warmGlow, 23.9, 0.4, 25.4, false);
    wf.add(wfGlow);
    levels[L].add(wf);

    // room floors
    roomFloor(L, ROOMS.entry.office.bounds, M.oakFloor, 'Home Office');
    roomFloor(L, ROOMS.entry.media.bounds, M.oakFloor, 'Media Room');
    roomFloor(L, ROOMS.entry.gallery.bounds, M.stoneFloor, 'Entrance Gallery');
    roomFloor(L, ROOMS.entry.centerHall.bounds, M.stoneFloor, 'Center Hall');
    roomFloor(L, ROOMS.entry.studio.bounds, M.oakFloor, 'Studio');
    roomFloor(L, CORE.elevator.bounds, M.tileWhite, 'Elevator');
    roomFloor(L, ROOMS.entry.bath3.bounds, M.tileWhite, 'Bath #3');
    roomFloor(L, ROOMS.entry.hall.bounds, M.stoneFloor, 'Hall');
    roomFloor(L, ROOMS.entry.rearHall.bounds, M.stoneFloor, 'Rear Hall');
    roomFloor(L, ROOMS.entry.mechanical.bounds, M.concrete, 'Mechanical');
    roomFloor(L, ROOMS.entry.garage.bounds, M.slate, 'Three-Car Garage');

    // furniture
    // Home Office — per blueprint: desk floats facing the door, built-ins on the INNER (east) wall
    place(L, K.rug(9, 11, M.greige), 8, 7.2);
    place(L, K.desk(6, M.walnut), 8, 7.8, Math.PI);
    place(L, K.officeChair(), 8, 6.1);
    place(L, K.builtinWall(11.5, 8.6, M.iron), 15.1, 7, -Math.PI / 2);
    place(L, K.diningChair(M.leatherCognac), 6.5, 10.6, Math.PI);        // guest chairs facing the desk
    place(L, K.diningChair(M.leatherCognac), 9.5, 10.6, Math.PI);
    place(L, K.chair(M.leatherCognac), 2.8, 3.4, Math.PI / 4);           // reading corner
    place(L, K.bench(2.4, M.leatherCognac), 4.7, 5.3, Math.PI / 4);
    place(L, K.roundTable(0.9, 1.9, M.walnut), 2.5, 6.7);
    place(L, K.plant(6), 13.3, 11.9);
    // Media Room — per blueprint: media built-in on the INNER (west) wall, sectional facing it
    place(L, K.rug(11, 8, M.velvetChar), 24, 6.5);
    const sec = K.sectionalL(11, 8, 3.3, M.velvetChar);
    place(L, sec, 25, 7, Math.PI / 2);
    place(L, K.builtinWall(9.5, 8.6, M.iron), 16.8, 6.5, Math.PI / 2);
    const mediaTV = K.tv(6.4);
    place(L, mediaTV, 17.6, 6.5, Math.PI / 2);
    mediaTV.position.y = BASE[L] + 4.7;
    place(L, K.pouf(), 20.5, 3.6);                                       // pouf pair
    place(L, K.pouf(), 23.2, 3.1);
    place(L, K.rug(12, 3, M.greige), 8.5, 17.7);
    place(L, K.console(5.7, M.oakWood), 4, 20.9, Math.PI);
    const galMirror = K.mirrorPanel(4, 7.5);
    place(L, galMirror, 4, 21.6);
    place(L, K.bench(4, M.leatherCognac), 8, 14.4);
    place(L, K.lantern(1.7, 11.5, 20.6), 9, 17.7);
    // Studio — per blueprint: worktable + stools, counter on the INNER (east) wall, easel
    place(L, K.rug(8, 9, M.greige), 5.8, 28.2);
    place(L, K.table(6, 3.2, 3, M.oakWood), 5.8, 28.6);
    place(L, K.stool(), 4.6, 26.3);
    place(L, K.stool(), 7, 26.3);
    place(L, K.cabinetRun(9.8, 3, 2, M.oakWood, M.quartzite), 11.35, 28.6, -Math.PI / 2);
    const easel = new THREE.Group();
    easel.add(box(0.12, 5.2, 0.12, M.walnut, -0.55, 2.6, 0.2));
    easel.add(box(0.12, 5.2, 0.12, M.walnut, 0.55, 2.6, 0.2));
    easel.add(box(0.12, 5.4, 0.12, M.walnut, 0, 2.7, -0.5));
    const easelCanvas = K.art(2.2, 2.6, M.oakWood);
    easelCanvas.position.y = 1.6;
    easelCanvas.rotation.x = -0.12;
    easel.add(easelCanvas);
    place(L, easel, 3.2, 33, 0.7);
    place(L, K.chair(M.leatherCamel), 3, 23.6, 2.6);
    place(L, K.roundTable(0.8, 1.8, M.walnut), 5.3, 23);
    place(L, K.plant(5.5), 10.8, 34);
    place(L, K.plant(6), 19, 24);   // garage kept empty per Jonathan

    lab(L, 'Home Office', 8.3, 7); lab(L, 'Media Room', 24, 6.5);
    lab(L, 'Entrance Gallery', 8.5, 17.7); lab(L, 'Center Hall', 22, 19);
    lab(L, 'Studio', 6.5, 28.5); lab(L, 'Garage', 16, 46.5); lab(L, 'Elevator', 28.6, 28.5);

    evLight(L, 9, 8.6, 17.7, 16);       // gallery lantern
    evLight(L, 23.9, 6, 24.5, 8, 14);   // waterfall graze
    evLight(L, 8.3, 8.5, 7, 10);        // office
    evLight(L, 24, 8.5, 7, 10);         // media
    evLight(L, 6.5, 8.5, 28.5, 8);      // gym
  }

  // ==================================================================
  // LEVEL 1 — MAIN
  // ==================================================================
  {
    const L = 1, E = EXT(), ch = CEIL[1], R = roomExtents(ROOMS.main);
    slabAdd(1, [FOOTPRINT.full], [VOIDS.entryGallery, stairHole()], M.subfloor);

    mkWall(L, [0, 0.35], [W, 0.35], [win(4.5, 3.2, 6, 1.8), win(9, 3.2, 6, 1.8), win(15.5, 2, 3.5, 3), win(21.5, 3.2, 6, 1.8), win(26, 3.2, 6, 1.8)], E, ch);
    // brick arch over the small center window
    const mainArch = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.2, 6, 14, Math.PI), M.paverRed);
    mainArch.rotation.y = Math.PI;
    mainArch.position.set(15.5, BASE[L] + 6.7, -0.1);
    levels[L].add(mainArch);
    mkWall(L, [31.25, 0.35], [31.25, 46.4], [win(5.5, 3.2, 6, 1.8), win(18, 3, 4.5, 3.5), win(32, 3, 3, 5.8), win(43, 3, 3, 5.8)], E, ch);
    const rearLivingWallZ = between(R.great.z1, R.terrace.z0);
    mkWall(L, [31.6, rearLivingWallZ], [13.4, rearLivingWallZ], [gdoor(29, 5), win(22, 4, 5.5, 2), win(17, 4, 5.5, 2)], EXTM(M.panelBrown), ch);
    mkWall(L, [R.sun.x1, R.sun.z0], [R.sun.x1, R.sun.z1], [gdoor(47.8, 3), win(52, 3, 5, 2.5)], EXTM(M.sidingCream), ch);
    mkWall(L, [13.4, R.sun.z1], [0, R.sun.z1], [win(9, 3.5, 6, 1.5), win(3.5, 3.5, 6, 1.5)], EXTM(M.sidingCream), ch);
    mkWall(L, [0.35, 55.7], [0.35, 46.4], [win(52.5, 3.5, 6, 1.5), win(48.5, 3.5, 6, 1.5)], EXTM(M.sidingCream), ch);         // west: wing in siding
    // south facade, main floor: 2 slim windows each side of the oculus (real circular opening); blank wall at the inlay bay
    mkWall(L, [0.35, 46.4], [0.35, 0.35], [win(27.5, 2.6, 6, 1.8), win(22.5, 2.6, 6, 1.8), { pos: 17.6, w: 2.3, h: 2.3, sill: 3.65, type: 'arch' }, win(12.5, 2.6, 6, 1.8), win(7.5, 2.6, 6, 1.8)], E, ch);
    // sunburst oculus above the entry hood
    const ocRing = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.34, 8, 24), M.trimStone);
    ocRing.rotation.y = Math.PI / 2;
    ocRing.position.set(0.18, BASE[L] + 4.8, 17.6);
    ocRing.castShadow = true;
    levels[L].add(ocRing);
    const ocGlass = new THREE.Mesh(new THREE.CircleGeometry(1.08, 22), M.glass);
    ocGlass.rotation.y = -Math.PI / 2;
    ocGlass.position.set(0.0, BASE[L] + 4.8, 17.6);
    levels[L].add(ocGlass);
    const ocFrame = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.07, 6, 22), M.bronze);
    ocFrame.rotation.y = Math.PI / 2;
    ocFrame.position.set(0.04, BASE[L] + 4.8, 17.6);
    levels[L].add(ocFrame);
    const ocRingIn = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.32, 8, 24), M.wall);  // masks the square cut, interior side
    ocRingIn.rotation.y = Math.PI / 2;
    ocRingIn.position.set(0.72, BASE[L] + 4.8, 17.6);
    levels[L].add(ocRingIn);

    mkWall(L, [18.9, R.living.z1], [R.living.x1, R.living.z1], [arch(21.9, 6, 8.5)]);
    const diningButlerZ = between(R.dining.z1, R.butlerMenu.z0);
    mkWall(L, [R.dining.x0, diningButlerZ], [R.butlerMenu.x1, diningButlerZ], [arch(4.4, 4)]);
    mkWall(L, [R.butlerMenu.x1, 14.4], [R.butlerMenu.x1, R.kitchen.z0], [door(23, 2.8)]);
    mkWall(L, [R.pantry.x0, R.pantry.z0], [R.powder.x1, R.powder.z0]);
    mkWall(L, [between(R.pantry.x1, R.powder.x0), R.pantry.z0], [between(R.pantry.x1, R.powder.x0), R.pantry.z1]);
    mkWall(L, [R.powder.x1, R.powder.z0], [R.powder.x1, R.powder.z1]);
    const serviceKitchenZ = between(R.butlerMenu.z1, R.kitchen.z0);
    mkWall(L, [R.kitchen.x0, serviceKitchenZ], [R.kitchen.x1, serviceKitchenZ], [arch(4, 5)]);
    mkWall(L, [R.kitchen.x1, R.great.z0], [R.great.x1, R.great.z0], [door(17, 2.2), arch(20.5, 4), arch(27.5, 6)]);
    const kitchenGreatX = between(R.kitchen.x1, R.great.x0);
    mkWall(L, [kitchenGreatX, R.great.z0], [kitchenGreatX, R.kitchen.z1], [arch(36, 9, 8.5)]);
    elevatorCloset(L);

    levels[L].add(mainStair(BASE[L], HOUSE.rises[L], M.oakWood, M.blackSteel));
    levels[L].add(stairGuard(BASE[L], M.blackSteel));
    // gallery void guard rail
    levels[L].add(railing([8.6, 14.4], [8.6, 19.6], BASE[L], 3, M.blackSteel, M.glassRail));
    levels[L].add(railing([8.6, 19.6], [15.6, 19.6], BASE[L], 3, M.blackSteel, M.glassRail));

    // great room stone chimney + built-ins + beams
    const gr = new THREE.Group();
    gr.add(box(0.5, 10, 6, M.basalt, 30.65, BASE[L] + 5, 37.5));
    gr.add(box(2.2, 0.67, 9.5, M.basalt, 29.7, BASE[L] + 0.34, 37.5));             // hearth bench
    gr.add(box(0.3, 2.1, 5.2, M.blackSteel, 30.45, BASE[L] + 1.35, 37.5));
    gr.add(box(0.2, 0.85, 4.2, M.fire, 30.28, BASE[L] + 1.15, 37.5, false));
    gr.add(box(0.9, 8, 3.2, M.iron, 30.4, BASE[L] + 4, 32.2));                     // built-in
    gr.add(box(0.9, 8, 3.2, M.iron, 30.4, BASE[L] + 4, 42.8));
    for (const bz of [30, 34, 38, 42]) ceilings[L].add(box(14.8, 0.7, 0.7, M.oakWood, 23.4, BASE[L] + 9.5, bz));
    levels[L].add(gr);
    // chimney exterior mass
    roof.add(box(2, 34, 7, M.brick, 32.4, 24, 37.5));

    // (dining fluted feature wall removed — the south facade slim windows live on that wall now)

    // kitchen fixed millwork
    place(L, K.cabinetRun(17, 3, 2.2, M.wall, M.quartzite), 1.95, 36.3, Math.PI / 2);
    const uppers = K.upperRun(15, M.wall);
    place(L, uppers, 1.35, 36.3, Math.PI / 2);
    uppers.position.y = BASE[L] + 4.8;
    place(L, K.island(7.5, 3.8), 8, 36);
    place(L, K.range(), 2.4, 38.5, Math.PI / 2);
    const hood = K.hood();
    place(L, hood, 2.1, 38.5);
    hood.position.y = BASE[L] + 4.6;
    place(L, K.cabinetRun(3.2, 6.8, 2.6, M.iron, null), 10.3, 27.9);               // fridge columns
    place(L, K.cabinetRun(5.5, 3, 1.9, M.iron, M.quartzite), 1.95, 18.6, Math.PI / 2);   // butler
    place(L, K.cabinetRun(4, 3, 1.9, M.walnut, M.quartzite), 1.95, 23.8, Math.PI / 2);   // menu desk
    place(L, K.cabinetRun(5.8, 3, 1.4, M.wall, null), 11.6, 20.6);                 // pantry shelves
    for (const sx of [5.9, 7.9, 9.9]) place(L, K.stool(), sx + 0.6, 38.6);
    place(L, K.stool(), 10.9, 36);
    place(L, K.pendant(0.6, 6.6, ch, M.brass), 6, 36);
    place(L, K.pendant(0.6, 6.6, ch, M.brass), 10, 36);

    // furniture
    place(L, K.rug(11, 13, M.plum), 6.8, 8.2);
    place(L, K.table(9, 3.7, 2.5, M.walnut), 6.8, 8.2);
    for (const cz of [5.2, 8.2, 11.2]) {
      place(L, K.diningChair(M.linenCream), 4.6, cz, Math.PI / 2);
      place(L, K.diningChair(M.linenCream), 9, cz, -Math.PI / 2);
    }
    place(L, K.diningChair(M.leatherCamel), 6.8, 3.6, 0);
    place(L, K.diningChair(M.leatherCamel), 6.8, 12.8, Math.PI);
    place(L, K.linearChandelier(5, 6.2, ch), 6.8, 8.2);
    place(L, K.sideboard(7, M.oakWood), 2, 12.5, Math.PI / 2);

    place(L, K.rug(12, 9, M.greige), 24.5, 6.3);
    place(L, K.sofa(8, 3.3, M.velvetSlate), 24.5, 2.9, Math.PI);
    place(L, K.chair(M.shearling), 21.5, 9, Math.PI * 0.9);
    place(L, K.chair(M.shearling), 25, 9.6, Math.PI * 1.1);
    place(L, K.coffeeTable(4, 2.6), 24.5, 6.3);
    place(L, K.gameTable(4.2), 29, 9.3);
    place(L, K.diningChair(M.leatherCognac), 29, 6.8, 0);
    place(L, K.diningChair(M.leatherCognac), 29, 11.8, Math.PI);

    place(L, K.rug(10, 13, M.linenCream), 23.5, 37);
    const grSofa = K.sofa(10, 3.6, M.linenCream);
    place(L, grSofa, 21.5, 37.4, -Math.PI / 2);
    place(L, K.swivel(M.leatherCamel), 18.6, 33);
    place(L, K.swivel(M.leatherCamel), 18.6, 41.5);
    place(L, K.coffeeTable(4.5, 2.8), 26, 37.4);
    place(L, K.plant(7), 17.3, 44.3);

    place(L, K.roundTable(2, 2.5, M.oakWood), 6.8, 50.8);
    for (const a of [0, 1, 2, 3]) {
      const ang = a * Math.PI / 2 + Math.PI / 4;
      place(L, K.diningChair(M.linenCream), 6.8 + Math.cos(ang) * 2.9, 50.8 + Math.sin(ang) * 2.9, -ang + Math.PI / 2);
    }
    place(L, K.pendant(0.7, 6.8, ch, M.brass), 6.8, 50.8);
    place(L, K.plant(6.5), 2.3, 53.3);
    ceilings[L].add(box(12, 0.18, 9, M.oakWood, 6.9, BASE[L] + 9.4, 50.6, false));   // sun room T&G ceiling

    place(L, K.vanity(3, false), 17.1, 21, 0);
    place(L, K.toilet(), 16, 25.2, Math.PI / 2);

    // main terrace
    roomFloor(L, TERRACES.main, M.pavers, 'Terrace');
    roomFloor(L, rect(0, 55.7, 13.4, 57.7), M.roofMembrane, 'Roof');
    levels[L].add(box(0.35, 5, 11.3, M.slat, 31.4, BASE[L] + 2.5, 52, false));     // privacy wall
    levels[L].add(railing([R.terrace.x0, R.terrace.z1 - 0.2], [R.terrace.x1 - 0.2, R.terrace.z1 - 0.2], BASE[L], 3.2, M.blackSteel, M.glassRail));
    levels[L].add(railing([R.terrace.x0, R.terrace.z1 - 1.8], [R.terrace.x0, R.terrace.z1 - 0.2], BASE[L], 3.2, M.blackSteel, M.glassRail));
    place(L, K.table(6, 3.2, 2.5, M.teak), 22.5, 51.5);
    for (const cx of [20.5, 22.5, 24.5]) {
      place(L, K.diningChair(M.teak), cx, 49.6, 0);
      place(L, K.diningChair(M.teak), cx, 53.4, Math.PI);
    }
    for (const pz of [48, 52, 56]) place(L, K.plant(5.5), 29.9, pz);

    roomFloor(L, ROOMS.main.dining.bounds, M.oakFloor, 'Formal Dining');
    roomFloor(L, ROOMS.main.living.bounds, M.oakFloor, 'Living Room');
    roomFloor(L, ROOMS.main.butlerMenu.bounds, M.oakFloor, "Butler's Pantry · Menu");
    roomFloor(L, ROOMS.main.pantry.bounds, M.tileWhite, 'Walk-in Pantry');
    roomFloor(L, ROOMS.main.powder.bounds, M.tileWhite, 'Powder');
    roomFloor(L, ROOMS.main.kitchen.bounds, M.oakFloor, 'Kitchen');
    roomFloor(L, ROOMS.main.great.bounds, M.oakFloor, 'Great Room');
    roomFloor(L, ROOMS.main.sun.bounds, M.oakFloor, 'Sun Room');
    for (const region of ROOMS.main.stairHall.regions)
      roomFloor(L, region, M.oakFloor, 'Stair Hall');
    roomFloor(L, CORE.elevator.bounds, M.tileWhite, 'Elevator');

    lab(L, 'Formal Dining', 6.8, 8); lab(L, 'Living Room', 24.5, 6);
    lab(L, 'Kitchen', 8, 36); lab(L, 'Great Room', 24, 37);
    lab(L, 'Sun Room', 6.8, 50.8); lab(L, 'Terrace', 22.5, 51.5);

    evLight(L, 6.8, 7.2, 8.2, 12);      // dining chandelier
    evLight(L, 8, 7.6, 36, 14);         // island pendants
    evLight(L, 24, 8, 37.5, 12);        // great room
    evLight(L, 24.5, 7.5, 6.3, 10);     // living lamps
    evLight(L, 6.8, 7.5, 50.8, 10);     // sun room
    evLight(L, 30.2, 3, 37.5, 9, 14, 0xff9550); // fire glow
    evLight(L, 22.5, 6, 51.5, 8, 18);   // terrace bistro
  }

  // ==================================================================
  // LEVEL 2 — UPPER
  // ==================================================================
  {
    const L = 2, E = EXT(), ch = CEIL[2], R = roomExtents(ROOMS.upper);
    const [bathSouth, bathNorth] = ROOMS.upper.ownerBath.regions.map(bounds => extents({ bounds }));
    const closet = extents({ bounds: ROOMS.upper.ownerCloset.regions[0] });
    const [suiteMain, suiteNook] = ROOMS.upper.ownerSuite.regions.map(bounds => extents({ bounds }));
    slabAdd(2, [FOOTPRINT.upper], [stairHole()], M.subfloor);

    // east facade: CONNECTED window pairs + small arched center window
    mkWall(L, [0, 0.35], [W, 0.35], [win(4.9, 3, 4.5, 2.8), win(8.1, 3, 4.5, 2.8), win(15.5, 2, 3, 3.8), win(23.4, 3, 4.5, 2.8), win(26.6, 3, 4.5, 2.8)], E, ch);
    const upArch = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.2, 6, 14, Math.PI), M.paverRed);
    upArch.rotation.y = Math.PI;
    upArch.position.set(15.5, BASE[L] + 7.1, -0.1);
    levels[L].add(upArch);
    mkWall(L, [31.25, 0.35], [31.25, 46.4], [win(5.5), win(18, 3, 4, 3.5), win(37.5), win(42.5)], E, ch);
    mkWall(L, [31.6, suiteMain.z1 + 0.35], [13.4, suiteMain.z1 + 0.35], [win(24, 3.2, 5, 2.5), win(28.5, 3.2, 5, 2.5)], EXTM(M.panelBrown), ch);
    mkWall(L, [R.retreat.x1, R.retreat.z0], [R.retreat.x1, R.retreat.z1], [gdoor(48.5, 4, 7.5)], EXTM(M.sidingCream), ch);
    mkWall(L, [13.4, R.retreat.z1], [0, R.retreat.z1], [win(9, 3, 5, 2.5), win(4, 3, 5, 2.5)], EXTM(M.sidingCream), ch);
    mkWall(L, [0.35, 55.7], [0.35, 46.4], [win(52.5, 3.5, 5.5, 1.8), win(48.5, 3.5, 5.5, 1.8)], EXTM(M.sidingCream), ch);  // wing: window pair matching the floor below
    // south facade, upper floor: left pair matches the main floor's tall slim style (per photo)
    mkWall(L, [0.35, 46.4], [0.35, 0.35], [win(27.5, 2.6, 6, 1.8), win(22.5, 2.6, 6, 1.8), win(17.6, 2, 3, 4), win(12.5, 3, 4.5, 2.8), win(7.5, 3, 4.5, 2.8)], E, ch);

    mkWall(L, [R.bed3.x0, R.bed3.z1], [R.bed3.x1, R.bed3.z1], [door(9.5)]);
    mkWall(L, [R.bath2.x0, R.bath2.z1], [R.bath2.x1, R.bath2.z1], [door(15)]);
    mkWall(L, [R.bed2.x0, R.bed2.z1], [R.bed2.x1, R.bed2.z1], [door(21.3)]);
    mkWall(L, [R.bed3.x1, R.bed3.z0], [R.bed3.x1, R.bath2.z1]);
    mkWall(L, [R.bed2.x0, R.bed2.z0], [R.bed2.x0, R.bed3.z1]);
    mkWall(L, [R.laundry.x0, R.laundry.z0], [R.laundry.x1, R.laundry.z0]);
    mkWall(L, [R.laundry.x1, R.laundry.z0], [R.laundry.x1, R.laundry.z1], [door(17.9, 2.7)]);
    mkWall(L, [R.laundry.x0, R.laundry.z1], [bathSouth.x1, R.laundry.z1]);
    mkWall(L, [closet.x0, closet.z0], [closet.x1, closet.z0], [door(18.6, 2.6)]);
    mkWall(L, [closet.x0, closet.z0], [closet.x0, closet.z1]);
    mkWall(L, [closet.x1, closet.z0], [closet.x1, closet.z1], [door(31, 2.6)]);
    mkWall(L, [suiteNook.x0, suiteNook.z0], [suiteNook.x0, suiteNook.z1]);
    mkWall(L, [closet.x1, suiteNook.z0], [suiteNook.x0, suiteNook.z0], [arch(22.1, 3.5, 8)]);
    mkWall(L, [suiteNook.x0, suiteNook.z0], [suiteNook.x1, suiteNook.z0]);
    mkWall(L, [closet.x1, suiteMain.z0], [suiteNook.x0, suiteMain.z0], [arch(22.1, 4, 8)]);
    mkWall(L, [suiteMain.x0, suiteMain.z0], [closet.x1, suiteMain.z0]);
    mkWall(L, [suiteMain.x0, suiteMain.z0], [suiteMain.x0, suiteMain.z1], [door(35.7)]);
    mkWall(L, [bathNorth.x0, bathNorth.z0], [closet.x0, bathNorth.z0], [arch(5, 4, 8)]);
    mkWall(L, [closet.x0, closet.z1], [bathNorth.x1, closet.z1]);
    mkWall(L, [bathNorth.x0, R.retreat.z0 - 0.35], [13.4, R.retreat.z0 - 0.35], [door(6, 3, 7.5)], INT, ch);
    elevatorCloset(L);

    levels[L].add(mainStair(BASE[L], HOUSE.rises[L], M.oakWood, M.blackSteel));
    levels[L].add(stairGuard(BASE[L], M.blackSteel));

    // owner suite: slat ceiling canopy over the bed (head on the blueprint's right wall)
    ceilings[L].add(box(6, 0.22, 10.5, M.slat, 27.9, BASE[L] + ch - 0.55, 40.2, false));

    // furniture — owner suite (king bed head on the x-wall between the two windows, per plan)
    place(L, K.rug(12, 12, M.greige), 24.5, 40.2);
    place(L, K.bed(6.33, 7.2, M.slat, M.linenCream), 27.2, 40.2, -Math.PI / 2);
    place(L, K.nightstand(), 29.9, 36.4);
    place(L, K.nightstand(), 29.9, 44.0);
    place(L, K.bench(5, M.shearling), 23.1, 40.2, Math.PI / 2);
    place(L, K.dresser(6, M.walnut), 17.3, 40.2, Math.PI / 2);            // dresser + TV opposite the bed
    const suiteTV = K.tv(4.6);
    place(L, suiteTV, 16.7, 40.2, Math.PI / 2);
    suiteTV.position.y = BASE[L] + 4.9;
    place(L, K.dresser(5, M.walnut), 27.5, 34.7, 0);                       // long dresser at the vestibule wall
    place(L, K.chair(M.leatherCamel), 28.8, 30.5, -Math.PI * 0.75);        // nook
    place(L, K.chair(M.leatherCamel), 25.8, 30.5, Math.PI * 0.75);

    // retreat: long sofa on the far wall + reading corner (per plan)
    place(L, K.rug(9, 7, M.greige), 6.8, 50.8);
    place(L, K.sofa(8, 3.3, M.linenCream), 6.8, 53.3, Math.PI);
    place(L, K.chair(M.leatherCamel), 2.6, 48.6, 0.8);
    place(L, K.roundTable(1.4, 1.5, M.walnut), 6.5, 50.4);
    const retreatTV = K.tv(4.6);
    place(L, retreatTV, 6.8, 46.6);
    retreatTV.position.y = BASE[L] + 4.3;

    // owner bath: twin vanities on the west wall, WC beside, tub alcove, corner shower w/ seat
    place(L, K.tub(), 4.5, 30.2);
    place(L, K.vanity(3.5, false), 2.05, 37.2, Math.PI / 2);
    place(L, K.vanity(3.5, false), 2.05, 42.2, Math.PI / 2);
    place(L, K.toilet(), 1.7, 44.9, Math.PI / 2);
    place(L, K.shower(4.2, 3.6), 13.6, 43.6);
    place(L, K.cabinetRun(5, 3, 1.9, M.walnut, M.quartzite), 8.6, 45.05, Math.PI);   // opt. wet bar (per plan)
    // closet: rods both sides + center bench
    place(L, K.cabinetRun(6.4, 6.8, 2, M.oakWood, null), 12.1, 30.4, Math.PI / 2);
    place(L, K.cabinetRun(6.4, 6.8, 2, M.oakWood, null), 19.1, 30.4, -Math.PI / 2);
    place(L, K.bench(3, M.linenCream), 15.6, 30.4, Math.PI / 2);
    // laundry: stacked pair on the east wall, sink + counter along the west
    place(L, K.washerDryer(), 8.15, 24.5, Math.PI / 2);
    place(L, K.cabinetRun(5, 3, 2, M.wall, M.quartzite), 4.2, 17.3);
    place(L, K.cabinetRun(4, 3, 1.9, M.wall, M.quartzite), 1.95, 21.5, Math.PI / 2);
    // bath 2: vanity at the top wall, tub at the bottom (per plan)
    place(L, K.vanity(5, true), 15.1, 12.4, Math.PI);
    place(L, K.tub(), 15.2, 2.3);
    place(L, K.toilet(), 17.4, 7.2, -Math.PI / 2);
    // bedroom #2: bed head on the right (x) wall
    place(L, K.rug(9, 8, M.greige), 26, 6.3);
    place(L, K.bed(5, 6.8, M.oakWood, M.linenCream), 27, 6.3, -Math.PI / 2);
    place(L, K.nightstand(), 29.8, 3.0);
    place(L, K.nightstand(), 29.8, 9.6);
    place(L, K.dresser(5, M.walnut), 20, 6.3, Math.PI / 2);
    // bedroom #3: bed head on the left wall (per plan — a bedroom, not the podcast room)
    place(L, K.rug(9, 8, M.greige), 5.9, 6.9);
    place(L, K.bed(5, 6.8, M.oakWood, M.linenCream), 4.4, 6.9, Math.PI / 2);
    place(L, K.nightstand(), 1.6, 3.6);
    place(L, K.nightstand(), 1.6, 10.2);
    place(L, K.dresser(5, M.walnut), 10.9, 6.9, -Math.PI / 2);
    place(L, K.chair(M.leatherCamel), 9.4, 11.6, -2.3);
    // hall runner
    place(L, K.rug(6.5, 2.3, M.greige), 6, 14.8);

    roomFloor(L, ROOMS.upper.bed3.bounds, M.oakFloor, 'Bedroom #3');
    roomFloor(L, ROOMS.upper.bath2.bounds, M.tileWhite, 'Bath #2');
    roomFloor(L, ROOMS.upper.bed2.bounds, M.oakFloor, 'Bedroom #2');
    roomFloor(L, ROOMS.upper.laundry.bounds, M.tileWhite, 'Laundry');
    for (const region of ROOMS.upper.ownerBath.regions) roomFloor(L, region, M.stoneFloor, "Owner's Bath");
    for (const region of ROOMS.upper.ownerCloset.regions) roomFloor(L, region, M.oakFloor, 'Walk-in Closet');
    for (const region of ROOMS.upper.ownerSuite.regions) roomFloor(L, region, M.oakFloor, "Owner's Suite");
    roomFloor(L, ROOMS.upper.retreat.bounds, M.oakFloor, "Owner's Retreat");
    for (const region of ROOMS.upper.upperHall.regions) roomFloor(L, region, M.oakFloor, 'Upper Hall');
    roomFloor(L, ROOMS.upper.wetBar.bounds, M.oakFloor, 'Wet Bar');
    roomFloor(L, CORE.elevator.bounds, M.tileWhite, 'Elevator');

    lab(L, "Owner's Suite", 24, 40); lab(L, "Owner's Bath", 7, 39);
    lab(L, "Owner's Retreat", 6.8, 50.8); lab(L, 'Bedroom #3', 5.9, 7);
    lab(L, 'Bedroom #2', 25, 5.5); lab(L, 'Walk-in Closet', 15.6, 30.4);

    evLight(L, 24, 7.5, 40, 12);
    evLight(L, 7, 7.5, 38, 10);
    evLight(L, 6.8, 7.2, 50.8, 10);
    evLight(L, 5.9, 7.5, 7, 9);
    evLight(L, 25, 7.5, 6, 9);
    evLight(L, 18, 7.5, 20, 9);
  }

  // ==================================================================
  // LEVEL 3 — PENTHOUSE
  // ==================================================================
  {
    const L = 3, E = EXT(), ch = CEIL[3], R = roomExtents(ROOMS.penthouse);
    slabAdd(3, [FOOTPRINT.upper], [stairHole()], M.subfloor);

    // exterior walls of the penthouse "box" (inset from footprint)
    // east facade, top floor: trio of windows centered under the roof pediment
    const enclosure = FOOTPRINT.penthouseEnclosure;
    mkWall(L, enclosure[0], enclosure[1], [win(10.3, 2.8, 4.2, 2.8), win(13.75, 2.8, 4.2, 2.8), win(17.2, 2.8, 4.2, 2.8)], E, ch);
    mkWall(L, enclosure[1], enclosure[2], [], E, ch);
    mkWall(L, enclosure[2], enclosure[3], [win(28, 3, 4, 3.5)], E, ch);
    mkWall(L, enclosure[3], enclosure[4], [win(16.5, 3, 4.5, 3), win(23.5, 3, 4.5, 3)], E, ch);
    mkWall(L, enclosure[4], enclosure[5], [gdoor(27.5, 4.5)], EXTM(M.panelBrown), ch);
    mkWall(L, enclosure[5], enclosure[6], [], EXTM(M.panelBrown), ch);
    mkWall(L, enclosure[6], enclosure[7], [gdoor(20, 6)], EXTM(M.panelBrown), ch);
    mkWall(L, enclosure[7], enclosure[8], [], EXTM(M.panelBrown), ch);
    mkWall(L, enclosure[8], enclosure[9], [win(10, 4, 4.5, 2.5)], EXTM(M.panelBrown), ch);
    mkWall(L, enclosure[9], enclosure[10], [win(37.6, 3, 4, 2.5)], EXTM(M.panelBrown), ch);
    mkWall(L, enclosure[10], enclosure[11], [win(4, 2.2, 4, 3.5)], EXTM(M.panelBrown), ch);
    roof.add(box(9.9, 0.6, 7.4, M.roofMembrane, 10.15, 41.2, 38.0167, false));        // bump cap
    roomFloor(L, ROOMS.penthouse.wetBar.bounds, M.oakFloor, 'Wet Bar');
    // south facade, penthouse: WIDE french doors, lamps tight to each side, small windows just beyond,
    // and slate mansard cladding wrapping both ends of the story (per photo)
    mkWall(L, enclosure[11], enclosure[0], [win(22.6, 2.2, 3.5, 3), gdoor(17.6, 4.6, 7.5), win(12.6, 2.2, 3.5, 3)], E, ch);
    levels[L].add(box(0.18, 9, 8.6, M.shingle, 2.7, BASE[L] + 4.5, 6.25, false));   // slate end panel (south)
    levels[L].add(box(0.18, 9, 10.0, M.shingle, 2.7, BASE[L] + 4.5, 29.6, false));  // slate end panel (north)
    for (const lz of [14.7, 20.5]) {                                                 // little lamps flanking the doors
      levels[L].add(box(0.32, 0.62, 0.32, M.matBlack, 2.5, BASE[L] + 5.6, lz));
      levels[L].add(box(0.16, 0.3, 0.16, M.warmGlow, 2.5, BASE[L] + 5.55, lz, false));
      evLight(L, 2.3, 5.5, lz, 4, 7);
    }
    // Juliet "mini fence" — widened with the doors
    for (let i = 0; i < 11; i++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.1, 6), M.matBlack);
      p.position.set(2.45, BASE[L] + 1.55, 15.35 + i * 0.45);
      p.castShadow = true;
      levels[L].add(p);
    }
    levels[L].add(box(0.14, 0.14, 5.0, M.matBlack, 2.45, BASE[L] + 3.1, 17.6, false));
    levels[L].add(box(0.55, 0.14, 5.0, M.trimStone, 2.6, BASE[L] - 0.05, 17.6, false));   // stone shelf
    // small arched bonnet over the french door
    const jBarrel = new THREE.Mesh(new THREE.CylinderGeometry(2.75, 2.75, 1.7, 18, 1, true, 0, Math.PI), M.hoodMetal);
    jBarrel.rotation.z = Math.PI / 2;
    jBarrel.position.set(2.35, BASE[L] + 7.75, 17.6);
    jBarrel.castShadow = true;
    levels[L].add(jBarrel);
    const jFace = new THREE.Mesh(new THREE.CircleGeometry(2.72, 18, 0, Math.PI), M.hoodMetal);
    jFace.rotation.y = -Math.PI / 2;
    jFace.position.set(1.52, BASE[L] + 7.75, 17.6);
    levels[L].add(jFace);

    mkWall(L, [2.8, R.bed5.z1], [24.7, R.bed5.z1], [door(21)]);
    mkWall(L, [R.bed5.x1, R.bed5.z0], [R.bed5.x1, R.bath4.z1]);
    mkWall(L, [R.bath4.x0, 9.7], [R.bath4.x1, 9.7], [door(21.5, 2.6)]);
    // (no divider between the stair and the loft — open per the blueprint)
    elevatorCloset(L);

    // raised tray + cove over loft
    const trayG = new THREE.Group();
    trayG.add(box(11.4, 0.25, 16, M.plaster, 11.5, BASE[L] + 10.8, 21.6, false));
    trayG.add(box(11.8, 1.9, 0.25, M.plaster, 11.5, BASE[L] + 9.9, 13.6, false));
    trayG.add(box(11.8, 1.9, 0.25, M.plaster, 11.5, BASE[L] + 9.9, 29.6, false));
    trayG.add(box(0.25, 1.9, 16, M.plaster, 5.7, BASE[L] + 9.9, 21.6, false));
    trayG.add(box(0.25, 1.9, 16, M.plaster, 17.3, BASE[L] + 9.9, 21.6, false));
    // slatted oak inside the tray + cove glow strips
    trayG.add(box(11, 0.12, 15.6, M.slat, 11.5, BASE[L] + 10.7, 21.6, false));
    for (const [gx, gz, gw, gd] of [[11.5, 13.85, 11, 0.2], [11.5, 29.35, 11, 0.2], [5.95, 21.6, 0.2, 15.5], [17.05, 21.6, 0.2, 15.5]]) {
      trayG.add(box(gw, 0.12, gd, M.warmGlow, gx, BASE[L] + 9.15, gz, false));
    }
    levels[L].add(trayG);
    tray = trayG;

    levels[L].add(stairGuard(BASE[L], M.blackSteel, null, true));
    // 3-story pendant moment: staggered glass orbs down the stair void
    levels[L].add(voidOrbs(M.glass, M.warmGlow, M.blackSteel));

    // loft media wall (black roman clay) + TV + linear fire — on the bed5 partition, facing the loft (per blueprint)
    levels[L].add(box(9.5, ch - 0.2, 0.28, M.darkPlaster, 13, BASE[L] + (ch - 0.2) / 2, 13.64));
    const loftTV = K.tv(6.5);
    place(L, loftTV, 13, 13.84, 0);
    loftTV.position.y = BASE[L] + 5.1;
    levels[L].add(box(6.5, 1.6, 0.3, M.blackSteel, 13, BASE[L] + 1.3, 13.84));
    levels[L].add(box(5.6, 0.7, 0.2, M.fire, 13, BASE[L] + 1.2, 13.98, false));
    levels[L].add(box(7.2, 0.35, 0.9, M.basalt, 13, BASE[L] + 0.85, 14.05));       // floating hearth ledge

    // wet bar inside the bump-out: counter along the west wall, backlit onyx above, island + stools
    place(L, K.cabinetRun(8, 3, 2, M.flutedBlack, M.quartzite), 10.1, 38.9, Math.PI);
    levels[L].add(box(7.5, 3.2, 0.25, M.onyx, 10.1, BASE[L] + 5.3, 39.9));
    levels[L].add(box(6.8, 0.08, 0.7, M.glass, 10.1, BASE[L] + 5.0, 39.55, false));  // glass shelf
    place(L, K.barCounter(5.5), 10.1, 36.3, Math.PI);
    for (const sx of [8.4, 10.1, 11.8]) place(L, K.stool(), sx, 34.9);

    // Edison display wall (walnut museum cases) — on the west wall, north of the french doors
    place(L, K.builtinWall(5.5, 8, M.walnut), 3.6, 29.4, Math.PI / 2);

    // loft furniture
    // loft seating per blueprint: sofa faces the media wall, chair pairs flank, bistro by the french doors
    place(L, K.rug(12, 10, M.greige), 12.8, 19);
    place(L, K.sofa(10, 3.5, M.velvetChar), 12.8, 22.3, Math.PI);
    place(L, K.roundTable(0.9, 1.9, M.walnut), 7.2, 22.3);
    place(L, K.roundTable(0.9, 1.9, M.walnut), 18.4, 22.3);
    place(L, K.swivel(M.leatherCamel), 7.2, 17);
    place(L, K.swivel(M.leatherCamel), 7.2, 20.6);
    place(L, K.swivel(M.leatherCamel), 18.4, 17);
    place(L, K.swivel(M.leatherCamel), 18.4, 20.6);
    place(L, K.coffeeTable(4.5, 2.6), 12.8, 18);
    place(L, K.roundTable(1.3, 2.5, M.walnut), 5.4, 16.5);       // bistro at the french doors
    place(L, K.diningChair(M.leatherCognac), 5.4, 14.6, 0);
    place(L, K.diningChair(M.leatherCognac), 5.4, 18.4, Math.PI);

    // bed5 + bath4
    place(L, K.rug(9, 7, M.greige), 10.5, 6.6);
    place(L, K.bed(5, 6.8, M.oakWood, M.linenCream), 10.5, 7.4, Math.PI);       // head on the loft partition (per blueprint)
    place(L, K.nightstand(), 7.4, 10.6);
    place(L, K.nightstand(), 13.6, 10.6);
    place(L, K.chair(M.leatherCamel), 4.4, 3.8, 0.9);                            // lounge corner
    place(L, K.dresser(6, M.walnut), 10.5, 2.8, 0);                              // low media dresser, south wall
    place(L, K.shower(3.4, 3.4), 22.6, 4);
    place(L, K.vanity(3.5, false), 19.6, 8, Math.PI / 2);
    place(L, K.toilet(), 23.2, 8.2, Math.PI);

    // terraces
    for (const region of TERRACES.penthouseLivingRegions)
      roomFloor(L, region, M.pavers, 'Outdoor Living Terrace');
    for (const region of TERRACES.penthouseDiningRegions)
      roomFloor(L, region, M.pavers, 'Outdoor Dining Terrace');
    roomFloor(L, TERRACES.penthouseSun, M.pavers, 'Sun Terrace');
    roomFloor(L, rect(0, 0, 2.8, 34.6), M.roofMembrane, 'Roof');
    roomFloor(L, rect(2.8, 0, 31.6, 2), M.roofMembrane, 'Roof');
    roomFloor(L, rect(24.7, 2, 31.6, 13.5), M.roofMembrane, 'Roof');

    // terrace fireplace wall + outdoor TV (stacks on chimney)
    levels[L].add(box(0.9, 8.5, 6.5, M.basalt, 31.05, BASE[L] + 4.25, 40));
    levels[L].add(box(0.3, 1.9, 4.9, M.blackSteel, 30.62, BASE[L] + 1.35, 40));
    levels[L].add(box(0.2, 0.8, 4, M.fire, 30.45, BASE[L] + 1.2, 40, false));
    const terrTV = K.tv(5.5);
    place(L, terrTV, 30.75, 40, -Math.PI / 2);
    terrTV.position.y = BASE[L] + 5.3;

    // parapets & railings
    const gap = OPTIONAL.exteriorSpiral.guardGap;
    levels[L].add(railing([R.livingTerrace.x0, R.livingTerrace.z1 - 0.1], [R.livingTerrace.x1 - 0.1, R.livingTerrace.z1 - 0.1], BASE[L], 3.4, M.blackSteel, M.glassRail));
    levels[L].add(railing([R.livingTerrace.x1 - 0.1, R.livingTerrace.z0], [R.livingTerrace.x1 - 0.1, R.livingTerrace.z1 - 0.1], BASE[L], 3.4, M.blackSteel, M.glassRail));
    levels[L].add(railing([0.85, R.diningTerrace.z0], [0.85, R.sunTerrace.z1 - 0.1], BASE[L], 3.4, M.blackSteel, M.glassRail));
    levels[L].add(railing([0.85, R.sunTerrace.z1 - 0.1], [R.sunTerrace.x1, R.sunTerrace.z1 - 0.1], BASE[L], 3.4, M.blackSteel, M.glassRail));
    levels[L].add(railing([R.sunTerrace.x1, R.sunTerrace.z0], [R.sunTerrace.x1, gap.z0], BASE[L], 3.4, M.blackSteel, M.glassRail));
    levels[L].add(railing([R.sunTerrace.x1, gap.z1], [R.sunTerrace.x1, R.sunTerrace.z1 - 0.1], BASE[L], 3.4, M.blackSteel, M.glassRail));
    // tall bushes at the WEST edge, tight to the guardrail (per photo)
    for (const bx of [15.5, 18.3, 21.1, 23.9, 26.7, 29.5]) {
      const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 1), M.green);
      bush.position.set(bx, BASE[L] + 2.7, 45.7);
      bush.scale.set(1.05, 1.6, 0.75);
      bush.castShadow = true;
      levels[L].add(bush);
    }

    // terrace furniture
    const balmain = K.sectionalL(9, 7, 3.2, M.graphite);
    place(L, balmain, 26.5, 40.5, Math.PI / 2);
    place(L, K.coffeeTable(3.5, 2.5, M.concrete), 28.5, 40);
    place(L, K.lounger(), 17, 41, 0);       // pulled inward, clear of the bushes at the rail
    place(L, K.lounger(), 20, 41, 0);
    place(L, K.table(7, 3.2, 2.5, M.teak), 7.5, 43.4);
    for (const cx of [5.7, 7.5, 9.3]) {
      place(L, K.diningChair(M.teak), cx, 41.5, 0);
      place(L, K.diningChair(M.teak), cx, 45.2, Math.PI);
    }
    place(L, K.lounger(), 4, 50.5, Math.PI);
    place(L, K.lounger(), 7.5, 50.5, Math.PI);
    place(L, K.plant(5), 2, 47.8);
    place(L, K.plant(5), 11.8, 53.8);

    // ---- pergola + string lights + faux hedge on the Outdoor Living Terrace ----
    // OUTDOOR DINING TERRACE: thin wall + slat structure, west of the wet-bar bump (per blueprint)
    levels[L].add(box(0.8, 8.6, 5.7, M.panelBrown, 1.6, BASE[L] + 4.3, 43.4));       // thin wall
    levels[L].add(box(1.1, 0.35, 6.1, M.slate, 1.6, BASE[L] + 8.75, 43.4, false));   // cap
    for (const pz of [41.8, 45.6])
      levels[L].add(box(0.5, 9.6, 0.5, M.blackSteel, 12.9, BASE[L] + 4.8, pz));
    // cross-beams from the wall to the posts
    levels[L].add(box(12.1, 0.55, 0.5, M.blackSteel, 7.25, BASE[L] + 9.35, 41.8));
    levels[L].add(box(12.1, 0.55, 0.5, M.blackSteel, 7.25, BASE[L] + 9.35, 45.6));
    // top slats run EAST-WEST, covering the table
    for (let sx = 2.2; sx <= 12.9; sx += 1.1)
      levels[L].add(box(0.28, 0.32, 4.5, M.blackSteel, sx, BASE[L] + 9.85, 43.7, false));
    // string lights: from the north stretch of the wall across to the structure
    swag(levels[L], [17, BASE[L] + 8.8, 34.9], [12.9, BASE[L] + 9.7, 41.8], 1.1);
    swag(levels[L], [21, BASE[L] + 8.8, 34.9], [12.9, BASE[L] + 9.7, 43.7], 1.3);
    swag(levels[L], [25, BASE[L] + 8.8, 34.9], [12.9, BASE[L] + 9.7, 45.6], 1.4);
    // (railing hedge panel replaced by the tall bush row above)
    evLight(L, 22.5, 8.2, 40.8, 7, 16);

    roomFloor(L, ROOMS.penthouse.loft.bounds, M.oakFloor, 'Penthouse Loft');
    roomFloor(L, ROOMS.penthouse.bed5.bounds, M.oakFloor, 'Bedroom #5');
    roomFloor(L, ROOMS.penthouse.bath4.bounds, M.tileWhite, 'Bath #4');
    roomFloor(L, CORE.elevator.bounds, M.tileWhite, 'Elevator');

    lab(L, 'Penthouse Loft', 11, 23); lab(L, 'Outdoor Living Terrace', 23, 40.5);
    lab(L, 'Outdoor Dining Terrace', 6.5, 43.5); lab(L, 'Wet Bar', 10.1, 37.3); lab(L, 'Sun Terrace', 7, 50.5);
    lab(L, 'Bedroom #5', 10, 6.5);

    evLight(L, 11.5, 8.6, 23.5, 14);    // tray cove
    evLight(L, 10.1, 5.5, 37.5, 12, 16, 0xffb060);  // onyx bar (in the bump-out)
    evLight(L, 14, 6.5, 30, 8);
    evLight(L, 10, 7, 7, 9);
    evLight(L, 27, 5, 40.5, 9, 16, 0xff9550);    // terrace fire
    evLight(L, 7, 6, 40.5, 8, 16);
  }

  // ==================================================================
  // ROOF over penthouse box
  // ==================================================================
  {
    const roofPoly = FOOTPRINT.penthouseEnclosure;
    roof.add(slab([...roofPoly.map(p => p)], [], 1, 42, M.roofMembrane));
    roof.add(box(10, 1.0, 16, M.roofMembrane, 12.5, 42.3, 21.6, false));

    // ---- slate roof angling IN on every face to a small flat cap (per photos) ----
    const hipRoof = (x0, z0, x1, z1, h, topRatio = 0.42) => {
      const geo = new THREE.CylinderGeometry(Math.SQRT2 * topRatio, Math.SQRT2, 1, 4, 1, false, Math.PI / 4);
      const m = new THREE.Mesh(geo, M.shingle);
      m.scale.set((x1 - x0) / 2, h, (z1 - z0) / 2);
      m.position.set((x0 + x1) / 2, 41.9 + h / 2, (z0 + z1) / 2);
      m.castShadow = true;
      m.receiveShadow = true;
      roof.add(m);
    };
    const eaveCornice = (x0, z0, x1, z1) => {
      const w = x1 - x0, d = z1 - z0;
      roof.add(box(w + 2.2, 0.65, 1.1, M.slate, x0 + w / 2, 41.6, z0 - 0.45, false));
      roof.add(box(w + 2.2, 0.65, 1.1, M.slate, x0 + w / 2, 41.6, z1 + 0.45, false));
      roof.add(box(1.1, 0.65, d + 2.2, M.slate, x0 - 0.45, 41.6, z0 + d / 2, false));
      roof.add(box(1.1, 0.65, d + 2.2, M.slate, x1 + 0.45, 41.6, z0 + d / 2, false));
    };
    // tall, steep mansard masses (near-vertical slate faces, high flat cap — per photo)
    // chimney flue extension + smoke plume
    roof.add(box(2.4, 3.2, 2.4, M.brick, 32.4, 42.4, 37.5));
    roof.add(box(3.1, 0.4, 3.1, M.trimStone, 32.4, 44.15, 37.5, false));
    roof.add(box(1.5, 0.55, 1.5, M.matBlack, 32.4, 44.6, 37.5, false));
    const smokeCanvas = document.createElement('canvas');
    smokeCanvas.width = smokeCanvas.height = 64;
    const sctx = smokeCanvas.getContext('2d');
    const sg = sctx.createRadialGradient(32, 32, 3, 32, 32, 31);
    sg.addColorStop(0, 'rgba(190,190,196,0.6)');
    sg.addColorStop(1, 'rgba(190,190,196,0)');
    sctx.fillStyle = sg;
    sctx.fillRect(0, 0, 64, 64);
    const smokeTex = new THREE.CanvasTexture(smokeCanvas);
    smoke = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const puff = new THREE.Sprite(new THREE.SpriteMaterial({
        map: smokeTex, transparent: true, opacity: 0, depthWrite: false,
      }));
      puff.userData.age = i / 14;
      puff.userData.drift = Math.random() * Math.PI * 2;
      smoke.add(puff);
    }
    smoke.position.set(32.4, 44.9, 37.5);
    roof.add(smoke);

    hipRoof(2.8, 2, 24.7, 13.5, 6.3, 0.78);     // front (east) block
    hipRoof(2.8, 13.5, 24.4, 29.8, 6.3, 0.72);  // loft block
    hipRoof(24.4, 13.5, 31, 30.6, 5.2, 0.7);    // stair/elevator core
    eaveCornice(2.8, 2, 24.7, 13.5);
    eaveCornice(2.8, 13.5, 24.4, 29.8);
    eaveCornice(24.4, 13.5, 31, 30.6);
    // eyebrow arch relief lying on the south roof slope, over the french-door axis
    const ped = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.22, 8, 18, Math.PI), M.slate);
    ped.position.set(3.8, 43.7, 17.6);
    ped.lookAt(2.96, 44.25, 17.6);
    roof.add(ped);
    // grand arched pediment with circle motif on the east roof face (per photo)
    const eNorm = new THREE.Vector3(0, 0.2, -0.98);
    const eTan = new THREE.Vector3(0, 0.98, 0.2);
    const pedBase = new THREE.Vector3(13.75, 45.2, 2.55);
    const tym = new THREE.Mesh(new THREE.CircleGeometry(3.2, 22, 0, Math.PI), M.shingle);
    tym.position.copy(pedBase).addScaledVector(eNorm, 0.12);
    tym.lookAt(tym.position.clone().add(eNorm));
    roof.add(tym);
    const pedRing = new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.24, 8, 20, Math.PI), M.slate);
    pedRing.position.copy(pedBase).addScaledVector(eNorm, 0.24);
    pedRing.lookAt(pedRing.position.clone().add(eNorm));
    roof.add(pedRing);
    const pedDot = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.14, 6, 14), M.slate);
    pedDot.position.copy(pedBase).addScaledVector(eNorm, 0.24).addScaledVector(eTan, 0.6);
    pedDot.lookAt(pedDot.position.clone().add(eNorm));
    roof.add(pedDot);
  }

  // ==================================================================
  // DECOR — drapery + original art through the house
  // ==================================================================
  {
    const drapeAt = (lvl, x, z, rot = 0, mat = M.linenCream, h = null) =>
      place(lvl, K.drape(1.8, h ?? CEIL[lvl] - 0.5, mat), x, z, rot);
    const artAt = (lvl, x, z, rot, w, hh, y = 3.6, frame = M.walnut) => {
      const a = K.art(w, hh, frame);
      place(lvl, a, x, z, rot);
      a.position.y += y;
      return a;
    };

    // ground: media blackout drapes, gallery + office art
    drapeAt(0, 19.2, 1.2, 0, M.velvetChar); drapeAt(0, 23.5, 1.2, 0, M.velvetChar); drapeAt(0, 27.8, 1.2, 0, M.velvetChar);
    artAt(0, 6.4, 13.85, 0, 3, 3.8);
    artAt(0, 11.6, 13.85, 0, 2.4, 3);
    artAt(0, 23, 12.35, Math.PI, 4, 3, 4, M.blackSteel);
    artAt(0, 4, 13.35, Math.PI, 3, 3.2, 4);

    // main: living + dining drapes, art over sideboard & living
    drapeAt(1, 19.5, 1.2); drapeAt(1, 23.7, 1.2); drapeAt(1, 27.9, 1.2);
    drapeAt(1, 2.7, 1.2); drapeAt(1, 6.7, 1.2); drapeAt(1, 10.8, 1.2);
    drapeAt(1, 1.2, 4.2, Math.PI / 2); drapeAt(1, 1.2, 7.8, Math.PI / 2);
    artAt(1, 1.15, 12.5, Math.PI / 2, 4.2, 3.6, 4.2, M.brass);
    artAt(1, 25, 12.0, Math.PI, 3.4, 3, 4.4);

    // upper: suite drapes (east), guest + podcast drapes, gallery-hall art
    drapeAt(2, 30.6, 35.7, -Math.PI / 2); drapeAt(2, 30.6, 39.9, -Math.PI / 2); drapeAt(2, 30.6, 44.4, -Math.PI / 2);
    drapeAt(2, 20.7, 1.2); drapeAt(2, 24.75, 1.2); drapeAt(2, 28.8, 1.2);
    drapeAt(2, 2.2, 1.2, 0, M.velvetChar); drapeAt(2, 6, 1.2, 0, M.velvetChar); drapeAt(2, 9.8, 1.2, 0, M.velvetChar);
    artAt(2, 26, 34.15, 0, 3, 3, 4.4);
    artAt(2, 12.2, 13.6, 0, 2.5, 3, 3.9);
    artAt(2, 24.75, 1.0, 0, 3, 2.8, 4.3);

    // decorative brick-inlay squares on the south facade left section (per photos)
    for (const [lvl, cy] of [[1, BASE[1] + 5], [2, BASE[2] + 4.6]]) {
      levels[lvl].add(box(0.14, 0.5, 4.6, M.paverRed, -0.06, cy + 2.05, 38.5, false));
      levels[lvl].add(box(0.14, 0.5, 4.6, M.paverRed, -0.06, cy - 2.05, 38.5, false));
      levels[lvl].add(box(0.14, 4.6, 0.5, M.paverRed, -0.06, cy, 36.45, false));
      levels[lvl].add(box(0.14, 4.6, 0.5, M.paverRed, -0.06, cy, 40.55, false));
      const diamond = box(0.12, 2.5, 2.5, M.paverRed, -0.05, cy, 38.5, false);
      diamond.rotation.x = Math.PI / 4;
      levels[lvl].add(diamond);
    }

    // penthouse: bed5 drapes + loft & guest art
    drapeAt(3, 5.2, 2.5); drapeAt(3, 9.5, 2.5); drapeAt(3, 13.8, 2.5);
    artAt(3, 8, 13.6, 0, 3.2, 3.4, 3.9, M.blackSteel);
    artAt(3, 12.5, 13.6, 0, 2.4, 2.8, 4.2, M.blackSteel);
    artAt(3, 10, 12.9, Math.PI, 3.6, 3, 4);
  }

  // ==================================================================
  // Optional 3-story spiral stair: main terrace (11) -> retreat (22) -> sun terrace (32)
  // ==================================================================
  optional.add(spiralStair(
    OPTIONAL.exteriorSpiral.center[0], OPTIONAL.exteriorSpiral.center[1],
    OPTIONAL.exteriorSpiral.y0, OPTIONAL.exteriorSpiral.y1,
    OPTIONAL.exteriorSpiral.radius, M.oakWood, M.blackSteel,
  ));
  for (const [bounds, y] of [
    [OPTIONAL.exteriorSpiral.upperLanding, BASE[2]],
    [OPTIONAL.exteriorSpiral.penthouseLanding, BASE[3]],
  ]) {
    const landing = extents({ bounds });
    optional.add(box(
      landing.x1 - landing.x0, 0.3, landing.z1 - landing.z0, M.pavers,
      (landing.x0 + landing.x1) / 2, y - 0.15, (landing.z0 + landing.z1) / 2,
    ));
    optional.add(railing([landing.x0, landing.z0], [14.1, landing.z0], y, 3, M.blackSteel, null));
    optional.add(railing([landing.x0, landing.z1], [14.1, landing.z1], y, 3, M.blackSteel, null));
  }

  // ---- internal slab helper (declared late via hoisting-style closure) ----
  function slabAdd(level, polys, holes, mat) {
    for (const p of polys) {
      const s = slab(p, holes, 1, BASE[level], mat);
      levels[level].add(s);
    }
  }

  return { levels, furn, ceilings, roof, site, optional, labels, evLights, floorPicks, tray, garageDoors, smoke };
}
