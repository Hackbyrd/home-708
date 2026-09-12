import type {
  Camera,
  Group,
  Material,
  Object3D,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export type Floor = 'all' | 0 | 1 | 2 | 3;
export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type TimeOfDay = 'day' | 'evening';
export type QualityPreset = 'low' | 'balanced' | 'high';
export type SceneLayer =
  | 'house'
  | 'roof'
  | 'site'
  | 'landscape'
  | 'sky'
  | 'furniture'
  | 'labels'
  | 'optional';

export interface HouseModel {
  levels: [Group, Group, Group, Group];
  furn: [Group, Group, Group, Group];
  ceilings: [Group, Group, Group, Group];
  roof: Group;
  site: Group;
  optional: Group;
  labels: Object3D[][];
  evLights: Object3D[];
  floorPicks: Object3D[];
  tray: Group | null;
  garageDoors: Group[];
  smoke: Group | null;
}

export interface MaterialKit {
  [name: string]: Material;
  warmGlow: Material & { emissiveIntensity: number };
  onyx: Material & { emissiveIntensity: number };
  screenGlow: Material & { emissiveIntensity: number };
}

export type FurnitureFactory = (...args: unknown[]) => Group;
export type FurnitureKit = Record<string, FurnitureFactory>;

export interface Landscape {
  ground: Group;
  sky: Group;
  evening: Object3D[];
  treeMats: Array<Material & { color: { setHex(value: number): void } }>;
  treeLeaves: Object3D[];
  setNight(night: boolean): void;
  tick(deltaSeconds: number): void;
}

export interface SeasonsController {
  setFloor(floor: Floor): void;
  setSeason(season: Season): void;
  setSnowing(enabled: boolean): void;
  setXmas(enabled: boolean): void;
  setHalloween(enabled: boolean): void;
  tick(deltaSeconds: number, evening: boolean): void;
}

export interface AudioController {
  readonly on?: boolean;
  readonly active?: boolean;
  start(mode?: 'xmas' | 'halloween'): Promise<void>;
  stop(): void;
  toggle?(): boolean;
}

export interface EditorController {
  readonly enabled: boolean;
  readonly focusedRoom: { level?: number } | null;
  readonly selection: { id: string; kind: string } | null;
  applyOverrides(): void;
  getState(): Record<string, unknown>;
  clearSelection(): void;
  setEnabled(enabled: boolean): void;
  tick(deltaSeconds: number): void;
  beginPlace(kind: string, label: string, args?: unknown[]): void;
  beginPaint(key: string | null): void;
  resizeSelected(axis: string, direction: number): void;
  modifySofa(operation: string): void;
  styleSelected(slot: 'p' | 'a', materialKey: string | null): void;
  setRoomFloor(materialKey: string | null): void;
  exitRoom(): void;
  resetFloor(floor: string): void;
  exportLayout(): void;
  importLayout(json: unknown): void;
  listLayouts(): string[];
  saveLayoutAs(name: string): void;
  loadLayout(name: string): boolean;
  deleteLayout(name: string): void;
}

export interface SceneState {
  floor: Floor;
  timeOfDay: TimeOfDay;
  season: Season;
  snowing: boolean;
  xmas: boolean;
  halloween: boolean;
  mode: 'orbit' | 'walk';
  garageOpen: boolean;
  editing: boolean;
  quality: QualityPreset;
}

export interface SceneEventMap {
  state: SceneState;
  ui: Record<string, unknown>;
  resize: { width: number; height: number; pixelRatio: number };
  frame: { deltaSeconds: number; elapsedSeconds: number };
  dispose: undefined;
}

export type PbrHook = (context: {
  scene: Scene;
  world: Group;
  materials: MaterialKit;
  renderer: WebGLRenderer;
}) => void | (() => void);

export type RenderPipeline = (context: {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: Camera;
  deltaSeconds: number;
}) => void;

export interface SceneControllerOptions {
  container: HTMLElement;
  quality?: QualityPreset;
  autoStart?: boolean;
  editor?: boolean;
  antialias?: boolean;
  alpha?: boolean;
  debug?: boolean;
  pbrHooks?: PbrHook[];
  renderPipeline?: RenderPipeline;
  onUI?: (event: Record<string, unknown>) => void;
  rendererFactory?: (parameters: {
    antialias: boolean;
    alpha: boolean;
    powerPreference: WebGLPowerPreference;
  }) => WebGLRenderer;
}

export interface SceneDebugApi {
  readonly scene: Scene;
  readonly world: Group;
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  readonly orbit: OrbitControls;
  readonly house: HouseModel;
  readonly materials: MaterialKit;
  readonly furniture: FurnitureKit;
  readonly editor: EditorController | null;
  getState(): SceneState;
  getAudioMode(): 'off' | 'lobby' | 'xmas' | 'halloween';
  stop(): void;
  renderOnce(): void;
  setFloor(floor: Floor): void;
  view(position: [number, number, number], target: [number, number, number]): void;
}
