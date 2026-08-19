import * as THREE from 'three';
import { box } from './parts.js';
import { W, D } from '../data/house.js';

// Seasons: Summer (baseline) · Spring (cherry blossoms) · Fall (+Halloween) · Winter (+Snowing, +Christmas).
// All groups live in plan-space (added to the mirrored world root). Grade is y = -1.5.

const SUMMER = [0x51633e, 0x64784a];
const SPRING = [0xe8a9c6, 0xd98bb4];   // cherry blossom
const FALL   = [0xc9743a, 0xd9a13b];   // autumn

export function makeSeasons(M, land, worldGroup) {
  const std = (opts) => new THREE.MeshStandardMaterial(opts);
  const root = new THREE.Group();
  worldGroup.add(root);
  let season = 'summer';

  // ---------------- ground leaves / petals (fall + spring) ----------------
  const FALL_COLS = [0xc9743a, 0xb0452e, 0xd9a13b, 0x8a5a2e];
  const SPRING_COLS = [0xefc1d8, 0xe8a9c6, 0xf5e6ee];
  const N_LEAVES = 520;
  const leaves = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.55, 0.03, 0.38),
    std({ roughness: 1 }),
    N_LEAVES
  );
  const leafMtx = new THREE.Matrix4();
  const leafPos = [];
  let placed = 0;
  while (placed < N_LEAVES) {
    const x = -15 + Math.random() * 60, z = -5 + Math.random() * 76;
    if (x > -0.5 && x < W + 0.5 && z > -0.5 && z < D + 0.5) continue;   // skip the house footprint
    leafPos.push([x, z]);
    leafMtx.makeRotationY(Math.random() * Math.PI * 2);
    leafMtx.setPosition(x, -1.33, z);
    leaves.setMatrixAt(placed, leafMtx);
    placed++;
  }
  const leafCol = new THREE.Color();
  function paintLeaves(palette) {
    for (let i = 0; i < N_LEAVES; i++)
      leaves.setColorAt(i, leafCol.setHex(palette[i % palette.length]));
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
  }
  leaves.visible = false;
  root.add(leaves);

  // ---------------- winter: snow cover ----------------
  const snowMat = std({ color: 0xf4f7fa, roughness: 0.95 });
  const winter = new THREE.Group();
  winter.add(box(520, 0.3, 520, snowMat, W / 2, -1.36, D / 2, false));            // ground blanket
  winter.add(box(17.4, 0.28, 9.2, snowMat, 13.75, 48.25, 7.75, false));           // roof caps
  winter.add(box(21, 0.28, 15.4, snowMat, 17.2, 48.25, 24.05, false));
  winter.add(box(10, 0.24, 6.2, snowMat, 10.15, 41.65, 37.4, false));             // wet-bar bump cap
  winter.add(box(17.4, 0.14, 11.6, snowMat, 22.8, 32.2, 40.5, false));            // living terrace
  winter.add(box(4.6, 0.14, 11.6, snowMat, 3.1, 32.2, 40.5, false));              // dining terrace (around the bump)
  winter.add(box(8.3, 0.14, 6.0, snowMat, 9.65, 32.2, 43.35, false));
  winter.add(box(12.5, 0.14, 9.1, snowMat, 7, 32.2, 51, false));                  // sun terrace
  winter.add(box(18, 0.14, 11.1, snowMat, 22.4, 11.16, 52, false));               // main terrace
  winter.visible = false;
  root.add(winter);

  // ---------------- snowfall ----------------
  const N_SNOW = 1600;
  const snowPos = new Float32Array(N_SNOW * 3);
  for (let i = 0; i < N_SNOW; i++) {
    snowPos[i * 3] = -60 + Math.random() * 120;
    snowPos[i * 3 + 1] = Math.random() * 60;
    snowPos[i * 3 + 2] = -30 + Math.random() * 120;
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snowfall = new THREE.Points(snowGeo, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.18, transparent: true, opacity: 0.9, depthWrite: false,
  }));
  snowfall.visible = false;
  root.add(snowfall);

  // ---------------- christmas ----------------
  const xmas = new THREE.Group();
  const bulbGeo = new THREE.SphereGeometry(0.15, 6, 5);
  const matRed = std({ color: 0xd0342c, emissive: 0xff2a1e, emissiveIntensity: 0.2 });
  const matGreen = std({ color: 0x2f8f3e, emissive: 0x2aff55, emissiveIntensity: 1.4 });
  const matOrange = std({ color: 0xe07820, emissive: 0xff8a20, emissiveIntensity: 0.6 });

  function bulbRow(group, a, b, step, mats, sag = 0) {
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const n = Math.max(2, Math.round(dist / step));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const m = new THREE.Mesh(bulbGeo, mats[i % mats.length]);
      m.position.set(
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t - sag * Math.abs(Math.sin(t * Math.PI * 6)),
        a[2] + (b[2] - a[2]) * t
      );
      group.add(m);
    }
  }
  const rg = [matRed, matGreen];
  bulbRow(xmas, [-15, 1.4, -5.2], [45, 1.4, -5.2], 1.1, rg, 0.25);                // front fence
  bulbRow(xmas, [-0.35, 11.3, 1], [-0.35, 11.3, 56.5], 1.1, rg, 0.2);             // south facade bands
  bulbRow(xmas, [-0.35, 21.3, 1], [-0.35, 21.3, 45.5], 1.1, rg, 0.2);
  bulbRow(xmas, [2.5, 41.8, 2.2], [2.5, 41.8, 34.4], 1.1, rg, 0.2);               // mansard eave
  bulbRow(xmas, [1, 11.3, -0.35], [31, 11.3, -0.35], 1.1, rg, 0.2);               // east facade band
  bulbRow(xmas, [-4.1, 9.9, 14.4], [-4.1, 9.9, 20.8], 0.9, rg, 0.15);             // entry hood brow

  // blow-up snowman (front yard, south of the walk)
  const infMat = std({ color: 0xffffff, roughness: 0.55 });
  const snowman = new THREE.Group();
  for (const [r, y] of [[1.5, 0.1], [1.1, 2.25], [0.75, 3.85]]) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), infMat);
    s.position.y = y; s.castShadow = true;
    snowman.add(s);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.75, 8), std({ color: 0xe07820 }));
  nose.rotation.z = Math.PI / 2;
  nose.position.set(-1.05, 3.9, 0);
  snowman.add(nose);
  for (const ez of [-0.28, 0.28]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), M.matBlack);
    eye.position.set(-0.62, 4.15, ez);
    snowman.add(eye);
  }
  const hatB = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.1, 14), M.matBlack);
  hatB.position.y = 4.5;
  snowman.add(hatB);
  const hatT = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 14), M.matBlack);
  hatT.position.y = 4.95;
  snowman.add(hatT);
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.18, 8, 16), matRed);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 3.15;
  snowman.add(scarf);
  snowman.position.set(-7.5, -1.4, 9.5);
  xmas.add(snowman);

  // blow-up santa (front yard, north of the walk)
  const santa = new THREE.Group();
  const redMat = std({ color: 0xc22e26, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.35, 1.7, 6, 14), redMat);
  body.position.y = 2.2; body.castShadow = true;
  santa.add(body);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.16, 8, 18), M.matBlack);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 2.1;
  santa.add(belt);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.78, 14, 12), std({ color: 0xf2c49b }));
  head.position.y = 4.35;
  santa.add(head);
  const beard = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), infMat);
  beard.scale.set(1, 0.75, 0.9);
  beard.position.set(-0.42, 4.05, 0);
  santa.add(beard);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.4, 12), redMat);
  hat.position.y = 5.55;
  hat.rotation.z = -0.18;
  santa.add(hat);
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), infMat);
  pom.position.set(0.26, 6.2, 0);
  santa.add(pom);
  const brim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.14, 8, 16), infMat);
  brim.rotation.x = Math.PI / 2;
  brim.position.y = 4.95;
  santa.add(brim);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.1, 4, 8), redMat);
    arm.rotation.z = s * 0.9;
    arm.position.set(0, 3.1, s * 1.35);
    arm.rotation.x = s * 0.5;
    santa.add(arm);
    const boot = box(0.75, 0.6, 0.9, M.matBlack, 0, 0.3, s * 0.6);
    santa.add(boot);
  }
  santa.position.set(-7.5, -1.4, 25.5);
  xmas.add(santa);

  // ---- extravagant extras ----
  function lightSpiral(group, cx, cz, y0, y1, r0, r1, turns, mats) {
    const n = Math.round((y1 - y0) * 6);
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = t * turns * Math.PI * 2;
      const r = r0 + (r1 - r0) * t;
      const m = new THREE.Mesh(bulbGeo, mats[i % mats.length]);
      m.position.set(cx + Math.cos(a) * r, y0 + (y1 - y0) * t, cz + Math.sin(a) * r);
      group.add(m);
    }
  }
  // more strings: every fence run, the garage facade, and light-wrapped bare trees
  bulbRow(xmas, [45, 1.4, -5.2], [45, 1.4, 70.5], 1.1, rg, 0.25);
  bulbRow(xmas, [-15, 1.4, -5.2], [-15, 1.4, 70.5], 1.1, rg, 0.25);
  bulbRow(xmas, [-15, 1.4, 70.5], [45, 1.4, 70.5], 1.1, rg, 0.25);
  bulbRow(xmas, [1, 8.4, 58.05], [31, 8.4, 58.05], 1.1, rg, 0.2);
  lightSpiral(xmas, -11, -2.5, -1, 8.5, 1.7, 0.6, 5, rg);
  lightSpiral(xmas, -11.5, 44, -1, 9.5, 1.8, 0.6, 5, rg);

  // grand decorated tree — builder reused for yard, indoor main floor, and terrace
  const pine = std({ color: 0x2e5232, roughness: 1 });
  const ornMats = [matRed, matGreen, std({ color: 0xd4af37, emissive: 0xd4af37, emissiveIntensity: 0.5 })];
  const stars = [];
  const makeXmasTree = (s) => {
    const tr = new THREE.Group();
    for (const [r, h, y] of [[3.4, 3.6, 1.9], [2.6, 3.1, 4.2], [1.7, 2.7, 6.3]]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r * s, h * s, 14), pine);
      cone.position.y = y * s; cone.castShadow = true;
      tr.add(cone);
    }
    tr.add(box(0.7 * s, 1.2 * s, 0.7 * s, M.walnut, 0, 0.4 * s, 0));
    const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.55 * s), std({ color: 0xf5c542, emissive: 0xffd24a, emissiveIntensity: 1.4 }));
    st.position.y = 8.1 * s;
    stars.push(st);
    tr.add(st);
    for (let i = 0; i < 16; i++) {
      const t = Math.random(), a = Math.random() * Math.PI * 2;
      const rr2 = ((1 - t) * 3.1 + 0.4) * s;
      const orn = new THREE.Mesh(new THREE.SphereGeometry(0.19 * s, 8, 6), ornMats[i % 3]);
      orn.position.set(Math.cos(a) * rr2 * 0.8, (1.2 + t * 6) * s, Math.sin(a) * rr2 * 0.8);
      tr.add(orn);
    }
    lightSpiral(tr, 0, 0, 0.7 * s, 7.4 * s, 3.1 * s, 0.5 * s, 6, rg);
    return tr;
  };
  const yardTree = makeXmasTree(1);
  for (const [gx, gz, gs, gm] of [[1.9, 1.6, 1.1, matRed], [-1.8, 1.9, 0.9, matGreen], [0.6, 2.6, 0.7, ornMats[2]]]) {
    yardTree.add(box(gs, gs * 0.7, gs, gm, gx, gs * 0.35, gz));
    yardTree.add(box(0.16, gs * 0.72, gs + 0.04, infMat, gx, gs * 0.35, gz, false));
  }
  yardTree.position.set(-10, -1.4, 41);
  xmas.add(yardTree);
  // indoor tree on the second (main) floor — great room corner by the fireplace
  const mainTree = makeXmasTree(0.8);
  for (const [gx, gz, gs, gm] of [[1.4, 1.2, 0.8, matGreen], [-1.3, 1.4, 0.65, matRed]]) {
    mainTree.add(box(gs, gs * 0.7, gs, gm, gx, gs * 0.35, gz));
  }
  mainTree.position.set(28.2, 11.05, 43.6);
  xmas.add(mainTree);
  const mainTreeGlow = new THREE.PointLight(0xffd9a0, 0, 18, 1.8);
  mainTreeGlow.position.set(27.4, 17, 42.4);
  xmas.add(mainTreeGlow);
  // mini tree on the penthouse living terrace
  const terraceTree = makeXmasTree(0.55);
  terraceTree.position.set(16, 32.05, 38.2);
  xmas.add(terraceTree);

  // candy canes lining the walk
  for (const [cx2, cz2] of [[-12.8, 14.1], [-9.6, 14.1], [-6.4, 14.1], [-12.8, 21.1], [-9.6, 21.1], [-6.4, 21.1]]) {
    const cane = new THREE.Group();
    cane.add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.4, 8), infMat));
    cane.children[0].position.y = 1.2;
    for (const sy of [0.5, 1.1, 1.7]) {
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.22, 8), matRed);
      stripe.position.y = sy;
      cane.add(stripe);
    }
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 8, 12, Math.PI), infMat);
    hook.position.set(0.3, 2.4, 0);
    cane.add(hook);
    cane.position.set(cx2, -1.4, cz2);
    xmas.add(cane);
  }

  // wreaths: front door + both garage doors
  const makeWreath = (s = 1) => {
    const w2 = new THREE.Group();
    w2.add(new THREE.Mesh(new THREE.TorusGeometry(1.0 * s, 0.3 * s, 10, 20), pine));
    const bowL = box(0.3 * s, 0.32 * s, 0.5 * s, matRed, 0, -0.85 * s, -0.3 * s, false);
    const bowR = box(0.3 * s, 0.32 * s, 0.5 * s, matRed, 0, -0.85 * s, 0.3 * s, false);
    bowL.rotation.x = 0.5; bowR.rotation.x = -0.5;
    w2.add(bowL, bowR);
    for (let i = 0; i < 6; i++) {
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 6, 5), matRed);
      const a = i * 1.05;
      berry.position.set(-0.12 * s, Math.sin(a) * s, Math.cos(a) * s);
      w2.add(berry);
    }
    return w2;
  };
  const doorWreath = makeWreath(1);
  doorWreath.rotation.y = Math.PI / 2;
  doorWreath.position.set(4.16, 5.4, 17.6);
  xmas.add(doorWreath);
  for (const gx3 of [6.5, 21]) {
    const gw = makeWreath(0.85);
    gw.position.set(gx3, 4.6, 57.95);
    xmas.add(gw);
  }

  // 360°: strings on every facade band, every eave, and the terrace rails
  bulbRow(xmas, [1, 21.3, -0.35], [31, 21.3, -0.35], 1.1, rg, 0.2);               // east upper band
  bulbRow(xmas, [31.95, 11.3, 1], [31.95, 11.3, 45.5], 1.1, rg, 0.2);             // north bands
  bulbRow(xmas, [31.95, 21.3, 1], [31.95, 21.3, 45.5], 1.1, rg, 0.2);
  bulbRow(xmas, [14, 14.5, 57.95], [31, 14.5, 57.95], 1.1, rg, 0.2);              // main terrace rail (west)
  bulbRow(xmas, [14, 35.7, 46.75], [31.4, 35.7, 46.75], 1.1, rg, 0.2);            // penthouse terrace rails
  bulbRow(xmas, [1.2, 35.7, 35.2], [1.2, 35.7, 55.4], 1.1, rg, 0.2);
  bulbRow(xmas, [1.2, 35.7, 55.9], [13.2, 35.7, 55.9], 1.1, rg, 0.2);
  bulbRow(xmas, [3, 41.9, 1.7], [24.5, 41.9, 1.7], 1.1, rg, 0.2);                 // remaining mansard eaves
  bulbRow(xmas, [3, 41.9, 34.95], [31.4, 41.9, 34.95], 1.1, rg, 0.2);
  bulbRow(xmas, [31.95, 41.9, 14], [31.95, 41.9, 34.4], 1.1, rg, 0.2);
  lightSpiral(xmas, 40.5, 10, -1, 9.5, 1.8, 0.6, 5, rg);                          // wrap the remaining trees
  lightSpiral(xmas, 40.5, 52, -1, 10.5, 2, 0.7, 5, rg);
  lightSpiral(xmas, 37, -2.5, -1, 7.5, 1.5, 0.6, 5, rg);
  // rear snowman on the main terrace
  const terraceSnowman = snowman.clone(true);
  terraceSnowman.scale.setScalar(0.72);
  terraceSnowman.position.set(21.5, 11.1, 54.8);
  terraceSnowman.rotation.y = Math.PI;
  xmas.add(terraceSnowman);

  // inflatable reindeer (glowing nose) — one in the yard, one pulling the rooftop sleigh
  const makeReindeer = (s = 1) => {
    const deer = new THREE.Group();
    const hide = std({ color: 0x8a5c3a, roughness: 0.7 });
    const bodyD = new THREE.Mesh(new THREE.CapsuleGeometry(0.75 * s, 1.6 * s, 6, 10), hide);
    bodyD.rotation.x = Math.PI / 2;
    bodyD.position.y = 2.2 * s; bodyD.castShadow = true;
    deer.add(bodyD);
    for (const [lx, lz] of [[-0.4, -0.7], [0.4, -0.7], [-0.4, 0.7], [0.4, 0.7]])
      deer.add(box(0.24 * s, 1.8 * s, 0.24 * s, hide, lx * s, 0.9 * s, lz * s));
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.34 * s, 1.3 * s, 8), hide);
    neck.rotation.x = -0.55;
    neck.position.set(0, 3.1 * s, -1.35 * s);
    deer.add(neck);
    const headD = new THREE.Mesh(new THREE.SphereGeometry(0.48 * s, 10, 8), hide);
    headD.scale.set(1, 0.85, 1.35);
    headD.position.set(0, 3.85 * s, -1.85 * s);
    deer.add(headD);
    const noseD = new THREE.Mesh(new THREE.SphereGeometry(0.17 * s, 8, 6), std({ color: 0xff2010, emissive: 0xff2010, emissiveIntensity: 1.6 }));
    noseD.position.set(0, 3.8 * s, -2.45 * s);
    deer.add(noseD);
    for (const [ax, tilt] of [[-0.22, -0.5], [0.22, 0.5]]) {
      const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * s, 0.045 * s, 1.05 * s, 6), std({ color: 0xd9c9a8 }));
      antler.rotation.z = tilt;
      antler.position.set(ax * s, 4.55 * s, -1.7 * s);
      deer.add(antler);
      const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * s, 0.04 * s, 0.5 * s, 6), std({ color: 0xd9c9a8 }));
      tine.rotation.z = tilt + 1;
      tine.position.set(ax * 2 * s, 4.8 * s, -1.7 * s);
      deer.add(tine);
    }
    return deer;
  };
  const yardDeer = makeReindeer(1);
  yardDeer.position.set(-11.5, -1.4, 29.5);
  yardDeer.rotation.y = -0.6;
  xmas.add(yardDeer);

  // sleigh + Rudolph on the roof
  const roofShow = new THREE.Group();
  roofShow.add(box(2.9, 1.05, 1.7, matRed, 1.6, 0.85, 0));
  roofShow.add(box(3.6, 0.12, 0.14, M.blackSteel, 1.6, 0.1, -0.75, false));
  roofShow.add(box(3.6, 0.12, 0.14, M.blackSteel, 1.6, 0.1, 0.75, false));
  roofShow.add(box(0.8, 0.6, 0.8, matGreen, 1.3, 1.7, 0.2));
  roofShow.add(box(0.6, 0.45, 0.6, ornMats[2], 2.2, 1.6, -0.3));
  const rudolph = makeReindeer(0.72);
  rudolph.rotation.y = -Math.PI / 2;
  rudolph.position.set(-2.6, 0, 0);
  roofShow.add(rudolph);
  const rope = box(2.6, 0.05, 0.05, M.walnut, -0.4, 1.3, 0, false);
  roofShow.add(rope);
  roofShow.rotation.y = Math.PI / 2;
  roofShow.position.set(13.75, 48.4, 9.2);
  xmas.add(roofShow);

  const xmasRedLights = [], xmasGreenLights = [];
  // north-lawn display: reindeer trio, candy-cane lane, gift stack
  {
  for (const [rx2, rz2, rr2] of [[37, 13.5, -0.5], [39.6, 18, -0.9], [37.4, 22.5, -0.2]]) {
    const d2 = makeReindeer(0.85);
    d2.position.set(rx2, -1.4, rz2);
    d2.rotation.y = rr2;
    xmas.add(d2);
  }
  for (let cz = 6; cz <= 40; cz += 6.8) {                                    // candy canes along the north bed
    const cane = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.5, 8), matRed);
    stick.position.y = 1.25;
    cane.add(stick);
    for (const ry2 of [0.5, 1.1, 1.7]) {
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.05, 6, 10), infMat);
      stripe.rotation.x = Math.PI / 2;
      stripe.position.y = ry2;
      cane.add(stripe);
    }
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.1, 6, 12, Math.PI), matRed);
    hook.position.y = 2.5;
    cane.add(hook);
    cane.position.set(33.2, -1.4, cz);
    xmas.add(cane);
  }
  for (const [gx2, gz2, gs2, gm2] of [[36.5, 43.5, 1.2, matGreen], [38.2, 44.3, 0.9, matRed], [37.1, 45.4, 0.7, ornMats[2]]]) {
    xmas.add(box(gs2, gs2 * 0.7, gs2, gm2, gx2, -1.4 + gs2 * 0.35, gz2));
    xmas.add(box(0.16, gs2 * 0.72, gs2 + 0.04, infMat, gx2, -1.4 + gs2 * 0.35, gz2, false));
  }
  }

  for (const [lx, ly, lz, red] of [[-6, 8, 12, true], [-6, 8, 24, false], [-9, 7, 41, false], [16, 10, 58.5, true], [36, 8, 25, false], [16, 15, 62, true], [16, 40, 41, false]]) {
    const l = new THREE.PointLight(red ? 0xff3020 : 0x2aff55, 0, 30, 1.6);
    l.position.set(lx, ly, lz);
    xmas.add(l);
    (red ? xmasRedLights : xmasGreenLights).push(l);
  }
  xmas.visible = false;
  root.add(xmas);

  // ---------------- halloween ----------------
  const hween = new THREE.Group();
  const matPurple = std({ color: 0x7a2bd6, emissive: 0x9a2be2, emissiveIntensity: 0.6 });
  const op = [matOrange, matPurple];
  bulbRow(hween, [-15, 1.4, -5.2], [45, 1.4, -5.2], 1.2, op, 0.25);
  bulbRow(hween, [45, 1.4, -5.2], [45, 1.4, 70.5], 1.2, op, 0.25);
  bulbRow(hween, [-15, 1.4, -5.2], [-15, 1.4, 70.5], 1.2, op, 0.25);
  bulbRow(hween, [-0.35, 11.3, 1], [-0.35, 11.3, 56.5], 1.2, op, 0.2);
  bulbRow(hween, [-0.35, 21.3, 1], [-0.35, 21.3, 45.5], 1.2, op, 0.2);
  bulbRow(hween, [1, 11.3, -0.35], [31, 11.3, -0.35], 1.2, op, 0.2);
  bulbRow(hween, [2.5, 41.8, 2.2], [2.5, 41.8, 34.4], 1.2, op, 0.2);
  bulbRow(hween, [-4.1, 9.9, 14.4], [-4.1, 9.9, 20.8], 0.9, op, 0.15);
  // graveyard patch on the north lawn
  hween.add(box(9.5, 0.18, 13.5, std({ color: 0x3a2f26, roughness: 1 }), -8, -1.38, 35, false));
  const stoneMat = std({ color: 0x9b978f, roughness: 0.9 });
  hween.add(box(8, 0.18, 12, std({ color: 0x3a2f26, roughness: 1 }), 37.5, -1.38, 16, false));  // north graveyard patch
  for (const [gx, gz, rot] of [[-10.5, 30.5, 0.1], [-6.2, 31.5, -0.15], [-10.8, 36, 0.05], [-5.6, 37.5, 0.2], [-8.6, 40.2, -0.1],
    [36.5, 11.5, 0.15], [39, 15.5, -0.12], [36.2, 19.5, 0.08], [39.4, 21.5, 0.2]]) {
    const g2 = new THREE.Group();
    g2.add(box(1.3, 1.7, 0.28, stoneMat, 0, 0.85, 0));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.28, 12, 1, false, 0, Math.PI), stoneMat);
    cap.rotation.z = Math.PI / 2;
    cap.rotation.y = Math.PI / 2;
    cap.position.y = 1.7;
    g2.add(cap);
    g2.position.set(gx, -1.4, gz);
    g2.rotation.y = rot;
    g2.rotation.x = (Math.random() - 0.5) * 0.12;
    hween.add(g2);
  }
  // witch
  const witch = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.ConeGeometry(1.15, 3.4, 12), M.matBlack);
  robe.position.y = 1.7; robe.castShadow = true;
  witch.add(robe);
  const wHead = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 10), std({ color: 0x7da35a }));
  wHead.position.y = 3.7;
  witch.add(wHead);
  const wBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.08, 14), M.matBlack);
  wBrim.position.y = 4.1;
  witch.add(wBrim);
  const wHat = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 12), M.matBlack);
  wHat.position.y = 4.8;
  wHat.rotation.z = 0.12;
  witch.add(wHat);
  const broom = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 6), M.walnut);
  broom.rotation.z = 0.5;
  broom.position.set(1.1, 1.9, 0);
  witch.add(broom);
  const bristles = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 8), std({ color: 0xb08d3a }));
  bristles.rotation.z = 0.5 + Math.PI;
  bristles.position.set(2.0, 3.2, 0);
  witch.add(bristles);
  witch.position.set(-7.2, -1.4, 33.5);
  witch.rotation.y = 0.5;
  hween.add(witch);
  // skeleton rising from a grave
  const bone = std({ color: 0xe8e4d8, roughness: 0.7 });
  const skel = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), bone);
  skull.position.y = 2.1;
  skel.add(skull);
  for (const ey of [-0.14, 0.14]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), M.matBlack);
    socket.position.set(-0.34, 2.18, ey);
    skel.add(socket);
  }
  skel.add(box(0.14, 1.3, 0.14, bone, 0, 1.1, 0));
  for (const ry of [1.0, 1.3, 1.6]) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 6, 12), bone);
    rib.rotation.x = Math.PI / 2;
    rib.position.y = ry;
    skel.add(rib);
  }
  for (const s of [-1, 1]) {
    const arm = box(0.11, 1.4, 0.11, bone, 0, 1.6, s * 0.62);
    arm.rotation.x = s * 0.75;
    skel.add(arm);
  }
  skel.position.set(-9.2, -1.55, 37.8);
  skel.rotation.z = -0.12;
  hween.add(skel);
  // monster blobs
  for (const [mx, mz, col, r] of [[-11, 32.5, 0x7a4a9c, 1.2], [-5, 41.3, 0x5a8a3a, 0.95]]) {
    const mon = new THREE.Group();
    const bodyM = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), std({ color: col, roughness: 0.9 }));
    bodyM.position.y = r * 0.85; bodyM.castShadow = true;
    mon.add(bodyM);
    for (const s of [-0.32, 0.32]) {
      const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), infMat);
      eyeW.position.set(-r * 0.75, r * 1.15, s * r);
      mon.add(eyeW);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), M.matBlack);
      pupil.position.set(-r * 0.9, r * 1.15, s * r);
      mon.add(pupil);
    }
    mon.position.set(mx, -1.4, mz);
    hween.add(mon);
  }
  // jack-o-lanterns by the entry steps
  const pumpkinMat = std({ color: 0xe07820, emissive: 0xff7a20, emissiveIntensity: 0.15, roughness: 0.8 });
  for (const [px, pz, pr] of [[-4.2, 14.6, 0.55], [-4.2, 20.6, 0.55], [-5.8, 17.6, 0.42]]) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(pr, 12, 10), pumpkinMat);
    p.scale.y = 0.75;
    p.position.set(px, -1.4 + pr * 0.7, pz);
    p.castShadow = true;
    hween.add(p);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.3, 6), M.green);
    stem.position.set(px, -1.4 + pr * 1.35, pz);
    hween.add(stem);
  }
  // ---- GINORMOUS skeleton (~15') looming over the south lawn ----
  let gSkull;
  {
  const giant = new THREE.Group();
  const gSeg = (r, h, x, y, z, rx = 0, rz = 0) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, h, 8), bone);
    c.position.set(x, y, z); c.rotation.x = rx; c.rotation.z = rz; c.castShadow = true;
    giant.add(c);
  };
  const gJoint = (r, x, y, z) => {
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), bone);
    s2.position.set(x, y, z);
    giant.add(s2);
  };
  gSeg(0.26, 3.4, -0.85, 1.7, 0); gSeg(0.26, 3.4, 0.85, 1.7, 0);          // shins
  gJoint(0.34, -0.85, 3.5, 0); gJoint(0.34, 0.85, 3.5, 0);                // knees
  gSeg(0.28, 3.2, -0.85, 5.2, 0); gSeg(0.28, 3.2, 0.85, 5.2, 0);          // femurs
  giant.add(box(2.5, 1.1, 1.0, bone, 0, 7.2, 0));                          // pelvis
  gSeg(0.24, 2.2, 0, 8.7, 0);                                              // spine
  for (let i = 0; i < 4; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(1.25 - i * 0.12, 0.14, 6, 14), bone);
    rib.rotation.x = Math.PI / 2;
    rib.position.y = 9.2 + i * 0.62;
    giant.add(rib);
  }
  giant.add(box(3.1, 0.5, 0.7, bone, 0, 11.6, 0));                         // shoulders
  gSeg(0.2, 2.9, -1.9, 10.2, 0.3, 0, 0.5); gSeg(0.2, 2.9, 1.9, 10.2, 0.3, 0, -0.5);
  gJoint(0.28, -2.55, 8.9, 0.45); gJoint(0.28, 2.55, 8.9, 0.45);
  gSeg(0.18, 2.7, -2.9, 7.6, 0.8, 0.25, 0.25); gSeg(0.18, 2.7, 2.9, 7.6, 0.8, 0.25, -0.25);
  giant.add(box(0.6, 0.9, 0.35, bone, -3.25, 6.2, 1.15));                  // hands
  giant.add(box(0.6, 0.9, 0.35, bone, 3.25, 6.2, 1.15));
  gSkull = new THREE.Group();
  const gHead = new THREE.Mesh(new THREE.SphereGeometry(1.05, 12, 10), bone);
  gHead.castShadow = true;
  gSkull.add(gHead);
  gSkull.add(box(0.95, 0.55, 0.7, bone, 0, -0.85, 0.15));                  // jaw
  for (const s2 of [-0.4, 0.4]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), pumpkinMat);
    eye.position.set(s2, 0.1, 0.92);
    gSkull.add(eye);
  }
  gSkull.position.set(0, 12.9, 0);
  giant.add(gSkull);
  giant.scale.setScalar(1.15);
  giant.position.set(-9.5, -1.4, 2.5);
  giant.rotation.y = -0.9;                                                  // looming toward the street corner
  hween.add(giant);
  }

  {
  // ---- Frankenstein's monster shambling by the graveyard ----
  const frank = new THREE.Group();
  const skin = std({ color: 0x6f9b52, roughness: 0.85 });
  const jacket = std({ color: 0x2f3a2f, roughness: 0.9 });
  frank.add(box(0.85, 0.95, 0.85, skin, 0, 5.45, 0));
  frank.add(box(0.95, 0.28, 0.95, M.matBlack, 0, 6.0, 0));                 // flat top
  for (const s2 of [-0.55, 0.55]) {
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 6), M.blackSteel);
    bolt.rotation.z = Math.PI / 2;
    bolt.position.set(s2, 4.95, 0);
    frank.add(bolt);
  }
  frank.add(box(1.7, 1.9, 0.95, jacket, 0, 3.92, 0));
  for (const s2 of [-1.05, 1.05]) {                                         // zombie arms straight out
    frank.add(box(0.42, 0.42, 2.0, jacket, s2, 4.5, 1.0));
    frank.add(box(0.4, 0.4, 0.5, skin, s2, 4.5, 2.15));
  }
  frank.add(box(0.62, 2.0, 0.7, M.matBlack, -0.45, 1.98, 0));
  frank.add(box(0.62, 2.0, 0.7, M.matBlack, 0.45, 1.98, 0));
  frank.add(box(0.75, 0.55, 1.1, M.matBlack, -0.45, 0.28, 0.15));
  frank.add(box(0.75, 0.55, 1.1, M.matBlack, 0.45, 0.28, 0.15));
  frank.position.set(-5.2, -1.4, 28.6);
  frank.rotation.y = -Math.PI / 2;
  hween.add(frank);
  }

  {
  // ---- giant spider on the north lawn ----
  const northSpider = new THREE.Group();
  const spBody = new THREE.Mesh(new THREE.SphereGeometry(1.05, 12, 10), M.matBlack);
  spBody.position.y = 1.15; spBody.castShadow = true;
  northSpider.add(spBody);
  const spHead = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), M.matBlack);
  spHead.position.set(0, 0.95, 1.25);
  northSpider.add(spHead);
  for (const s2 of [-0.2, 0.2]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), matRed);
    eye.position.set(s2, 1.05, 1.72);
    northSpider.add(eye);
  }
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 2.7, 6), M.matBlack);
    leg.position.set(side * 1.15, 0.85, -0.9 + (i % 4) * 0.65);
    leg.rotation.z = side * 1.15;
    leg.rotation.y = (i % 4 - 1.5) * 0.3;
    northSpider.add(leg);
  }
  northSpider.position.set(38.5, -1.4, 29);
  northSpider.rotation.y = 2.4;
  hween.add(northSpider);
  }

  {
  // ---- spider webs everywhere ----
  const webCanvas = document.createElement('canvas');
  webCanvas.width = webCanvas.height = 128;
  const wctx = webCanvas.getContext('2d');
  wctx.strokeStyle = 'rgba(255,255,255,0.9)';
  wctx.lineWidth = 1.3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 7) * Math.PI / 2;
    wctx.beginPath(); wctx.moveTo(0, 0); wctx.lineTo(Math.cos(a) * 127, Math.sin(a) * 127); wctx.stroke();
  }
  for (let r = 18; r < 130; r += 20) {
    wctx.beginPath(); wctx.arc(0, 0, r, 0, Math.PI / 2); wctx.stroke();
  }
  const webMat = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(webCanvas), transparent: true, opacity: 0.8,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const webAt = (size, x, y, z, ry, rz = 0) => {
    const w3 = new THREE.Mesh(new THREE.PlaneGeometry(size, size), webMat);
    w3.position.set(x, y, z);
    w3.rotation.y = ry; w3.rotation.z = rz;
    hween.add(w3);
  };
  webAt(3.2, -0.3, 8.6, 14.6, Math.PI / 2);                 // entry recess corners
  webAt(3.2, -0.3, 8.6, 20.6, Math.PI / 2, Math.PI / 2);
  webAt(2.6, -2.5, 7.9, 15.0, Math.PI / 2, Math.PI);        // under the hood
  webAt(4, -14.55, 1.9, -5.0, 0.5);                          // fence corners
  webAt(4, -14.55, 1.9, 20.9, Math.PI / 2, Math.PI / 2);
  webAt(4.5, 31.5, 1.9, -5.0, -0.5);
  webAt(3.5, 0.2, 9.4, 0.1, Math.PI / 4);                    // house corners
  webAt(3.5, 0.2, 19.8, 57.4, -Math.PI / 4);
  webAt(3.5, 31.4, 9.4, 0.1, -Math.PI / 4);
  webAt(4.2, 31.4, 12.5, 46.2, -Math.PI / 4);                // terrace corner
  webAt(5.5, -14.55, 2.2, 44, Math.PI / 2);                  // big web on the west fence
  webAt(3, -8.2, 3.4, 33.6, 0.8, 0.4);                       // draped over the graveyard
  }

  // floating ghosts (animated)
  const ghosts = [];
  const ghostMat = new THREE.MeshStandardMaterial({ color: 0xf2f4f8, roughness: 0.8, transparent: true, opacity: 0.82 });
  const makeGhost = (s) => {
    const g2 = new THREE.Group();
    const bodyG = new THREE.Mesh(new THREE.ConeGeometry(1.2 * s, 3.4 * s, 12), ghostMat);
    bodyG.position.y = 1.7 * s;
    g2.add(bodyG);
    const headG = new THREE.Mesh(new THREE.SphereGeometry(0.85 * s, 12, 10), ghostMat);
    headG.position.y = 3.4 * s;
    g2.add(headG);
    for (const s2 of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.26 * s, 0.9 * s, 4, 8), ghostMat);
      arm.rotation.z = s2 * 1.2;
      arm.position.set(s2 * 1.05 * s, 2.9 * s, 0);
      g2.add(arm);
    }
    for (const ez of [-0.3, 0.3]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 6, 5), M.matBlack);
      eye.position.set(-0.68 * s, 3.55 * s, ez * s);
      g2.add(eye);
    }
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 6, 5), M.matBlack);
    mouth.scale.y = 1.5;
    mouth.position.set(-0.72 * s, 3.05 * s, 0);
    g2.add(mouth);
    return g2;
  };
  for (const [gx2, gz2, gs2, gy] of [[-12.2, 22.5, 1.5, 0.4], [-4.5, 44, 0.9, 1.2], [36.5, 6, 1.1, 0.8]]) {
    const gh = makeGhost(gs2);
    gh.position.set(gx2, -1.4 + gy, gz2);
    gh.userData = { baseY: -1.4 + gy, phase: gx2 };
    ghosts.push(gh);
    hween.add(gh);
  }
  // bats (animated flapping)
  const bats = [];
  for (const [bx2, by2, bz2] of [[-6, 9, 9], [-9.5, 12, 26], [-3, 10, 34], [37, 11, 22]]) {
    const bat = new THREE.Group();
    const bodyB = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), M.matBlack);
    bat.add(bodyB);
    const wl = box(0.95, 0.05, 0.42, M.matBlack, -0.55, 0, 0, false);
    const wr = box(0.95, 0.05, 0.42, M.matBlack, 0.55, 0, 0, false);
    bat.add(wl, wr);
    bat.position.set(bx2, by2, bz2);
    bat.userData = { baseY: by2, phase: bx2 * 2 };
    bats.push({ g: bat, wl, wr });
    hween.add(bat);
  }
  // giant spider on the blank inlay bay
  const spider = new THREE.Group();
  const spBody = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), M.matBlack);
  spider.add(spBody);
  const spHead = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), M.matBlack);
  spHead.position.y = -1.05;
  spider.add(spHead);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const leg = box(0.07, 2.1, 0.07, M.matBlack, 0, 0, 0, false);
    leg.position.set(0, Math.cos(a) * 1.2, Math.sin(a) * 1.2);
    leg.rotation.x = -a;
    spider.add(leg);
  }
  spider.position.set(-0.55, 24.5, 38.5);
  hween.add(spider);
  // pumpkin patch at the yard corner
  for (const [px2, pz2, pr2] of [[-13, 5, 0.6], [-11.4, 7.1, 0.45], [-13.4, 8.9, 0.5], [-10.3, 4.7, 0.35], [-12, 10.9, 0.42]]) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(pr2, 12, 10), pumpkinMat);
    p.scale.y = 0.72;
    p.position.set(px2, -1.4 + pr2 * 0.65, pz2);
    hween.add(p);
  }
  // standing skeleton greeting at the gate
  const skel2 = new THREE.Group();
  const skull2 = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), bone);
  skull2.position.y = 4.5;
  skel2.add(skull2);
  for (const ey of [-0.13, 0.13]) {
    const so = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), M.matBlack);
    so.position.set(-0.32, 4.58, ey);
    skel2.add(so);
  }
  skel2.add(box(0.16, 1.7, 0.16, bone, 0, 3.3, 0));
  for (const ry of [3.0, 3.35, 3.7]) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 6, 12), bone);
    rib.rotation.x = Math.PI / 2;
    rib.position.y = ry;
    skel2.add(rib);
  }
  skel2.add(box(0.62, 0.3, 0.3, bone, 0, 2.4, 0));
  for (const s2 of [-1, 1]) {
    skel2.add(box(0.12, 2.3, 0.12, bone, s2 * 0.22, 1.15, 0));
    const upArm = box(0.11, 1.1, 0.11, bone, s2 * 0.62, 4.0, 0, false);
    upArm.rotation.z = s2 * (s2 > 0 ? 2.4 : 0.6);
    skel2.add(upArm);
  }
  skel2.position.set(-13.6, -1.4, 16.2);
  skel2.rotation.y = 0.9;
  hween.add(skel2);

  const hweenLights = [];
  for (const [lx, ly, lz, col] of [[-5, 6, 17.6, 0xff8a20], [-8, 5, 35, 0xff8a20], [-9, 6, 22, 0x9a2be2], [36, 6, 8, 0xff8a20]]) {
    const l = new THREE.PointLight(col, 0, 26, 1.6);
    l.position.set(lx, ly, lz);
    hween.add(l);
    hweenLights.push(l);
  }
  hween.visible = false;
  root.add(hween);

  // ---------------- state ----------------
  let snowing = false, xmasOn = false, hweenOn = false;

  function setSeason(s) {
    season = s;
    const leavesOn = s !== 'winter';
    for (const leaf of land.treeLeaves) leaf.visible = leavesOn;
    const pal = s === 'spring' ? SPRING : s === 'fall' ? FALL : SUMMER;
    land.treeMats[0].color.setHex(pal[0]);
    land.treeMats[1].color.setHex(pal[1]);
    leaves.visible = s === 'fall' || s === 'spring';
    if (s === 'fall') paintLeaves(FALL_COLS);
    if (s === 'spring') paintLeaves(SPRING_COLS);
    winter.visible = s === 'winter';
    if (s !== 'winter') { snowing = false; xmasOn = false; snowfall.visible = false; xmas.visible = false; }
    if (s !== 'fall') { hweenOn = false; hween.visible = false; }
  }

  function setSnowing(b) { snowing = season === 'winter' && b; snowfall.visible = snowing; }
  function setXmas(b) { xmasOn = season === 'winter' && b; xmas.visible = xmasOn; }
  function setHalloween(b) { hweenOn = season === 'fall' && b; hween.visible = hweenOn; }

  let t = 0;
  function tick(dt, evening) {
    t += dt;
    if (snowing) {
      const p = snowGeo.attributes.position;
      for (let i = 0; i < N_SNOW; i++) {
        let y = p.getY(i) - dt * (6 + (i % 5));
        if (y < -1.4) y = 58;
        p.setY(i, y);
        p.setX(i, p.getX(i) + Math.sin(t * 0.8 + i) * dt * 0.6);
      }
      p.needsUpdate = true;
    }
    if (xmasOn) {
      const phase = Math.floor(t * 1.7) % 2;
      matRed.emissiveIntensity = phase ? 1.8 : 0.15;
      matGreen.emissiveIntensity = phase ? 0.15 : 1.8;
      const glow = evening ? 9 : 2.5;
      for (const l of xmasRedLights) l.intensity = phase ? glow : 0.4;
      for (const l of xmasGreenLights) l.intensity = phase ? 0.4 : glow;
      snowman.rotation.z = Math.sin(t * 1.4) * 0.05;
      santa.rotation.z = Math.sin(t * 1.1 + 1) * 0.06;
      yardDeer.rotation.z = Math.sin(t * 1.25 + 2) * 0.045;
      for (const st of stars) st.rotation.y = t * 0.8;
      mainTreeGlow.intensity = evening ? 10 : 4;
    }
    if (hweenOn) {
      gSkull.rotation.y = Math.sin(t * 0.55) * 0.4;                 // the giant slowly scans the street
      const pulse = (Math.sin(t * 2.6) + 1) / 2;
      matOrange.emissiveIntensity = 0.4 + pulse * 1.4;
      matPurple.emissiveIntensity = 0.4 + (1 - pulse) * 1.4;
      pumpkinMat.emissiveIntensity = evening ? 0.5 + pulse * 0.8 : 0.15;
      const glow = evening ? 8 : 2;
      hweenLights.forEach((l, i) => {
        l.intensity = glow * (0.55 + (i % 2 ? pulse : 1 - pulse) * 0.45);
      });
      for (const gh of ghosts) {
        gh.position.y = gh.userData.baseY + Math.sin(t * 1.2 + gh.userData.phase) * 0.55;
        gh.rotation.y = Math.sin(t * 0.5 + gh.userData.phase) * 0.5;
      }
      for (const b of bats) {
        const flap = Math.sin(t * 15 + b.g.userData.phase) * 0.65;
        b.wl.rotation.x = flap;
        b.wr.rotation.x = -flap;
        b.g.position.y = b.g.userData.baseY + Math.sin(t * 2.2 + b.g.userData.phase) * 0.8;
        b.g.rotation.y = t * 0.6 + b.g.userData.phase;
      }
    }
  }

  return { setSeason, setSnowing, setXmas, setHalloween, tick };
}
