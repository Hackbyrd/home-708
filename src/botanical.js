import * as THREE from 'three';

// A folded leaf with a raised midrib. Instances retain real silhouettes and
// cast leaf-shaped shadows without alpha sorting or a network texture.
export function leafGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, -0.5, -0.25, 0, -0.12, -0.2, 0, 0.25, 0, 0.02, 0.5,
    0.2, 0, 0.25, 0.25, 0, -0.12, 0, 0.09, 0,
  ], 3));
  geometry.setIndex([0, 1, 6, 1, 2, 6, 2, 3, 6, 3, 4, 6, 4, 5, 6, 5, 0, 6]);
  geometry.computeVertexNormals();
  return geometry;
}

export function branchBetween(a, b, radius, material) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const direction = end.clone().sub(start);
  const branch = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.45, radius, direction.length(), 8), material);
  branch.position.copy(start).add(end).multiplyScalar(0.5);
  branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  branch.castShadow = branch.receiveShadow = true;
  return branch;
}

export function foliage(geometry, material, centers, count, seed, leafSize = 0.5) {
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  material.side = THREE.DoubleSide;
  const leaves = new THREE.InstancedMesh(geometry, material, count);
  const transform = new THREE.Object3D(), color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const [x, y, z, radius] = centers[i % centers.length];
    const angle = random() * Math.PI * 2, elevation = random() * 2 - 1;
    const distance = radius * Math.cbrt(random()), horizontal = Math.sqrt(1 - elevation * elevation);
    transform.position.set(x + Math.cos(angle) * distance * horizontal, y + elevation * distance * 0.8, z + Math.sin(angle) * distance * horizontal);
    transform.rotation.set(random() * 2.2, random() * Math.PI * 2, random() * 1.2);
    const scale = leafSize * (0.6 + random() * 0.8);
    transform.scale.set(scale, scale, scale);
    transform.updateMatrix(); leaves.setMatrixAt(i, transform.matrix);
    const shade = 0.68 + random() * 0.45;
    leaves.setColorAt(i, color.setRGB(shade, shade, shade * 0.93));
  }
  leaves.castShadow = leaves.receiveShadow = true;
  leaves.computeBoundingSphere();
  return leaves;
}
