import {
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PMREMGenerator,
  Vector2,
  WebGLRenderer,
  type Camera,
  type Material,
  type Scene,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import type { PbrHook, QualityPreset, RenderPipeline } from './types.js';

/**
 * A local PMREM environment gives the procedural materials stable image-based
 * lighting without adding a large network HDR asset to the initial download.
 */
export const createPbrEnvironmentHook = (intensity = 1): PbrHook => {
  return ({ scene, world, renderer }) => {
    const generator = new PMREMGenerator(renderer);
    generator.compileEquirectangularShader();
    const room = new RoomEnvironment();
    const target = generator.fromScene(room, 0.04);
    scene.environment = target.texture;

    world.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) tuneMaterial(material, intensity);
    });

    return () => {
      if (scene.environment === target.texture) scene.environment = null;
      room.dispose();
      target.dispose();
      generator.dispose();
    };
  };
};

function tuneMaterial(material: Material, intensity: number): void {
  if (material instanceof MeshStandardMaterial || material instanceof MeshPhysicalMaterial) {
    material.envMapIntensity = intensity;
    material.roughness = Math.max(0.08, Math.min(1, material.roughness));
    material.metalness = Math.max(0, Math.min(1, material.metalness));
    if (material instanceof MeshPhysicalMaterial && material.transparent) {
      material.depthWrite = false;
      material.ior = Math.max(1, material.ior);
    }
    material.needsUpdate = true;
  }
}

export interface ProductionPipeline {
  render: RenderPipeline;
  setQuality(preset: QualityPreset): void;
  resize(width: number, height: number, pixelRatio: number): void;
  dispose(): void;
}

/**
 * Selective post-processing: high gets SSAO plus FXAA; balanced gets lightweight
 * FXAA; low renders directly. This keeps the default useful on integrated GPUs.
 */
export function createProductionPipeline(initial: QualityPreset = 'balanced'): ProductionPipeline {
  let quality = initial;
  let composer: EffectComposer | null = null;
  let renderPass: RenderPass | null = null;
  let ssao: SSAOPass | null = null;
  let bloom: UnrealBloomPass | null = null;
  let fxaa: ShaderPass | null = null;
  let rendererRef: WebGLRenderer | null = null;
  let sceneRef: Scene | null = null;
  let cameraRef: Camera | null = null;
  const size = new Vector2(1, 1);
  let pixelRatio = 1;

  // EffectComposer disposes its buffers, but passes own additional GPU targets.
  const disposeComposer = (): void => {
    for (const pass of composer?.passes ?? []) pass.dispose();
    composer?.dispose();
    composer = null;
  };

  const resizeComposer = (): void => {
    composer?.setPixelRatio(pixelRatio);
    composer?.setSize(size.x, size.y);
    fxaa?.material.uniforms.resolution?.value.set(1 / (size.x * pixelRatio), 1 / (size.y * pixelRatio));
  };

  const rebuild = (renderer: WebGLRenderer, scene: Scene, camera: Camera): void => {
    disposeComposer();
    rendererRef = renderer;
    sceneRef = scene;
    cameraRef = camera;
    if (quality === 'low') return;
    composer = new EffectComposer(renderer);
    renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    ssao = null;
    if (quality === 'high') {
      ssao = new SSAOPass(scene, camera, size.x, size.y);
      ssao.kernelRadius = 0.65;
      ssao.minDistance = 0.0005;
      ssao.maxDistance = 0.018;
      composer.addPass(ssao);
    }
    bloom = new UnrealBloomPass(size, quality === 'high' ? 0.12 : 0.06, 0.3, 1.05);
    composer.addPass(bloom);
    fxaa = new ShaderPass(FXAAShader);
    composer.addPass(fxaa);
    composer.addPass(new OutputPass());
    resizeComposer();
  };

  return {
    render({ renderer, scene, camera, deltaSeconds }) {
      if (quality === 'low') {
        rendererRef = renderer; sceneRef = scene; cameraRef = camera;
        renderer.render(scene, camera);
        return;
      }
      if (!composer || renderer !== rendererRef || scene !== sceneRef || camera !== cameraRef) {
        rebuild(renderer, scene, camera);
      }
      composer!.render(deltaSeconds);
    },
    setQuality(preset) {
      if (preset === quality) return;
      quality = preset;
      if (rendererRef && sceneRef && cameraRef) rebuild(rendererRef, sceneRef, cameraRef);
    },
    resize(width, height, ratio) {
      size.set(Math.max(1, width), Math.max(1, height));
      pixelRatio = Math.max(0.5, ratio);
      resizeComposer();
    },
    dispose() {
      disposeComposer();
      composer = null;
      renderPass = null;
      ssao = null;
      bloom = null;
      fxaa = null;
      rendererRef = null;
      sceneRef = null;
      cameraRef = null;
    },
  };
}
