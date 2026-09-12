import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type {
  Floor,
  LayoutDocument,
  SaveState,
  SceneSelection,
  Season,
  ViewMode,
} from '../types'

const V2_KEY = 'cityhome-layout-v2'
const V1_KEY = 'cityhome-layout-v1'
const SLOTS_KEY = 'cityhome-layout-slots'

export function emptyLayout(name = 'My layout'): LayoutDocument {
  return { version: 2, name, edits: {}, added: [], rooms: {}, walls: {} }
}

export function parseLocalLayout(raw: string | null): LayoutDocument | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<LayoutDocument>
    return {
      ...emptyLayout(value.name),
      ...value,
      version: 2,
      edits: value.edits ?? {},
      added: value.added ?? [],
      rooms: value.rooms ?? {},
      walls: value.walls ?? {},
    }
  } catch {
    return null
  }
}

export const useViewStore = defineStore('view', () => {
  const floor = ref<Floor>('all')
  const mode = ref<ViewMode>('orbit')
  const autoOrbit = ref(true)
  const orbitSpeed = ref(1.8)
  const heading = ref(0)
  return { floor, mode, autoOrbit, orbitSpeed, heading }
})

export const useSeasonStore = defineStore('season', () => {
  const season = ref<Season>('summer')
  const snowing = ref(false)
  const christmas = ref(false)
  const halloween = ref(false)
  watch(season, (value) => {
    if (value !== 'winter') christmas.value = snowing.value = false
    if (value !== 'fall') halloween.value = false
  })
  watch(christmas, (enabled) => {
    if (enabled) {
      snowing.value = true
      halloween.value = false
    }
  })
  watch(halloween, (enabled) => {
    if (enabled) christmas.value = false
  })
  return { season, snowing, christmas, halloween }
})

export const useAudioStore = defineStore('audio', () => {
  const enabled = ref(true)
  const blocked = ref(false)
  return { enabled, blocked }
})

export const useEditorStore = defineStore('editor', () => {
  const enabled = ref(false)
  const selection = ref<SceneSelection | null>(null)
  const focusedRoom = ref<string | null>(null)
  const catalogOpen = ref(false)
  const saveState = ref<SaveState>('idle')
  return { enabled, selection, focusedRoom, catalogOpen, saveState }
})

export const useGraphicsStore = defineStore('graphics', () => {
  const labels = ref(true)
  const furniture = ref(true)
  const spiral = ref(true)
  const garageOpen = ref(false)
  const quality = ref<'low' | 'balanced' | 'high'>('high')
  return { labels, furniture, spiral, garageOpen, quality }
})

export const useUiStore = defineStore('ui', () => {
  const panelCollapsed = ref(false)
  const migrationOpen = ref(false)
  const busy = ref(true)
  const error = ref<string | null>(null)
  const toast = ref<string | null>(null)
  return { panelCollapsed, migrationOpen, busy, error, toast }
})

export const useLayoutStore = defineStore('layout', () => {
  const current = ref<LayoutDocument>(emptyLayout())
  const slots = ref<LayoutDocument[]>([])
  const legacyDraft = ref<LayoutDocument | null>(null)

  function discoverLocalDrafts() {
    // Requested reference arrangement becomes the default once. Keep the old
    // document recoverable, and preserve every edit made after this revision.
    const revisionKey = 'cityhome-reference-revision'
    if (localStorage.getItem(revisionKey) !== '2026-09-photos') {
      const previous = localStorage.getItem(V2_KEY)
      if (previous) localStorage.setItem('cityhome-layout-before-reference-2026-09', previous)
      localStorage.setItem(V2_KEY, JSON.stringify(emptyLayout('Reference photographs')))
      localStorage.setItem(revisionKey, '2026-09-photos')
    }
    const v2 = parseLocalLayout(localStorage.getItem(V2_KEY))
    const v1 = parseLocalLayout(localStorage.getItem(V1_KEY))
    legacyDraft.value = v2 ? null : v1
    try {
      const stored = JSON.parse(localStorage.getItem(SLOTS_KEY) ?? '{}') as Record<string, unknown>
      slots.value = Object.entries(stored)
        .map(([name, value]) => parseLocalLayout(JSON.stringify({ ...(value as object), name })))
        .filter((value): value is LayoutDocument => Boolean(value))
    } catch {
      slots.value = []
    }
    return Boolean(v2 || legacyDraft.value || slots.value.length)
  }

  function loadLocal() {
    current.value = parseLocalLayout(localStorage.getItem(V2_KEY))
      ?? slots.value[0]
      ?? legacyDraft.value
      ?? emptyLayout()
  }

  function useLocalDraft(draft = legacyDraft.value) {
    if (!draft) return
    current.value = { ...draft, name: `${draft.name || 'My layout'} (local)` }
  }

  function persistLocal(layout: LayoutDocument) {
    current.value = layout
    localStorage.setItem(V2_KEY, JSON.stringify(layout))
  }

  function saveLocal(layout: LayoutDocument) {
    persistLocal(layout)
    return current.value
  }

  function resetLocal() {
    localStorage.removeItem(V2_KEY)
    current.value = emptyLayout()
    legacyDraft.value = null
    return current.value
  }

  function dismissMigration() {
    legacyDraft.value = null
  }

  return {
    current,
    slots,
    legacyDraft,
    discoverLocalDrafts,
    loadLocal,
    useLocalDraft,
    persistLocal,
    saveLocal,
    resetLocal,
    dismissMigration,
  }
})
