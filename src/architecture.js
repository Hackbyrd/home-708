import * as THREE from 'three';
import { box, slab } from './parts.js';
import { FOOTPRINT } from '../data/blueprint.js';
import { surfaceUVs } from './surfaces.js';

// Roof sections follow the white house's south/east/rear photographs. The
// mansard encloses the fourth story; it does not sit on top of a full box story.
export function referenceRoof(M) {
  const g = new THREE.Group();
  g.name = 'photographed-mansard-and-dormers';
  const panel = (points, material = M.shingle) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(),3));
    geo.setIndex(points.length === 3 ? [0,1,2] : [0,1,2,0,2,3]);
    const flat = geo.toNonIndexed(); geo.dispose(); flat.computeVertexNormals();
    flat.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(flat.attributes.position.count*2).fill(0),2));
    surfaceUVs(flat,material);
    const m = new THREE.Mesh(flat,material); m.castShadow=m.receiveShadow=true;g.add(m);
  };
  const low=31.25, high=43.3;
  // East street face: slate hips flank the projecting three-window dormer.
  panel([[0,low,0],[9,low,0],[9,high,5.5],[5.5,high,5.5]]);
  panel([[24.4,low,0],[31.6,low,0],[29.2,high,5.5],[24.4,high,5.5]]);
  // South front: two steep slate cheeks flank the French-door dormer.
  panel([[0,low,0],[5.5,high,5.5],[5.5,high,11],[0,low,11]]);
  panel([[0,low,25.8],[5.5,high,25.8],[5.5,high,33.7],[0,low,33.7]]);
  // North cheek and rear return, ending at the open terrace.
  panel([[31.6,low,0],[31.6,low,13.3],[29.2,high,13.3],[29.2,high,5.5]]);

  g.add(slab(FOOTPRINT.penthouseEnclosure,[],.35,41.2,M.roofMembrane));
  // A continuous, shallow upper roof sits behind the dormer pediments.
  g.add(box(23.7,.25,21.1,M.roofMembrane,17.35,43.42,16.05));
  panel([[9,40.9,1.75],[24.4,40.9,1.75],[24.4,43.3,5.5],[9,43.3,5.5]]);
  panel([[2.55,40.9,11],[5.5,43.3,11],[5.5,43.3,25.8],[2.55,40.9,25.8]]);
  // Close the dormer roof ends where they meet the taller mansard cheeks.
  for (const x of [9,24.4]) panel([[x,40.9,1.75],[x,43.3,5.5],[x,40.9,5.5]]);
  for (const z of [11,25.8]) panel([[2.55,40.9,z],[5.5,43.3,z],[5.5,40.9,z]]);
  panel([[5.5,41.2,26.6],[5.5,43.3,26.6],[29.2,43.3,26.6],[29.2,41.2,26.6]]);
  panel([[29.2,41.2,13.3],[29.2,41.2,26.6],[29.2,43.3,26.6],[29.2,43.3,13.3]]);
  const cornice = (a,b,y) => {
    const len=Math.hypot(b[0]-a[0],b[1]-a[1]);
    for(const [h,d,dy] of [[.24,.8,-.5],[.32,1.05,-.24],[.12,1.45,0],[.14,1.3,.15]]){
      const m=box(len+.3,h,d,M.hoodMetal,(a[0]+b[0])/2,y+dy,(a[1]+b[1])/2);
      m.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);g.add(m);
    }
    for(let t=.6;t<len;t+=1.25){
      const p=new THREE.Vector2().lerpVectors(new THREE.Vector2(...a),new THREE.Vector2(...b),t/len);
      const dentil=box(.22,.25,.6,M.hoodMetal,p.x,y-.73,p.y);dentil.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);g.add(dentil);
    }
  };
  for(const [a,b] of [[[0,0],[9,0]],[[24.4,0],[31.6,0]],[[0,0],[0,11]],[[0,25.8],[0,33.7]],[[31.6,0],[31.6,13.3]]])cornice(a,b,31.7);
  cornice([9,1.75],[24.4,1.75],40.7);
  cornice([2.55,11],[2.55,25.8],40.7);
  cornice([14.75,30.8],[31,30.8],41.15);
  cornice([5.5,33.9],[14.75,33.9],41.15);
  const pediment=(x,z,rotation)=>{
    const p=new THREE.Group();
    const face=new THREE.Mesh(new THREE.CircleGeometry(4.25,48,0,Math.PI),M.hoodMetal);
    face.scale.y=.56; p.add(face);
    const arc=new THREE.Mesh(new THREE.TorusGeometry(4.15,.095,8,64,Math.PI),M.slate);
    arc.scale.y=.56;arc.position.z=.08;p.add(arc);
    const inner=new THREE.Mesh(new THREE.TorusGeometry(3.85,.045,6,56,Math.PI),M.hoodMetal);
    inner.scale.y=.54;inner.position.z=.11;p.add(inner);
    const medallion=new THREE.Mesh(new THREE.TorusGeometry(.56,.04,8,40),M.hoodMetal);
    medallion.position.set(0,.86,.12);p.add(medallion);
    p.position.set(x,40.8,z);p.rotation.y=rotation;g.add(p);
  };
  pediment(16.7,1.7,Math.PI);
  pediment(2.5,17.6,-Math.PI/2);
  g.userData.roof={eave:low,mansardTop:high,maxHeight:43.55,form:'inhabited-mansard-with-projecting-dormers'};
  return g;
}

// Applied cast-stone eyebrow lintels visible on the white-brick main story.
export function eyebrowLintel(w, M) {
  const g=new THREE.Group();
  const shape=new THREE.Shape();
  shape.moveTo(-w/2-.25,0);shape.quadraticCurveTo(0,.8,w/2+.25,0);
  shape.lineTo(w/2+.25,.22);shape.quadraticCurveTo(0,1.18,-w/2-.25,.22);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.35,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:2,steps:1,curveSegments:28});
  const m=new THREE.Mesh(geo,M.trimStone);m.castShadow=m.receiveShadow=true;g.add(m);
  for(const x of [-w/2-.1,w/2+.1])g.add(box(.32,.16,.42,M.trimStone,x,-.08,.15));
  return g;
}
