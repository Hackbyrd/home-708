<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import AppShell from './components/AppShell.vue'
import CatalogDrawer from './components/CatalogDrawer.vue'
import CompassRose from './components/CompassRose.vue'
import ControlPanel from './components/ControlPanel.vue'
import DimensionHud from './components/DimensionHud.vue'
import ErrorOverlay from './components/ErrorOverlay.vue'
import MigrationWizard from './components/MigrationWizard.vue'
import ReferenceViewer from './components/ReferenceViewer.vue'
import RedesignsPage from './components/RedesignsPage.vue'
import RoomBar from './components/RoomBar.vue'
import SceneViewport from './components/SceneViewport.vue'
import StyleBar from './components/StyleBar.vue'
import { loadSceneExports } from './scene/adapter'
import {
  useAudioStore,
  useEditorStore,
  useGraphicsStore,
  useLayoutStore,
  useSeasonStore,
  useUiStore,
  useViewStore,
} from './stores'
import type { CatalogItem, LayoutDocument, SceneControllerLike, SceneSelection, SceneTime, Swatch } from './types'

const view = useViewStore()
const season = useSeasonStore()
const audio = useAudioStore()
const editor = useEditorStore()
const layout = useLayoutStore()
const graphics = useGraphicsStore()
const ui = useUiStore()
const { selection, focusedRoom, catalogOpen, saveState } = storeToRefs(editor)

const time = ref<SceneTime>('day')
const controller = ref<SceneControllerLike | null>(null)
const sceneKey = ref(0)
const catalog = ref<CatalogItem[]>([])
const swatches = ref<Swatch[]>([])
const floorSwatches = ref<Swatch[]>([])
const paints = ref<Swatch[]>([])
let saveTimer: ReturnType<typeof setTimeout> | undefined

function applySceneState(scene: SceneControllerLike) {
  scene.setFloor(view.floor)
  scene.setTime(time.value)
  scene.setSeason(season.season, {
    snowing: season.snowing,
    christmas: season.christmas,
    halloween: season.halloween,
  })
  scene.setViewMode(view.mode)
  scene.setAutoOrbit(view.autoOrbit, view.orbitSpeed)
  scene.setAudio(audio.enabled)
  scene.setLayer('labels', graphics.labels)
  scene.setLayer('furniture', graphics.furniture)
  scene.setLayer('spiral', graphics.spiral)
  scene.setGarageOpen(graphics.garageOpen)
  scene.setQuality(graphics.quality)
  scene.setEditorEnabled(editor.enabled)
  scene.loadLayout(layout.current)
}

async function initialize() {
  ui.busy = true
  ui.error = null
  layout.discoverLocalDrafts()
  try {
    const exports = await loadSceneExports()
    catalog.value = exports.catalog
    swatches.value = exports.swatches
    floorSwatches.value = exports.floorSwatches
    paints.value = exports.paints
  } catch (error) {
    ui.error = error instanceof Error ? error.message : String(error)
  }
  layout.loadLocal()
  ui.migrationOpen = Boolean(layout.legacyDraft)
  ui.busy = false
}

function onSceneReady(scene: SceneControllerLike) {
  controller.value = scene
  applySceneState(scene)
}

function onSceneError(error: Error) {
  ui.error = error.message
  ui.busy = false
}

function onSelection(value: unknown) {
  selection.value = value && typeof value === 'object' ? value as SceneSelection : null
}

function onRoom(value: unknown) {
  focusedRoom.value = typeof value === 'string'
    ? value
    : value && typeof value === 'object' && 'name' in value
      ? String(value.name)
      : null
}

function onLayoutChange(payload: unknown) {
  if (!payload || typeof payload !== 'object') return
  const next = payload as LayoutDocument
  saveState.value = 'dirty'
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => layout.persistLocal(next), 350)
}

async function save() {
  const current = controller.value?.getLayout() ?? layout.current
  saveState.value = 'saving'
  try {
    const saved = layout.saveLocal({ ...current, version: 2, name: current.name || 'My layout' })
    controller.value?.loadLayout(saved)
    saveState.value = 'saved'
    setTimeout(() => { if (saveState.value === 'saved') saveState.value = 'idle' }, 1800)
  } catch (error) {
    saveState.value = 'error'
    ui.error = error instanceof Error ? error.message : 'Could not save this layout.'
  }
}

function exportLayout() {
  const value = controller.value?.getLayout() ?? layout.current
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'city-home-layout.json'
  anchor.click()
  URL.revokeObjectURL(url)
}

async function importLayout(file: File) {
  try {
    const value = JSON.parse(await file.text()) as LayoutDocument
    if (!value || typeof value !== 'object') throw new Error('Invalid layout')
    const migrated = { ...value, version: 2 as const, name: value.name || file.name.replace(/\.json$/i, '') }
    layout.persistLocal(migrated)
    controller.value?.loadLayout(migrated)
    saveState.value = 'dirty'
  } catch {
    ui.error = 'That file is not a valid City Home layout.'
  }
}

function resetFloor() {
  if (!window.confirm('Reset changes on the visible floor?')) return
  controller.value?.updateSelection('resetFloor', view.floor)
  saveState.value = 'dirty'
}

function resetLayout() {
  if (!window.confirm('Reset the entire layout and remove the saved browser draft?')) return
  editor.enabled = false
  const reset = layout.resetLocal()
  controller.value?.loadLayout(reset)
  saveState.value = 'idle'
}

function restoreDraft() {
  layout.useLocalDraft()
  ui.migrationOpen = false
  controller.value?.loadLayout(layout.current)
}

async function uploadDraft() {
  layout.useLocalDraft()
  ui.migrationOpen = false
  await save()
}

watch(() => view.floor, (value) => controller.value?.setFloor(value))
watch(() => time.value, (value) => controller.value?.setTime(value))
watch(() => [season.season, season.snowing, season.christmas, season.halloween] as const,
  ([value, snowing, christmas, halloween]) => controller.value?.setSeason(value, { snowing, christmas, halloween }))
watch(() => view.mode, (value) => controller.value?.setViewMode(value))
watch(() => [view.autoOrbit, view.orbitSpeed] as const, ([enabled, speed]) => controller.value?.setAutoOrbit(enabled, speed))
watch(() => audio.enabled, (value) => controller.value?.setAudio(value))
watch(() => graphics.labels, (value) => controller.value?.setLayer('labels', value))
watch(() => graphics.furniture, (value) => controller.value?.setLayer('furniture', value))
watch(() => graphics.spiral, (value) => controller.value?.setLayer('spiral', value))
watch(() => graphics.garageOpen, (value) => controller.value?.setGarageOpen(value))
watch(() => graphics.quality, (value) => controller.value?.setQuality(value))
watch(() => editor.enabled, (enabled) => controller.value?.setEditorEnabled(enabled))

onMounted(initialize)

// deep link: #/renders opens the redesign gallery directly and survives refresh
onMounted(() => {
  if (window.location.hash === '#/renders') ui.redesignsOpen = true
})
watch(() => ui.redesignsOpen, (open) => {
  if (open && window.location.hash !== '#/renders') window.location.hash = '#/renders'
  else if (!open && window.location.hash === '#/renders') {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }
})
</script>

<template>
  <AppShell :editing="editor.enabled" :collapsed="ui.panelCollapsed">
    <SceneViewport
      :key="sceneKey"
      @ready="onSceneReady"
      @error="onSceneError"
      @selection="onSelection"
      @room="onRoom"
      @heading="(value) => view.heading = Number(value) || 0"
      @layout-change="onLayoutChange"
    />
    <ControlPanel
      v-model:time="time"
      @save="save"
      @export="exportLayout"
      @import="importLayout"
      @reset="resetFloor"
      @reset-layout="resetLayout"
    />
    <CatalogDrawer :open="catalogOpen" :items="catalog" @close="catalogOpen = false" @select="(item) => controller?.placeItem(item)" />
    <StyleBar :selection="editor.enabled ? selection : null" :swatches="swatches" @action="(action, value) => controller?.updateSelection(action, value)" />
    <RoomBar :room="focusedRoom" :floors="floorSwatches" :paints="paints" @finish="(kind, value) => controller?.setRoomFinish(kind, value)" @exit="controller?.exitRoom()" />
    <DimensionHud :selection="editor.enabled ? selection : null" />
    <CompassRose :heading="view.heading" />

    <div v-if="ui.busy" class="loading-state" role="status"><span class="loader" /><div><strong>Preparing The City Home</strong><small>Loading architecture and finishes…</small></div></div>
    <MigrationWizard
      :open="ui.migrationOpen"
      :draft="layout.legacyDraft"
      :slot-count="layout.slots.length"
      @restore="restoreDraft"
      @upload="uploadDraft"
      @dismiss="ui.migrationOpen = false; layout.dismissMigration()"
    />
    <ReferenceViewer :open="ui.referenceOpen" @close="ui.referenceOpen = false" />
    <RedesignsPage :open="ui.redesignsOpen" @close="ui.redesignsOpen = false" />
    <ErrorOverlay :message="ui.error" @dismiss="ui.error = null" @retry="ui.error = null; sceneKey++" />
  </AppShell>
</template>
