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
// A curved winder entry feeds one straight flight to the next floor. Each storey
// restarts with another curved section; there is no parallel return flight.
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

function curvedRail(points, mat) {
  if (points.length < 2) return null;
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, Math.max(16, points.length * 5), 0.12, 8, false),
    mat,
  );
  mesh.castShadow = true;
  return mesh;
}

function traditionalRailing(a, b, yBase, h, railMat, balusterMat) {
  const g = new THREE.Group();
  const dir = new THREE.Vector2(b[0] - a[0], b[1] - a[1]);
  const len = dir.length();
  const u = dir.clone().normalize();
  const position = t => [a[0] + u.x * t, a[1] + u.y * t];
  const newel = (x, z) => {
    g.add(box(0.44, h + 0.22, 0.44, balusterMat, x, yBase + (h + 0.22) / 2, z));
    g.add(box(0.62, 0.16, 0.62, balusterMat, x, yBase + 0.12, z, false));
    g.add(box(0.62, 0.16, 0.62, balusterMat, x, yBase + h + 0.24, z, false));
  };
  const [ax, az] = position(0);
  const [bx, bz] = position(len);
  newel(ax, az);
  newel(bx, bz);
  const spaces = Math.max(2, Math.ceil(len / 0.52));
  for (let i = 1; i < spaces; i++) {
    const [x, z] = position((i / spaces) * len);
    g.add(box(0.1, h - 0.2, 0.1, balusterMat, x, yBase + (h - 0.2) / 2, z, false));
  }
  const top = box(len + 0.26, 0.18, 0.28, railMat,
    (a[0] + b[0]) / 2, yBase + h + 0.12, (a[1] + b[1]) / 2);
  top.rotation.y = -Math.atan2(dir.y, dir.x);
  g.add(top);
  return g;
}

export function traditionalGuard(a, b, yBase, h, railMat, balusterMat) {
  return traditionalRailing(a, b, yBase, h, railMat, balusterMat);
}

// Four curved winders feed one straight flight. The real stair is traditional:
// white closed risers/stringers and balusters with espresso tread caps and rail.
export function mainStair(yBase, rise, treadMat, railMat, trimMat = treadMat) {
  const g = new THREE.Group();
  const S = CORE.stair;
  const n = S.treads.total, sh = rise / n;
  const cap = 0.14;
  let s = 0;

  const addPicket = (points, x, yTop, z, railY = yTop + cap + 3.08) => {
    const base = yTop + cap;
    const balusterHeight = railY - base;
    g.add(box(0.1, balusterHeight, 0.1, trimMat, x, base + balusterHeight / 2, z, false));
    g.add(box(0.2, 0.1, 0.2, trimMat, x, base + 0.18, z, false));
    const point = new THREE.Vector3(x, railY, z);
    points.push(point);
    return point;
  };
  const addNewel = (x, yTop, z) => {
    const base = yTop + cap;
    g.add(box(0.42, 3.42, 0.42, trimMat, x, base + 1.71, z));
    g.add(box(0.62, 0.16, 0.62, trimMat, x, base + 0.12, z, false));
    g.add(box(0.62, 0.16, 0.62, trimMat, x, base + 3.48, z, false));
  };
  const addRail = (points, firstTreadTop, lastTreadTop) => {
    const rail = curvedRail(points, railMat);
    if (rail) g.add(rail);
    if (points.length) {
      const first = points[0], last = points[points.length - 1];
      addNewel(first.x, firstTreadTop, first.z);
      addNewel(last.x, lastTreadTop, last.z);
    }
  };
  const tread = (w, d, x, z, yStep = ++s) => {
    const yTop = yBase + sh * yStep;
    const h = sh * yStep + 0.35;
    g.add(box(w, h, d, trimMat, x, yBase + h / 2 - 0.35, z));
    g.add(box(w + 0.16, cap, d + 0.18, treadMat, x, yTop + cap / 2, z));
    return yTop;
  };

  // Curved quarter-turn entry and its closely spaced painted balusters.
  const winderRail = [];
  for (let i = 0; i < S.treads.winders; i++) {
    s++;
    const yTop = yBase + sh * s;
    const h = sh * s + 0.35;
    const da = (Math.PI / 2) / S.treads.winders;
    const a0 = -Math.PI / 2 + i * da;
    const body = wedge(S.curveInnerRadius, S.curveOuterRadius, a0, a0 + da, h, trimMat);
    body.position.set(S.curveCenter[0], yTop, S.curveCenter[1]);
    g.add(body);
    const treadCap = wedge(
      S.curveInnerRadius - 0.04, S.curveOuterRadius + 0.12,
      a0 - 0.012, a0 + da + 0.012, cap, treadMat,
    );
    treadCap.position.set(S.curveCenter[0], yTop + cap, S.curveCenter[1]);
    g.add(treadCap);
    for (const fraction of [0.28, 0.72]) {
      const a = a0 + da * fraction;
      addPicket(
        winderRail,
        S.curveCenter[0] + Math.cos(a) * (S.curveOuterRadius - 0.13),
        yTop,
        S.curveCenter[1] + Math.sin(a) * (S.curveOuterRadius - 0.13),
        yBase + sh * (s - 1 + fraction) + cap + 3.08,
      );
    }
  }
  addRail(winderRail, yBase + sh, yBase + sh * S.treads.winders);

  // One continuous straight flight rises from the curved entry to floor level.
  const outboundRail = [];
  const straightTreads = n - S.treads.winders;
  const straightEnd = S.north - 1.35;
  const outDepth = (straightEnd - S.outbound.z0) / straightTreads;
  for (let i = 0; i < straightTreads; i++) {
    const zc = S.outbound.z0 + (i + 0.5) * outDepth;
    const yTop = tread(
      S.outbound.x1 - S.outbound.x0, outDepth,
      (S.outbound.x0 + S.outbound.x1) / 2, zc,
    );
    addPicket(outboundRail, S.outbound.x0 + 0.1, yTop, zc);
  }
  addRail(
    outboundRail,
    yBase + sh * (S.treads.winders + 1),
    yBase + rise,
  );

  // A compact floor-level landing replaces the former U-turn and return flight.
  const landingTop = yBase + rise;
  g.add(box(
    S.outbound.x1 - S.outbound.x0, 0.6, S.north - straightEnd, trimMat,
    (S.outbound.x0 + S.outbound.x1) / 2, landingTop - 0.3,
    (straightEnd + S.north) / 2,
  ));
  g.add(box(
    S.outbound.x1 - S.outbound.x0 + 0.12, cap,
    S.north - straightEnd + 0.12, treadMat,
    (S.outbound.x0 + S.outbound.x1) / 2, landingTop + cap / 2,
    (straightEnd + S.north) / 2,
  ));
  g.add(traditionalRailing(
    [S.outbound.x0 + 0.12, S.north - 0.12],
    [S.outbound.x1 - 0.12, S.north - 0.12],
    landingTop + cap, 3, railMat, trimMat,
  ));

  const topFloor = yBase + rise;
  g.userData.stair = {
    yBase, rise, risers: n, landingTop, topFloor,
    style: 'traditional-curved-to-single-flight',
  };
  return g;
}

// Traditional painted balustrades overlook the open well at each floor.
export function stairGuard(
  yFloor,
  railMat,
  panelMat = null,
  topFloor = false,
  balusterMat = railMat,
) {
  const g = new THREE.Group();
  const guard = (a, b) => panelMat
    ? railing(a, b, yFloor, 3, railMat, panelMat)
    : traditionalRailing(a, b, yFloor, 3, railMat, balusterMat);
  g.add(guard([WELL.x0, WELL.z0], [WELL.x0, WELL.z1]));
  g.add(guard([WELL.x0, WELL.z1], [WELL.x1, WELL.z1]));
  if (topFloor) {
    const S = CORE.stair;
    // Penthouse arrival stays open where the single flight meets the north edge.
    g.add(guard([S.west, S.south], [S.west, S.north]));
    g.add(guard([S.west, S.north], [S.outbound.x0, S.north]));
    g.add(guard([S.east, S.north], [S.east, S.south]));
    g.add(guard([S.east, S.south], [S.west, S.south]));
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
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, rise + 4, 12), poleMat);
  pole.position.set(cx, yBase + (rise + 4) / 2, cz);
  g.add(pole);
  const railPoints = [];
  for (let i = 0; i < risers; i++) {
    const a = i * anglePer;
    const y = yBase + (i + 1) * (rise / risers);
    const tread = wedge(0.2, r, a, a + anglePer * 0.92, 0.16, treadMat);
    tread.position.set(cx, y + 0.16, cz);
    g.add(tread);

    const railA = a + anglePer * 0.82;
    const px = cx + Math.cos(railA) * (r - 0.12);
    const pz = cz + Math.sin(railA) * (r - 0.12);
    const nextY = yBase + Math.min(risers, i + 2) * (rise / risers);
    const railY = nextY + 3.05;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, railY - y, 7), poleMat);
    p.position.set(px, y + (railY - y) / 2, pz);
    p.castShadow = true;
    g.add(p);
    railPoints.push(new THREE.Vector3(px, railY, pz));
  }
  const rail = curvedRail(railPoints, poleMat);
  if (rail) g.add(rail);
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
