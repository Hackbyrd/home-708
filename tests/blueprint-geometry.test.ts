import { describe, expect, it } from 'vitest';
import { MeshBasicMaterial } from 'three';
import {
  CORE,
  FOOTPRINT,
  HOUSE,
  OPTIONAL,
  ROOMS,
  SOURCE_DIMENSIONS,
  TERRACES,
  extents,
} from '../data/blueprint.js';
import { mainStair, spiralStair, stairHole, WELL } from '../src/parts.js';

type Point = readonly [number, number];

function pointInPolygon([x, z]: Point, polygon: readonly Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    const cross = (x - xi) * (zj - zi) - (z - zi) * (xj - xi);
    const onSegment = Math.abs(cross) < 1e-7
      && x >= Math.min(xi, xj) - 1e-7 && x <= Math.max(xi, xj) + 1e-7
      && z >= Math.min(zi, zj) - 1e-7 && z <= Math.max(zi, zj) + 1e-7;
    if (onSegment) return true;
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi)
      inside = !inside;
  }
  return inside;
}

function expectPolygonInside(inner: readonly Point[], outer: readonly Point[]) {
  for (const point of inner) expect(pointInPolygon(point, outer)).toBe(true);
}

function rectangleArea(bounds: readonly Point[]) {
  const { x0, x1, z0, z1 } = extents({ bounds });
  return (x1 - x0) * (z1 - z0);
}

function overlapArea(a: readonly Point[], b: readonly Point[]) {
  const A = extents({ bounds: a });
  const B = extents({ bounds: b });
  return Math.max(0, Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0))
    * Math.max(0, Math.min(A.z1, B.z1) - Math.max(A.z0, B.z0));
}

describe('blueprint coordinate model', () => {
  it('keeps traced room regions inside their floor footprints', () => {
    for (const room of Object.values(ROOMS.entry))
      expectPolygonInside(room.bounds, FOOTPRINT.full);
    for (const room of Object.values(ROOMS.main))
      expectPolygonInside(room.bounds, FOOTPRINT.full);
    for (const room of Object.values(ROOMS.upper))
      expectPolygonInside(room.bounds, FOOTPRINT.upper);
    for (const room of Object.values(ROOMS.penthouse))
      expectPolygonInside(room.bounds, FOOTPRINT.upper);
  });

  it('builds rectangular room bounds at their printed dimensions', () => {
    for (const floor of Object.values(ROOMS)) {
      for (const definition of Object.values(floor)) {
        if (!definition.source || definition.regions) continue;
        const actual = extents(definition);
        expect(actual.x1 - actual.x0).toBeCloseTo(definition.source.width, 6);
        expect(actual.z1 - actual.z0).toBeCloseTo(definition.source.depth, 6);
      }
    }
  });

  it('uses an exact rotated living-terrace envelope and clips only enclosed areas', () => {
    const terrace = ROOMS.penthouse.livingTerrace;
    const nominal = extents(terrace);
    expect(nominal.x1 - nominal.x0).toBeCloseTo(terrace.source.depth, 6);
    expect(nominal.z1 - nominal.z0).toBeCloseTo(terrace.source.width, 6);
    expect(nominal.x1).toBe(HOUSE.width);

    const actualArea = terrace.regions.reduce((sum, region) => sum + rectangleArea(region), 0);
    expect(actualArea).toBeGreaterThan(rectangleArea(terrace.bounds) * 0.9);
    for (const terraceRegion of terrace.regions) {
      for (const enclosed of FOOTPRINT.penthouseEnclosedRegions)
        expect(overlapArea(terraceRegion, enclosed)).toBe(0);
      expect(overlapArea(terraceRegion, CORE.stairHole)).toBe(0);
      expect(overlapArea(terraceRegion, CORE.elevator.bounds)).toBe(0);
    }
  });

  it('keeps all three penthouse terraces distinct from enclosure and core', () => {
    const terraceRegions = [
      ...TERRACES.penthouseLivingRegions,
      ...TERRACES.penthouseDiningRegions,
      TERRACES.penthouseSun,
    ];
    for (const terraceRegion of terraceRegions) {
      for (const enclosed of FOOTPRINT.penthouseEnclosedRegions)
        expect(overlapArea(terraceRegion, enclosed)).toBe(0);
      expect(overlapArea(terraceRegion, CORE.stairHole)).toBe(0);
      expect(overlapArea(terraceRegion, CORE.elevator.bounds)).toBe(0);
    }
    for (const living of TERRACES.penthouseLivingRegions) {
      for (const dining of TERRACES.penthouseDiningRegions)
        expect(overlapArea(living, dining)).toBe(0);
      expect(overlapArea(living, TERRACES.penthouseSun)).toBe(0);
    }
    for (const dining of TERRACES.penthouseDiningRegions)
      expect(overlapArea(dining, TERRACES.penthouseSun)).toBe(0);
  });

  it('keeps the well, flights, and landing inside the aligned stair hole', () => {
    const hole = CORE.stairHole;
    expect(stairHole()).toEqual(hole);
    expect(WELL).toEqual(CORE.well);
    const S = CORE.stair;
    for (const region of [S.outbound, S.landing, S.return, S.terminalLanding]) {
      expectPolygonInside(
        [[region.x0, region.z0], [region.x1, region.z0], [region.x1, region.z1], [region.x0, region.z1]],
        hole,
      );
    }
    expectPolygonInside(
      [[WELL.x0, WELL.z0], [WELL.x1, WELL.z0], [WELL.x1, WELL.z1], [WELL.x0, WELL.z1]],
      hole,
    );
    expect(S.curveCenter[0] + S.curveOuterRadius).toBeLessThanOrEqual(S.east + 1e-9);
    expect(S.curveCenter[1] - S.curveOuterRadius).toBeGreaterThanOrEqual(S.south - 1e-9);
  });

  it('uses the accepted floor rises and eighteen equal stair rises', () => {
    expect(HOUSE.base.slice(1).map((base, i) => base - HOUSE.base[i])).toEqual(HOUSE.rises);
    const material = new MeshBasicMaterial();
    for (let level = 0; level < HOUSE.rises.length; level++) {
      const stair = mainStair(HOUSE.base[level], HOUSE.rises[level], material, material);
      expect(stair.userData.stair).toMatchObject({
        yBase: HOUSE.base[level],
        rise: HOUSE.rises[level],
        risers: CORE.stair.treads.total,
      });
      expect(stair.userData.stair.risers).toBe(18);
    }
  });

  it('preserves authoritative printed source dimensions in feet', () => {
    expect(SOURCE_DIMENSIONS.entry.garage).toEqual([30 + 2 / 12, 21]);
    expect(SOURCE_DIMENSIONS.main.kitchen).toEqual([14 + 7 / 12, 18 + 7 / 12]);
    expect(SOURCE_DIMENSIONS.upper.ownerBath).toEqual([14 + 8 / 12, 18 + 8 / 12]);
    expect(SOURCE_DIMENSIONS.penthouse.loft).toEqual([23 + 10 / 12, 16 + 6 / 12]);
    expect(SOURCE_DIMENSIONS.penthouse.livingTerrace).toEqual([17 + 3 / 12, 17 + 1 / 12]);
  });

  it('aligns the optional spiral and supported landings on all terrace levels', () => {
    const spiral = OPTIONAL.exteriorSpiral;
    expect(OPTIONAL).toMatchObject({
      mainCurvedStair: true,
      elevator: true,
      upperWetBar: true,
      penthouseWetBar: true,
    });
    expect(CORE.elevator.servedLevels).toEqual(HOUSE.base);
    expect(overlapArea(CORE.elevator.bounds, CORE.stairHole)).toBe(0);
    expectPolygonInside(spiral.mainClearance, TERRACES.main);
    expect(spiral.y0).toBe(HOUSE.base[1]);
    expect(spiral.y1).toBe(HOUSE.base[3]);
    expect(spiral.landingLevels).toEqual([HOUSE.base[2], HOUSE.base[3]]);

    for (const landing of [spiral.upperLanding, spiral.penthouseLanding]) {
      const L = extents({ bounds: landing });
      expect(L.x0).toBeLessThan(FOOTPRINT.upper[3][0]);
      expect(L.x1).toBeGreaterThan(FOOTPRINT.upper[3][0]);
      expect(spiral.center[0]).toBeGreaterThanOrEqual(L.x0);
      expect(spiral.center[0]).toBeLessThanOrEqual(L.x1);
      expect(spiral.center[1]).toBeGreaterThanOrEqual(L.z0);
      expect(spiral.center[1]).toBeLessThanOrEqual(L.z1);
      expect(spiral.guardGap).toEqual({ z0: L.z0, z1: L.z1 });
    }

    const material = new MeshBasicMaterial();
    const geometry = spiralStair(
      spiral.center[0], spiral.center[1], spiral.y0, spiral.y1,
      spiral.radius, material, material,
    );
    expect(geometry.userData.spiral).toMatchObject({
      cx: spiral.center[0],
      cz: spiral.center[1],
      yBase: HOUSE.base[1],
      yTop: HOUSE.base[3],
      radius: spiral.radius,
    });
  });
});
