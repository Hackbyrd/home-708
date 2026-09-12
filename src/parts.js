import * as THREE from 'three';
import { CORE } from '../data/blueprint.js';
import { surfaceUVs } from './surfaces.js';

// All units in feet. Plan coords: x (west->east), z (front/south -> rear/north). y up.

export function box(w, h, d, mat, x = 0, y = 0, z = 0, castShadow = true) {
  const m = new THREE.Mesh(surfaceUVs(new THREE.BoxGeometry(w, h, d), mat, [x, y, z]), mat);
  m.position.set(x, y, z);
  m.castShadow = castShadow;
  m.receiveShadow = true;
  return m;
}

// ---------------- WALLS ----------------
// Wall runs from a=[x,z] to b=[x,z], built out of boxes so openings are real holes.
// openings: {at (dist from a to CENTER), w, h, sill=0, type:'door'|'window'|'arch'|'open'|'garage'}
// layers: [{mat, t, off}] off = lateral offset from centerline (+ = left of a->b direction)
export function wall(a, b, height, openings = [], layers, yBase = 0, glassMat = null, frameMat = null, trimMat = null, leafMat = null, interiorTrim = null) {
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
      const geometry = surfaceUVs(new THREE.BoxGeometry(to - from, y1 - y0, layer.t), layer.mat,
        [(from + to) / 2, yBase + (y0 + y1) / 2, 0]);
      const m = new THREE.Mesh(geometry, layer.mat);
      m.castShadow = true; m.receiveShadow = true;
      place(m, (from + to) / 2, yBase + (y0 + y1) / 2, layer.off || 0);
    };
    for (const o of ops) {
      const o0 = o.at - o.w / 2, o1 = o.at + o.w / 2;
      seg(cursor, o0, 0, height);                       // solid before opening
      const sill = o.sill ?? (o.type === 'window' ? 2.5 : 0);
      seg(o0, o1, sill + o.h, height);                  // header
      if(o.type==='arch' && o.w>2.5 && o.w<11) {
        const rise=Math.min(.85,o.w*.14), shape=new THREE.Shape();
        shape.moveTo(-o.w/2,0);shape.quadraticCurveTo(0,rise*2,o.w/2,0);
        shape.lineTo(o.w/2,rise);shape.lineTo(-o.w/2,rise);shape.closePath();
        const geo=new THREE.ExtrudeGeometry(shape,{depth:layer.t,bevelEnabled:false,curveSegments:32});
        geo.translate(0,0,-layer.t/2);
        const m=new THREE.Mesh(surfaceUVs(geo,layer.mat),layer.mat);m.castShadow=m.receiveShadow=true;
        place(m,o.at,yBase+sill+o.h-rise,layer.off||0);
      }
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
          fr.add(box(o.w - 0.15, 0.1, 0.3, frameMat, 0, 0, 0));
          if(o.w>4.5) {
            fr.add(box(.13,o.h,.34,frameMat,0,0,0));
            for(const x of [-o.w/4,o.w/4])fr.add(box(.045,o.h/2,.18,frameMat,x,o.h/4,0));
          }
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
  if(interiorTrim) {
    const faces=layers.length>1?[.38]:[-.23,.23];
    for(const face of faces) {
      // Stepped skirting follows solid floor-level segments, leaving doorways open.
      let cursor=0;
      const lowSegments=[];
      for(const o of ops.filter(o=>(o.sill??0)===0)){lowSegments.push([cursor,o.at-o.w/2]);cursor=o.at+o.w/2;}
      lowSegments.push([cursor,len]);
      for(const [a,b] of lowSegments)if(b-a>.05){
        for(const [h,y,d] of [[.48,.24,.07],[.065,.51,.11],[.075,.075,.13]])place(box(b-a,h,d,interiorTrim), (a+b)/2,yBase+y,face);
      }
      for(const [h,y,d] of [[.18,height-.16,.13],[.09,height-.3,.2],[.09,height-.055,.27]])place(box(len,h,d,interiorTrim),len/2,yBase+y,face);
      for(const o of ops) {
        if(o.type==='arch')continue;
        const sill=o.sill??0, bottom=sill>0?sill-.08:0;
        for(const x of [o.at-o.w/2-.085,o.at+o.w/2+.085])place(box(.17,o.h+(sill?0:.12),.09,interiorTrim),x,yBase+bottom+o.h/2,face);
        place(box(o.w+.38,.18,.1,interiorTrim),o.at,yBase+sill+o.h+.1,face);
        if(sill>0)place(box(o.w+.55,.1,.35,interiorTrim),o.at,yBase+sill-.07,face);
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
  surfaceUVs(geo, mat);
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
// A quarter-turn curved lower flight reaches a half-story landing, then a
// straight upper flight crosses the back of the well to the next floor.
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

// The stair is a shell with closed white risers and a clear underside, not a
// stack of solid columns. The landing is exactly halfway between floor levels.
export function mainStair(yBase, rise, treadMat, railMat, trimMat = treadMat) {
  const g = new THREE.Group();
  const S = CORE.stair, n = S.treads.total, sh = rise / n, cap = 0.105;
  const landingTop = yBase + rise / 2;
  const treadTops = [];
  const innerRail = [], outerRail = [];
  const picket = (points, x, z, yTop, railTop) => {
    const height = railTop - yTop;
    g.add(box(0.085, height, 0.085, trimMat, x, yTop + height / 2, z, false));
    g.add(box(0.14, 0.12, 0.14, trimMat, x, yTop + 0.16, z, false));
    points.push(new THREE.Vector3(x, railTop, z));
  };
  const newel = (x, z, y) => {
    g.add(box(0.42, 3.25, 0.42, trimMat, x, y + 1.625, z));
    for (const [w,h,cy] of [[0.62,0.13,0.07],[0.52,0.1,0.23],[0.5,0.09,2.7],[0.65,0.12,3.28],[0.54,0.12,3.39]])
      g.add(box(w,h,w,trimMat,x,y+cy,z));
  };
  const treadBody = (corners, top, bottom0, bottom1) => {
    const xyz=[];for(const [x,z] of corners)xyz.push(x,top,z);
    corners.forEach(([x,z],i)=>xyz.push(x,i<2?bottom0:bottom1,z));
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(xyz,3));
    geo.setIndex([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]);
    const flat=geo.toNonIndexed();geo.dispose();flat.computeVertexNormals();
    const mesh=new THREE.Mesh(flat,trimMat);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);
  };
  for (let i = 0; i < S.treads.winders; i++) {
    const da = Math.PI / 2 / S.treads.winders;
    const a0 = -Math.PI / 2 + i * da, a1 = a0 + da;
    const top = yBase + (i + 1) * sh;
    for(let slice=0;slice<8;slice++) {
      const start=a0+(a1-a0)*slice/8, end=a0+(a1-a0)*(slice+1)/8;
      const point=(r,a)=>[S.curveCenter[0]+Math.cos(a)*r,S.curveCenter[1]+Math.sin(a)*r];
      treadBody([point(S.curveInnerRadius,start),point(S.curveOuterRadius,start),point(S.curveOuterRadius,end),point(S.curveInnerRadius,end)],top-cap,top-sh-.5+sh*slice/8,top-sh-.5+sh*(slice+1)/8);
    }
    const tread = wedge(S.curveInnerRadius - 0.035, S.curveOuterRadius + 0.025, a0 - 0.006, a1, cap, treadMat);
    tread.position.set(S.curveCenter[0], top, S.curveCenter[1]);
    surfaceUVs(tread.geometry, treadMat); g.add(tread);
    treadTops.push(top);
    for (const f of [0.22, 0.72]) {
      const angle = a0 + f * da;
      const railY = yBase + (i + f) * sh + 3.1;
      picket(innerRail, S.curveCenter[0] + Math.cos(angle) * (S.curveInnerRadius + 0.09), S.curveCenter[1] + Math.sin(angle) * (S.curveInnerRadius + 0.09), top, railY);
      // Painted outer skirt follows the rise against the stairwell wall.
      outerRail.push(new THREE.Vector3(S.curveCenter[0] + Math.cos(angle) * (S.curveOuterRadius - 0.04), railY - 2.72, S.curveCenter[1] + Math.sin(angle) * (S.curveOuterRadius - 0.04)));
    }
  }
  // Smooth plaster soffit under the curved flight; stairwell stays open below.
  const underside = [], indices = [];
  for(let i=0;i<=64;i++) {
    const a=-Math.PI/2+i/64*Math.PI/2, y=yBase+i/64*rise/2-.51;
    for(const r of [S.curveInnerRadius,S.curveOuterRadius])underside.push(S.curveCenter[0]+Math.cos(a)*r,y,S.curveCenter[1]+Math.sin(a)*r);
    if(i<64){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
  }
  const soffitGeo=new THREE.BufferGeometry();soffitGeo.setAttribute('position',new THREE.Float32BufferAttribute(underside,3));soffitGeo.setIndex(indices);soffitGeo.computeVertexNormals();
  const soffit=new THREE.Mesh(soffitGeo,trimMat);soffit.castShadow=soffit.receiveShadow=true;g.add(soffit);
  const L = S.landing;
  const landing = box(L.x1-L.x0, 0.45, L.z1-L.z0, trimMat, (L.x0+L.x1)/2, landingTop-0.225, (L.z0+L.z1)/2);
  landing.name = 'half-story-landing'; landing.userData.top = landingTop; g.add(landing);
  g.add(box(L.x1-L.x0, cap, L.z1-L.z0, treadMat, (L.x0+L.x1)/2, landingTop-cap/2, (L.z0+L.z1)/2));
  innerRail.push(new THREE.Vector3(L.x0 + 0.09, landingTop+3.1, S.return.z0-0.09));
  const R = S.return, depth = (R.x1-R.x0) / S.treads.return;
  for (let i=0;i<S.treads.return;i++) {
    const top = landingTop+(i+1)*sh, x=R.x1-(i+0.5)*depth;
    treadBody([[x+depth/2,R.z0],[x+depth/2,R.z1],[x-depth/2,R.z1],[x-depth/2,R.z0]],top-cap,top-sh-.5,top-.5);
    g.add(box(depth+0.07,cap,R.z1-R.z0+0.06,treadMat,x,top-cap/2,(R.z0+R.z1)/2));
    treadTops.push(top);
    picket(innerRail,x,R.z0+0.09,top,landingTop+(i+0.5)*sh+3.1);
    picket([],x,R.z1-0.09,top,landingTop+(i+0.5)*sh+3.1);
  }
  const underUpper=new THREE.BufferGeometry();underUpper.setAttribute('position',new THREE.Float32BufferAttribute([
    R.x1,landingTop-.51,R.z0,R.x1,landingTop-.51,R.z1,
    R.x0,yBase+rise-.51,R.z0,R.x0,yBase+rise-.51,R.z1],3));
  underUpper.setIndex([0,1,2,1,3,2]);underUpper.computeVertexNormals();
  const upperSoffit=new THREE.Mesh(underUpper,trimMat);upperSoffit.castShadow=upperSoffit.receiveShadow=true;g.add(upperSoffit);
  g.add(curvedRail(innerRail, railMat));
  g.add(curvedRail(outerRail, trimMat));
  const upperOuter = [new THREE.Vector3(R.x1,landingTop+3.1,R.z1-0.09),new THREE.Vector3(R.x0,yBase+rise+3.1,R.z1-0.09)];
  g.add(curvedRail(upperOuter,railMat));
  newel(S.curveCenter[0]+0.08,S.curveCenter[1]-S.curveInnerRadius, yBase);
  newel(S.curveCenter[0]+0.08,S.curveCenter[1]-S.curveOuterRadius, yBase);
  newel(R.x0,R.z0+0.09,yBase+rise);
  newel(R.x0,R.z1-0.09,yBase+rise);
  g.userData.stair = { yBase, rise, risers:n, landingTop, topFloor:yBase+rise, treadTops, style:'quarter-turn-half-landing-straight-return' };
  return g;
}

export function stairGuard(yFloor, railMat, panelMat = null, topFloor = false, balusterMat = railMat) {
  const g = new THREE.Group(), S = CORE.stair;
  const guard = (a,b) => panelMat ? railing(a,b,yFloor,3,railMat,panelMat) : traditionalRailing(a,b,yFloor,3,railMat,balusterMat);
  // Arrival at the west end of the upper flight remains open on every level.
  g.add(guard([S.west,S.south+3.6],[S.west,S.return.z0]));
  if (topFloor) {
    g.add(guard([S.west,S.south],[S.east,S.south]));
    g.add(guard([S.east,S.south],[S.east,S.north]));
    g.add(guard([S.east,S.north],[S.west,S.north]));
    g.add(guard([S.west,S.south],[S.west,S.south+3.6]));
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
