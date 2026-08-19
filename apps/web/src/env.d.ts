/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>
  export default component
}

declare module '@city-home/scene' {
  export const SceneController: unknown
  export const CATALOG: unknown
  export const SWATCHES: unknown
  export const FLOOR_SWATCHES: unknown
  export const PAINTS: unknown
  export function createSceneController(options: unknown): Promise<unknown>
}
