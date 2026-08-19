<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAudioStore, useEditorStore, useGraphicsStore, useSeasonStore, useUiStore, useViewStore } from '../stores'
import type { Floor, Season } from '../types'

defineProps<{ time: 'day' | 'evening' }>()
const emit = defineEmits<{
  'update:time': [value: 'day' | 'evening']
  save: []
  export: []
  import: [file: File]
  reset: []
  resetLayout: []
}>()

const view = useViewStore()
const season = useSeasonStore()
const audio = useAudioStore()
const editor = useEditorStore()
const graphics = useGraphicsStore()
const ui = useUiStore()
const { floor, mode, autoOrbit, orbitSpeed } = storeToRefs(view)
const { saveState } = storeToRefs(editor)

const floors: Array<{ value: Floor; level: string; name: string }> = [
  { value: 'all', level: '⌂', name: 'All' },
  { value: 0, level: '01', name: 'Ground' },
  { value: 1, level: '02', name: 'Main' },
  { value: 2, level: '03', name: 'Upper' },
  { value: 3, level: '04', name: 'Penthouse' },
]
const seasons: Array<{ value: Season; label: string }> = [
  { value: 'summer', label: 'Summer' },
  { value: 'spring', label: 'Spring' },
  { value: 'fall', label: 'Fall' },
  { value: 'winter', label: 'Winter' },
]

function chooseFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) emit('import', file)
  ;(event.target as HTMLInputElement).value = ''
}
</script>

<template>
<aside class="control-panel glass" :class="{ collapsed: ui.panelCollapsed }" aria-label="House controls">
  <header class="brand">
    <div>
      <p class="eyebrow">Crown · Gaithersburg · 4,882 sq ft</p>
      <h1>The City Home <em>Modern Georgetown</em></h1>
    </div>
    <button class="icon-button collapse-button" :aria-label="ui.panelCollapsed ? 'Expand controls' : 'Collapse controls'" @click="ui.panelCollapsed = !ui.panelCollapsed">
      {{ ui.panelCollapsed ? '+' : '−' }}
    </button>
  </header>

  <div v-show="!ui.panelCollapsed" class="panel-body">
    <section>
      <h2>Floor</h2>
      <div class="floor-grid">
        <button v-for="item in floors" :key="item.value" class="floor-button" :class="{ active: floor === item.value }" @click="floor = item.value">
          <strong>{{ item.level }}</strong><span>{{ item.name }}</span>
        </button>
      </div>
    </section>

    <section>
      <h2>Scene</h2>
      <div class="segmented scene-buttons">
        <button :class="{ active: time === 'day' }" @click="emit('update:time', 'day')">Day</button>
        <button :class="{ active: time === 'evening' }" @click="emit('update:time', 'evening')">Evening</button>
      </div>
      <button class="wide-button music-button" :class="{ active: audio.enabled }" @click="audio.enabled = !audio.enabled">♪ Lobby music</button>
    </section>

    <section>
      <h2>Season</h2>
      <div class="season-grid" aria-label="Season">
        <button
          v-for="item in seasons"
          :key="item.value"
          :class="{ active: season.season === item.value }"
          @click="season.season = item.value"
        >
          {{ item.label }}
        </button>
      </div>
      <label v-if="season.season === 'winter'" class="check"><input v-model="season.snowing" type="checkbox" /> Snowing</label>
      <label v-if="season.season === 'winter'" class="check"><input v-model="season.christmas" type="checkbox" /> Christmas mode</label>
      <label v-if="season.season === 'fall'" class="check"><input v-model="season.halloween" type="checkbox" /> Halloween mode</label>
    </section>

    <section>
      <h2>View</h2>
      <div class="segmented view-buttons">
        <button :class="{ active: mode === 'orbit' }" @click="mode = 'orbit'">Orbit</button>
        <button :class="{ active: mode === 'walk' }" @click="mode = 'walk'">Walk inside</button>
      </div>
      <label class="check"><input v-model="autoOrbit" type="checkbox" /> Aerial auto-orbit</label>
      <label class="range-label">Speed <input v-model.number="orbitSpeed" type="range" min=".2" max="8" step=".1" /></label>
    </section>

    <section>
      <div class="section-title"><h2>Design</h2><span class="save-state" :data-state="saveState">{{ saveState }}</span></div>
      <div class="button-grid">
        <button :class="{ active: editor.enabled }" @click="editor.enabled = !editor.enabled">✎ {{ editor.enabled ? 'Editing' : 'Edit layout' }}</button>
        <button @click="editor.catalogOpen = !editor.catalogOpen">＋ Add</button>
        <button :disabled="saveState === 'saving'" @click="emit('save')">Save</button>
        <button @click="emit('reset')">Reset floor</button>
        <button @click="emit('export')">Export</button>
        <label class="file-button">Import<input type="file" accept=".json,application/json" @change="chooseFile" /></label>
        <button class="reset-layout-button" @click="emit('resetLayout')">Reset layout</button>
      </div>
      <p v-if="editor.enabled" class="hint"><b>Edit:</b> drag to move · R rotate · F flip · D duplicate · arrows nudge · Delete remove · Esc back.</p>
    </section>

    <section>
      <h2>Layers &amp; options</h2>
      <button class="wide-button" :class="{ active: graphics.garageOpen }" @click="graphics.garageOpen = !graphics.garageOpen">{{ graphics.garageOpen ? 'Close' : 'Open' }} garage</button>
      <label class="check"><input v-model="graphics.labels" type="checkbox" /> Room labels</label>
      <label class="check"><input v-model="graphics.furniture" type="checkbox" /> Furniture</label>
      <label class="check"><input v-model="graphics.spiral" type="checkbox" /> Optional spiral stair</label>
    </section>

  </div>
</aside>
</template>
