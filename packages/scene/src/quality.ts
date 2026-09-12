import {
  PCFShadowMap,
  PCFSoftShadowMap,
  type DirectionalLight,
  type WebGLRenderer,
} from 'three';
import type { QualityPreset } from './types.js';

export interface QualityProfile {
  maxPixelRatio: number;
  minPixelRatio: number;
  shadows: boolean;
  softShadows: boolean;
  shadowMapSize: number;
  targetFps: number;
}

export const QUALITY_PROFILES: Readonly<Record<QualityPreset, QualityProfile>> = {
  low: {
    maxPixelRatio: 1,
    minPixelRatio: 0.75,
    shadows: false,
    softShadows: false,
    shadowMapSize: 512,
    targetFps: 30,
  },
  balanced: {
    maxPixelRatio: 1.5,
    minPixelRatio: 0.85,
    shadows: true,
    softShadows: true,
    shadowMapSize: 2048,
    targetFps: 50,
  },
  high: {
    maxPixelRatio: 2,
    minPixelRatio: 1,
    shadows: true,
    softShadows: true,
    shadowMapSize: 4096,
    targetFps: 58,
  },
};

export function resolvePixelRatio(
  preset: QualityPreset,
  devicePixelRatio = 1,
  adaptiveScale = 1,
): number {
  const profile = QUALITY_PROFILES[preset];
  return Math.max(
    profile.minPixelRatio,
    Math.min(profile.maxPixelRatio, devicePixelRatio * adaptiveScale),
  );
}

export function applyQuality(
  renderer: WebGLRenderer,
  sun: DirectionalLight,
  preset: QualityPreset,
  adaptiveScale = 1,
  devicePixelRatio = globalThis.devicePixelRatio ?? 1,
): number {
  const profile = QUALITY_PROFILES[preset];
  const ratio = resolvePixelRatio(preset, devicePixelRatio, adaptiveScale);
  renderer.setPixelRatio(ratio);
  renderer.shadowMap.enabled = profile.shadows;
  renderer.shadowMap.type = profile.softShadows ? PCFSoftShadowMap : PCFShadowMap;
  sun.castShadow = profile.shadows;
  if (sun.shadow.mapSize.x !== profile.shadowMapSize) {
    sun.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
  }
  return ratio;
}

export class AdaptiveQuality {
  private sampleTime = 0;
  private frames = 0;
  private cooldown = 0;
  private scale = 1;
  private readonly onScale: (scale: number) => void;
  private preset: QualityPreset;

  constructor(
    onScale: (scale: number) => void,
    preset: QualityPreset,
  ) {
    this.onScale = onScale;
    this.preset = preset;
  }

  setPreset(preset: QualityPreset): void {
    this.preset = preset;
    this.scale = 1;
    this.reset();
    this.onScale(this.scale);
  }

  sample(deltaSeconds: number): void {
    this.sampleTime += deltaSeconds;
    this.frames++;
    this.cooldown = Math.max(0, this.cooldown - deltaSeconds);
    if (this.sampleTime < 2 || this.cooldown > 0) return;

    const fps = this.frames / this.sampleTime;
    const target = QUALITY_PROFILES[this.preset].targetFps;
    const next =
      fps < target * 0.78 ? Math.max(0.62, this.scale - 0.1)
      : fps > target * 1.08 ? Math.min(1, this.scale + 0.05)
      : this.scale;

    this.reset();
    if (next !== this.scale) {
      this.scale = next;
      this.cooldown = 3;
      this.onScale(next);
    }
  }

  getScale(): number {
    return this.scale;
  }

  private reset(): void {
    this.sampleTime = 0;
    this.frames = 0;
  }
}
