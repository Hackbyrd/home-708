import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { box, slab, rect } from './parts.js';
import { surfaceUVs } from './surfaces.js';
import { branchBetween, foliage, leafGeometry } from './botanical.js';

// Parametric furniture at true dimensions (feet). Each returns a Group centered
// at its footprint center, sitting on y=0; caller positions/rotates.

// Small eased edges catch highlights on casework without changing its footprint.
const rr = (w, h, d, mat, x = 0, y = 0, z = 0) => {
  if (Math.min(w, h, d) < 0.09) return box(w, h, d, mat, x, y, z);
  const geometry = new RoundedBoxGeometry(w, h, d, 1, Math.min(0.035, w / 8, h / 8, d / 8));
  const m = new THREE.Mesh(surfaceUVs(geometry, mat), mat);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  return m;
};

function welt(w, d, y, radius, mat) {
  const points = [];
  for (let corner = 0; corner < 4; corner++) {
    const sx = corner === 0 || corner === 3 ? 1 : -1;
    const sz = corner < 2 ? 1 : -1;
    const cx = sx * (w / 2 - radius), cz = sz * (d / 2 - radius);
    for (let i = 0; i <= 5; i++) {
      const angle = corner * Math.PI / 2 + i / 5 * Math.PI / 2;
      points.push(new THREE.Vector3(cx + Math.cos(angle) * radius, y, cz + Math.sin(angle) * radius));
    }
  }
  const curve = new THREE.CatmullRomCurve3(points, true);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.012, 4, true), mat);
  mesh.receiveShadow = true;
  return mesh;
}

// Factories that previously returned an elevated Mesh must retain that root
// origin. Saved editor y offsets are relative to it, not the visible floor.
function keepOrigin(group, y) {
  group.position.y = y;
  for (const child of group.children) child.position.y -= y;
  return group;
}

// soft (rounded) box for upholstery
function soft(w, h, d, mat, x = 0, y = 0, z = 0, r = 0.22) {
  const radius = Math.min(r, w / 2.2, h / 2.2, d / 2.2);
  const m = new THREE.Mesh(surfaceUVs(new RoundedBoxGeometry(w, h, d, 3, radius), mat), mat);
  if (h < 0.8 && w > 0.8 && d > 0.8) m.add(welt(w - 0.045, d - 0.045, h / 2 - radius * 0.65, radius, mat));
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// abstract art canvas (original generated artwork)
function artTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const palettes = [
    ['#EDE7DA', '#B08D57', '#2E3230', '#9c6b52'],
    ['#DDD6C9', '#5C4433', '#C9AE8C', '#3a3f3c'],
    ['#F2EFE9', '#4A4E57', '#A97B4F', '#23211D'],
  ];
  const p = palettes[Math.floor(Math.random() * palettes.length)];
  ctx.fillStyle = p[0]; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = p[1 + Math.floor(Math.random() * 3)];
    ctx.globalAlpha = 0.55 + Math.random() * 0.4;
    ctx.beginPath();
    if (Math.random() < 0.5) {
      ctx.ellipse(60 + Math.random() * 140, 60 + Math.random() * 140, 20 + Math.random() * 70, 15 + Math.random() * 55, Math.random() * 3, 0, 7);
    } else {
      const x = Math.random() * 180, y = Math.random() * 180;
      ctx.rect(x, y, 20 + Math.random() * 90, 8 + Math.random() * 60);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeFurnitureKit(M) {
  const K = {};
  const leaves = leafGeometry();

  K.rug = (w, d, mat = M.greige) => {
    const g = new THREE.Group();
    g.position.y=.085;
    const m = rr(w, 0.06, d, mat, 0, 0.03, 0);
    m.castShadow = false;
    g.add(m);
    // A bound perimeter and fine fringe make rugs read separately from flooring.
    for (const x of [-w / 2 + 0.055, w / 2 - 0.055])
      g.add(rr(0.08, 0.014, d - 0.05, mat, x, 0.068, 0));
    for (const z of [-d / 2 + 0.055, d / 2 - 0.055])
      g.add(rr(w - 0.05, 0.014, 0.08, mat, 0, 0.068, z));
    return g;
  };

  K.sofa = (w = 10, d = 3.5, mat = M.linenCream) => {
    const g = new THREE.Group();
    g.add(soft(w, 1.0, d, mat, 0, 0.5, 0, 0.28));                       // base
    const inner = w - 1.5, nC = Math.max(2, Math.round(inner / 2.6));
    for (let i = 0; i < nC; i++) {                                       // seat cushions
      const cw = inner / nC - 0.08;
      const cx = -inner / 2 + (i + 0.5) * (inner / nC);
      g.add(soft(cw, 0.55, d - 0.9, mat, cx, 1.22, 0.12, 0.24));
      const bp = soft(cw, 1.35, 0.55, mat, cx, 1.95, -d / 2 + 0.42, 0.26);  // back pillows
      bp.rotation.x = -0.12;
      g.add(bp);
    }
    g.add(soft(0.85, 1.8, d, mat, -w / 2 + 0.42, 1.05, 0, 0.3));         // arms
    g.add(soft(0.85, 1.8, d, mat, w / 2 - 0.42, 1.05, 0, 0.3));
    for (const x of [-w / 2 + 0.8, w / 2 - 0.8]) {
      for (const z of [-d / 2 + 0.5, d / 2 - 0.5])
        g.add(rr(0.18, 0.22, 0.18, M.walnut, x, 0.12, z));
      const pillow = soft(0.85, 0.95, 0.32, M.greige, x * 0.83, 1.85, -d / 2 + 0.95, 0.15);
      pillow.rotation.set(-0.18, 0, Math.sign(x) * 0.16); g.add(pillow);
    }
    return g;
  };

  K.sectionalL = (w = 12, d = 9, seatD = 3.4, mat = M.velvetChar) => {
    const g = new THREE.Group();
    g.add(K.sofa(w, seatD, mat));                               // main run, back at -z
    const ch = K.sofa(d - seatD + 1.5, seatD, mat);             // return
    ch.rotation.y = Math.PI / 2;
    ch.position.set(-w / 2 + seatD / 2, 0, (d - seatD + 1.5) / 2 - seatD / 2 + 1);
    g.add(ch);
    return g;
  };

  K.chair = (mat = M.leatherCamel, w = 2.6) => {
    const g = new THREE.Group();
    g.add(soft(w, 1.05, 2.6, mat, 0, 0.55, 0, 0.26));
    g.add(soft(w - 0.5, 0.45, 2.0, mat, 0, 1.25, 0.15, 0.2));
    g.add(soft(w, 1.5, 0.65, mat, 0, 1.75, -1, 0.26));
    g.add(soft(0.4, 1.3, 2.4, mat, -w / 2 + 0.2, 1.0, 0, 0.18));
    g.add(soft(0.4, 1.3, 2.4, mat, w / 2 - 0.2, 1.0, 0, 0.18));
    return g;
  };

  K.swivel = (mat = M.leatherCamel) => {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 1.3, 20), mat);
    seat.position.y = 0.85; seat.castShadow = true;
    g.add(seat);
    const back = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1.5, 20, 1, false, Math.PI * 0.75, Math.PI * 0.9), mat);
    back.position.y = 2.0; back.castShadow = true;
    g.add(back);
    return g;
  };

  K.diningChair = (mat = M.linenCream) => {
    const g = new THREE.Group();
    g.add(soft(1.6, 0.35, 1.6, mat, 0, 1.5, 0, 0.14));
    const back = soft(1.6, 2.2, 0.3, mat, 0, 2.5, -0.72, 0.15);
    back.rotation.x = 0.08;
    g.add(back);
    for (const [lx, lz] of [[-0.62, -0.62], [0.62, -0.62], [-0.62, 0.62], [0.62, 0.62]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 1.4, 8), M.walnut);
      leg.position.set(lx, 0.7, lz);
      leg.castShadow = true;
      g.add(leg);
    }
    return g;
  };

  K.table = (w = 9, d = 3.5, h = 2.5, mat = M.walnut) => {
    const g = new THREE.Group();
    g.add(rr(w, 0.22, d, mat, 0, h, 0));
    g.add(rr(0.5, h, 0.5, mat, -w / 2 + 0.6, h / 2, -d / 2 + 0.6));
    g.add(rr(0.5, h, 0.5, mat, w / 2 - 0.6, h / 2, -d / 2 + 0.6));
    g.add(rr(0.5, h, 0.5, mat, -w / 2 + 0.6, h / 2, d / 2 - 0.6));
    g.add(rr(0.5, h, 0.5, mat, w / 2 - 0.6, h / 2, d / 2 - 0.6));
    return g;
  };

  K.roundTable = (r = 2, h = 2.5, mat = M.oakWood) => {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.2, 28), mat);
    top.position.y = h; top.castShadow = true;
    g.add(top);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.8, h, 16), mat);
    base.position.y = h / 2; base.castShadow = true;
    g.add(base);
    return g;
  };

  K.coffeeTable = (w = 4.5, d = 2.8, mat = M.brass) => {
    const g = new THREE.Group();
    g.add(rr(w, 0.15, d, mat, 0, 1.35, 0));
    g.add(rr(0.15, 1.3, 0.15, mat, -w / 2 + 0.3, 0.65, -d / 2 + 0.3));
    g.add(rr(0.15, 1.3, 0.15, mat, w / 2 - 0.3, 0.65, -d / 2 + 0.3));
    g.add(rr(0.15, 1.3, 0.15, mat, -w / 2 + 0.3, 0.65, d / 2 - 0.3));
    g.add(rr(0.15, 1.3, 0.15, mat, w / 2 - 0.3, 0.65, d / 2 - 0.3));
    return g;
  };

  K.bed = (w = 6.33, len = 7.2, head = M.slat, lin = M.linenCream) => {
    const g = new THREE.Group();
    g.add(rr(w + 0.4, 0.9, len, M.oakWood, 0, 0.45, 0));                   // platform
    g.add(soft(w, 0.75, len - 0.5, M.white, 0, 1.25, 0, 0.2));             // mattress
    const duvet = soft(w + 0.25, 0.55, len - 2.2, lin, 0, 1.62, 0.95, 0.24); // duvet
    g.add(duvet);
    g.add(soft(w + 0.25, 0.28, 1.1, lin, 0, 1.55, len / 2 - 1.1, 0.13));   // folded end
    const n = w > 5.5 ? 2 : 2;
    for (let i = 0; i < n; i++) {                                           // sleeping pillows
      const px = (i - (n - 1) / 2) * (w / n) * 0.92;
      const p = soft(w / n - 0.5, 0.55, 1.35, M.white, px, 1.85, -len / 2 + 1.0, 0.24);
      p.rotation.x = -0.28;
      g.add(p);
    }
    const ap = soft(w * 0.42, 0.5, 1.0, M.greige, 0, 1.95, -len / 2 + 1.7, 0.22); // accent
    ap.rotation.x = -0.25;
    g.add(ap);
    g.add(rr(w + 0.6, 3.8, 0.3, head, 0, 1.9, -len / 2 - 0.15));           // headboard
    return g;
  };

  K.nightstand = (mat = M.walnut) => {
    const g = new THREE.Group();
    g.add(rr(2,1.85,1.65,mat,0,1.27,0));
    for(const y of [.77,1.35,1.91]){
      g.add(rr(1.85,.48,.045,mat,0,y,.85));
      g.add(rr(.4,.045,.09,M.brass,0,y,.91));
    }
    for(const x of [-.78,.78])for(const z of [-.61,.61])g.add(rr(.1,.37,.1,mat,x,.19,z));
    return keepOrigin(g,1.7);
  };

  K.dresser = (w = 6, mat = M.walnut) => {
    const g = new THREE.Group();
    g.add(rr(w, 2.6, 1.7, mat, 0, 1.3, 0));
    for (const x of [-w / 4, w / 4]) for (let row = 0; row < 3; row++) {
      const y = 0.47 + row * 0.79;
      g.add(rr(w / 2 - 0.09, 0.72, 0.06, mat, x, y, 0.86));
      g.add(rr(0.65, 0.055, 0.07, M.brass, x, y + 0.1, 0.93));
    }
    return keepOrigin(g, 1.3);
  };

  K.bench = (w = 5, mat = M.shearling) => {
    const g = new THREE.Group();
    g.add(soft(w, 0.48, 1.6, mat, 0, 1.26, 0, 0.16));
    for (const x of [-w / 2 + 0.4, w / 2 - 0.4])
      g.add(rr(0.16, 1.04, 1.25, M.walnut, x, 0.52, 0));
    return keepOrigin(g, 0.75);
  };

  K.desk = (w = 6, mat = M.walnut) => {
    const g = new THREE.Group();
    g.add(rr(w, 0.2, 3, mat, 0, 2.45, 0));
    g.add(rr(0.3, 2.4, 2.8, mat, -w / 2 + 0.3, 1.2, 0));
    g.add(rr(0.3, 2.4, 2.8, mat, w / 2 - 0.3, 1.2, 0));
    g.add(rr(1.4, 0.9, 0.1, M.matBlack, 0, 3.2, -0.9));  // monitor
    return g;
  };

  K.officeChair = () => {
    const g = new THREE.Group();
    g.add(rr(1.6, 0.3, 1.6, M.matBlack, 0, 1.5, 0));
    g.add(rr(1.5, 1.8, 0.3, M.matBlack, 0, 2.6, -0.7));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8), M.blackSteel)).children;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8), M.blackSteel);
    post.position.y = 0.75; g.add(post);
    return g;
  };

  // millwork
  K.cabinetRun = (len, h = 3, depth = 2.1, mat = M.iron, counter = M.quartzite) => {
    const g = new THREE.Group();
    g.add(rr(len, h - 0.35, depth, mat, 0, (h - 0.35) / 2 + 0.35, 0));
    g.add(rr(len - 0.3, 0.35, depth - 0.25, M.matBlack, 0, 0.175, -0.12));   // toe kick
    const nDoors = Math.max(1, Math.round(len / 1.6));
    for (let i = 1; i < nDoors; i++) {                                        // shaker seams
      g.add(rr(0.035, h - 0.55, 0.03, M.matBlack, -len / 2 + i * (len / nDoors), h / 2 + 0.1, depth / 2));
    }
    for (let i = 0; i < nDoors; i++) {
      const px = -len / 2 + (i + 0.5) * (len / nDoors);
      const dw = len / nDoors - 0.07, dh = h - 0.58, face = depth / 2 + 0.025;
      // Recessed shaker panel, raised rails and stiles, with visible reveals.
      for (const dx of [-dw / 2 + 0.075, dw / 2 - 0.075])
        g.add(rr(0.15, dh, 0.07, mat, px + dx, h / 2 + 0.12, face));
      for (const dy of [-dh / 2 + 0.075, dh / 2 - 0.075])
        g.add(rr(dw - 0.3, 0.15, 0.07, mat, px, h / 2 + 0.12 + dy, face));
      g.add(rr(0.5, 0.07, 0.07, M.brass, px, h - 0.6, depth / 2 + 0.06));
    }
    if (counter) g.add(rr(len + 0.15, 0.18, depth + 0.15, counter, 0, h + 0.09, 0));
    return g;
  };

  K.upperRun = (len, mat = M.wall) => {
    const g = new THREE.Group();
    g.add(rr(len, 2.6, 1.15, mat, 0, 1.3, 0));
    const n = Math.max(1, Math.round(len / 1.6)), w = len / n;
    for (let i = 0; i < n; i++) {
      const x = -len / 2 + (i + 0.5) * w;
      for (const dx of [-(w - 0.08) / 2 + 0.075, (w - 0.08) / 2 - 0.075])
        g.add(rr(0.15, 2.5, 0.065, mat, x + dx, 1.3, 0.59));
      for (const y of [0.13, 2.47]) g.add(rr(w - 0.38, 0.15, 0.065, mat, x, y, 0.59));
      g.add(rr(0.055, 0.42, 0.08, M.brass, x + w / 2 - 0.25, 0.5, 0.66));
    }
    return keepOrigin(g, 1.3);
  };

  K.island = (w = 7.5, d = 3.8, baseMat = M.cabinetGray, counterMat = M.quartzite) => {
    const g = new THREE.Group();
    g.add(rr(w-.35,2.85,d-.5,baseMat,0,1.425,0));
    // A real opening in the waterfall worktop reveals the stainless sink.
    g.add(slab(rect(-w/2-.3,-d/2-.1,w/2+.3,d/2+.55),[rect(-1.25,-1.2,1.25,.5)],.16,3.2,counterMat));
    for(const x of [-w/2,w/2])g.add(rr(.16,3.2,d+.65,counterMat,x,1.6,.22));
    g.add(rr(2.5,.06,1.7,M.blackSteel,0,2.56,-.35));
    for(const x of [-1.24,1.24])g.add(rr(.035,.6,1.7,M.blackSteel,x,2.85,-.35));
    for(const z of [-1.18,.48])g.add(rr(2.5,.6,.035,M.blackSteel,0,2.85,z));
    g.add(rr(.04,.58,1.68,M.blackSteel,0,2.85,-.35));
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,3.2,-1.5),new THREE.Vector3(0,4.25,-1.5),new THREE.Vector3(0,4.45,-.9),new THREE.Vector3(0,4.05,-.7)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve,32,.045,10,false),M.blackSteel));
    for(let x=-w/2+.65;x<w/2;x+=1.35){
      g.add(rr(1.24,2.6,.055,baseMat,x,1.65,-d/2+.2));
      g.add(rr(.55,.045,.1,M.blackSteel,x,2.75,-d/2+.14));
    }
    return g;
  };

  K.stool = () => {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.4, 16), M.leatherCognac);
    seat.position.y = 2.2; seat.castShadow = true; g.add(seat);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 2.0, 12), M.blackSteel);
    leg.position.y = 1.0; g.add(leg);
    return g;
  };

  K.counterStool = (mat = M.sunYellow) => {
    const g = new THREE.Group();
    g.add(soft(1.45, 0.22, 1.45, mat, 0, 2.35, 0, 0.12));
    for (const [x, z] of [[-0.56, -0.56], [0.56, -0.56], [-0.56, 0.56], [0.56, 0.56]])
      g.add(rr(0.08, 2.3, 0.08, mat, x, 1.15, z));
    g.add(rr(1.2, 0.08, 0.08, mat, 0, 0.75, 0.56));
    return g;
  };

  K.hood = () => {
    const g=new THREE.Group();
    g.add(rr(4.5,.4,2.5,M.blackSteel,0,.2,0));
    const geometry=new THREE.CylinderGeometry(1,2,1.4,4,1,false,Math.PI/4);
    geometry.scale(1.05,1,.67);const canopy=new THREE.Mesh(geometry,M.blackSteel);canopy.position.y=1.05;g.add(canopy);
    g.add(rr(1.7,2.4,1.2,M.blackSteel,0,2.65,-.2));
    return g;
  };

  K.range = () => {
    const g = new THREE.Group();
    g.add(rr(4, 3.05, 2.3, M.blackSteel, 0, 1.52, 0));
    g.add(rr(3.6, 0.08, 1.9, M.matBlack, 0, 3.12, 0));
    g.add(rr(3.45, 1.55, 0.08, M.screenGlow, 0, 1.34, 1.17));
    g.add(rr(3.2, 0.1, 0.15, M.blackSteel, 0, 2.25, 1.28));
    for (const x of [-1.2, -0.4, 0.4, 1.2]) {
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16), M.brass);
      knob.rotation.x = Math.PI / 2; knob.position.set(x, 2.75, 1.2); g.add(knob);
    }
    for (const x of [-0.95, 0.95]) for (const z of [-0.52, 0.52]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 6, 20), M.blackSteel);
      ring.rotation.x = Math.PI / 2; ring.position.set(x, 3.2, z); g.add(ring);
      for (const angle of [0, Math.PI / 2]) {
        const grate = rr(0.85, 0.05, 0.07, M.blackSteel, x, 3.23, z);
        grate.rotation.y = angle; g.add(grate);
      }
    }
    return g;
  };

  K.builtinWall = (len, h, mat = M.iron, depth = 1.3) => {
    const g = new THREE.Group();
    g.add(rr(len, h, depth, mat, 0, h / 2, 0));
    // open bays
    for (let i = 0; i < Math.floor(len / 2.4); i++) {
      const bx = -len / 2 + 1.2 + i * 2.4;
      g.add(rr(1.9, h * 0.42, depth * 0.7, M.walnut, bx, h * 0.66, 0.12));
    }
    return g;
  };

  K.tv = (w = 6.2) => {
    const g = new THREE.Group();
    g.add(rr(w + 0.07, w * 0.5625 + 0.07, 0.13, M.matBlack, 0, 0, -0.01));
    g.add(rr(w, w * 0.5625, 0.15, M.screenGlow, 0, 0, 0));
    return g;
  };

  K.fireplaceInsert = (w = 4) => {
    const g = new THREE.Group();
    g.add(rr(w + 0.6, 1.6, 0.4, M.blackSteel, 0, 0.8, 0));
    g.add(rr(w, 1.0, 0.2, M.fire, 0, 0.75, 0.06));
    return g;
  };

  // bath
  K.tub = () => {
    const g = new THREE.Group();
    // Continuous double-wall ceramic shell: an actual open bowl, including rim.
    const profile = [[0, 0.16], [0.65, 0.16], [0.87, 0.25], [1.04, 0.7],
      [1.15, 1.58], [1.14, 1.75], [1.06, 1.8], [1.0, 1.72],
      [0.93, 0.83], [0.77, 0.38], [0.55, 0.3], [0, 0.3]];
    const shell = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 64), M.white);
    shell.scale.x = 2.12; shell.castShadow = shell.receiveShadow = true; g.add(shell);
    const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.015, 16), M.blackSteel);
    drain.position.set(1.15, 0.32, 0); g.add(drain);
    const tapCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.2, 0.05, -0.5), new THREE.Vector3(2.2, 1.8, -0.5),
      new THREE.Vector3(2.15, 2.05, -0.48), new THREE.Vector3(1.8, 2.05, -0.4),
      new THREE.Vector3(1.76, 1.94, -0.38),
    ]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(tapCurve, 24, 0.045, 8, false), M.brass));
    return g;
  };

  K.vanity = (w = 6, doubleSink = true, cabinetMat = M.oakWood, counterMat = M.quartzite) => {
    const g = new THREE.Group();
    g.add(rr(w, 1.7, 1.9, cabinetMat, 0, 1.55, 0));               // floating
    g.add(rr(w + 0.1, 0.15, 2, counterMat, 0, 2.48, 0));
    const n = doubleSink ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 0 : (i ? w / 4 : -w / 4);
      const basin = new THREE.Mesh(new THREE.LatheGeometry([
        new THREE.Vector2(0, 0), new THREE.Vector2(0.34, 0.025), new THREE.Vector2(0.57, 0.13),
        new THREE.Vector2(0.7, 0.28), new THREE.Vector2(0.68, 0.31),
        new THREE.Vector2(0.6, 0.27), new THREE.Vector2(0.45, 0.12), new THREE.Vector2(0, 0.06),
      ], 32), M.white);
      basin.scale.z = 0.78; basin.position.set(x, 2.54, 0); basin.castShadow = true; g.add(basin);
      g.add(rr(0.08, 0.9, 0.08, M.brass, x, 2.9, -0.7));
      g.add(rr(0.08, 0.08, 0.38, M.brass, x, 3.31, -0.54));
    }
    g.add(rr(w - 0.6, 2.6, 0.08, M.mirror, 0, 4.6, -0.9));
    return g;
  };

  K.shower = (w = 4, d = 4) => {
    const g = new THREE.Group();
    g.add(rr(w, 0.15, d, M.stoneFloor, 0, 0.08, 0));
    g.add(rr(0.06, 7, d, M.glass, -w / 2, 3.5, 0));
    g.add(rr(w, 7, 0.06, M.glass, 0, 3.5, d / 2));
    g.add(rr(0.7, 0.06, 0.7, M.brass, 0, 6.9, 0)); // rain head
    return g;
  };

  K.toilet = () => {
    const g = new THREE.Group();
    g.add(rr(1.3, 1.3, 2.2, M.white, 0, 0.65, 0));
    g.add(rr(1.2, 0.9, 0.5, M.white, 0, 1.75, -0.8));
    return g;
  };

  K.washerDryer = () => {
    const g = new THREE.Group();
    for (let i = 0; i < 2; i++) {
      g.add(rr(2.3, 3.1, 2.3, M.white, i * 2.5 - 1.25, 1.55, 0));
      const door = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.06, 20), M.matBlack);
      door.rotation.x = Math.PI / 2;
      door.position.set(i * 2.5 - 1.25, 1.7, 1.18);
      g.add(door);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.055, 8, 32), M.blackSteel);
      rim.position.copy(door.position); rim.position.z += 0.045; g.add(rim);
      const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 20), M.blackSteel);
      dial.rotation.x = Math.PI / 2; dial.position.set(i * 2.5 - 1.7, 2.82, 1.18); g.add(dial);
      g.add(rr(0.62, 0.18, 0.03, M.screenGlow, i * 2.5 - 0.95, 2.82, 1.18));
    }
    return g;
  };

  // lighting fixtures (emissive core registered for evening scene)
  K.pendant = (r = 0.55, dropTo = 6.5, ceilingY = 10, mat = M.brass, glowMats) => {
    const g = new THREE.Group();
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, ceilingY - dropTo, 6), M.blackSteel);
    cord.position.y = dropTo + (ceilingY - dropTo) / 2;
    g.add(cord);
    const profile=[[.05,.25],[r*.3,.24],[r*.42,.08],[r*.74,-.16],[r,-.32],[r,-.4],[r*.93,-.4],[r*.67,-.18],[r*.34,.15]].map(p=>new THREE.Vector2(...p));
    const sh = new THREE.Mesh(new THREE.LatheGeometry(profile,32), mat);
    sh.position.y = dropTo; sh.castShadow = true;
    g.add(sh);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 12, 10), M.warmGlow);
    glow.position.y = dropTo - r * 0.35;
    g.add(glow);
    if (glowMats) glowMats.push(M.warmGlow);
    return g;
  };

  K.linearChandelier = (len = 5, dropTo = 6, ceilingY = 10) => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, ceilingY - dropTo, 6), M.brass);
      cord.position.set(s * len / 2 * 0.8, dropTo + (ceilingY - dropTo) / 2, 0);
      g.add(cord);
    }
    g.add(rr(len, 0.18, 0.35, M.brass, 0, dropTo, 0));
    g.add(rr(len - 0.3, 0.1, 0.22, M.warmGlow, 0, dropTo - 0.1, 0));
    return g;
  };

  K.lantern = (size = 1.5, dropTo = 11, ceilingY = 20) => {
    const g = new THREE.Group();
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, ceilingY - dropTo, 6), M.blackSteel);
    cord.position.y = dropTo + (ceilingY - dropTo) / 2;
    g.add(cord);
    const frame=new THREE.Group(), half=size/2, h=size*1.3;
    for(const x of [-half,half])for(const z of [-half,half])frame.add(rr(.045,h,.045,M.blackSteel,x,0,z));
    for(const y of [-h/2,h/2]){
      for(const z of [-half,half])frame.add(rr(size,.045,.045,M.blackSteel,0,y,z));
      for(const x of [-half,half])frame.add(rr(.045,.045,size,M.blackSteel,x,y,0));
    }
    for(const z of [-half,half])frame.add(rr(size-.08,h-.08,.015,M.glass,0,0,z));
    frame.position.y=dropTo;g.add(frame);
    const core = new THREE.Mesh(new THREE.SphereGeometry(size * 0.32, 10, 8), M.warmGlow);
    core.position.y = dropTo;
    g.add(core);
    return g;
  };

  // gym
  K.rack = () => {
    const g = new THREE.Group();
    for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]])
      g.add(rr(0.25, 7.5, 0.25, M.blackSteel, x, 3.75, z));
    g.add(rr(4.2, 0.25, 0.25, M.blackSteel, 0, 7.4, -2));
    g.add(rr(4.2, 0.25, 0.25, M.blackSteel, 0, 7.4, 2));
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7.2, 8), M.blackSteel);
    bar.rotation.z = Math.PI / 2; bar.position.y = 4.5;
    g.add(bar);
    for (const s of [-1, 1]) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.2, 16), M.matBlack);
      plate.rotation.z = Math.PI / 2; plate.position.set(s * 3.2, 4.5, 0);
      g.add(plate);
    }
    return g;
  };

  K.rower = () => {
    const g = new THREE.Group();
    g.add(rr(7.5, 0.35, 0.7, M.blackSteel, 0, 0.7, 0));
    g.add(rr(1.1, 1.6, 1.1, M.matBlack, -3.2, 1.3, 0));
    return g;
  };

  K.mirrorPanel = (w = 6, h = 6.5) => rr(w, h, 0.08, M.mirror, 0, h / 2 + 1, 0);

  K.car = (color) => {
    const g = new THREE.Group();
    const body = rr(6.2, 1.6, 14.5, new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.6 }), 0, 1.5, 0);
    g.add(body);
    const cabin = rr(5.4, 1.3, 7, M.matBlack, 0, 2.9, -0.4);
    g.add(cabin);
    for (const [x, z] of [[-2.9, 4.6], [2.9, 4.6], [-2.9, -4.6], [2.9, -4.6]]) {
      const wm = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.7, 18), M.matBlack);
      wm.rotation.z = Math.PI / 2;
      wm.position.set(x, 1.05, z);
      g.add(wm);
    }
    return g;
  };

  K.plant = (h = 6) => {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.62, 1.6, 18), M.terracotta);
    pot.position.y = 0.8; pot.castShadow = true;
    g.add(pot);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.13, h - 3, 8), M.walnut);
    trunk.position.y = 1.5 + (h - 3) / 2;
    trunk.rotation.z = 0.05;
    g.add(trunk);
    const crowns = [];
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.39996, y = h - 2.1 + i * 0.23;
      const end = [Math.cos(angle) * 0.85, y, Math.sin(angle) * 0.85];
      g.add(branchBetween([0, Math.max(1.6, y - 0.7), 0], end, 0.035, M.walnut));
      crowns.push([...end, 0.58]);
    }
    g.add(foliage(leaves, M.green, crowns, 190, 928, 0.55));
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.73, 0.73, 0.04, 24), M.deepWalnut);
    soil.position.y = 1.57; g.add(soil);
    return g;
  };

  // drapery panel: sine-rippled fabric on a brass rod
  K.drape = (w = 1.8, h = 8.6, mat = M.linenCream) => {
    const g = new THREE.Group();
    const geo = new THREE.PlaneGeometry(w, h - 0.4, 32, 24);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const t=(pos.getY(i)+(h-.4)/2)/(h-.4);
      pos.setZ(i,Math.sin(pos.getX(i)*15)*(.075+(1-t)*.11)+Math.sin(t*4+pos.getX(i)*2)*.04);
      pos.setY(i,pos.getY(i)+Math.sin(pos.getX(i)*12)*.035*(1-t));
    }
    geo.computeVertexNormals();
    const panel = new THREE.Mesh(surfaceUVs(geo,mat), mat);
    panel.position.y = (h - 0.4) / 2 + 0.1;
    panel.castShadow = panel.receiveShadow = true;
    g.add(panel);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, w + 0.6, 8), M.brass);
    rod.rotation.z = Math.PI / 2;
    rod.position.y = h - 0.1;
    g.add(rod);
    return g;
  };

  // framed abstract artwork (generated, original)
  K.art = (w = 3, h = 3.8, frameMat = M.walnut) => {
    const g = new THREE.Group();
    g.add(rr(w + 0.25, h + 0.25, 0.12, frameMat, 0, h / 2, 0));
    const canvas = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: artTexture(), roughness: 0.9, side: THREE.DoubleSide }));
    canvas.position.set(0, h / 2, 0.08);
    g.add(canvas);
    return g;
  };

  // ---- catalog-only kinds ----
  K.floorLamp = () => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.1, 14), M.blackSteel);
    base.position.y = 0.05;
    g.add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.9, 8), M.brass);
    pole.position.y = 2.5;
    g.add(pole);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 0.9, 14, 1, true), M.linenCream);
    shade.position.y = 5.1;
    g.add(shade);
    g.add(rr(0.3, 0.25, 0.3, M.warmGlow, 0, 4.85, 0));
    return g;
  };
  K.tableLamp = () => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.9, 12), M.brass);
    base.position.y = 0.45;
    g.add(base);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.65, 12, 1, true), M.linenCream);
    shade.position.y = 1.15;
    g.add(shade);
    g.add(rr(0.2, 0.18, 0.2, M.warmGlow, 0, 1.0, 0));
    return g;
  };
  K.bookshelf = (w = 3.5, h = 7) => {
    const g = new THREE.Group();
    g.add(rr(w, h, 1.15, M.walnut, 0, h / 2, 0));
    const bookCols = [0x8a5a33, 0x4a5568, 0x9c6b52, 0x5e6f4f, 0xB08D57];
    for (let s = 0; s < 4; s++) {
      g.add(rr(w - 0.3, 0.08, 0.95, M.walnut, 0, 1.2 + s * 1.5, 0.08));
      for (let b = 0; b < 5; b++) {
        const bw = 0.28 + Math.random() * 0.2;
        g.add(rr(bw, 0.9 + Math.random() * 0.3, 0.7,
          new THREE.MeshStandardMaterial({ color: bookCols[(s + b) % 5], roughness: 0.9 }),
          -w / 2 + 0.5 + b * ((w - 1) / 5), 1.75 + s * 1.5, 0.1));
      }
    }
    return g;
  };
  K.wardrobe = (w = 4) => {
    const g = new THREE.Group();
    g.add(rr(w, 7, 2, M.oakWood, 0, 3.5, 0));
    g.add(rr(0.05, 6.4, 0.06, M.matBlack, 0, 3.5, 1.03));
    g.add(rr(0.09, 1.1, 0.09, M.brass, -0.35, 3.5, 1.06));
    g.add(rr(0.09, 1.1, 0.09, M.brass, 0.35, 3.5, 1.06));
    return g;
  };
  K.ottoman = (r = 1.15, mat = M.greige) => {
    const g = new THREE.Group();
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, 1.3, 18), mat);
    o.position.y = 0.65; o.castShadow = true;
    g.add(o);
    return g;
  };
  // grand piano: real rim silhouette — straight bass side, curved tail, S-waist treble side
  const grandShape = () => {
    const s = new THREE.Shape();                 // shape y maps to plan −z after rotateX(−90°)
    s.moveTo(-2.45, -2.9);                       // keyboard end, bass corner
    s.lineTo(-2.45, 1.4);                        // straight bass side
    s.bezierCurveTo(-2.45, 2.95, -1.55, 3.5, -0.5, 3.45);   // round tail
    s.bezierCurveTo(0.75, 3.35, 0.95, 1.95, 1.45, 1.1);     // treble bow into the waist
    s.bezierCurveTo(2.0, 0.45, 2.45, 0.42, 2.45, -0.4);     // out to the cheek
    s.lineTo(2.45, -2.9);
    s.closePath();
    return s;
  };
  K.piano = () => {
    const g = new THREE.Group();
    const gloss = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.15, metalness: 0.1, side: THREE.DoubleSide });
    const bodyGeo = new THREE.ExtrudeGeometry(grandShape(), { depth: 1.15, bevelEnabled: false });
    bodyGeo.rotateX(-Math.PI / 2);
    bodyGeo.translate(0, 1.75, 0);
    const body = new THREE.Mesh(bodyGeo, gloss);
    body.castShadow = true;
    g.add(body);
    const lidGeo = new THREE.ExtrudeGeometry(grandShape(), { depth: 0.1, bevelEnabled: false });
    lidGeo.rotateX(-Math.PI / 2);
    lidGeo.scale(1.02, 1, 1.02);
    lidGeo.translate(2.45, 0.1, 0);              // hinge line on the bass side
    const lid = new THREE.Mesh(lidGeo, gloss);
    lid.position.set(-2.45, 2.92, 0);
    lid.rotation.z = 0.42;                       // propped open
    lid.castShadow = true;
    g.add(lid);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 6), M.brass);
    stick.position.set(1.5, 3.5, 0.3);
    stick.rotation.z = 0.5;
    g.add(stick);
    g.add(rr(4.9, 0.32, 0.9, gloss, 0, 2.42, 3.3));               // key bed
    g.add(rr(4.5, 0.16, 0.72, M.white, 0, 2.62, 3.26));           // keys
    g.add(rr(4.9, 0.5, 0.16, gloss, 0, 2.85, 3.72));              // fallboard lip
    for (const [lx, lz] of [[-2.05, 2.4], [2.05, 2.4], [-0.6, -2.55]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 1.75, 10), gloss);
      leg.position.set(lx, 0.88, lz);
      g.add(leg);
    }
    g.add(rr(0.5, 0.9, 0.3, gloss, 0, 0.9, 2.1));                 // pedal lyre
    g.add(rr(0.7, 0.08, 0.25, M.brass, 0, 0.5, 2.15));            // pedals
    g.add(rr(2.4, 0.14, 1.1, gloss, 0, 1.55, 4.7));               // bench
    for (const [bx, bz] of [[-1, 4.3], [1, 4.3], [-1, 5.1], [1, 5.1]]) {
      const bl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.5, 8), gloss);
      bl.position.set(bx, 0.75, bz);
      g.add(bl);
    }
    // baby-grand footprint (~3'10" wide) — modeled dims read oversized in rooms
    const scaled = new THREE.Group();
    scaled.add(...g.children);
    scaled.scale.setScalar(0.78);
    g.add(scaled);
    return g;
  };

  // modular sofa: chain of modules — seat / chaise / corner (turns the run) / ottoman
  K.modSofa = (mods = ['seat', 'seat', 'corner', 'seat'], w = 3.2, d = 3.4, mat = M.velvetChar) => {
    const g = new THREE.Group();
    let cx = 0, cz = 0, ux = 1, uz = 0, theta = 0;
    const mkModule = kind => {
      const m = new THREE.Group();
      const len = kind === 'corner' ? d : w;
      if (kind === 'ottoman') {
        m.add(soft(w, 1.0, d - 0.5, mat, 0, 0.5, 0, 0.28));
        m.add(soft(w - 0.15, 0.5, d - 0.95, mat, 0, 1.2, 0, 0.24));
      } else if (kind === 'chaise') {
        m.add(soft(w, 1.0, d + 2.2, mat, 0, 0.5, 1.1, 0.28));
        m.add(soft(w - 0.15, 0.55, d + 1.3, mat, 0, 1.22, 1.16, 0.24));
        const bp = soft(w - 0.2, 1.35, 0.55, mat, 0, 1.95, -d / 2 + 0.42, 0.26);
        bp.rotation.x = -0.12;
        m.add(bp);
      } else {
        m.add(soft(len, 1.0, d, mat, 0, 0.5, 0, 0.28));
        m.add(soft(len - 0.15, 0.55, d - 0.9, mat, 0, 1.22, 0.12, 0.24));
        const bp = soft(len - 0.2, 1.35, 0.55, mat, 0, 1.95, -d / 2 + 0.42, 0.26);
        bp.rotation.x = -0.12;
        m.add(bp);
        if (kind === 'corner') {
          const bp2 = soft(0.55, 1.35, d - 0.6, mat, len / 2 - 0.28, 1.95, 0.2, 0.26);
          m.add(bp2);
        }
      }
      return m;
    };
    for (const kind of mods) {
      const m = mkModule(kind);
      const len = kind === 'corner' ? d : w;
      if (kind === 'corner') {
        m.position.set(cx + ux * len / 2, 0, cz + uz * len / 2);
        m.rotation.y = theta;
        g.add(m);
        cx += ux * len / 2; cz += uz * len / 2;
        theta -= Math.PI / 2;
        const nx = -uz, nz2 = ux;             // turn: run continues around the corner
        ux = nx; uz = nz2;
        cx += ux * len / 2; cz += uz * len / 2;
      } else {
        m.position.set(cx + ux * len / 2, 0, cz + uz * len / 2);
        m.rotation.y = theta;
        g.add(m);
        cx += ux * len; cz += uz * len;
      }
    }
    // center the whole run on the group origin so rotation pivots sensibly
    const bb = new THREE.Box3().setFromObject(g);
    const c = bb.getCenter(new THREE.Vector3());
    for (const ch of g.children) { ch.position.x -= c.x; ch.position.z -= c.z; }
    g.userData.chainEnd = { x: cx - c.x, z: cz - c.z };   // where the next module appends
    g.userData.chainStart = { x: -c.x, z: -c.z };         // …or prepends, if the marker is flipped
    return g;
  };

  K.pouf = (r = 1.05, mat = M.greige) => {
    const g = new THREE.Group();
    const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, 1.25, 16), mat);
    p.position.y = 0.63; p.castShadow = true;
    g.add(p);
    return g;
  };
  K.chairLinen = () => K.chair(M.linenCream);
  K.chairShearling = () => K.chair(M.shearling);

  // fancy chandeliers
  K.chandelierTiered = (dropTo = 6.4, ceilingY = 10) => {
    const g = new THREE.Group();
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, ceilingY - dropTo - 1.2, 6), M.brass);
    cord.position.y = dropTo + 1.2 + (ceilingY - dropTo - 1.2) / 2;
    g.add(cord);
    [[1.35, 0], [0.95, 0.6], [0.55, 1.15]].forEach(([r, dy]) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 8, 24), M.brass);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = dropTo + dy;
      g.add(ring);
      const n = Math.round(r * 6);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), M.warmGlow);
        bulb.position.set(Math.cos(a) * r, dropTo + dy + 0.12, Math.sin(a) * r);
        g.add(bulb);
      }
    });
    return g;
  };
  K.chandelierCrystal = (dropTo = 6.7, ceilingY = 10) => {
    const g = new THREE.Group();
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, ceilingY - dropTo - 1, 6), M.brass);
    cord.position.y = dropTo + 1 + (ceilingY - dropTo - 1) / 2;
    g.add(cord);
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.07, 8, 24), M.brass);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = dropTo + 0.9;
    g.add(hoop);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const len = 0.5 + ((i % 4) * 0.22);
      const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.028, len, 6), M.glass);
      drop.position.set(Math.cos(a) * 1.02, dropTo + 0.9 - len / 2 - 0.1, Math.sin(a) * 1.02);
      g.add(drop);
    }
    g.add(rr(0.34, 0.34, 0.34, M.warmGlow, 0, dropTo + 0.7, 0, false));
    return g;
  };
  K.chandelierSputnik = (dropTo = 6.5, ceilingY = 10) => {
    const g = new THREE.Group();
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, ceilingY - dropTo - 0.4, 6), M.blackSteel);
    cord.position.y = dropTo + 0.4 + (ceilingY - dropTo - 0.4) / 2;
    g.add(cord);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), M.brass);
    hub.position.y = dropTo;
    g.add(hub);
    for (let i = 0; i < 12; i++) {
      const dir = new THREE.Vector3().setFromSphericalCoords(1, Math.acos(2 * ((i + 0.5) / 12) - 1), i * 2.4);
      const len = 1.2 + (i % 3) * 0.4;
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 6), M.brass);
      arm.position.copy(dir).multiplyScalar(len / 2).add(new THREE.Vector3(0, dropTo, 0));
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      g.add(arm);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), M.warmGlow);
      bulb.position.copy(dir).multiplyScalar(len).add(new THREE.Vector3(0, dropTo, 0));
      g.add(bulb);
    }
    return g;
  };

  K.glassTable = (w = 7, d = 3.6, h = 2.5) => {
    const g = new THREE.Group();
    g.add(rr(w, 0.12, d, M.glass, 0, h, 0));
    for (const [x, z] of [
      [-w / 2 + 0.45, -d / 2 + 0.45], [w / 2 - 0.45, -d / 2 + 0.45],
      [-w / 2 + 0.45, d / 2 - 0.45], [w / 2 - 0.45, d / 2 - 0.45],
    ]) g.add(rr(0.12, h, 0.12, M.blackSteel, x, h / 2, z));
    return g;
  };

  K.glassRoundTable = (r = 2.4, h = 2.5) => {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.1, 32), M.glass);
    top.position.y = h; g.add(top);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, h, 12), M.blackSteel);
    stem.position.y = h / 2; g.add(stem);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.12, 24), M.blackSteel);
    base.position.y = 0.06; g.add(base);
    return g;
  };

  K.canopyBed = (w = 6.33, len = 7.2, lin = M.linenCream) => {
    const g = K.bed(w, len, M.graphite, lin);
    const x = w / 2 + 0.18, z = len / 2 + 0.18, top = 6.8;
    for (const [px, pz] of [[-x, -z], [x, -z], [-x, z], [x, z]])
      g.add(rr(0.12, top, 0.12, M.matBlack, px, top / 2, pz));
    g.add(rr(w + 0.48, 0.12, 0.12, M.matBlack, 0, top, -z));
    g.add(rr(w + 0.48, 0.12, 0.12, M.matBlack, 0, top, z));
    g.add(rr(0.12, 0.12, len + 0.48, M.matBlack, -x, top, 0));
    g.add(rr(0.12, 0.12, len + 0.48, M.matBlack, x, top, 0));
    return g;
  };

  K.featureBed = (w = 5, len = 6.8, lin = M.linenCream) => {
    const g = K.bed(w, len, M.white, lin);
    const backZ = -len / 2 - 0.22;
    const shape=new THREE.Shape();shape.moveTo(-w/2-.4,0);shape.lineTo(-w/2-.4,3.5);shape.quadraticCurveTo(-w/2-.4,5,w/2+.4,4.5);shape.lineTo(w/2+.4,0);shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.28,bevelEnabled:true,bevelSize:.07,bevelThickness:.06,bevelSegments:3,curveSegments:32});
    const head=new THREE.Mesh(surfaceUVs(geometry,M.chairPattern),M.chairPattern);head.position.set(0,0,backZ);head.castShadow=true;g.add(head);
    return g;
  };

  K.chaise = (mat = M.carpetGray) => {
    const g = new THREE.Group();
    g.add(soft(2.8, 0.85, 5.5, mat, 0, 0.5, 0, 0.3));
    g.add(soft(2.65, 0.45, 4.8, M.linenCream, 0, 1.08, 0.25, 0.24));
    const back = soft(2.75, 2.1, 0.5, mat, 0, 1.8, -2.35, 0.28);
    back.rotation.x = -0.15;
    g.add(back);
    return g;
  };

  K.libraryWall = (len = 10, h = 8.5, mat = M.deepWalnut) => {
    const g = K.builtinWall(len, h, mat, 1.35);
    const ladder = new THREE.Group();
    for (const x of [-0.55, 0.55]) ladder.add(rr(0.1, h - 0.6, 0.1, M.blackSteel, x, (h - 0.6) / 2, 0));
    for (let y = 0.7; y < h - 0.5; y += 0.72) ladder.add(rr(1.2, 0.08, 0.08, M.blackSteel, 0, y, 0));
    ladder.rotation.z = -0.08;
    ladder.position.set(0.6, 0, 0.82);
    g.add(ladder);
    return g;
  };

  K.eggChair = (mat = M.teak) => {
    const g=new THREE.Group();
    // Open wicker shell: the aperture faces +z, with separate woven ribs.
    const pt=(theta,phi)=>new THREE.Vector3(-1.8*Math.cos(phi)*Math.sin(theta),2.7+2.5*Math.cos(theta),1.5*Math.sin(phi)*Math.sin(theta));
    const tube=points=>{const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,.023,4,false),mat);m.castShadow=true;g.add(m);};
    for(let phi=Math.PI-.2;phi<=2*Math.PI+.2;phi+=.11){const points=[];for(let i=0;i<=24;i++)points.push(pt(.12+i/24*2.65,phi));tube(points);}
    for(let theta=.22;theta<2.8;theta+=.115){const points=[];for(let i=0;i<=30;i++)points.push(pt(theta,Math.PI-.2+i/30*(Math.PI+.4)));tube(points);}
    g.add(soft(2.65,.5,2,M.sunYellow,0,.8,.1,.24));
    const pillow=soft(2.5,1.8,.45,M.sunYellow,0,1.7,-.6,.25);pillow.rotation.x=-.2;g.add(pillow);
    g.add(soft(.9,.85,.35,M.chairPattern,0,1.55,.1,.18));
    const base=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.3,.3,32),mat);base.position.y=.15;g.add(base);
    return g;
  };

  K.doubleSofa = (w=10.5,d=5.8,mat=M.carpetGray) => {
    const g=new THREE.Group();
    for(const sign of [-1,1]){
      const side=K.sofa(w,d/2+.12,mat);side.position.z=sign*d/4;
      if(sign<0)side.rotation.y=Math.PI;g.add(side);
    }
    for(const x of [-3.5,3.5]){const cushion=soft(.95,.95,.32,M.loftRug,x,2.1,.35,.18);cushion.rotation.z=x*.025;g.add(cushion);}
    return g;
  };

  K.metalDiningChair = (mat = M.sunYellow) => {
    const g=new THREE.Group();g.add(rr(1.45,.09,1.45,mat,0,1.48,0));
    const outline=[new THREE.Vector3(-.67,1.45,-.61),new THREE.Vector3(-.7,2.6,-.77),new THREE.Vector3(-.48,3.05,-.8),new THREE.Vector3(.48,3.05,-.8),new THREE.Vector3(.7,2.6,-.77),new THREE.Vector3(.67,1.45,-.61)];
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outline),36,.045,8,false),mat));
    g.add(rr(1.3,.28,.055,mat,0,2.63,-.77));
    for(const x of [-.55,.55])for(const z of [-.55,.55])g.add(branchBetween([x*1.25,.07,z*1.25],[x,1.44,z],.04,mat));
    return g;
  };

  // stamp every piece with its kind so the layout editor can identify it
  for (const name of Object.keys(K)) {
    const factory = K[name];
    K[name] = (...args) => {
      const g = factory(...args);
      g.userData.kind = name;
      return g;
    };
  }

  K.lounger = (mat = M.teak, cush = M.graphite) => {
    const g = new THREE.Group();
    g.add(rr(2.3, 0.9, 6.3, mat, 0, 0.45, 0));
    g.add(rr(2.1, 0.35, 4.2, cush, 0, 1.05, 0.9));
    const back = rr(2.1, 2.2, 0.35, cush, 0, 1.8, -2.2);
    back.rotation.x = -0.5;
    g.add(back);
    return g;
  };

  K.console = (w = 5.7, mat = M.oakWood) => rr(w, 2.6, 1.3, mat, 0, 1.3, 0);

  K.sideboard = (w = 7, mat = M.oakWood) => {
    const g=new THREE.Group();g.add(rr(w,2.2,1.6,mat,0,1.55,0));
    const n=Math.round(w/1.6);
    for(let i=0;i<n;i++){const x=-w/2+(i+.5)*w/n;g.add(rr(w/n-.06,2.06,.04,mat,x,1.55,.82));g.add(rr(.05,.32,.08,M.brass,x+w/n*.28,1.65,.87));}
    for(const x of [-w/2+.35,w/2-.35])for(const z of [-.6,.6])g.add(rr(.12,.5,.12,M.blackSteel,x,.25,z));
    g.userData.kind='sideboard';return keepOrigin(g,1.35);
  };

  K.barCounter = (w = 8) => {
    const g = new THREE.Group();
    g.add(rr(w, 3.1, 2.1, M.flutedBlack, 0, 1.55, 0));
    g.add(rr(w + 0.6, 0.2, 2.5, M.quartzite, 0, 3.2, 0));
    g.add(rr(w, 0.1, 0.1, M.brass, 0, 0.8, 1.15)); // foot rail
    return g;
  };

  K.gameTable = (sq = 4.5) => {
    const g = new THREE.Group();
    g.add(rr(sq, 0.25, sq, M.walnut, 0, 2.4, 0));
    g.add(rr(sq * 0.55, 0.03, sq * 0.55, M.greige, 0, 2.55, 0)); // playmat inlay
    g.add(rr(0.45, 2.3, 0.45, M.walnut, 0, 1.15, 0));
    return g;
  };

  return K;
}
