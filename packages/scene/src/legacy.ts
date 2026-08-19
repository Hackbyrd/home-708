import type {
  AudioController,
  EditorController,
  FurnitureFactory,
  FurnitureKit,
  HouseModel,
  Landscape,
  MaterialKit,
  Season,
  SeasonsController,
} from './types.js';

// These modules remain the procedural source of truth. Vite bundles them into
// the package build; the casts form the typed boundary around the legacy JS.
// @ts-expect-error Legacy JavaScript module has no declarations.
import { makeMaterials as legacyMakeMaterials } from '../../../src/materials.js';
// @ts-expect-error Legacy JavaScript module has no declarations.
import { makeFurnitureKit as legacyMakeFurnitureKit } from '../../../src/furniture.js';
// @ts-expect-error Legacy JavaScript module has no declarations.
import { makeLandscape as legacyMakeLandscape } from '../../../src/landscape.js';
// @ts-expect-error Legacy JavaScript module has no declarations.
import { makeSeasons as legacyMakeSeasons } from '../../../src/seasons.js';
// @ts-expect-error Legacy JavaScript module has no declarations.
import { createHolidayAudio as legacyHolidayAudio, createLobbyAudio as legacyLobbyAudio } from '../../../src/audio.js';
// @ts-expect-error Legacy JavaScript module has no declarations.
import { CATALOG, FLOOR_SWATCHES, PAINTS, SWATCHES, makeEditor as legacyMakeEditor } from '../../../src/editor.js';
// @ts-expect-error Legacy JavaScript module has no declarations.
import { BASE, CEIL, D, W, buildHouse as legacyBuildHouse } from '../../../data/house.js';

export { BASE, CATALOG, CEIL, D, FLOOR_SWATCHES, PAINTS, SWATCHES, W };

export const makeMaterials = legacyMakeMaterials as () => MaterialKit;

export function makeFurnitureKit(materials: MaterialKit): FurnitureKit {
  const kit = legacyMakeFurnitureKit(materials) as FurnitureKit;

  // The legacy factory stamps kinds before several late factories are added.
  // Re-wrap every factory here so every package-created piece is identifiable.
  for (const [kind, factory] of Object.entries(kit)) {
    const typedFactory = factory as FurnitureFactory;
    kit[kind] = (...args: unknown[]) => {
      const item = typedFactory(...args);
      item.userData.kind = kind;
      return item;
    };
  }
  return kit;
}

export const buildHouse = legacyBuildHouse as (
  materials: MaterialKit,
  furniture: FurnitureKit,
) => HouseModel;

export const makeLandscape = legacyMakeLandscape as (
  materials: MaterialKit,
) => Landscape;

export const makeSeasons = legacyMakeSeasons as (
  materials: MaterialKit,
  landscape: Landscape,
  world: import('three').Group,
) => SeasonsController;

export const createLobbyAudio = legacyLobbyAudio as () => AudioController;
export const createHolidayAudio = legacyHolidayAudio as () => AudioController;

export interface MakeEditorOptions {
  scene: import('three').Scene;
  camera: import('three').PerspectiveCamera;
  renderer: import('three').WebGLRenderer;
  orbit: import('three/addons/controls/OrbitControls.js').OrbitControls;
  H: HouseModel;
  M: MaterialKit;
  K: FurnitureKit;
  BASE: number[];
  getFloor: () => string;
  setFloor: (floor: string) => void;
  onUI: (event: Record<string, unknown>) => void;
  onChange?: (state: Record<string, unknown>) => void;
}

export const makeEditor = legacyMakeEditor as (
  options: MakeEditorOptions,
) => EditorController;

export function isSeason(value: string): value is Season {
  return value === 'spring' || value === 'summer' || value === 'fall' || value === 'winter';
}
