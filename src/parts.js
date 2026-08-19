import * as THREE from 'three';
import { CORE } from '../data/blueprint.js';

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

// ---------------- MAIN STAIR ----------------
// The plan is not a spiral: a quarter-turn winder entry feeds a straight outbound
// flight, a square landing, and a straight return flight around an open well.
export const WELL = CORE.well;

// full rectangular shaft opening (flights + well live inside it)
export function stairHole() {
  return CORE.stairHole.map(([x, z]) => [x, z]);
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

// 4 quarter-turn winders -> 7 northbound treads -> landing -> 7 southbound
// treads. Eighteen equal rises keeps all three floor-to-floor runs coherent.
export function mainStair(yBase, rise, treadMat, railMat) {
  const g = new THREE.Group();
  const S = CORE.stair;
  const n = S.treads.total, sh = rise / n;
  let s = 0;
  const tread = (w, d, x, z, yStep = ++s) => {
    const h = sh * yStep + 0.35;
    g.add(box(w, h, d, treadMat, x, yBase + h / 2 - 0.35, z));
    return yBase + sh * yStep;
  };
  const picket = (x, yTop, z) => {
    g.add(box(0.08, 3, 0.08, railMat, x, yTop + 1.5, z, false));
    g.add(box(0.24, 0.12, 0.24, railMat, x, yTop + 3, z, false));
  };

  // Curved quarter-turn entry in the south bay, rising west-to-east into run A.
  for (let i = 0; i < S.treads.winders; i++) {
    s++;
    const h = sh * s + 0.35;
    const da = (Math.PI / 2) / S.treads.winders;
    const a0 = -Math.PI / 2 + i * da;
    const wed = wedge(S.curveInnerRadius, S.curveOuterRadius, a0, a0 + da, h, treadMat);
    wed.position.set(S.curveCenter[0], yBase + sh * s, S.curveCenter[1]);
    g.add(wed);
    const a = a0 + da / 2;
    picket(
      S.curveCenter[0] + Math.cos(a) * (S.curveOuterRadius - 0.15),
      yBase + sh * s,
      S.curveCenter[1] + Math.sin(a) * (S.curveOuterRadius - 0.15),
    );
  }

  // Straight outbound flight along the east side of the well.
  const outDepth = (S.outbound.z1 - S.outbound.z0) / S.treads.outbound;
  for (let i = 0; i < S.treads.outbound; i++) {
    const zc = S.outbound.z0 + (i + 0.5) * outDepth;
    const yT = tread(S.outbound.x1 - S.outbound.x0, outDepth,
      (S.outbound.x0 + S.outbound.x1) / 2, zc);
    picket(S.outbound.x0 + 0.08, yT, zc);
  }

  // Full-width square landing turns 180 degrees into the return flight.
  const landingTop = yBase + sh * s;
  g.add(box(
    S.landing.x1 - S.landing.x0, 0.6, S.landing.z1 - S.landing.z0, treadMat,
    (S.landing.x0 + S.landing.x1) / 2, landingTop - 0.3,
    (S.landing.z0 + S.landing.z1) / 2,
  ));

  // Rectilinear return flight runs south on the west side and terminates at floor.
  const returnDepth = (S.return.z1 - S.return.z0) / S.treads.return;
  for (let i = 0; i < S.treads.return; i++) {
    const zc = S.return.z1 - (i + 0.5) * returnDepth;
    const yT = tread(S.return.x1 - S.return.x0, returnDepth,
      (S.return.x0 + S.return.x1) / 2, zc);
    picket(S.return.x1 - 0.08, yT, zc);
  }
  const topFloor = yBase + rise;
  g.add(box(
    S.terminalLanding.x1 - S.terminalLanding.x0, 0.6,
    S.terminalLanding.z1 - S.terminalLanding.z0, treadMat,
    (S.terminalLanding.x0 + S.terminalLanding.x1) / 2, topFloor - 0.3,
    (S.terminalLanding.z0 + S.terminalLanding.z1) / 2,
  ));
  g.userData.stair = { yBase, rise, risers: n, landingTop, topFloor };
  return g;
}

// guard rails at each floor: balustrade overlooking the open well from the hall;
// topFloor also fences the whole shaft rim (no flight continues upward).
export function stairGuard(yFloor, railMat, panelMat = null, topFloor = false) {
  const g = new THREE.Group();
  g.add(railing([WELL.x0, WELL.z0], [WELL.x0, WELL.z1], yFloor, 3, railMat, panelMat));
  g.add(railing([WELL.x0, WELL.z1], [WELL.x1, WELL.z1], yFloor, 3, railMat, panelMat));
  if (topFloor) {
    const S = CORE.stair;
    // Penthouse arrival stays open across the return-flight landing at south-west.
    g.add(railing([S.west, S.terminalLanding.z1], [S.west, S.north], yFloor, 3, railMat, panelMat));
    g.add(railing([S.west, S.north], [S.east, S.north], yFloor, 3, railMat, panelMat));
    g.add(railing([S.east, S.north], [S.east, S.south], yFloor, 3, railMat, panelMat));
    g.add(railing([S.east, S.south], [S.west, S.south], yFloor, 3, railMat, panelMat));
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
  g.userData.spiral = { cx, cz, yBase, yTop, radius: r, risers };
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
