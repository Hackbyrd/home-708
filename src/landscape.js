import * as THREE from 'three';
import { box } from './parts.js';
import { W, D } from '../data/house.js';

// Site + sky. Ground group lives in mirrored plan-space; sky group at scene root.
// Grade (lawn top) is y = -1.5.

function canvas(w, h, draw, repX = 1, repY = 1) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repX, repY);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeLandscape(M) {
  const ground = new THREE.Group();
  const evening = [];

  // ---------------- surfaces ----------------
  const grassTex = canvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#7d8a58'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const g = ['#6e7c4e', '#89966a', '#75835a', '#93a06e'][Math.floor(Math.random() * 4)];
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 2 + Math.random() * 3);
    }
    ctx.globalAlpha = 1;
  }, 46, 46);
  const grassMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x3b3d40, roughness: 0.95 });
  const mulchMat = new THREE.MeshStandardMaterial({ color: 0x4a3628, roughness: 1 });

  const lawn = box(520, 0.4, 520, grassMat, W / 2, -1.7, D / 2, false);
  ground.add(lawn);
  // street + curb + sidewalk (front) and rear alley
  ground.add(box(180, 0.42, 9, asphaltMat, W / 2, -1.62, -12.7, false));
  ground.add(box(180, 0.55, 0.6, M.trimStone, W / 2, -1.35, -8, false));
  ground.add(box(180, 0.46, 3.6, M.concrete, W / 2, -1.58, -6, false));
  ground.add(box(180, 0.42, 10, asphaltMat, W / 2, -1.62, 76.4, false));
  // driveway: alley -> garage, with concrete joint look + ramp apron
  const driveTex = canvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#a8a49c'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(60,58,54,0.55)'; ctx.lineWidth = 3;
    for (let x = 0; x <= w; x += 128) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 128) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  }, 4, 2);
  const driveMat = new THREE.MeshStandardMaterial({ map: driveTex, roughness: 0.95 });
  ground.add(box(30.6, 0.44, 9.6, driveMat, W / 2, -1.58, 66.5, false));
  const ramp = box(30.6, 0.4, 6.2, driveMat, W / 2, -0.82, 60.4, false);
  ramp.rotation.x = 0.235;   // rises from grade to the garage slab
  ground.add(ramp);

  // ---------------- fence: brick piers + iron pickets ----------------
  const X0 = -15, X1 = 45, Z0 = -5.5, Z1 = 71;
  const runs = [
    [[X0, Z0], [X1, Z0]],                                     // front (continuous)
    [[X1, Z0], [X1, Z1]],                                     // east
    [[X1, Z1], [31.4, Z1]], [[0.2, Z1], [X0, Z1]],            // rear, driveway gap
    [[X0, Z1], [X0, 20.9]], [[X0, 14.3], [X0, Z0]],           // west, gate on the front-door axis
  ];
  const railMat = M.blackSteel;
  const picketGeo = new THREE.BoxGeometry(0.09, 3.9, 0.09);
  let picketCount = 0;
  const picketRuns = [];
  for (const [a, b] of runs) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    picketRuns.push({ a, b, len, n: Math.floor(len / 0.52) });
    picketCount += Math.floor(len / 0.52);
  }
  const pickets = new THREE.InstancedMesh(picketGeo, railMat, picketCount);
  const mtx = new THREE.Matrix4();
  let pi = 0;
  for (const { a, b, len, n } of picketRuns) {
    const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) * (len / n);
      mtx.makeTranslation(a[0] + ux * t, 0.55, a[1] + uz * t);
      pickets.setMatrixAt(pi++, mtx);
    }
    const rot = -Math.atan2(uz, ux);
    for (const ry of [2.35, 0.55 - 1.6]) {
      const rail = box(len, 0.14, 0.14, railMat, (a[0] + b[0]) / 2, ry, (a[1] + b[1]) / 2, false);
      rail.rotation.y = rot;
      ground.add(rail);
    }
    // brick piers along the run
    const nP = Math.max(2, Math.round(len / 13) + 1);
    for (let p = 0; p < nP; p++) {
      const t = (p / (nP - 1)) * len;
      const px = a[0] + ux * t, pz = a[1] + uz * t;
      ground.add(box(1.35, 5.2, 1.35, M.brick, px, 1.1, pz));
      ground.add(box(1.7, 0.3, 1.7, M.trimStone, px, 3.85, pz));
    }
  }
  pickets.castShadow = true;
  ground.add(pickets);

  // ---------------- planting beds, bushes, flowers, trees ----------------
  const beds = [
    [0.5, -2.6, 31.2, -0.3],     // front foundation
    [-2.5, 1, -0.3, 13],         // west of house, south of portico
    [-2.5, 22, -0.3, 36],        // west of house, north of portico
    [31.9, 4, 34.3, 40],         // east side
    [-14.5, -5, -9.5, 0],        // gate corners
    [-3.6, -5, 0.6, -2.8],
  ];
  for (const [x0, z0, x1, z1] of beds)
    ground.add(box(x1 - x0, 0.5, z1 - z0, mulchMat, (x0 + x1) / 2, -1.28, (z0 + z1) / 2, false));

  // bushes (two greens, instanced)
  const bushGeo = new THREE.IcosahedronGeometry(1, 1);
  const greens = [0x51633e, 0x64784a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
  const bushSpots = [];
  const scatter = (x0, z0, x1, z1, n, s0 = 0.7, s1 = 1.5) => {
    for (let i = 0; i < n; i++)
      bushSpots.push([x0 + Math.random() * (x1 - x0), z0 + Math.random() * (z1 - z0), s0 + Math.random() * (s1 - s0)]);
  };
  scatter(1.5, -1.8, 30.5, -1.0, 13);
  scatter(-1.8, 2, -0.9, 12, 5);
  scatter(-1.8, 23, -0.9, 35, 6);
  scatter(32.3, 5, 33.8, 39, 8);
  scatter(-14, -4.5, -10, -0.5, 4, 1, 2);
  scatter(-3, -4.6, 0.2, -3, 3, 1, 1.8);
  bushSpots.push([-4.6, 13.7, 1.7], [-4.6, 21.5, 1.7]);   // flanking the entry steps
  const half = Math.ceil(bushSpots.length / 2);
  [bushSpots.slice(0, half), bushSpots.slice(half)].forEach((set, k) => {
    const im = new THREE.InstancedMesh(bushGeo, greens[k], set.length);
    set.forEach(([x, z, s], i) => {
      mtx.makeScale(s, s * (0.75 + Math.random() * 0.3), s);
      mtx.setPosition(x, -1.2 + s * 0.55, z);
      im.setMatrixAt(i, mtx);
    });
    im.castShadow = true;
    ground.add(im);
  });

  // flowers (instanced, per-instance color)
  const flowerColors = [0xf5f0e2, 0xe07856, 0xa87bb8, 0xe8c76a, 0xd96a7c];
  const flowerBeds = [[1, -2.3, 31, -0.6, 150], [-2.2, 2, -0.6, 12, 40], [-2.2, 23, -0.6, 35, 50], [32.2, 5, 34, 39, 55], [-3.3, -4.4, 0.3, -3.1, 25]];
  const totalF = flowerBeds.reduce((s, b) => s + b[4], 0);
  const flowers = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.14, 6, 5),
    new THREE.MeshStandardMaterial({ roughness: 0.9 }),
    totalF
  );
  const col = new THREE.Color();
  let fi = 0;
  for (const [x0, z0, x1, z1, n] of flowerBeds) {
    for (let i = 0; i < n; i++) {
      mtx.makeTranslation(x0 + Math.random() * (x1 - x0), -0.95 - Math.random() * 0.15, z0 + Math.random() * (z1 - z0));
      flowers.setMatrixAt(fi, mtx);
      flowers.setColorAt(fi, col.setHex(flowerColors[Math.floor(Math.random() * flowerColors.length)]));
      fi++;
    }
  }
  ground.add(flowers);

  // yard + street trees — foliage uses dedicated materials so the seasons can restyle it
  const treeMats = [
    new THREE.MeshStandardMaterial({ color: 0x51633e, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x64784a, roughness: 1 }),
  ];
  const treeLeaves = [];
  const treeAt = (x, z, s = 1) => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.42 * s, 11 * s, 8), M.walnut);
    trunk.position.y = -1.5 + 5.5 * s; trunk.castShadow = true;
    g.add(trunk);
    for (let i = 0; i < 7; i++) {
      const r = (1.9 + Math.random() * 1.6) * s;
      const blob = new THREE.Mesh(bushGeo, treeMats[i % 2]);
      blob.scale.setScalar(r);
      const a = Math.random() * Math.PI * 2;
      blob.position.set(x + Math.cos(a) * r * 0.8, -1.5 + 11 * s + (Math.random() - 0.35) * 3 * s, z + Math.sin(a) * r * 0.8);
      blob.castShadow = true;
      treeLeaves.push(blob);
      g.add(blob);
    }
    trunk.position.x = x; trunk.position.z = z;
    ground.add(g);
  };
  treeAt(-11.5, 44, 1.1);
  treeAt(40.5, 10, 1.0);
  treeAt(40.5, 52, 1.2);
  treeAt(-11, -2.5, 0.8);
  treeAt(37, -2.5, 0.85);

  // ---------------- facade uplights + path bollards ----------------
  const upFixGeo = new THREE.CylinderGeometry(0.16, 0.2, 0.55, 8);
  const upSpots = [
    [[4, -1.7], [4, 0.6]], [[11.5, -1.7], [11.5, 0.6]], [[20, -1.7], [20, 0.6]], [[27.5, -1.7], [27.5, 0.6]],
    [[-2.1, 8], [0.4, 8]], [[-2.1, 31], [0.4, 31]],
    [[33.7, 18], [31.2, 18]], [[33.7, 40], [31.2, 40]],
  ];
  for (const [[fx, fz], [tx, tz]] of upSpots) {
    const fix = new THREE.Mesh(upFixGeo, M.blackSteel);
    fix.position.set(fx, -1.1, fz);
    ground.add(fix);
    const lens = box(0.22, 0.06, 0.22, M.warmGlow, fx, -0.8, fz, false);
    ground.add(lens);
    const s = new THREE.SpotLight(0xffd9a8, 0, 55, 0.5, 0.65, 1.4);
    s.position.set(fx, -1, fz);
    s.target.position.set(tx, 17, tz);
    s.userData.evening = 60;
    ground.add(s, s.target);
    evening.push(s);
  }
  for (const [bx, bz] of [[-12.5, 13.8], [-12.5, 21.4], [-6.8, 13.8], [-6.8, 21.4]]) {   // bollards lining the entry walk
    ground.add(box(0.28, 1.8, 0.28, M.blackSteel, bx, -0.6, bz, false));
    ground.add(box(0.34, 0.14, 0.34, M.warmGlow, bx, 0.34, bz, false));
    const pl = new THREE.PointLight(0xffc98a, 0, 9, 1.8);
    pl.position.set(bx, 0.6, bz);
    pl.userData.evening = 5;
    ground.add(pl);
    evening.push(pl);
  }

  // ---------------- sky ----------------
  const sky = new THREE.Group();
  const domeGeo = new THREE.SphereGeometry(340, 32, 18);
  const gradTex = (top, mid, bot) => canvas(16, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, top); g.addColorStop(0.55, mid); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 256);
  });
  const domeDay = new THREE.Mesh(domeGeo, new THREE.MeshBasicMaterial({ map: gradTex('#69a9dc', '#b8d3e4', '#e3e9e6'), side: THREE.BackSide, fog: false }));
  const domeNight = new THREE.Mesh(domeGeo, new THREE.MeshBasicMaterial({ map: gradTex('#060c1a', '#101b2c', '#1b2634'), side: THREE.BackSide, fog: false }));
  sky.add(domeDay, domeNight);

  const glowTex = (inner, outer) => canvas(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, inner); g.addColorStop(1, outer);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  });

  // sun + glow
  const sun = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 16), new THREE.MeshBasicMaterial({ color: 0xfff3c0, fog: false }));
  sun.position.set(128, 192, -113);   // matches the directional light's bearing
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,244,200,0.95)', 'rgba(255,244,200,0)'), transparent: true, depthWrite: false, fog: false }));
  sunGlow.scale.setScalar(85);
  sunGlow.position.copy(sun.position);
  sky.add(sun, sunGlow);

  // big moon with craters + glow
  const moonTex = canvas(128, 128, (ctx) => {
    ctx.fillStyle = '#e4eaf2'; ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = `rgba(120,135,160,${0.1 + Math.random() * 0.16})`;
      ctx.beginPath();
      ctx.arc(Math.random() * 128, Math.random() * 128, 3 + Math.random() * 12, 0, 7);
      ctx.fill();
    }
  });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(14, 24, 18), new THREE.MeshBasicMaterial({ map: moonTex, fog: false }));
  moon.position.set(85, 185, -175);
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(214,228,248,0.75)', 'rgba(214,228,248,0)'), transparent: true, depthWrite: false, fog: false }));
  moonGlow.scale.setScalar(95);
  moonGlow.position.copy(moon.position);
  sky.add(moon, moonGlow);

  // stars
  const starPos = [];
  for (let i = 0; i < 550; i++) {
    const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI * 0.46 + 0.06;
    starPos.push(Math.cos(a) * Math.cos(e) * 320, Math.sin(e) * 320, Math.sin(a) * Math.cos(e) * 320);
  }
  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3)),
    new THREE.PointsMaterial({ color: 0xdfe8ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.85, fog: false })
  );
  sky.add(stars);

  // drifting clouds
  const cloudTex = canvas(256, 128, (ctx) => {
    for (let i = 0; i < 7; i++) {
      const x = 40 + Math.random() * 176, y = 45 + Math.random() * 40, r = 22 + Math.random() * 34;
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.85)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 128);
    }
  });
  const clouds = [];
  for (let i = 0; i < 8; i++) {
    const m = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0.9, fog: false });
    const sp = new THREE.Sprite(m);
    const scale = 55 + Math.random() * 55;
    sp.scale.set(scale, scale * 0.42, 1);
    sp.position.set(-180 + Math.random() * 360, 85 + Math.random() * 65, -190 + Math.random() * 300);
    sp.userData.speed = 1.2 + Math.random() * 1.6;
    clouds.push(sp);
    sky.add(sp);
  }

  function setNight(n) {
    domeDay.visible = !n;
    domeNight.visible = n;
    sun.visible = sunGlow.visible = !n;
    moon.visible = moonGlow.visible = n;
    stars.visible = n;
    for (const c of clouds) {
      c.material.color.setHex(n ? 0x7e93b5 : 0xffffff);
      c.material.opacity = n ? 0.42 : 0.9;
    }
  }
  setNight(false);

  function tick(dt) {
    for (const c of clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 195) c.position.x = -195;
    }
  }

  return { ground, sky, evening, setNight, tick, treeMats, treeLeaves };
}
