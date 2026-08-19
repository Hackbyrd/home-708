import * as THREE from 'three';

// All units in feet. Plan coords: x (west->east), z (front/south -> rear/north). y up.

export function box(w, h, d, mat, x = 0, y = 0, z = 0, castShadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = castShadow;
  m.receiveShadow = true;
  return m;
}

// ---------------- WALLS ----------------
// Wall runs from a=[x,z] to b=[x,z], built out of boxes so openings are real holes.
// openings: {at (dist from a to CENTER), w, h, sill=0, type:'door'|'window'|'arch'|'open'|'garage'}
// layers: [{mat, t, off}] off = lateral offset from centerline (+ = left of a->b direction)
export function wall(a, b, height, openings = [], layers, yBase = 0, glassMat = null, frameMat = null, trimMat = null, leafMat = null) {
  const g = new THREE.Group();
  const dir = new THREE.Vector2(b[0] - a[0], b[1] - a[1]);
  const len = dir.length();
  const u = dir.clone().normalize();          // along wall
  const n = new THREE.Vector2(-u.y, u.x);     // lateral normal

  const place = (mesh, along, y, lateral) => {
    mesh.position.set(
      a[0] + u.x * along + n.x * lateral,
      y,
      a[1] + u.y * along + n.y * lateral
    );
    mesh.rotation.y = -Math.atan2(u.y, u.x);
    g.add(mesh);
  };

  const ops = [...openings].sort((p, q) => p.at - q.at);

  for (const layer of layers) {
    let cursor = 0;
    const seg = (from, to, y0, y1) => {
      if (to - from < 0.01 || y1 - y0 < 0.01) return;
      const m = new THREE.Mesh(new THREE.BoxGeometry(to - from, y1 - y0, layer.t), layer.mat);
      m.castShadow = true; m.receiveShadow = true;
      place(m, (from + to) / 2, yBase + (y0 + y1) / 2, layer.off || 0);
    };
    for (const o of ops) {
      const o0 = o.at - o.w / 2, o1 = o.at + o.w / 2;
      seg(cursor, o0, 0, height);                       // solid before opening
      const sill = o.sill ?? (o.type === 'window' ? 2.5 : 0);
      seg(o0, o1, sill + o.h, height);                  // header
      if (sill > 0) seg(o0, o1, 0, sill);               // below sill
      cursor = o1;
    }
    seg(cursor, len, 0, height);
  }

  // glazing, frames, trims, door leaves
  for (const o of ops) {
    const sill = o.sill ?? (o.type === 'window' ? 2.5 : 0);
    if ((o.type === 'window' || o.type === 'glassdoor') && glassMat) {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(o.w - 0.25, o.h - 0.2, 0.08), glassMat);
      pane.castShadow = false;
      place(pane, o.at, yBase + sill + o.h / 2, 0);
      if (frameMat) {
        const fr = new THREE.Group();
        const t = 0.16;
        fr.add(box(o.w, t, 0.32, frameMat, 0, o.h / 2 - t / 2, 0));
        fr.add(box(o.w, t, 0.32, frameMat, 0, -o.h / 2 + t / 2, 0));
        fr.add(box(t, o.h, 0.32, frameMat, -o.w / 2 + t / 2, 0, 0));
        fr.add(box(t, o.h, 0.32, frameMat, o.w / 2 - t / 2, 0, 0));
        // 1-over-1 sashes: single meeting rail (matches the real house); center stile on glass doors
        if (o.type === 'window') {
          fr.add(box(o.w - 0.15, 0.14, 0.3, frameMat, 0, 0, 0));  // meeting rail
        } else {
          fr.add(box(0.09, o.h - 0.2, 0.24, frameMat, 0, 0, 0));  // french-door center stile
        }
        place(fr, o.at, yBase + sill + o.h / 2, 0);
      }
      // limestone sill + lintel on masonry walls
      if (trimMat) {
        if (o.type === 'window') {
          const s = new THREE.Mesh(new THREE.BoxGeometry(o.w + 0.55, 0.28, 0.55), trimMat);
          s.castShadow = true; s.receiveShadow = true;
          place(s, o.at, yBase + sill - 0.12, -0.42);
        }
        const l = new THREE.Mesh(new THREE.BoxGeometry(o.w + 0.45, 0.5, 0.4), trimMat);
        l.castShadow = true; l.receiveShadow = true;
        place(l, o.at, yBase + sill + o.h + 0.26, -0.38);
      }
    }
    // hinged door leaf, ajar — reads as a real door without blocking the path
    if (o.type === 'door' && leafMat) {
      const holder = new THREE.Group();
      const pivot = new THREE.Group();
      const lw = o.w - 0.12, lh = o.h - 0.12;
      pivot.add(box(lw, lh, 0.12, leafMat, lw / 2, lh / 2, 0));
      // panel reveal lines
      pivot.add(box(lw - 0.5, lh * 0.42, 0.02, leafMat, lw / 2, lh * 0.68, 0.075));
      pivot.add(box(lw - 0.5, lh * 0.34, 0.02, leafMat, lw / 2, lh * 0.24, 0.075));
      if (frameMat) {
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), frameMat);
        knob.position.set(lw - 0.3, 3.1, 0.14);
        pivot.add(knob);
      }
      pivot.rotation.y = 1.15 + (o.at % 1) * 0.5;
      holder.add(pivot);
      place(holder, o.at - o.w / 2, yBase, 0);
    }
    if (o.type === 'garage' && frameMat) {
      const door = new THREE.Group();
      door.add(box(o.w - 0.3, o.h - 0.2, 0.25, frameMat, 0, 0, 0));
      // panel ribs
      for (let ry = -o.h / 2 + 0.9; ry < o.h / 2 - 0.3; ry += 1.5)
        door.add(box(o.w - 0.6, 0.12, 0.06, trimMat ?? frameMat, 0, ry, 0.16));
      place(door, o.at, yBase + o.h / 2, 0);
      if (trimMat) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(o.w + 0.5, 0.5, 0.4), trimMat);
        place(l, o.at, yBase + o.h + 0.26, -0.38);
      }
    }
  }
  return g;
}

// ---------------- SLABS ----------------
// poly: [[x,z],...] outer ring. holes: array of rings. Extruded `th` thick, top at yTop.
export function slab(poly, holes = [], th, yTop, mat) {
  const shape = new THREE.Shape(poly.map(p => new THREE.Vector2(p[0], p[1])));
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(p => new THREE.Vector2(p[0], p[1]))));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: th, bevelEnabled: false });
  geo.rotateX(Math.PI / 2); // (x,y,z) -> (x,-z,y): shape y becomes world z, extrude +z becomes -y
  const m = new THREE.Mesh(geo, mat);
  m.position.y = yTop;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function rect(x0, z0, x1, z1) {
  return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
}

// ---------------- STAIRS ----------------
// Straight run: from (x,z) heading dir ('N','S','E','W'), width, run length, rise, risers count
export function stairRun(x, z, dirCh, width, runLen, rise0, rise1, mat, risers = 9) {
  const g = new THREE.Group();
  const treadLen = runLen / risers;
  const stepH = (rise1 - rise0) / risers;
  for (let i = 0; i < risers; i++) {
    const t = box(
      dirCh === 'E' || dirCh === 'W' ? treadLen : width,
      stepH * (i + 1) + 0.35,
      dirCh === 'N' || dirCh === 'S' ? treadLen : width,
      mat
    );
    const along = treadLen * (i + 0.5);
    const y = rise0 + (stepH * (i + 1) + 0.35) / 2 - 0.35;
    if (dirCh === 'N') t.position.set(x + width / 2, y, z + along);
    if (dirCh === 'S') t.position.set(x + width / 2, y, z - along);
    if (dirCh === 'E') t.position.set(x + along, y, z + width / 2);
    if (dirCh === 'W') t.position.set(x - along, y, z + width / 2);
    g.add(t);
  }
  return g;
}

// The house's stacked switchback stair, one flight set per level.
// Geometry constants shared by data + engine:
export const STAIR = {
  runAx0: 28.3, runAx1: 30.9,   // run A along east wall, ascends N
  runBx0: 25.5, runBx1: 28.1,   // run B, ascends S
  z0: 14.0, z1: 21.3,           // run extent
  landZ0: 21.3, landZ1: 24.9,   // landing at north
  voidX0: 21.8, voidX1: 25.5,   // open-above/below void west of run B
};

export function switchbackStair(yBase, rise, treadMat, railMat) {
  const g = new THREE.Group();
  const S = STAIR;
  const half = rise / 2;
  // run A up (heading N)
  g.add(stairRun(S.runAx0, S.z0, 'N', S.runAx1 - S.runAx0, S.z1 - S.z0, yBase, yBase + half, treadMat, 9));
  // landing
  const land = box(S.runAx1 - S.runBx0, 0.6, S.landZ1 - S.landZ0, treadMat,
    (S.runBx0 + S.runAx1) / 2, yBase + half - 0.3, (S.landZ0 + S.landZ1) / 2);
  g.add(land);
  // run B up (heading S)
  g.add(stairRun(S.runBx0, S.z1, 'S', S.runBx1 - S.runBx0, S.z1 - S.z0, yBase + half, yBase + rise, treadMat, 9));
  // simple rail along run B west edge (the void side)
  const railH = 3;
  const rail = box(0.15, railH, S.z1 - S.z0 + (S.landZ1 - S.landZ0), railMat,
    S.runBx0 + 0.1, yBase + half + railH / 2 + 1.2, (S.z0 + S.landZ1) / 2, false);
  g.add(rail);
  return g;
}

// ---------------- MAIN STAIR (per blueprint: flight wraps an OPEN WELL) ----------------
// "Open Above & Below": a central open shaft you can see through on every floor.
// Each flight: 3 treads east (south band) -> curved winders at the SE corner ->
// straight run north along the east wall -> winders at the NE corner ->
// 3 treads west (north band), discharging into the hall. The well sits in the middle.
export const WELL = { x0: 24.4, x1: 28.1, z0: 16.6, z1: 21.8 };

// full rectangular shaft opening (flights + well live inside it)
export function stairHole() {
  return [[24.4, 13.8], [31, 13.8], [31, 26.2], [24.4, 26.2]];
}

// annular-sector tread
function wedge(rIn, rOut, a0, a1, th, mat) {
  const s = new THREE.Shape();
  s.absarc(0, 0, rOut, a0, a1, false);
  s.absarc(0, 0, rIn, a1, a0, true);
  const g = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false });
  g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// one flight wrapping the well: 3 east -> SE winders -> 6 north -> NE winders -> 3 west
export function mainStair(yBase, rise, treadMat, railMat) {
  const g = new THREE.Group();
  const n = 17, sh = rise / n;
  let s = 0;
  const tread = (w, d, x, z) => {
    s++;
    const h = sh * s + 0.35;
    g.add(box(w, h, d, treadMat, x, yBase + h / 2 - 0.35, z));
    return yBase + sh * s;
  };
  const picket = (x, yTop, z) => {
    g.add(box(0.08, 3, 0.08, railMat, x, yTop + 1.5, z, false));
    g.add(box(0.24, 0.12, 0.24, railMat, x, yTop + 3, z, false));
  };
  // A: 3 treads heading EAST along the south band
  for (let i = 0; i < 3; i++) {
    const xc = 24.97 + i * 1.13;
    const yT = tread(1.13, 2.8, xc, 15.2);
    picket(xc, yT, 16.45);
  }
  // SE winders (the blueprint's curve) around pivot (28.1, 16.6)
  for (let i = 0; i < 3; i++) {
    s++;
    const h = sh * s + 0.35;
    const a0 = -Math.PI / 2 + i * (Math.PI / 6);
    const wed = wedge(0.12, 2.9, a0, a0 + Math.PI / 6, h, treadMat);
    wed.position.set(WELL.x1, yBase + sh * s, WELL.z0);
    g.add(wed);
  }
  const hSE = sh * 5 + 0.35;
  g.add(box(1.4, hSE, 1.4, treadMat, 30.25, yBase + hSE / 2 - 0.35, 14.55));   // corner infill
  // B: 6 treads heading NORTH along the east wall
  for (let i = 0; i < 6; i++) {
    const zc = WELL.z0 + (i + 0.5) * ((WELL.z1 - WELL.z0) / 6);
    const yT = tread(2.9, (WELL.z1 - WELL.z0) / 6, 29.55, zc);
    picket(28.25, yT, zc);
  }
  // NE winders around pivot (28.1, 21.8)
  for (let i = 0; i < 2; i++) {
    s++;
    const h = sh * s + 0.35;
    const a0 = i * (Math.PI / 4);
    const wed = wedge(0.12, 2.9, a0, a0 + Math.PI / 4, h, treadMat);
    wed.position.set(WELL.x1, yBase + sh * s, WELL.z1);
    g.add(wed);
  }
  const hNE = sh * 13 + 0.35;
  g.add(box(1.4, hNE, 1.4, treadMat, 30.25, yBase + hNE / 2 - 0.35, 25.45));   // corner infill
  // C: 3 treads heading WEST across the north band, discharging into the hall
  for (let i = 0; i < 3; i++) {
    const xc = 27.53 - (i + 0.5) * 1.13;
    const yT = tread(1.13, 2.9, xc, 24.05);
    picket(xc, yT, 22.05);
  }
  return g;
}

// guard rails at each floor: balustrade overlooking the open well from the hall;
// topFloor also fences the whole shaft rim (no flight continues upward).
export function stairGuard(yFloor, railMat, panelMat = null, topFloor = false) {
  const g = new THREE.Group();
  g.add(railing([WELL.x0, WELL.z0], [WELL.x0, WELL.z1], yFloor, 3, railMat, panelMat));
  if (topFloor) {
    g.add(railing([WELL.x0, 13.8], [WELL.x0, WELL.z0], yFloor, 3, railMat, panelMat));
    g.add(railing([WELL.x0, WELL.z1], [WELL.x0, 26.2], yFloor, 3, railMat, panelMat));
    g.add(railing([WELL.x0, 13.8], [31, 13.8], yFloor, 3, railMat, panelMat));
    g.add(railing([WELL.x0, 26.2], [31, 26.2], yFloor, 3, railMat, panelMat));
  }
  return g;
}

// staggered glass pendant orbs dropping through the open well
export function voidOrbs(glassMat, glowMat, steelMat) {
  const g = new THREE.Group();
  const drops = [[9.5, 25.6, 18.1], [14.5, 26.9, 19.9], [20, 25.9, 20.6], [25.5, 27.2, 17.6], [31, 26.3, 19.2]];
  for (const [y, x, z] of drops) {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 40.5 - y, 4), steelMat);
    cord.position.set(x, y + (40.5 - y) / 2, z);
    g.add(cord);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), glassMat);
    orb.position.set(x, y, z);
    g.add(orb);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), glowMat);
    core.position.set(x, y, z);
    g.add(core);
  }
  return g;
}

// ---------------- SPIRAL STAIR ----------------
export function spiralStair(cx, cz, yBase, yTop, r, treadMat, poleMat) {
  const g = new THREE.Group();
  const rise = yTop - yBase;
  const risers = Math.max(10, Math.round(rise / 0.75));
  const anglePer = (Math.PI * 2 * (rise / 10)) / risers; // ~full turn per 10ft
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, rise + 3, 12), poleMat);
  pole.position.set(cx, yBase + (rise + 3) / 2, cz);
  g.add(pole);
  for (let i = 0; i < risers; i++) {
    const a = i * anglePer;
    const tread = new THREE.Mesh(new THREE.BoxGeometry(r, 0.15, 0.85), treadMat);
    tread.castShadow = true;
    tread.position.set(cx + Math.cos(a) * r / 2, yBase + (i + 1) * (rise / risers), cz + Math.sin(a) * r / 2);
    tread.rotation.y = -a;
    g.add(tread);
  }
  // helical outer rail approximated with vertical pickets
  for (let i = 0; i < risers; i += 2) {
    const a = i * anglePer;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 6), poleMat);
    p.position.set(cx + Math.cos(a) * (r - 0.15), yBase + (i + 1) * (rise / risers) + 1.5, cz + Math.sin(a) * (r - 0.15));
    g.add(p);
  }
  return g;
}

// ---------------- RAILINGS / PARAPETS ----------------
export function railing(a, b, yBase, h, postMat, panelMat) {
  const g = new THREE.Group();
  const dir = new THREE.Vector2(b[0] - a[0], b[1] - a[1]);
  const len = dir.length();
  const u = dir.clone().normalize();
  const nPosts = Math.max(2, Math.round(len / (panelMat ? 4 : 0.6)) + 1);
  for (let i = 0; i < nPosts; i++) {
    const t = (i / (nPosts - 1)) * len;
    const thick = panelMat ? 0.15 : 0.07;
    const p = box(thick, h, thick, postMat, a[0] + u.x * t, yBase + h / 2, a[1] + u.y * t);
    g.add(p);
  }
  const top = box(len, 0.12, 0.2, postMat, a[0] + u.x * len / 2, yBase + h, a[1] + u.y * len / 2);
  top.rotation.y = -Math.atan2(u.y, u.x);
  g.add(top);
  if (panelMat) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(len - 0.2, h - 0.5, 0.06), panelMat);
    panel.position.set(a[0] + u.x * len / 2, yBase + h / 2, a[1] + u.y * len / 2);
    panel.rotation.y = -Math.atan2(u.y, u.x);
    panel.castShadow = false;
    g.add(panel);
  }
  return g;
}

// ---------------- LABELS ----------------
export function label(text, x, y, z, scale = 1) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const fs = 44;
  ctx.font = `500 ${fs}px Fraunces, Georgia, serif`;
  const w = Math.ceil(ctx.measureText(text).width) + 44;
  c.width = w; c.height = 76;
  const ctx2 = c.getContext('2d');
  ctx2.fillStyle = 'rgba(35,33,29,0.78)';
  ctx2.beginPath();
  ctx2.roundRect(0, 6, w, 64, 14);
  ctx2.fill();
  ctx2.font = `500 ${fs}px Fraunces, Georgia, serif`;
  ctx2.fillStyle = '#F2EFE9';
  ctx2.textBaseline = 'middle';
  ctx2.fillText(text, 22, 40);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  const s = 0.02 * scale;
  sp.scale.set(w * s, 76 * s, 1);
  sp.position.set(x, y, z);
  sp.renderOrder = 999;
  return sp;
}
