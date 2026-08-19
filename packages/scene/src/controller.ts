import {
  ACESFilmicToneMapping,
  AmbientLight,
  Clock,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { planToWorld, validateFurnitureIds } from './invariants.js';
import {
  BASE,
  CATALOG,
  D,
  W,
  buildHouse,
  createHolidayAudio,
  createLobbyAudio,
  makeEditor,
  makeFurnitureKit,
  makeLandscape,
  makeMaterials,
  makeSeasons,
} from './legacy.js';
import { AdaptiveQuality, applyQuality } from './quality.js';
import {
  createPbrEnvironmentHook,
  createProductionPipeline,
  type ProductionPipeline,
} from './pbr.js';
import { disposeObjectTree } from './resources.js';
import type {
  EditorController,
  Floor,
  PbrHook,
  QualityPreset,
  SceneControllerOptions,
  SceneDebugApi,
  SceneEventMap,
  SceneLayer,
  SceneState,
  Season,
  TimeOfDay,
} from './types.js';

type Listener<K extends keyof SceneEventMap> = (event: SceneEventMap[K]) => void;

const AERIAL_POSITION = new Vector3(56, 60, -62);
const AERIAL_TARGET = new Vector3(-W / 2, 13, D / 2 - 4);

export class SceneController {
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  readonly orbit: OrbitControls;
  readonly walkControls: PointerLockControls;
  readonly world = new Group();
  readonly materials = makeMaterials();
  readonly furniture = makeFurnitureKit(this.materials);
  readonly house = buildHouse(this.materials, this.furniture);
  readonly landscape = makeLandscape(this.materials);
  readonly seasons = makeSeasons(this.materials, this.landscape, this.world);
  readonly lobbyAudio = createLobbyAudio();
  readonly holidayAudio = createHolidayAudio();
  readonly editor: EditorController | null;

  private readonly container: HTMLElement;
  private readonly win: Window;
  private readonly sun = new DirectionalLight(0xfff2dd, 1.25);
  private readonly hemisphere = new HemisphereLight(0xd6e4ee, 0xa8a49a, 0.34);
  private readonly ambient = new AmbientLight(0xfff4e4, 0.12);
  private readonly clock = new Clock(false);
  private readonly keys = new Set<string>();
  private readonly listeners = new Map<keyof SceneEventMap, Set<(event: unknown) => void>>();
  private readonly hookCleanups: Array<() => void> = [];
  private readonly resizeObserver: ResizeObserver | null;
  private readonly adaptiveQuality: AdaptiveQuality;
  private readonly labels = new Group();
  private readonly layers: Record<SceneLayer, Object3D>;
  private readonly renderPipeline: SceneControllerOptions['renderPipeline'];
  private readonly productionPipeline: ProductionPipeline | null;
  private animationFrame: number | null = null;
  private disposed = false;
  private elapsed = 0;
  private adaptiveScale = 1;
  private walkFloor = 0;
  private garageAngle = 0;
  private debugInstalled = false;
  private audioEnabled = false;
  private activeAudioMode: 'off' | 'lobby' | 'xmas' | 'halloween' = 'off';
  private readonly onAudioUnlock = (): void => {
    if (!this.audioEnabled) return;
    const holiday = this.state.xmas || this.state.halloween;
    if ((holiday && !this.holidayAudio.active) || (!holiday && !this.lobbyAudio.on)) {
      this.setAudio(true);
    }
  };

  private state: SceneState;

  constructor(options: SceneControllerOptions) {
    if (!options.container) throw new TypeError('SceneController requires a container');
    const win = options.container.ownerDocument.defaultView;
    if (!win) throw new Error('SceneController requires a browser window');
    this.container = options.container;
    this.win = win;

    const quality = options.quality ?? 'balanced';
    this.productionPipeline = options.renderPipeline ? null : createProductionPipeline(quality);
    this.renderPipeline = options.renderPipeline ?? this.productionPipeline!.render;
    this.state = {
      floor: 'all',
      timeOfDay: 'day',
      season: 'summer',
      snowing: false,
      xmas: false,
      halloween: false,
      mode: 'orbit',
      garageOpen: false,
      editing: false,
      quality,
    };

    this.renderer = options.rendererFactory?.({
      antialias: options.antialias ?? quality !== 'low',
      alpha: options.alpha ?? false,
      powerPreference: 'high-performance',
    }) ?? new WebGLRenderer({
      antialias: options.antialias ?? quality !== 'low',
      alpha: options.alpha ?? false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.78;
    this.renderer.setClearColor(0xdce4e6, 1);
    this.renderer.domElement.dataset.scene = 'city-home';
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.setAttribute('aria-label', 'Interactive 3D view of The City Home');
    this.container.appendChild(this.renderer.domElement);

    this.camera = new PerspectiveCamera(46, 1, 0.1, 600);
    this.camera.position.set(46, 52, -52);
    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.target.copy(AERIAL_TARGET);
    this.orbit.maxPolarAngle = Math.PI * 0.495;
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.08;
    this.walkControls = new PointerLockControls(this.camera, this.renderer.domElement);

    this.configureLights();
    this.constructWorld();
    this.layers = {
      house: this.world,
      roof: this.house.roof,
      site: this.house.site,
      landscape: this.landscape.ground,
      sky: this.landscape.sky,
      furniture: new Group(),
      labels: this.labels,
      optional: this.house.optional,
    };

    this.editor = options.editor === false ? null : makeEditor({
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      orbit: this.orbit,
      H: this.house,
      M: this.materials,
      K: this.furniture,
      BASE,
      getFloor: () => String(this.state.floor),
      setFloor: (floor) => this.setFloor(parseFloor(floor)),
      onUI: (event) => {
        options.onUI?.(event);
        this.emit('ui', event);
      },
      onChange: (layout) => this.emit('ui', { layout }),
    });
    this.editor?.applyOverrides();

    this.adaptiveQuality = new AdaptiveQuality((scale) => {
      this.adaptiveScale = scale;
      this.applyQuality();
      this.resize();
    }, quality);
    this.applyQuality();
    this.applyFloor();
    this.setTimeOfDay('day');
    this.runPbrHooks([createPbrEnvironmentHook(), ...(options.pbrHooks ?? [])]);

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onWalkUnlock = this.onWalkUnlock.bind(this);
    this.win.addEventListener('keydown', this.onKeyDown);
    this.win.addEventListener('keyup', this.onKeyUp);
    this.win.addEventListener('pointerdown', this.onAudioUnlock);
    this.walkControls.addEventListener('unlock', this.onWalkUnlock);

    this.resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => this.resize());
    this.resizeObserver?.observe(this.container);
    this.resize();

    if (options.debug) this.installDebugApi();
    if (options.autoStart !== false) this.start();
  }

  on<K extends keyof SceneEventMap>(type: K, listener: Listener<K>): () => void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener as (event: unknown) => void);
    this.listeners.set(type, set);
    return () => set.delete(listener as (event: unknown) => void);
  }

  getState(): SceneState {
    return { ...this.state };
  }

  start(): void {
    this.assertActive();
    if (this.animationFrame !== null) return;
    this.clock.start();
    const frame = (): void => {
      if (this.disposed) return;
      this.animationFrame = this.win.requestAnimationFrame(frame);
      this.tick(Math.min(this.clock.getDelta(), 0.05));
    };
    this.animationFrame = this.win.requestAnimationFrame(frame);
  }

  stop(): void {
    if (this.animationFrame !== null) this.win.cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    this.clock.stop();
  }

  tick(deltaSeconds: number): void {
    this.assertActive();
    const dt = Math.max(0, Math.min(deltaSeconds, 0.05));
    this.elapsed += dt;
    this.landscape.tick(dt);
    this.editor?.tick(dt);
    this.seasons.tick(dt, this.state.timeOfDay === 'evening');
    this.stepSmoke(dt);
    this.stepGarage(dt);
    if (this.state.mode === 'walk') this.stepWalk(dt);
    else this.orbit.update();
    this.adaptiveQuality.sample(dt);

    if (this.renderPipeline) {
      this.renderPipeline({ renderer: this.renderer, scene: this.scene, camera: this.camera, deltaSeconds: dt });
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    this.emit('frame', { deltaSeconds: dt, elapsedSeconds: this.elapsed });
  }

  resize(width = this.container.clientWidth, height = this.container.clientHeight): void {
    if (this.disposed) return;
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));
    this.camera.aspect = safeWidth / safeHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(safeWidth, safeHeight, false);
    this.productionPipeline?.resize(safeWidth, safeHeight, this.renderer.getPixelRatio());
    this.emit('resize', {
      width: safeWidth,
      height: safeHeight,
      pixelRatio: this.renderer.getPixelRatio(),
    });
  }

  setFloor(floor: Floor): void {
    this.assertActive();
    this.state.floor = floor;
    if (floor !== 'all') this.walkFloor = floor;
    this.applyFloor();
    this.emitState();
  }

  setTimeOfDay(time: TimeOfDay): void {
    this.assertActive();
    const evening = time === 'evening';
    this.state.timeOfDay = time;
    this.landscape.setNight(evening);
    if (evening) {
      this.scene.background = new Color(0x0a111d);
      this.scene.fog = new Fog(0x0d1522, 200, 480);
      this.sun.position.set(85, 185, -175);
      this.sun.intensity = 0.28;
      this.sun.color.set(0xa9bcd8);
      this.hemisphere.intensity = 0.09;
      this.ambient.intensity = 0.08;
      this.scene.environmentIntensity = 0.08;
      this.renderer.toneMappingExposure = 0.9;
    } else {
      this.scene.background = new Color(0xdce4e6);
      this.scene.fog = new Fog(0xdde7ea, 220, 500);
      this.sun.position.set(52, 78, -46);
      this.sun.intensity = 1.25;
      this.sun.color.set(0xfff2dd);
      this.hemisphere.intensity = 0.34;
      this.ambient.intensity = 0.12;
      this.scene.environmentIntensity = 0.34;
      this.renderer.toneMappingExposure = 0.78;
    }
    for (const light of [...this.house.evLights, ...this.landscape.evening]) {
      const value = Number(light.userData.evening ?? 0);
      if ('intensity' in light) (light as Object3D & { intensity: number }).intensity = evening ? value : 0;
    }
    this.materials.warmGlow.emissiveIntensity = evening ? 1.5 : 0.15;
    this.materials.onyx.emissiveIntensity = evening ? 1.1 : 0.2;
    this.materials.screenGlow.emissiveIntensity = evening ? 1 : 0.5;
    this.emitState();
  }

  setEvening(enabled: boolean): void {
    this.setTimeOfDay(enabled ? 'evening' : 'day');
  }

  setTime(time: TimeOfDay): void {
    this.setTimeOfDay(time);
  }

  setSeason(
    season: Season,
    options?: { snowing?: boolean; christmas?: boolean; halloween?: boolean },
  ): void {
    this.assertActive();
    this.state.season = season;
    this.seasons.setSeason(season);
    if (season !== 'winter') {
      this.state.snowing = false;
      this.state.xmas = false;
    }
    if (season !== 'fall') this.state.halloween = false;
    if (options) {
      this.state.xmas = Boolean(options.christmas && season === 'winter');
      this.state.halloween = Boolean(options.halloween && season === 'fall');
      this.state.snowing = Boolean((options.snowing || this.state.xmas) && season === 'winter');
      this.seasons.setSnowing(this.state.snowing);
      this.seasons.setXmas(this.state.xmas);
      this.seasons.setHalloween(this.state.halloween);
    }
    if (this.state.xmas) {
      this.lobbyAudio.stop();
      void this.holidayAudio.start('xmas');
      this.activeAudioMode = 'xmas';
    } else if (this.state.halloween) {
      this.lobbyAudio.stop();
      void this.holidayAudio.start('halloween');
      this.activeAudioMode = 'halloween';
    } else {
      this.holidayAudio.stop();
      if (this.activeAudioMode === 'xmas' || this.activeAudioMode === 'halloween') {
        this.activeAudioMode = 'off';
      }
    }
    this.emitState();
  }

  setSnowing(enabled: boolean): void {
    if (enabled && this.state.season !== 'winter') this.setSeason('winter');
    this.state.snowing = enabled;
    this.seasons.setSnowing(enabled);
    this.emitState();
  }

  setXmas(enabled: boolean): void {
    if (enabled && this.state.season !== 'winter') this.setSeason('winter');
    this.state.xmas = enabled;
    this.state.halloween = false;
    this.seasons.setHalloween(false);
    this.seasons.setXmas(enabled);
    if (enabled) {
      this.state.snowing = true;
      this.seasons.setSnowing(true);
      this.lobbyAudio.stop();
      void this.holidayAudio.start('xmas');
      this.activeAudioMode = 'xmas';
    } else {
      this.holidayAudio.stop();
      this.activeAudioMode = 'off';
    }
    this.emitState();
  }

  setHalloween(enabled: boolean): void {
    if (enabled && this.state.season !== 'fall') this.setSeason('fall');
    this.state.halloween = enabled;
    this.state.xmas = false;
    this.seasons.setXmas(false);
    this.seasons.setHalloween(enabled);
    if (enabled) {
      this.lobbyAudio.stop();
      void this.holidayAudio.start('halloween');
      this.activeAudioMode = 'halloween';
    } else {
      this.holidayAudio.stop();
      this.activeAudioMode = 'off';
    }
    this.emitState();
  }

  setOrbit(enabled = true): void {
    if (!enabled) {
      this.orbit.enabled = false;
      return;
    }
    if (this.state.mode === 'walk') this.walkControls.unlock();
    this.state.mode = 'orbit';
    this.orbit.enabled = true;
    this.applyFloor();
    this.emitState();
  }

  setViewMode(mode: 'orbit' | 'walk'): void {
    if (mode === 'walk') this.setWalk(true);
    else this.setOrbit(true);
  }

  setAutoOrbit(enabled: boolean, speed = 1.8): void {
    this.orbit.autoRotate = enabled;
    this.orbit.autoRotateSpeed = speed;
  }

  setAudio(enabled: boolean): void {
    this.audioEnabled = enabled;
    if (!enabled) {
      this.lobbyAudio.stop();
      this.holidayAudio.stop();
      this.activeAudioMode = 'off';
      return;
    }
    if (this.state.xmas) {
      void this.holidayAudio.start('xmas');
      this.activeAudioMode = 'xmas';
    } else if (this.state.halloween) {
      void this.holidayAudio.start('halloween');
      this.activeAudioMode = 'halloween';
    } else {
      void this.lobbyAudio.start();
      this.activeAudioMode = 'lobby';
    }
  }

  setWalk(enabled = true, requestPointerLock = true): void {
    if (!enabled) {
      this.setOrbit(true);
      return;
    }
    this.setEditMode(false);
    this.state.mode = 'walk';
    this.walkFloor = this.state.floor === 'all' ? 0 : this.state.floor;
    this.state.floor = this.walkFloor as Floor;
    this.camera.position.set(-8, BASE[this.walkFloor]! + 5.4, 17.7);
    this.camera.lookAt(-20, BASE[this.walkFloor]! + 5.4, 17.7);
    this.orbit.enabled = false;
    this.applyFloor();
    if (requestPointerLock) this.walkControls.lock();
    this.emitState();
  }

  setGarageOpen(open: boolean): void {
    this.state.garageOpen = open;
    this.emitState();
  }

  toggleGarage(): void {
    this.setGarageOpen(!this.state.garageOpen);
  }

  setLayer(layer: SceneLayer | 'labels' | 'spiral', visible: boolean): void {
    if (layer === 'labels') {
      this.setLabels(visible);
      return;
    }
    if (layer === 'spiral') layer = 'optional';
    if (layer === 'furniture') {
      for (const furniture of this.house.furn) furniture.visible = visible;
    } else {
      this.layers[layer].visible = visible;
    }
    this.emit('ui', { layer, visible });
  }

  setLabels(visible: boolean): void {
    this.labels.userData.enabled = visible;
    this.updateLabels();
  }

  setEditMode(enabled: boolean): void {
    if (!this.editor) return;
    if (enabled && this.state.floor === 'all') this.setFloor(1);
    if (enabled && this.state.mode === 'walk') this.setOrbit(true);
    this.editor.setEnabled(enabled);
    this.state.editing = enabled;
    this.emitState();
  }

  beginCatalogPlace(kind: string, label = kind, args: unknown[] = []): void {
    if (!this.editor) throw new Error('Editor support is disabled');
    if (!this.editor.enabled) this.setEditMode(true);
    this.editor.beginPlace(kind, label, args);
  }

  placeItem(kind: string, label = kind, args: unknown[] = []): void {
    this.beginCatalogPlace(kind, label, args);
  }

  setEditorEnabled(enabled: boolean): void {
    this.setEditMode(enabled);
  }

  loadLayout(layout: Record<string, unknown>): void {
    this.editor?.importLayout(layout);
  }

  getLayout(): Record<string, unknown> | null {
    return this.editor?.getState() ?? null;
  }

  updateSelection(action: string, value?: unknown): void {
    if (!this.editor) return;
    if (action === 'clear') {
      this.editor.clearSelection();
      return;
    }
    if (action === 'resetFloor') {
      this.editor.resetFloor(String(value ?? this.state.floor));
      return;
    }
    if (action === 'primary' || action === 'finish') {
      this.editor.styleSelected('p', typeof value === 'string' ? value : null);
      return;
    }
    if (action === 'accent') {
      this.editor.styleSelected('a', typeof value === 'string' ? value : null);
      return;
    }
    const resizeActions: Record<string, [string, number]> = {
      scaleDown: ['xz', -1],
      scaleUp: ['xz', 1],
      widthDown: ['x', -1],
      widthUp: ['x', 1],
      depthDown: ['z', -1],
      depthUp: ['z', 1],
      heightDown: ['y', -1],
      heightUp: ['y', 1],
      resetScale: ['reset', 0],
    };
    if (resizeActions[action]) {
      this.editor.resizeSelected(...resizeActions[action]);
      return;
    }
    if (action === 'resize' && Array.isArray(value)) {
      this.editor.resizeSelected(String(value[0]), Number(value[1]));
      return;
    }
    if (action === 'sofa') this.editor.modifySofa(String(value));
    else if (action.startsWith('sofa:')) this.editor.modifySofa(action.slice(5));
  }

  setRoomFinish(kind: 'floor' | 'wall', value: string): void {
    if (kind === 'floor') this.editor?.setRoomFloor(value);
    else this.editor?.beginPaint(value);
  }

  exitRoom(): void {
    this.editor?.exitRoom();
  }

  getCatalog(): typeof CATALOG {
    return CATALOG;
  }

  setQuality(quality: QualityPreset): void {
    this.state.quality = quality;
    this.adaptiveQuality.setPreset(quality);
    this.productionPipeline?.setQuality(quality);
    this.applyQuality();
    this.resize();
    this.emitState();
  }

  registerPbrHook(hook: PbrHook): () => void {
    const cleanup = hook({
      scene: this.scene,
      world: this.world,
      materials: this.materials,
      renderer: this.renderer,
    });
    if (!cleanup) return () => undefined;
    this.hookCleanups.push(cleanup);
    return () => {
      const index = this.hookCleanups.indexOf(cleanup);
      if (index >= 0) this.hookCleanups.splice(index, 1);
      cleanup();
    };
  }

  getDebugApi(): SceneDebugApi {
    return {
      scene: this.scene,
      world: this.world,
      camera: this.camera,
      renderer: this.renderer,
      orbit: this.orbit,
      house: this.house,
      materials: this.materials,
      furniture: this.furniture,
      editor: this.editor,
      getState: () => this.getState(),
      getAudioMode: () => this.activeAudioMode,
      stop: () => this.stop(),
      renderOnce: () => this.tick(0),
      setFloor: (floor) => this.setFloor(floor),
      view: (position, target) => {
        this.camera.position.fromArray(position);
        this.orbit.target.fromArray(target);
        this.orbit.update();
      },
    };
  }

  validateIds(): ReturnType<typeof validateFurnitureIds> {
    return validateFurnitureIds(this.house);
  }

  dispose(): void {
    if (this.disposed) return;
    this.stop();
    this.disposed = true;
    this.resizeObserver?.disconnect();
    this.editor?.setEnabled(false);
    this.walkControls.unlock();
    this.walkControls.removeEventListener('unlock', this.onWalkUnlock);
    this.win.removeEventListener('keydown', this.onKeyDown);
    this.win.removeEventListener('keyup', this.onKeyUp);
    this.win.removeEventListener('pointerdown', this.onAudioUnlock);
    this.orbit.dispose();
    this.walkControls.dispose();
    this.lobbyAudio.stop();
    this.holidayAudio.stop();
    for (const cleanup of this.hookCleanups.splice(0)) cleanup();
    this.productionPipeline?.dispose();
    disposeObjectTree(this.world);
    disposeObjectTree(this.landscape.sky);
    this.renderer.dispose();
    this.renderer.domElement.remove();
    if (this.debugInstalled) delete (this.win as unknown as Record<string, unknown>).CH;
    this.emit('dispose', undefined);
    this.listeners.clear();
  }

  private configureLights(): void {
    this.sun.position.set(52, 78, -46);
    this.sun.target.position.copy(planToWorld({ x: W / 2, y: 8, z: D / 2 }));
    this.sun.castShadow = true;
    this.sun.shadow.camera.left = -62;
    this.sun.shadow.camera.right = 62;
    this.sun.shadow.camera.top = 62;
    this.sun.shadow.camera.bottom = -62;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 260;
    this.sun.shadow.bias = -0.0004;
    this.scene.add(this.hemisphere, this.ambient, this.sun, this.sun.target);
  }

  private constructWorld(): void {
    for (let index = 0; index < 4; index++) {
      this.house.levels[index]!.add(this.house.furn[index]!);
      for (const label of this.house.labels[index] ?? []) this.labels.add(label);
    }
    this.world.name = 'city-home-world';
    this.world.userData.coordinateSystem = 'mirrored-plan';
    this.world.scale.x = -1;
    this.world.add(
      this.house.site,
      this.house.roof,
      this.house.optional,
      ...this.house.levels,
      this.landscape.ground,
      this.labels,
    );
    this.scene.add(this.world, this.landscape.sky);
  }

  private applyFloor(): void {
    const top = this.state.floor === 'all' ? 3 : this.state.floor;
    for (let index = 0; index < 4; index++) this.house.levels[index]!.visible = index <= top;
    this.house.roof.visible = this.state.floor === 'all';
    if (this.house.tray) this.house.tray.visible = this.state.mode === 'walk' || this.state.floor === 'all';
    this.house.ceilings.forEach((group) => {
      group.visible = this.state.mode === 'walk' || this.state.floor === 'all';
    });
    this.updateLabels();
  }

  private updateLabels(): void {
    const enabled = this.labels.userData.enabled === true;
    this.house.labels.forEach((labels, index) => {
      const visible = enabled && this.state.floor !== 'all' && this.state.floor === index;
      for (const label of labels) label.visible = visible;
    });
  }

  private stepWalk(deltaSeconds: number): void {
    const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 22 : 11;
    const forwardAmount = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'));
    const rightAmount = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
    const forward = new Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new Vector3().crossVectors(forward, new Vector3(0, 1, 0));
    const move = new Vector3()
      .addScaledVector(forward, forwardAmount)
      .addScaledVector(right, rightAmount);
    if (move.lengthSq() > 0) this.camera.position.add(move.normalize().multiplyScalar(speed * deltaSeconds));
    this.camera.position.y = BASE[this.walkFloor]! + 5.4;
    this.camera.position.x = Math.max(-(W + 14), Math.min(14, this.camera.position.x));
    this.camera.position.z = Math.max(-14, Math.min(D + 16, this.camera.position.z));
  }

  private stepGarage(deltaSeconds: number): void {
    const target = this.state.garageOpen ? 1.45 : 0;
    this.garageAngle += (target - this.garageAngle) * Math.min(1, deltaSeconds * 2.5);
    for (const door of this.house.garageDoors) door.rotation.x = this.garageAngle;
  }

  private stepSmoke(deltaSeconds: number): void {
    if (!this.house.smoke || !this.house.roof.visible) return;
    for (const puff of this.house.smoke.children) {
      let age = Number(puff.userData.age ?? 0) + deltaSeconds * 0.2;
      if (age > 1) age -= 1;
      puff.userData.age = age;
      const drift = Number(puff.userData.drift ?? 0);
      puff.position.set(
        Math.sin(age * 6 + drift) * (0.25 + age * 1.4) + age * 2.4,
        age * 8,
        Math.cos(age * 5 + drift) * (0.25 + age * 1.1),
      );
      const scale = 0.9 + age * 3.6;
      puff.scale.set(scale, scale, 1);
      const sprite = puff as Object3D & { material?: Material & { opacity?: number } };
      if (sprite.material && 'opacity' in sprite.material) {
        sprite.material.opacity = age < 0.12
          ? (age / 0.12) * 0.5
          : 0.5 * (1 - (age - 0.12) / 0.88);
      }
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.keys.add(event.code);
    if (this.state.mode !== 'walk' || (event.code !== 'KeyQ' && event.code !== 'KeyE')) return;
    this.walkFloor = Math.max(0, Math.min(3, this.walkFloor + (event.code === 'KeyE' ? 1 : -1)));
    this.state.floor = this.walkFloor as Floor;
    this.camera.position.y = BASE[this.walkFloor]! + 5.4;
    this.applyFloor();
    this.emitState();
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keys.delete(event.code);
  }

  private onWalkUnlock(): void {
    if (this.disposed || this.state.mode !== 'walk') return;
    this.state.mode = 'orbit';
    this.orbit.enabled = true;
    this.applyFloor();
    this.emitState();
  }

  private applyQuality(): void {
    applyQuality(
      this.renderer,
      this.sun,
      this.state.quality,
      this.adaptiveScale,
      this.win.devicePixelRatio,
    );
  }

  private runPbrHooks(hooks: PbrHook[]): void {
    for (const hook of hooks) this.registerPbrHook(hook);
  }

  private installDebugApi(): void {
    (this.win as unknown as Record<string, unknown>).CH = this.getDebugApi();
    this.debugInstalled = true;
  }

  private emit<K extends keyof SceneEventMap>(type: K, event: SceneEventMap[K]): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  private emitState(): void {
    this.emit('state', this.getState());
  }

  private assertActive(): void {
    if (this.disposed) throw new Error('SceneController has been disposed');
  }
}

function parseFloor(value: string): Floor {
  if (value === 'all') return 'all';
  const floor = Number(value);
  if (floor === 0 || floor === 1 || floor === 2 || floor === 3) return floor;
  throw new RangeError(`Invalid floor: ${value}`);
}

export function createSceneController(options: SceneControllerOptions): SceneController {
  return new SceneController(options);
}

export { AERIAL_POSITION, AERIAL_TARGET };
