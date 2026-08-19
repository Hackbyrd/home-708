import type { Object3D } from 'three';
import type { HouseModel } from './types.js';

export interface PlanPoint {
  x: number;
  y?: number;
  z: number;
}

export interface WorldPoint {
  x: number;
  y: number;
  z: number;
}

/** Converts legacy plan coordinates through the required mirrored world root. */
export function planToWorld(point: PlanPoint): WorldPoint {
  return { x: -point.x, y: point.y ?? 0, z: point.z };
}

export function worldToPlan(point: WorldPoint): PlanPoint & { y: number } {
  return { x: -point.x, y: point.y, z: point.z };
}

export interface IdValidation {
  valid: boolean;
  ids: string[];
  duplicates: string[];
  missing: Object3D[];
}

export function validateFurnitureIds(house: Pick<HouseModel, 'furn'>): IdValidation {
  const ids: string[] = [];
  const missing: Object3D[] = [];
  const counts = new Map<string, number>();

  for (const floor of house.furn) {
    for (const item of floor.children) {
      const id = item.userData.id;
      if (typeof id !== 'string' || !id) {
        missing.push(item);
        continue;
      }
      ids.push(id);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  const duplicates = [...counts]
    .filter(([, count]) => count > 1)
    .map(([id]) => id)
    .sort();
  return { valid: duplicates.length === 0 && missing.length === 0, ids, duplicates, missing };
}
