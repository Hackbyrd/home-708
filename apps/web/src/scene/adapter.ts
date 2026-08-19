import type {
  CatalogItem,
  Floor,
  LayoutDocument,
  SceneControllerLike,
  SceneTime,
  Season,
  Swatch,
  ViewMode,
} from '../types'

type AnyFn = (...args: any[]) => any
type LooseController = Record<string, any>
type SceneModule = Record<string, any>

const fallbackColors: Record<string, string> = {
  linenCream: '#ddd3c3', velvetChar: '#393a37', velvetSlate: '#687079',
  leatherCamel: '#b8844e', leatherCognac: '#874d2c', shearling: '#e7dfcf',
  greige: '#aaa093', plum: '#614858', white: '#eeeae2', walnut: '#5c4433',
  oakWood: '#c9ae8c', teak: '#9a6b43', iron: '#414440', matBlack: '#222321',
  blackSteel: '#34383a', brass: '#b08d57', bronze: '#806143', graphite: '#555856',
  green: '#62705b', oakFloor: '#b99b73', stoneFloor: '#c6beb1', tileWhite: '#e5e2dc',
  slate: '#777b7c', pavers: '#a59686', rubber: '#484a48',
}

function cssColor(value: unknown, fallback: string) {
  if (typeof value === 'number') return `#${value.toString(16).padStart(6, '0')}`
  if (typeof value === 'string' && /^(#|rgb|hsl|oklch|var\()/.test(value)) return value
  return fallback
}

function call(target: LooseController, names: string[], ...args: unknown[]) {
  const method = names.find((name) => typeof target[name] === 'function')
  return method ? (target[method] as AnyFn)(...args) : undefined
}

function normalizeCatalog(source: unknown): CatalogItem[] {
  const rows: CatalogItem[] = []
  const groups = source instanceof Map ? [...source.entries()] : Array.isArray(source) ? source : []
  for (const entry of groups) {
    if (!Array.isArray(entry)) continue
    const [category, items] = entry
    if (!Array.isArray(items)) continue
    for (const item of items) {
      if (Array.isArray(item)) {
        const [kind, label, args] = item
        rows.push({ category: String(category), kind: String(kind), label: String(label), args })
      } else if (item && typeof item === 'object') {
        rows.push({ category: String(category), ...(item as Omit<CatalogItem, 'category'>) })
      }
    }
  }
  return rows
}

function normalizeSwatches(source: unknown): Swatch[] {
  if (!Array.isArray(source)) return []
  return source.map((item, index) => {
    if (Array.isArray(item)) {
      const key = String(item[0])
      return { key, label: String(item[1] ?? key), color: cssColor(item[2], fallbackColors[key] ?? '#b9b1a5') }
    }
    const value = item as Record<string, unknown>
    const key = String(value.key ?? value.id ?? index)
    return {
      key,
      label: String(value.label ?? value.name ?? value.key ?? 'Finish'),
      color: cssColor(value.color ?? value.hex, fallbackColors[key] ?? '#b9b1a5'),
    }
  })
}

export async function loadSceneExports() {
  const module = (await import('@city-home/scene')) as SceneModule
  return {
    module,
    catalog: normalizeCatalog(module.CATALOG),
    swatches: normalizeSwatches(module.SWATCHES),
    floorSwatches: normalizeSwatches(module.FLOOR_SWATCHES),
    paints: normalizeSwatches(module.PAINTS),
  }
}

export async function createSceneController(
  container: HTMLElement,
  events: Record<string, (payload: unknown) => void>,
): Promise<SceneControllerLike> {
  const { module } = await loadSceneExports()
  const Factory = module.SceneController ?? module.default
  const debug = import.meta.env.DEV
  let raw: LooseController

  if (typeof Factory === 'function') {
    try {
      raw = new Factory({ container, canvas: container.querySelector('canvas'), on: events, debug })
    } catch (objectSignatureError) {
      try {
        raw = new Factory(container, { canvas: container.querySelector('canvas'), on: events, debug })
      } catch {
        if (typeof module.createSceneController !== 'function') throw objectSignatureError
        raw = await module.createSceneController({ container, on: events, debug })
      }
    }
  } else if (typeof module.createSceneController === 'function') {
    raw = await module.createSceneController({ container, on: events, debug })
  } else {
    throw new Error('@city-home/scene does not export SceneController or createSceneController')
  }

  await call(raw, ['init', 'mount', 'start'], { container })

  const localListeners = new Map<string, Set<(payload: unknown) => void>>()
  const on = (event: string, listener: (payload: unknown) => void) => {
    const nativeOff = call(raw, ['on', 'addEventListener'], event, listener)
    if (typeof nativeOff === 'function') return nativeOff
    const set = localListeners.get(event) ?? new Set()
    set.add(listener)
    localListeners.set(event, set)
    return () => set.delete(listener)
  }
  let lastSelection: Record<string, unknown> | null = null
  on('ui', (payload) => {
    if (!payload || typeof payload !== 'object') return
    const event = payload as Record<string, unknown>
    if ('selected' in event) {
      const selected = event.selected
      lastSelection = selected && typeof selected === 'object'
        ? { label: String((selected as Record<string, unknown>).kind ?? 'Piece'), ...(selected as Record<string, unknown>) }
        : null
      events.selection?.(lastSelection)
    }
    if ('dims' in event && lastSelection && event.dims && typeof event.dims === 'object') {
      const dims = event.dims as Record<string, unknown>
      lastSelection = {
        ...lastSelection,
        dimensions: `${formatFeet(dims.w)} × ${formatFeet(dims.d)}`,
        clearances: { N: formatFeet(dims.N), S: formatFeet(dims.S), E: formatFeet(dims.E), W: formatFeet(dims.W) },
      }
      events.selection?.(lastSelection)
    }
    if ('room' in event) events.room?.(event.room)
    if ('layout' in event) events.layoutChange?.(event.layout)
  })
  on('frame', () => {
    const camera = raw.camera
    if (!camera?.getWorldDirection || !events.heading) return
    const direction = camera.position?.clone?.() ?? { x: 0, y: 0, z: -1 }
    camera.getWorldDirection(direction)
    events.heading(Math.atan2(-direction.z, -direction.x) * 180 / Math.PI)
  })

  return {
    dispose: () => call(raw, ['dispose', 'destroy']),
    resize: () => call(raw, ['resize', 'handleResize']),
    setFloor: (v: Floor) => call(raw, ['setFloor', 'showFloor'], v),
    setTime: (v: SceneTime) => call(raw, ['setTime', 'setScene', 'setLighting'], v),
    setSeason: (v: Season, options = {}) => call(raw, ['setSeason'], v, options),
    setViewMode: (v: ViewMode) => call(raw, ['setViewMode', 'setMode'], v),
    setAutoOrbit: (enabled, speed) => call(raw, ['setAutoOrbit', 'setOrbit'], enabled, speed),
    setAudio: (enabled) => call(raw, ['setAudio', 'setMusicEnabled'], enabled),
    setLayer: (name, visible) => call(raw, ['setLayer', 'setLayerVisible'], name, visible),
    setGarageOpen: (open) => call(raw, ['setGarageOpen', 'openGarage'], open),
    setQuality: (preset) => call(raw, ['setQuality'], preset),
    setEditorEnabled: (enabled) => call(raw, ['setEditorEnabled', 'setEditMode'], enabled),
    placeItem: (item) => call(raw, ['placeItem', 'beginPlace', 'addCatalogItem'], item.kind, item.label, item.args),
    updateSelection: (action, value) => call(raw, ['updateSelection', 'editSelection'], action, value),
    setRoomFinish: (kind, value) => call(raw, ['setRoomFinish', kind === 'floor' ? 'setRoomFloor' : 'beginPaint'], value),
    exitRoom: () => call(raw, ['exitRoom', 'clearRoomFocus']),
    loadLayout: (layout: LayoutDocument) => call(raw, ['loadLayout', 'applyLayout', 'setLayout'], layout),
    getLayout: () => call(raw, ['getLayout', 'exportLayout', 'serializeLayout']) ?? null,
    on,
  }
}

function formatFeet(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  const feet = Math.floor(value)
  const inches = Math.round((value - feet) * 12)
  return inches === 12 ? `${feet + 1}′ 0″` : `${feet}′ ${inches}″`
}
