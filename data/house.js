import * as THREE from 'three';
import { wall, slab, rect, box, mainStair, stairGuard, traditionalGuard, voidOrbs, stairHole, spiralStair, railing, label } from '../src/parts.js';
import { CORE, FOOTPRINT, HOUSE, OPTIONAL, ROOMS, TERRACES, VOIDS, extents } from './blueprint.js';
import { referenceRoof, eyebrowLintel } from '../src/architecture.js';

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
      mats.leaf ?? (isExt ? ly[ly.length - 1].mat : null), M.white); // door leaves on exterior walls only — interior doorways stay open
    // stable identity so the editor can persist per-side wall paint
    const wid = `${level}|${a[0]},${a[1]}-${b[0]},${b[1]}`;
    wallCounts[wid] = (wallCounts[wid] || 0) + 1;
    g.userData.wallId = wallCounts[wid] > 1 ? `${wid}#${wallCounts[wid]}` : wid;
    if(isExt && level===1 && ly[0].mat===M.brick) {
      for(const o of ops.filter(o=>o.type==='window' && o.w>2.4 && o.h>5)) {
        const cap=eyebrowLintel(o.w,M);
        cap.position.set(horiz?o.pos:a[0]-.38,BASE[level]+o.sill+o.h+.08,horiz?a[1]-.4:o.pos);
        cap.rotation.y=horiz?Math.PI:-Math.PI/2;g.add(cap);
      }
    }
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
    const cablePoints=[];for(let i=0;i<=32;i++){const t=i/32;cablePoints.push(new THREE.Vector3(p1[0]+(p2[0]-p1[0])*t,p1[1]+(p2[1]-p1[1])*t-sag*4*t*(1-t),p1[2]+(p2[2]-p1[2])*t));}
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePoints),48,.016,4,false),M.blackSteel));
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

  function shadeSail(group, points, mat) {
    const geometry = new THREE.BufferGeometry(),vertices=[],indices=[],rows=18;
    for(let i=0;i<=rows;i++)for(let j=0;j<=rows-i;j++) {
      const b=i/rows,c=j/rows,a=1-b-c;
      vertices.push(points[0][0]*a+points[1][0]*b+points[2][0]*c,
        points[0][1]*a+points[1][1]*b+points[2][1]*c-.28*27*a*b*c,
        points[0][2]*a+points[1][2]*b+points[2][2]*c);
    }
    let offset=0;for(let i=0;i<rows;i++) {
      const count=rows-i+1,next=offset+count;
      for(let j=0;j<count-1;j++) {
        indices.push(offset+j,next+j,offset+j+1);
        if(j<count-2)indices.push(offset+j+1,next+j,next+j+1);
      }
      offset=next;
    }
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const sail = new THREE.Mesh(geometry, mat);
    sail.castShadow = true;
    sail.receiveShadow = true;
    group.add(sail);
    return sail;
  }

  const litRooms=new Set();
  function roomFloor(level, r, mat, name) {
    const m = slab(r, [], 0.1, BASE[level] + 0.07, mat);
    m.castShadow = false;
    m.userData.room = name;
    m.userData.level = level;
    m.userData.srcFloorMat = mat;
    levels[level].add(m);
    floorPicks.push(m);
    const key=level+'|'+name;
    if(!litRooms.has(key)&&!['Entrance Gallery','Center Hall','Stair Hall','Upper Hall','Elevator','Roof','Mechanical','Three-Car Garage'].includes(name)&&!name.includes('Terrace')) {
      litRooms.add(key);
      const xs=r.map(p=>p[0]),zs=r.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs);
      const top=BASE[level]+(name==='Penthouse Loft'?11:CEIL[level]);
      for(const fx of [.28,.72])for(const fz of [.28,.72]){
        const trim=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.045,20),M.white);trim.position.set(x0+(x1-x0)*fx,top-.035,z0+(z1-z0)*fz);ceilings[level].add(trim);
        const lens=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.012,16),M.warmGlow);lens.position.copy(trim.position);lens.position.y-=.028;ceilings[level].add(lens);
      }
    }
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
    mkWall(L, [0, 0.35], [W, 0.35], [win(6.75,6.5,5.7,1.65), win(24.25,6.5,5.7,1.65)], E, ch, { frame: M.blackSteel });
    // blind "fake window" panel centered on the east facade (per photo)
    levels[L].add(box(3, 4.4, 0.12, M.brick, 15.5, 4.3, -0.05, false));
    levels[L].add(box(3.6, 0.28, 0.5, M.trimStone, 15.5, 1.95, -0.16));
    const blindArch = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.22, 6, 14, Math.PI), M.brickRelief);
    blindArch.rotation.y = Math.PI;
    blindArch.position.set(15.5, 6.55, -0.1);
    levels[L].add(blindArch);
    mkWall(L,[31.25,.35],[31.25,11.8],[win(5.5)],E,ch);
    mkWall(L,[31.25,11.8],[31.25,57.35],[win(17,2.7,4.5,3.5),win(22,2.7,4.5,3.5),win(30,3,4,3.5),win(50,4,3,4.5)],EXTM(M.sidingCream),ch);
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
    for(const x of [-2.37,-1.6,-.8,0,.5]) {
      const pts=[];for(let i=0;i<=36;i++){const a=i/36*Math.PI;pts.push(new THREE.Vector3(x,8.85+3.3*Math.sin(a),17.6+3.3*Math.cos(a)));}
      hoodG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),40,.04,5,false),M.slate));
    }
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
    // Metallic circle-pattern wallcovering makes the two-story entry gallery read
    // like the photographed space while leaving the arched opening unobstructed.
    for(const z of [13.84,21.68]) {
      levels[L].add(box(11.0,1.3,.08,M.galleryWallpaper,10.6,9.2,z,false));
      levels[1].add(box(7,8.8,.08,M.galleryWallpaper,12.1,15.4,z<17?14.4:19.6,false));
    }

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
    mkWall(L, [R.mechanical.x0, R.mechanical.z0], [R.mechanical.x1, R.mechanical.z0], [door(19.8,2.6),door(24,2.8),door(28.4,2.6)]);
    mkWall(L,[26.2,30.6],[26.2,35.3]);
    mkWall(L, [21.9, R.mechanical.z0], [21.9, R.mechanical.z1]);
    mkWall(L, [R.garage.x0, R.garage.z0], [R.garage.x1, R.garage.z0], [door(20.5)], INT, ch);

    levels[L].add(mainStair(BASE[L], HOUSE.rises[L], M.stairWood, M.stairWood, M.white));

    // room floors
    roomFloor(L, ROOMS.entry.office.bounds, M.darkOakFloor, 'Home Office');
    roomFloor(L, ROOMS.entry.media.bounds, M.carpetStriped, 'Media Room');
    roomFloor(L, ROOMS.entry.gallery.bounds, M.darkOakFloor, 'Entrance Gallery');
    roomFloor(L, ROOMS.entry.centerHall.bounds, M.darkOakFloor, 'Center Hall');
    roomFloor(L, ROOMS.entry.studio.bounds, M.carpetGray, 'Studio');
    roomFloor(L, CORE.elevator.bounds, M.tileWhite, 'Elevator');
    roomFloor(L, ROOMS.entry.bath3.bounds, M.tileWhite, 'Bath #3');
    roomFloor(L, ROOMS.entry.hall.bounds, M.darkOakFloor, 'Hall');
    roomFloor(L, ROOMS.entry.rearHall.bounds, M.darkOakFloor, 'Rear Hall');
    roomFloor(L, ROOMS.entry.mechanical.bounds, M.concrete, 'Mechanical');
    roomFloor(L, ROOMS.entry.garage.bounds, M.slate, 'Three-Car Garage');

    // furniture
    // Home office: floating oak desk, white task chair, two gray guest chairs,
    // black open shelving, and a restrained geometric rug.
    place(L, K.rug(9, 11, M.officeRug), 8, 7.2);
    place(L, K.desk(6, M.oakWood), 8, 7.8, Math.PI);
    place(L, K.officeChair(), 8, 6.1);
    place(L, K.builtinWall(11.5, 8.6, M.matBlack), 15.1, 7, -Math.PI / 2);
    place(L, K.chair(M.graphite), 6.5, 10.6, Math.PI);
    place(L, K.chair(M.graphite), 9.5, 10.6, Math.PI);
    // Media room: mustard walls, broad gray sectional, striped carpet and
    // gallery-style framed art around a wall-mounted TV.
    levels[L].add(box(0.08, 9.4, 11.4, M.mediaGold, 16.0, BASE[L] + 4.7, 6.5, false));
    place(L, K.rug(11, 8, M.carpetStriped), 24, 6.5);
    const sec = K.sectionalL(9.7, 7.3, 2.9, M.carpetGray);
    place(L, sec, 28.5, 5.9, -Math.PI / 2);
    const mediaTV = K.tv(6.4);
    place(L, mediaTV, 17.6, 6.5, Math.PI / 2);
    mediaTV.position.y = BASE[L] + 4.7;
    place(L, K.sideboard(6.5, M.deepWalnut), 17.2, 6.5, Math.PI / 2);
    place(L, K.rug(12, 3, M.greige), 8.5, 17.7);
    place(L, K.console(4.8, M.oakWood), 10.5, 20.9, Math.PI);
    const galMirror = K.mirrorPanel(4, 7.5);
    place(L, galMirror, 10.5, 21.6);
    place(L, K.bench(4, M.leatherCognac), 8, 14.4);
    place(L, K.lantern(1.7, 11.5, 20.6), 9, 17.7);
    // Studio is staged as the photographed library lounge: full-height dark
    // shelving with rolling ladder, three club chairs and a glass conversation table.
    place(L, K.rug(8, 9, M.greige), 5.8, 28.2);
    place(L, K.libraryWall(10.5, 8.8, M.deepWalnut), 11.35, 28.6, -Math.PI / 2);
    place(L, K.glassTable(4.2, 3.2, 1.55), 5.8, 28.2);
    place(L, K.chair(M.carpetGray), 3.2, 28.2, Math.PI / 2);
    place(L, K.chair(M.carpetGray), 7.8, 26.4, -0.7);
    place(L, K.chair(M.carpetGray), 7.8, 30.2, -2.4);
    place(L, K.chandelierSputnik(6.5, ch), 5.8, 28.2);
    place(L,K.vanity(3.5,false,M.charcoalCabinet),14.8,29.0,Math.PI);
    place(L,K.toilet(),17.1,28.7,Math.PI);
    place(L,K.shower(4.5,3.2),15.4,23.6);
    place(L,K.cabinetRun(2.8,6.4,2.8,M.white,null),20,33.5);
    levels[L].add(box(2,4.8,2,M.concrete,14.6,2.4,33.6));
    place(L, K.plant(6), 20, 24);   // garage kept empty per Jonathan

    lab(L, 'Home Office', 8.3, 7); lab(L, 'Media Room', 24, 6.5);
    lab(L, 'Entrance Gallery', 8.5, 17.7); lab(L, 'Center Hall', 22, 19);
    lab(L, 'Studio', 6.5, 28.5); lab(L, 'Garage', 16, 46.5); lab(L, 'Elevator', 28.6, 28.5);

    evLight(L, 9, 8.6, 17.7, 16);       // gallery lantern
    evLight(L, 23.9, 6, 24.5, 8, 14);   // center hall
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
    const mainArch = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.2, 6, 14, Math.PI), M.brickRelief);
    mainArch.rotation.y = Math.PI;
    mainArch.position.set(15.5, BASE[L] + 6.7, -0.1);
    levels[L].add(mainArch);
    mkWall(L,[31.25,.35],[31.25,11.8],[win(5.5,3.2,6,1.8)],E,ch);
    mkWall(L,[31.25,11.8],[31.25,46.4],[win(15.6,2.5,4.7,4.2),win(19.6,2.5,4.7,4.2),win(23.6,2.5,4.7,4.2),win(32,3,3,5.8),win(43,3,3,5.8)],EXTM(M.sidingCream),ch);
    const rearLivingWallZ = between(R.great.z1, R.terrace.z0);
    mkWall(L, [31.6, rearLivingWallZ], [13.4, rearLivingWallZ], [gdoor(29, 5), win(22, 4, 5.5, 2), win(17, 4, 5.5, 2)], EXTM(M.panelBrown), ch);
    mkWall(L, [R.sun.x1, R.sun.z0], [R.sun.x1, R.sun.z1], [gdoor(47.8, 3), win(52, 3, 5, 2.5)], EXTM(M.sidingCream), ch);
    mkWall(L, [13.4, R.sun.z1], [0, R.sun.z1], [win(2.4,2.5,6,1.5),win(5.25,2.5,6,1.5),win(8.1,2.5,6,1.5),win(10.95,2.5,6,1.5)], EXTM(M.sidingCream), ch);
    mkWall(L, [0.35, 55.7], [0.35, 46.4], [win(52.5, 3.5, 6, 1.5), win(48.5, 3.5, 6, 1.5)], EXTM(M.panelBrown), ch);         // south-facing rear bay in siding
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

    levels[L].add(mainStair(BASE[L], HOUSE.rises[L], M.stairWood, M.stairWood, M.white));
    levels[L].add(stairGuard(BASE[L], M.stairWood, null, false, M.white));
    // White gallery balustrade with the dark wood cap seen from the entry below.
    levels[L].add(traditionalGuard([8.6, 14.4], [8.6, 19.6], BASE[L], 3, M.stairWood, M.white));
    levels[L].add(traditionalGuard([8.6, 19.6], [15.6, 19.6], BASE[L], 3, M.stairWood, M.white));

    // Great room: simple pale fireplace projection, linear fire and offset TV.
    const gr = new THREE.Group();
    gr.add(box(0.5, 7.4, 6.2, M.tileWhite, 30.65, BASE[L] + 3.7, 37.5));
    gr.add(box(1.05, 0.5, 6.8, M.tileWhite, 30.2, BASE[L] + 0.25, 37.5));
    gr.add(box(0.3, 2.1, 5.2, M.blackSteel, 30.45, BASE[L] + 1.35, 37.5));
    gr.add(box(0.2, 0.85, 4.2, M.fire, 30.28, BASE[L] + 1.15, 37.5, false));
    levels[L].add(gr);
    const greatTV = K.tv(5.2);
    place(L, greatTV, 30.78, 42.2, -Math.PI / 2);
    greatTV.position.y = BASE[L] + 5.0;
    place(L, K.sideboard(5.5, M.deepWalnut), 30.1, 42.2, -Math.PI / 2);
    // chimney exterior mass
    levels[L].add(box(1.7,10,6.4,M.brick,32.1,16,37.5));
    levels[2].add(box(1.7,10,6.4,M.brick,32.1,27,37.5));

    // (dining fluted feature wall removed — the south facade slim windows live on that wall now)

    // kitchen fixed millwork
    place(L, K.cabinetRun(17, 3, 2.2, M.cabinetGray, M.quartzite), 1.95, 36.3, Math.PI / 2);
    const uppers = K.upperRun(15, M.cabinetGray);
    place(L, uppers, 1.35, 36.3, Math.PI / 2);
    uppers.position.y = BASE[L] + 4.8;
    place(L, K.island(8.5, 3.8), 8, 36.3, Math.PI/2);
    place(L, K.range(), 2.4, 38.5, Math.PI / 2);
    const hood = K.hood(M.hoodMetal);
    place(L, hood, 2.1, 38.5);
    hood.position.y = BASE[L] + 4.6;
    place(L, K.cabinetRun(3.2, 6.8, 2.6, M.cabinetGray, null), 10.3, 27.9);       // fridge columns
    place(L, K.cabinetRun(5.5, 3, 1.9, M.iron, M.quartzite), 1.95, 18.6, Math.PI / 2);   // butler
    place(L, K.cabinetRun(4, 3, 1.9, M.walnut, M.quartzite), 1.95, 23.8, Math.PI / 2);   // menu desk
    place(L, K.cabinetRun(5.8, 3, 1.4, M.wall, null), 11.6, 20.6);                 // pantry shelves
    for (const z of [33,35.2,37.4,39.6]) place(L,K.counterStool(M.sunYellow),10.65,z,-Math.PI/2);
    for (const z of [33.5,36.3,39.1]) place(L,K.pendant(.52,6.6,ch,M.matBlack),8,z);

    // furniture
    place(L, K.rug(11, 13, M.carpetIvory), 6.8, 8.2);
    place(L, K.glassTable(8, 3.7, 2.5), 6.8, 8.2,Math.PI/2);
    for (const cz of [5.2, 8.2, 11.2]) {
      place(L, K.diningChair(M.graphite), 4.6, cz, Math.PI / 2);
      place(L, K.diningChair(M.graphite), 9, cz, -Math.PI / 2);
    }
    place(L, K.diningChair(M.graphite), 6.8, 3.6, 0);
    place(L, K.diningChair(M.graphite), 6.8, 12.8, Math.PI);
    place(L, K.linearChandelier(5, 6.2, ch), 6.8, 8.2,Math.PI/2);
    place(L, K.sideboard(7, M.deepWalnut), 2, 12.5, Math.PI / 2);

    place(L, K.rug(12, 9, M.greige), 24.5, 6.3);
    place(L, K.sofa(8, 3.3, M.velvetSlate), 24.5, 2.9, Math.PI);
    place(L, K.chair(M.shearling), 21.5, 9, Math.PI * 0.9);
    place(L, K.chair(M.shearling), 25, 9.6, Math.PI * 1.1);
    place(L, K.coffeeTable(4, 2.6), 24.5, 6.3);
    place(L, K.gameTable(4.2), 29, 9.3);
    place(L, K.diningChair(M.leatherCognac), 29, 6.8, 0);
    place(L, K.diningChair(M.leatherCognac), 29, 11.8, Math.PI);

    place(L, K.rug(10, 13, M.carpetIvory), 23.5, 37);
    const grSofa = K.sofa(10, 3.6, M.carpetGray);
    place(L, grSofa, 21.5, 37.4, -Math.PI / 2);
    place(L, K.chair(M.chairPattern), 28.4, 32.2, -Math.PI/3);
    place(L, K.chair(M.chairPattern), 28.4, 42.4, -Math.PI*2/3);
    place(L, K.coffeeTable(4.5, 2.8), 26, 37.4);
    place(L, K.plant(7), 17.3, 44.3);

    place(L, K.glassRoundTable(2.25, 2.5), 6.8, 50.8);
    for (const a of [0, 1, 2, 3]) {
      const ang = a * Math.PI / 2 + Math.PI / 4;
      place(L, K.diningChair(M.linenCream), 6.8 + Math.cos(ang) * 2.9, 50.8 + Math.sin(ang) * 2.9, -ang + Math.PI / 2);
    }
    place(L, K.pendant(0.7, 6.8, ch, M.brass), 6.8, 50.8);
    place(L, K.plant(6.5), 2.3, 53.3);
    place(L, K.vanity(3, false), 17.1, 21, 0);
    place(L, K.toilet(), 16, 25.2, Math.PI / 2);

    // main terrace
    roomFloor(L, TERRACES.main, M.pavers, 'Terrace');
    roomFloor(L, rect(0, 55.7, 13.4, 57.7), M.roofMembrane, 'Roof');
    levels[L].add(box(0.35, 5, 11.3, M.panelBrown, 31.4, BASE[L] + 2.5, 52, false));     // privacy wall
    levels[L].add(railing([R.terrace.x0, R.terrace.z1 - 0.2], [R.terrace.x1 - 0.2, R.terrace.z1 - 0.2], BASE[L], 3.2, M.blackSteel, null));
    levels[L].add(railing([R.terrace.x0, R.terrace.z1 - 1.8], [R.terrace.x0, R.terrace.z1 - 0.2], BASE[L], 3.2, M.blackSteel, null));
    place(L, K.table(6, 3.2, 2.5, M.teak), 22.5, 51.5);
    for (const cx of [20.5, 22.5, 24.5]) {
      place(L, K.diningChair(M.teak), cx, 49.6, 0);
      place(L, K.diningChair(M.teak), cx, 53.4, Math.PI);
    }
    for (const pz of [48, 52, 56]) place(L, K.plant(5.5), 29.9, pz);

    roomFloor(L, ROOMS.main.dining.bounds, M.darkOakFloor, 'Formal Dining');
    roomFloor(L, ROOMS.main.living.bounds, M.darkOakFloor, 'Living Room');
    roomFloor(L, ROOMS.main.butlerMenu.bounds, M.darkOakFloor, "Butler's Pantry · Menu");
    roomFloor(L, ROOMS.main.pantry.bounds, M.tileWhite, 'Walk-in Pantry');
    roomFloor(L, ROOMS.main.powder.bounds, M.tileWhite, 'Powder');
    roomFloor(L, ROOMS.main.kitchen.bounds, M.darkOakFloor, 'Kitchen');
    roomFloor(L, ROOMS.main.great.bounds, M.darkOakFloor, 'Great Room');
    roomFloor(L, ROOMS.main.sun.bounds, M.darkOakFloor, 'Sun Room');
    for (const region of ROOMS.main.stairHall.regions)
      roomFloor(L, region, M.darkOakFloor, 'Stair Hall');
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
    const upArch = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.2, 6, 14, Math.PI), M.brickRelief);
    upArch.rotation.y = Math.PI;
    upArch.position.set(15.5, BASE[L] + 7.1, -0.1);
    levels[L].add(upArch);
    mkWall(L,[31.25,.35],[31.25,11.8],[win(5.5)],E,ch);
    mkWall(L,[31.25,11.8],[31.25,46.4],[win(15.6,2.5,4.2,4.1),win(19.6,2.5,4.2,4.1),win(23.6,2.5,4.2,4.1),win(37.5),win(42.5)],EXTM(M.sidingCream),ch);
    mkWall(L, [31.6, suiteMain.z1 + 0.35], [13.4, suiteMain.z1 + 0.35], [win(16.8,2.7,5,2.5),win(20.7,2.7,5,2.5),win(24.6,2.7,5,2.5),win(28.5,2.7,5,2.5)], EXTM(M.panelBrown), ch);
    mkWall(L, [R.retreat.x1, R.retreat.z0], [R.retreat.x1, R.retreat.z1], [gdoor(48.5, 4, 7.5)], EXTM(M.sidingCream), ch);
    mkWall(L, [13.4, R.retreat.z1], [0, R.retreat.z1], [win(2.4,2.5,5,2.5),win(5.25,2.5,5,2.5),win(8.1,2.5,5,2.5),win(10.95,2.5,5,2.5)], EXTM(M.sidingCream), ch);
    mkWall(L, [0.35, 55.7], [0.35, 46.4], [win(52.5, 3.5, 5.5, 1.8), win(48.5, 3.5, 5.5, 1.8)], EXTM(M.panelBrown), ch);  // wing: window pair matching the floor below
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

    levels[L].add(mainStair(BASE[L], HOUSE.rises[L], M.stairWood, M.stairWood, M.white));
    levels[L].add(stairGuard(BASE[L], M.stairWood, null, false, M.white));

    // Owner suite: black four-poster bed, white casegoods and yellow bench.
    place(L, K.rug(12, 12, M.carpetIvory), 24.5, 40.2);
    place(L, K.canopyBed(6.33, 7.2, M.linenCream), 27.2, 40.2, -Math.PI / 2);
    place(L, K.nightstand(M.white), 29.9, 36.4);
    place(L, K.nightstand(M.white), 29.9, 44.0);
    place(L, K.bench(5, M.sunYellow), 23.1, 40.2, Math.PI / 2);
    place(L, K.dresser(6, M.charcoalCabinet), 17.3, 40.2, Math.PI / 2);
    const suiteTV = K.tv(4.6);
    place(L, suiteTV, 16.7, 40.2, Math.PI / 2);
    suiteTV.position.y = BASE[L] + 4.9;
    place(L, K.dresser(5, M.white), 27.5, 34.7, 0);

    // Retreat: paired chaises in the window corner beside the dark wet bar.
    place(L, K.rug(9, 7, M.carpetIvory), 6.8, 50.8);
    place(L, K.chaise(M.carpetGray), 4.5, 51.7, Math.PI);
    place(L, K.chaise(M.carpetGray), 9.0, 51.7, Math.PI);
    place(L, K.roundTable(1.4, 1.5, M.walnut), 6.5, 50.4);

    // Owner bath: freestanding tub against a dramatic figured-stone slab,
    // long charcoal vanities, white floor and frameless glass shower.
    levels[L].add(box(6.8, 6.8, 0.12, M.marbleVein, 4.5, BASE[L] + 3.4, 27.0, false));
    place(L, K.tub(), 4.5, 30.2);
    place(L, K.vanity(3.5, false, M.charcoalCabinet), 2.05, 37.2, Math.PI / 2);
    place(L, K.vanity(3.5, false, M.charcoalCabinet), 2.05, 42.2, Math.PI / 2);
    place(L, K.toilet(), 1.7, 44.9, Math.PI / 2);
    place(L, K.shower(4.2, 3.6), 13.6, 43.6);
    place(L, K.cabinetRun(5, 3, 1.9, M.charcoalCabinet, M.quartzite), 8.6, 45.05, Math.PI);
    // closet: rods both sides + center bench
    place(L, K.cabinetRun(6.4, 6.8, 2, M.oakWood, null), 12.1, 30.4, Math.PI / 2);
    place(L, K.cabinetRun(6.4, 6.8, 2, M.oakWood, null), 19.1, 30.4, -Math.PI / 2);
    place(L, K.bench(3, M.linenCream), 15.6, 30.4, Math.PI / 2);
    // laundry: stacked pair on the east wall, sink + counter along the west
    levels[L].add(box(0.08, ch - 0.4, 9.8, M.laundryPeach, 8.88, BASE[L] + (ch - 0.4) / 2, 21.4, false));
    place(L, K.washerDryer(), 8.15, 24.5, Math.PI / 2);
    place(L, K.cabinetRun(5, 3, 2, M.wall, M.quartzite), 4.2, 17.3);
    place(L, K.cabinetRun(4, 3, 1.9, M.wall, M.quartzite), 1.95, 21.5, Math.PI / 2);
    const laundryUpper = K.upperRun(4.8, M.wall);
    place(L, laundryUpper, 4.2, 17.25);
    laundryUpper.position.y = BASE[L] + 4.9;
    // bath 2: vanity at the top wall, tub at the bottom (per plan)
    place(L, K.vanity(5, true, M.charcoalCabinet), 15.1, 12.4, Math.PI);
    place(L, K.tub(), 15.2, 2.3);
    place(L, K.toilet(), 17.4, 7.2, -Math.PI / 2);
    // bedroom #2: bed head on the right (x) wall
    place(L, K.rug(9, 8, M.greige), 26, 6.3);
    place(L, K.bed(5, 6.8, M.oakWood, M.linenCream), 27, 6.3, -Math.PI / 2);
    place(L, K.nightstand(), 29.8, 3.0);
    place(L, K.nightstand(), 29.8, 9.6);
    place(L, K.dresser(5, M.walnut), 20, 6.3, Math.PI / 2);
    // bedroom #3: bed head on the left wall (per plan — a bedroom, not the podcast room)
    place(L, K.rug(9, 8, M.carpetIvory), 5.9, 6.9);
    place(L, K.bed(5, 6.8, M.white, M.magentaPattern), 4.4, 6.9, Math.PI / 2);
    place(L, K.nightstand(M.white), 1.6, 3.6);
    place(L, K.nightstand(M.white), 1.6, 10.2);
    place(L, K.dresser(5, M.white), 10.9, 6.9, -Math.PI / 2);
    // Magenta perimeter band at the ceiling reproduces the photographed room.
    levels[L].add(box(10.6, 0.45, 0.3, M.magenta, 6.0, BASE[L] + ch - 0.3, 0.9, false));
    levels[L].add(box(10.6, 0.45, 0.3, M.magenta, 6.0, BASE[L] + ch - 0.3, 12.7, false));
    // hall runner
    place(L, K.rug(6.5, 2.3, M.greige), 6, 14.8);

    roomFloor(L, ROOMS.upper.bed3.bounds, M.carpetIvory, 'Bedroom #3');
    roomFloor(L, ROOMS.upper.bath2.bounds, M.tileWhite, 'Bath #2');
    roomFloor(L, ROOMS.upper.bed2.bounds, M.carpetIvory, 'Bedroom #2');
    roomFloor(L, ROOMS.upper.laundry.bounds, M.tileWhite, 'Laundry');
    for (const region of ROOMS.upper.ownerBath.regions) roomFloor(L, region, M.tileWhite, "Owner's Bath");
    for (const region of ROOMS.upper.ownerCloset.regions) roomFloor(L, region, M.carpetIvory, 'Walk-in Closet');
    for (const region of ROOMS.upper.ownerSuite.regions) roomFloor(L, region, M.carpetIvory, "Owner's Suite");
    roomFloor(L, ROOMS.upper.retreat.bounds, M.carpetIvory, "Owner's Retreat");
    for (const region of ROOMS.upper.upperHall.regions) roomFloor(L, region, M.darkOakFloor, 'Upper Hall');
    roomFloor(L, ROOMS.upper.wetBar.bounds, M.carpetIvory, 'Wet Bar');
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
    const L = 3, ch = CEIL[3], R = roomExtents(ROOMS.penthouse);
    slabAdd(3, [FOOTPRINT.upper], [stairHole()], M.subfloor);
    // The plan has a projecting central guest bedroom, a recessed closet and
    // bath on either side, and an open loft behind the French-door dormer.
    mkWall(L,[9,2],[24.4,2],[win(11.5,3,4.6,2),win(16.7,3,4.6,2),win(21.9,3,4.6,2)],EXT());
    mkWall(L,[24.4,2],[24.4,5.5],[],EXTM(M.shingle));
    mkWall(L,[24.4,5.5],[29.2,5.5],[],EXTM(M.shingle));
    mkWall(L,[29.2,5.5],[29.2,13.3],[],EXTM(M.shingle));
    mkWall(L,[29.2,13.3],[31,13.3],[],EXTM(M.sidingCream));
    mkWall(L,[31,13.3],[31,30.6],[win(16.1,2.5,4.8,2.7),win(20.1,2.5,4.8,2.7),win(24.1,2.5,4.8,2.7)],EXTM(M.sidingCream));
    mkWall(L,[31,30.6],[14.75,30.6],[gdoor(20,6.3)],EXTM(M.sidingCream));
    mkWall(L,[14.75,30.6],[14.75,33.7],[],EXTM(M.sidingCream));
    mkWall(L,[14.75,33.7],[5.5,33.7],[win(10.1,5,4.8,2.5)],EXTM(M.sidingCream));
    mkWall(L,[5.5,33.7],[5.5,25.8],[],EXTM(M.shingle));
    mkWall(L,[5.5,25.8],[2.8,25.8],[],EXTM(M.shingle));
    mkWall(L,[2.8,25.8],[2.8,11],[win(23.2,2.2,4,2.5),gdoor(17.6,4.8,7.8),win(12.9,2.2,4,2.5)],EXT());
    mkWall(L,[2.8,11],[5.5,11],[],EXTM(M.shingle));
    mkWall(L,[5.5,11],[5.5,5.5],[],EXTM(M.shingle));
    mkWall(L,[5.5,5.5],[9,5.5],[],EXTM(M.shingle));
    mkWall(L,[9,5.5],[9,2],[],EXTM(M.shingle));
    // Guest-room entrance is beside the linen cupboard; bath access is from
    // the bedroom vestibule. The closet occupies the opposite roof recess.
    mkWall(L,[9,13.3],[29.2,13.3],[door(22.4,3)]);
    mkWall(L,[24.4,5.5],[24.4,13.3],[door(9.1,2.6)]);
    mkWall(L,[24.4,8.7],[29.2,8.7],[door(26,2.6)]);
    mkWall(L,[9,5.5],[9,11],[door(8.2,3)]);
    mkWall(L,[5.5,11],[9,11]);
    mkWall(L,[20.7,11.5],[20.7,13.3]);
    mkWall(L,[20.7,11.5],[21.9,11.5]);
    elevatorCloset(L);
    levels[L].add(stairGuard(BASE[L],M.stairWood,null,true,M.white));
    for (const region of ROOMS.penthouse.loft.regions) roomFloor(L,region,M.darkOakFloor,'Penthouse Loft');
    for (const name of ['bed5','guestCloset','guestEntry']) roomFloor(L,ROOMS.penthouse[name].bounds,M.carpetIvory,name==='guestCloset'?'Guest Closet':'Bedroom #5');
    roomFloor(L,ROOMS.penthouse.bath4.bounds,M.tileWhite,'Bath #4');
    roomFloor(L,ROOMS.penthouse.wetBar.bounds,M.darkOakFloor,'Wet Bar');
    roomFloor(L,CORE.elevator.bounds,M.tileWhite,'Elevator');
    for (const region of TERRACES.penthouseDiningRegions) roomFloor(L,region,M.terraceDeck,'Outdoor Dining Terrace');
    for (const region of TERRACES.penthouseLivingRegions) roomFloor(L,region,M.terraceDeck,'Outdoor Living Terrace');
    roomFloor(L,TERRACES.penthouseSun,M.terraceDeck,'Sun Terrace');

    // Photographed gray, back-to-back upholstered seating and yellow tables.
    place(L,K.rug(12.5,10.5,M.loftRug),12.7,20.5);
    place(L,K.doubleSofa(10.5,5.8,M.carpetGray),12.7,20.8);
    place(L,K.roundTable(1,1.8,M.sunYellow),7,20.5);
    place(L,K.roundTable(1,1.8,M.sunYellow),18.4,20.5);
    place(L,K.sideboard(7.2,M.deepWalnut),14.2,14.1);
    const tv=place(L,K.tv(6.5),14.2,13.62); tv.position.y=BASE[L]+5.1;
    place(L,K.roundTable(1.3,2.5,M.walnut),5.3,13.8);
    place(L,K.diningChair(M.carpetGray),3.8,13.8,Math.PI/2);
    place(L,K.diningChair(M.carpetGray),6.8,13.8,-Math.PI/2);
    // The wet bar is on the loft side of the terrace window, with an L return.
    place(L,K.cabinetRun(7.9,3,2,M.charcoalCabinet,M.quartzite),10.1,32.4,Math.PI);
    place(L,K.cabinetRun(3.6,3,2,M.charcoalCabinet,M.quartzite),13.5,30.6,-Math.PI/2);
    place(L,K.cabinetRun(3.6,3,1.7,M.charcoalCabinet,M.quartzite),8,28.0);
    place(L,K.upperRun(4.4,M.charcoalCabinet),6.45,30.6,Math.PI/2).position.y=BASE[L]+6.1;
    place(L,K.stool(),7.3,26.8); place(L,K.stool(),9.2,26.8);
    place(L,K.featureBed(5,6.8,M.bedQuilt),16.1,8.5,Math.PI);
    place(L,K.nightstand(M.walnut),12.7,11.2);
    place(L,K.nightstand(M.walnut),19.4,11.2);
    place(L,K.dresser(6,M.walnut),16.2,3.1);
    place(L,K.cabinetRun(4.6,7,1.5,M.white,null),6.4,8.2,Math.PI/2);
    place(L,K.shower(4.3,2.8),26.8,7.05);
    place(L,K.vanity(3.5,false,M.charcoalCabinet),26.6,12.35,Math.PI);
    place(L,K.toilet(),28.2,10.05,-Math.PI/2);
    // Raised tray follows the seating area; its edges and cove are layered.
    const trayG=new THREE.Group();
    trayG.add(box(15.4,.25,12.2,M.white,13.7,42.9,20.2,false));
    for(const [x,z,w,d] of [[13.7,14.1,15.5,.25],[13.7,26.3,15.5,.25],[5.95,20.2,.25,12.4],[21.45,20.2,.25,12.4]]) {
      trayG.add(box(w,1.8,d,M.wall,x,42,z,false));
      trayG.add(box(w,.12,d+.12,M.white,x,41.1,z,false));
      trayG.add(box(w,.05,d+.08,M.warmGlow,x,41.25,z,false));
    }
    levels[L].add(trayG); tray=trayG;
    // Iron Juliet rail, stone shelf, and paired wall lanterns on the south dormer.
    levels[L].add(railing([2.25,15.1],[2.25,20.1],BASE[L],3.1,M.matBlack,null));
    levels[L].add(box(.9,.18,5.5,M.trimStone,2.5,31.95,17.6));
    for(const z of [14.65,20.55]){
      levels[L].add(box(.35,.7,.28,M.blackSteel,2.36,37.5,z));
      levels[L].add(box(.2,.4,.2,M.warmGlow,2.15,37.5,z,false));
    }
    // Reference terrace: yellow metal chairs, purple chaises, woven pod chair,
    // dark fireplace, tan shade sail and open timber pergola.
    place(L,K.table(6.7,3.2,2.5,M.terraceTable),7.5,40.1,Math.PI/2);
    for(const z of [38.4,40.1,41.8]){
      place(L,K.metalDiningChair(M.sunYellow),5.55,z,Math.PI/2);
      place(L,K.metalDiningChair(M.sunYellow),9.45,z,-Math.PI/2);
    }
    place(L,K.eggChair(M.teak),28.5,35.2,Math.PI/2);
    place(L,K.lounger(M.graphite,M.terracePurple),20.1,42.1,Math.PI);
    place(L,K.lounger(M.graphite,M.terracePurple),24.0,42.1,Math.PI);
    place(L,K.roundTable(.95,1.4,M.sunYellow),22,41.1);
    place(L,K.lounger(M.graphite,M.terracePurple),4.2,50.6,Math.PI/4);
    place(L,K.lounger(M.graphite,M.terracePurple),8.2,52.6,Math.PI/4);
    for(const [x,z] of [[1.8,54],[11.8,54],[29.7,44.9]]) place(L,K.plant(4.5),x,z);
    levels[L].add(box(.9,6.5,6.7,M.charcoalCabinet,31.05,35.25,36.7));
    levels[L].add(box(.3,2,5.1,M.blackSteel,30.5,33.5,36.7));
    levels[L].add(box(.2,.75,4.2,M.fire,30.3,33.45,36.7,false));
    place(L,K.art(4.5,2.6,M.white),30.4,36.7,-Math.PI/2).position.y=BASE[L]+4.9;
    const gap=OPTIONAL.exteriorSpiral.guardGap;
    for(const [a,b] of [[[14.75,46.2],[31.4,46.2]],[[31.4,30.6],[31.4,46.2]],[[.7,33.7],[.7,55.5]],[[.7,55.5],[13.05,55.5]],[[13.05,46.3],[13.05,gap.z0]],[[13.05,gap.z1],[13.05,55.5]]])
      levels[L].add(railing(a,b,32,3.4,M.blackSteel,null));
    // Four substantial posts and projecting rafters, matching the rear photos.
    for(const x of [1,13.25]) for(const z of [34,46.1])
      levels[L].add(box(.5,9.4,.5,M.pergola,x,36.7,z));
    for(const x of [1,13.25]) levels[L].add(box(.42,.65,13.5,M.pergola,x,41.2,40.05));
    for(let z=33.5;z<47;z+=1.1) levels[L].add(box(13.8,.38,.22,M.pergola,7.1,41.6,z));
    levels[L].add(box(.3,7.5,10.8,M.panelBrown,1.1,35.75,39.85));
    levels[L].add(box(.18,2.1,10.4,M.hedge,1.29,38.7,39.85));
    shadeSail(levels[L],[[12.9,40.5,34],[30.8,40.2,32],[29.9,40.3,45.6]],M.shadeCanvas);
    swag(levels[L],[13.25,41,34],[31,40,45.2],1.1);
    swag(levels[L],[13.25,41,46],[31,40,32],1.15);
    swag(levels[L],[1,41,34],[13.25,41,46.1],.8);
    lab(L,'Penthouse Loft',12,22);lab(L,'Bedroom #5',16,7);lab(L,'Wet Bar',10,31);
    lab(L,'Outdoor Dining Terrace',7,40);lab(L,'Outdoor Living Terrace',23,38);lab(L,'Sun Terrace',6,51);
    evLight(L,12,8.5,20,12);evLight(L,10,6.5,31,9);evLight(L,16,7,7,8);
    evLight(L,7,8,40,7);evLight(L,27,5,37,7,15,0xffb16f);
  }

  // ==================================================================
  // ROOF over penthouse box
  // ==================================================================
  {
    roof.add(referenceRoof(M));
    // Low chimney termination at the terrace fireplace, as seen from the rear.
    roof.add(box(2.1,10.6,6.4,M.brick,32.1,36.7,36.7));
    roof.add(box(2.5,.3,6.8,M.trimStone,32.1,42.15,36.7));
    roof.add(box(1.2,.5,1.4,M.blackSteel,32.1,42.55,36.7));
  }

  for(const level of [1,2]) {
    const y=BASE[level]-.2;
    levels[level].add(box(31.7,.34,.56,M.trimStone,15.8,y,-.05));
    levels[level].add(box(.56,.34,46.2,M.trimStone,-.05,y,23.1));
  }
  // Slim downpipes are aligned with masonry/side-wing junctions.
  for(const [x,z,top] of [[-.22,.2,31.1],[-.22,46.2,32],[31.55,.2,31.1],[31.55,46.2,31]]) {
    for(let level=0;level<3;level++)levels[level].add(box(.17,CEIL[level]+1,.17,M.hoodMetal,x,BASE[level]+(CEIL[level]+1)/2,z));
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

    // Ground: gray media drapes, taupe office drapes, patterned studio drapes.
    drapeAt(0, 19.2, 1.2, 0, M.carpetGray); drapeAt(0, 23.5, 1.2, 0, M.carpetGray); drapeAt(0, 27.8, 1.2, 0, M.carpetGray);
    drapeAt(0, 2.4, 1.2, 0, M.greige); drapeAt(0, 7.2, 1.2, 0, M.greige); drapeAt(0, 11.8, 1.2, 0, M.greige);
    artAt(0, 6.4, 13.85, 0, 3, 3.8);
    artAt(0, 11.6, 13.85, 0, 2.4, 3);
    artAt(0, 23, 12.35, Math.PI, 4, 3, 4, M.blackSteel);
    artAt(0, 4, 13.35, Math.PI, 3, 3.2, 4);

    // Main: neutral dining drapes, warm-yellow great/sun-room curtains.
    drapeAt(1, 19.5, 1.2); drapeAt(1, 23.7, 1.2); drapeAt(1, 27.9, 1.2);
    drapeAt(1, 2.7, 1.2, 0, M.carpetGray); drapeAt(1, 6.7, 1.2, 0, M.carpetGray); drapeAt(1, 10.8, 1.2, 0, M.carpetGray);
    drapeAt(1, 30.8, 32.2, -Math.PI / 2, M.sunYellow); drapeAt(1, 30.8, 43.0, -Math.PI / 2, M.sunYellow);
    drapeAt(1, 1.1, 48.2, Math.PI / 2, M.sunYellow); drapeAt(1, 1.1, 53.5, Math.PI / 2, M.sunYellow);
    artAt(1, 1.15, 12.5, Math.PI / 2, 4.2, 3.6, 4.2, M.brass);
    artAt(1, 25, 12.0, Math.PI, 3.4, 3, 4.4);

    // Upper: gray suite/retreat drapes and saturated Bedroom 3 accents.
    drapeAt(2, 30.6, 35.7, -Math.PI / 2, M.carpetGray); drapeAt(2, 30.6, 39.9, -Math.PI / 2, M.carpetGray); drapeAt(2, 30.6, 44.4, -Math.PI / 2, M.carpetGray);
    drapeAt(2, 20.7, 1.2); drapeAt(2, 24.75, 1.2); drapeAt(2, 28.8, 1.2);
    drapeAt(2, 2.2, 1.2, 0, M.magenta); drapeAt(2, 6, 1.2, 0, M.magenta); drapeAt(2, 9.8, 1.2, 0, M.magenta);
    drapeAt(2, 1.0, 48.3, Math.PI / 2, M.carpetGray); drapeAt(2, 1.0, 53.4, Math.PI / 2, M.carpetGray);
    artAt(2, 26, 34.15, 0, 3, 3, 4.4);
    artAt(2, 12.2, 13.6, 0, 2.5, 3, 3.9);
    artAt(2, 24.75, 1.0, 0, 3, 2.8, 4.3);

    // decorative brick-inlay squares on the south facade left section (per photos)
    for (const [lvl, cy] of [[1, BASE[1] + 5], [2, BASE[2] + 4.6]]) {
      levels[lvl].add(box(0.14, 0.5, 4.6, M.brickRelief, -0.06, cy + 2.05, 38.5, false));
      levels[lvl].add(box(0.14, 0.5, 4.6, M.brickRelief, -0.06, cy - 2.05, 38.5, false));
      levels[lvl].add(box(0.14, 4.6, 0.5, M.brickRelief, -0.06, cy, 36.45, false));
      levels[lvl].add(box(0.14, 4.6, 0.5, M.brickRelief, -0.06, cy, 40.55, false));
      levels[lvl].add(box(.08,3.8,3.8,M.brick,-.06,cy,38.5,false));
    }

    // penthouse: bed5 drapes + loft & guest art
    drapeAt(3, 9.4, 2.8,0,M.carpetGray); drapeAt(3, 14.1, 2.8,0,M.carpetGray); drapeAt(3, 19.3, 2.8,0,M.carpetGray); drapeAt(3,24,2.8,0,M.carpetGray);
    drapeAt(3,3.5,14.5,Math.PI/2,M.carpetGray); drapeAt(3,3.5,20.7,Math.PI/2,M.carpetGray);
    artAt(3, 8, 13.6, 0, 3.2, 3.4, 3.9, M.blackSteel);
    artAt(3, 12.5, 13.6, 0, 2.4, 2.8, 4.2, M.blackSteel);
    artAt(3, 19.8, 12.9, Math.PI, 2.4, 3, 4);
  }

  // ==================================================================
  // Optional 3-story spiral stair: main terrace (11) -> retreat (22) -> sun terrace (32)
  // ==================================================================
  for(const level of [1,2]) {
    const flight=spiralStair(OPTIONAL.exteriorSpiral.center[0],OPTIONAL.exteriorSpiral.center[1],BASE[level],BASE[level+1],OPTIONAL.exteriorSpiral.radius,M.blackSteel,M.blackSteel);
    flight.userData.startLevel=level;optional.add(flight);
  }
  for (const [bounds, y] of [
    [OPTIONAL.exteriorSpiral.upperLanding, BASE[2]],
    [OPTIONAL.exteriorSpiral.penthouseLanding, BASE[3]],
  ]) {
    const landing = extents({ bounds });
    const landingGroup=new THREE.Group();landingGroup.userData.startLevel=BASE.indexOf(y);
    landingGroup.add(box(landing.x1-landing.x0,.3,landing.z1-landing.z0,M.blackSteel,(landing.x0+landing.x1)/2,y-.15,(landing.z0+landing.z1)/2));
    landingGroup.add(railing([landing.x0,landing.z0],[14.1,landing.z0],y,3,M.blackSteel,null));
    landingGroup.add(railing([landing.x0,landing.z1],[14.1,landing.z1],y,3,M.blackSteel,null));
    optional.add(landingGroup);
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
