export type Floor = 'all' | 0 | 1 | 2 | 3
export type Season = 'summer' | 'spring' | 'fall' | 'winter'
export type SceneTime = 'day' | 'evening'
export type ViewMode = 'orbit' | 'walk'
export type QualityPreset = 'low' | 'balanced' | 'high'
export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

export interface LayoutDocument {
  version: 2
  id?: string
  name: string
  revision?: number
  createdAt?: string
  updatedAt?: string
  edits: Record<string, Record<string, unknown>>
  added: Array<Record<string, unknown>>
  rooms: Record<string, { floor?: string }>
  walls: Record<string, { paint?: string; src?: unknown }>
}

export interface CatalogItem {
  kind: string
  label: string
  category: string
  thumbnail?: string
  args?: unknown[]
}

export interface Swatch {
  key: string
  label: string
  color: string
}

export interface SceneSelection {
  id?: string
  label: string
  room?: string
  dimensions?: string
  clearances?: Partial<Record<'N' | 'S' | 'E' | 'W', string>>
  modular?: boolean
}

export interface SceneControllerLike {
  dispose(): void
  resize(): void
  setFloor(floor: Floor): void
  setTime(time: SceneTime): void
  setSeason(season: Season, options?: Record<string, boolean>): void
  setViewMode(mode: ViewMode): void
  setAutoOrbit(enabled: boolean, speed?: number): void
  setAudio(enabled: boolean): void
  setLayer(name: string, visible: boolean): void
  setGarageOpen(open: boolean): void
  setQuality(preset: QualityPreset): void
  setEditorEnabled(enabled: boolean): void
  placeItem(item: CatalogItem): void
  updateSelection(action: string, value?: unknown): void
  setRoomFinish(kind: 'floor' | 'wall', value: string): void
  exitRoom(): void
  loadLayout(layout: LayoutDocument): void
  getLayout(): LayoutDocument | null
  on(event: string, listener: (payload: unknown) => void): () => void
}
