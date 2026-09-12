import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoxGeometry, DoubleSide, Group, MeshStandardMaterial } from 'three';
import { surfaceUVs } from '../src/surfaces.js';
import { foliage, leafGeometry } from '../src/botanical.js';
import { makeFurnitureKit } from '../src/furniture.js';
import { makeSeasons } from '../src/seasons.js';

afterEach(() => vi.unstubAllGlobals());

describe('architectural texture coordinates', () => {
  it('keeps texture density constant across differently sized wall segments', () => {
    const material = new MeshStandardMaterial();
    material.userData.textureSize = [5.33, 2.67];
    for (const width of [2, 8, 30]) {
      const geometry = new BoxGeometry(width, 10, 0.5);
      const positions = Array.from(geometry.attributes.position.array);
      surfaceUVs(geometry, material, [width / 2, 5, 0]);
      const { normal, uv, position } = geometry.attributes;
      for (let i = 0; i < position.count; i++) {
        if (normal.getZ(i) !== 1) continue;
        expect(uv.getX(i)).toBeCloseTo(position.getX(i) + width / 2);
        expect(uv.getY(i)).toBeCloseTo(position.getY(i) + 5);
      }
      expect(Array.from(position.array)).toEqual(positions);
    }
  });

  it('uses finish-independent UVs so saved room finish changes retain their scale', () => {
    const oak = new MeshStandardMaterial(), tile = new MeshStandardMaterial();
    oak.userData.textureSize = [3.33, 8];
    tile.userData.textureSize = [4, 4];
    const a = surfaceUVs(new BoxGeometry(12, 0.1, 15), oak);
    const b = surfaceUVs(new BoxGeometry(12, 0.1, 15), tile);
    expect(Array.from(a.attributes.uv.array)).toEqual(Array.from(b.attributes.uv.array));
  });
});

it('builds deterministic, bounded foliage compatible with mirrored seasonal materials', () => {
  const material = new MeshStandardMaterial();
  const geo = leafGeometry();
  const centers = [[0, 10, 0, 3]];
  const a = foliage(geo, material, centers, 250, 708);
  const b = foliage(geo, material, centers, 250, 708);
  expect(a.count).toBe(250);
  expect(a.geometry.index!.count).toBe(18);
  expect(Array.from(a.instanceMatrix.array)).toEqual(Array.from(b.instanceMatrix.array));
  expect(a.boundingSphere!.radius).toBeLessThan(4);
  expect(material.side).toBe(DoubleSide);
  material.color.setHex(0xcc6622);
  expect(a.material).toBe(material);
  expect(b.material).toBe(material);
});

it('retains legacy factory origins used by saved furniture elevation overrides', () => {
  const materials = Object.fromEntries(['walnut', 'brass', 'wall', 'shearling']
    .map(key => [key, new MeshStandardMaterial()]));
  const kit = makeFurnitureKit(materials);
  for (const [item, expectedOrigin] of [
    [kit.nightstand(), 1.7], [kit.dresser(), 1.3], [kit.bench(), 0.75], [kit.upperRun(6), 1.3],
  ] as const) {
    expect(item.position.y).toBe(expectedOrigin);
    expect(item.userData.kind).toBeTruthy();
  }
});

it('hides unsupported snow surfaces when peeling a floor and restores them in All', () => {
  // Only the decorative spider-web canvas needs a DOM; snow is real geometry.
  const context = new Proxy({}, { get: () => () => undefined });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) });
  const materials = new Proxy({} as Record<string, MeshStandardMaterial>, {
    get(target, key: string) { return target[key] ??= new MeshStandardMaterial(); },
  });
  const world = new Group();
  const seasons = makeSeasons(materials, { treeMats: [materials.treeA, materials.treeB], treeLeaves: [] }, world);
  const snow = world.getObjectByName('seasonal-snow-cover')!;
  seasons.setSeason('winter');
  seasons.setFloor(1);
  expect(snow.visible).toBe(true);
  expect(snow.children.some(cover => cover.visible && cover.position.y > 21)).toBe(false);
  expect(snow.children.some(cover => cover.visible && cover.position.y > 0)).toBe(true);
  seasons.setFloor('all');
  expect(snow.children.every(cover => cover.visible)).toBe(true);
});
