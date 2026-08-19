import {
  InstancedMesh,
  Matrix4,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three';

export class ObjectPool<T> {
  private readonly available: T[] = [];
  private readonly active = new Set<T>();
  private readonly create: () => T;
  private readonly reset: (item: T) => void;

  constructor(
    create: () => T,
    reset: (item: T) => void = () => undefined,
    initialSize = 0,
  ) {
    this.create = create;
    this.reset = reset;
    for (let index = 0; index < initialSize; index++) this.available.push(create());
  }

  acquire(): T {
    const item = this.available.pop() ?? this.create();
    this.active.add(item);
    return item;
  }

  release(item: T): void {
    if (!this.active.delete(item)) return;
    this.reset(item);
    this.available.push(item);
  }

  releaseAll(): void {
    for (const item of [...this.active]) this.release(item);
  }

  get activeCount(): number {
    return this.active.size;
  }
}

export function createInstances(
  geometry: BufferGeometry,
  material: Material | Material[],
  transforms: readonly Matrix4[],
): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, transforms.length);
  transforms.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

export function disposeObjectTree(root: Object3D): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  root.traverse((object) => {
    const renderable = object as Object3D & {
      geometry?: BufferGeometry;
      material?: Material | Material[];
    };
    if (renderable.geometry) geometries.add(renderable.geometry);
    const list = Array.isArray(renderable.material)
      ? renderable.material
      : renderable.material ? [renderable.material] : [];
    for (const material of list) materials.add(material);
  });

  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value && typeof value === 'object' && 'isTexture' in value) {
        (value as { dispose(): void }).dispose();
      }
    }
    material.dispose();
  }
}
