<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BLUEPRINT_TITLE, BLUEPRINT_URL, REFERENCE_PHOTO_GROUPS, REFERENCE_PHOTOS } from '../reference'
import {
  FIRST_FLOOR_COSTS,
  FLOORS,
  LOOKS,
  modelPhoto,
  renderSrc,
  roomsOnFloor,
  type FloorKey,
  type RedesignLook,
} from '../redesigns'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

type Tab = 'photos' | 'blueprint' | 'redesigns'
const tab = ref<Tab>('photos')
const count = REFERENCE_PHOTOS.length

// ---- redesigns state ----
const floor = ref<FloorKey>('first-floor')
const look = ref<string | null>(null) // null = all looks

const visibleLooks = computed<RedesignLook[]>(() =>
  look.value === null ? LOOKS : LOOKS.filter((entry) => entry.key === look.value),
)
const floorRooms = computed(() => roomsOnFloor(floor.value))

interface RoomImage {
  src: string
  title: string
  eyebrow: string
}
interface RoomCard {
  key: string
  name: string
  dims: string
  note: string
  portrait: boolean
  draft: boolean
  images: RoomImage[]
}

const roomCards = computed<RoomCard[]>(() =>
  floorRooms.value.map((room) => {
    const images: RoomImage[] = []
    const photo = modelPhoto(room)
    if (photo) images.push({ src: photo.src, title: 'Model home · today', eyebrow: room.name })
    for (const entry of visibleLooks.value) {
      const src = renderSrc(room.floor, room.key, entry.key)
      if (src) images.push({ src, title: entry.name, eyebrow: room.name })
    }
    return {
      key: room.key,
      name: room.name,
      dims: room.dims,
      note: room.note,
      portrait: room.portrait ?? false,
      draft: room.status === 'draft',
      images,
    }
  }),
)

// ---- lightbox (shared by photos + redesigns) ----
interface LightItem {
  src: string
  title: string
  eyebrow: string
}
const lightItems = ref<LightItem[]>([])
const lightboxIndex = ref<number | null>(null)
const current = computed(() => (lightboxIndex.value === null ? null : lightItems.value[lightboxIndex.value] ?? null))

function openLightbox(items: LightItem[], index: number) {
  if (!items.length || index < 0) return
  lightItems.value = items
  lightboxIndex.value = index
}

function openPhoto(id: string) {
  const items = REFERENCE_PHOTOS.map((photo) => ({ src: photo.src, title: photo.title, eyebrow: photo.group }))
  openLightbox(items, REFERENCE_PHOTOS.findIndex((photo) => photo.id === id))
}

function openRoomImage(card: RoomCard, index: number) {
  // Arrow keys walk every visible image on the floor, room by room.
  const items: LightItem[] = []
  let start = 0
  for (const entry of roomCards.value) {
    if (entry.key === card.key) start = items.length + index
    items.push(...entry.images)
  }
  openLightbox(items, start)
}

function step(delta: number) {
  const total = lightItems.value.length
  if (lightboxIndex.value === null || !total) return
  lightboxIndex.value = (lightboxIndex.value + delta + total) % total
}

function closeLightbox() {
  lightboxIndex.value = null
}

function onKey(event: KeyboardEvent) {
  if (!props.open) return
  if (event.key === 'Escape') {
    event.preventDefault()
    if (lightboxIndex.value !== null) closeLightbox()
    else emit('close')
  } else if (lightboxIndex.value !== null && event.key === 'ArrowRight') {
    event.preventDefault()
    step(1)
  } else if (lightboxIndex.value !== null && event.key === 'ArrowLeft') {
    event.preventDefault()
    step(-1)
  }
}

watch(() => props.open, (open) => { if (!open) closeLightbox() })
watch([floor, look, tab], () => closeLightbox())
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
<Teleport to="body">
  <Transition name="fade">
    <div v-if="open" class="modal-backdrop reference-backdrop" @click.self="emit('close')">
      <section class="reference-viewer glass" role="dialog" aria-modal="true" aria-labelledby="reference-title">
        <header class="reference-header">
          <div>
            <p class="eyebrow">Reference material</p>
            <h2 id="reference-title">Photos &amp; blueprint</h2>
          </div>
          <div class="segmented reference-tabs" role="tablist" aria-label="Reference material">
            <button role="tab" :aria-selected="tab === 'photos'" :class="{ active: tab === 'photos' }" @click="tab = 'photos'">Photos ({{ count }})</button>
            <button role="tab" :aria-selected="tab === 'blueprint'" :class="{ active: tab === 'blueprint' }" @click="tab = 'blueprint'">Blueprint</button>
            <button role="tab" :aria-selected="tab === 'redesigns'" :class="{ active: tab === 'redesigns' }" @click="tab = 'redesigns'">Redesigns</button>
          </div>
          <button class="icon-button" aria-label="Close reference viewer" @click="emit('close')">×</button>
        </header>

        <div v-if="tab === 'photos'" class="reference-body photo-groups" role="tabpanel">
          <section v-for="group in REFERENCE_PHOTO_GROUPS" :key="group.group">
            <h3>{{ group.group }}</h3>
            <div class="photo-grid">
              <button v-for="photo in group.photos" :key="photo.id" class="photo-tile" :aria-label="`View ${photo.title}`" @click="openPhoto(photo.id)">
                <img :src="photo.src" :alt="photo.title" loading="lazy" decoding="async" />
                <span>{{ photo.title }}</span>
              </button>
            </div>
          </section>
          <p v-if="!count" class="empty-state">No reference photos were bundled with this build.</p>
        </div>

        <div v-else-if="tab === 'blueprint'" class="reference-body blueprint-panel" role="tabpanel">
          <div class="blueprint-toolbar">
            <span>{{ BLUEPRINT_TITLE }} · 4 pages</span>
            <a :href="BLUEPRINT_URL" target="_blank" rel="noopener" class="blueprint-link">Open in new tab</a>
            <a :href="BLUEPRINT_URL" download="cf_city_home_with_georgetown_pkg.pdf" class="blueprint-link">Download</a>
          </div>
          <iframe class="blueprint-frame" :src="BLUEPRINT_URL" :title="BLUEPRINT_TITLE" />
          <p class="hint">If the plan does not render here, use “Open in new tab” to view it with your browser's PDF viewer.</p>
        </div>

        <div v-else class="reference-body redesign-panel" role="tabpanel">
          <div class="redesign-controls">
            <div class="segmented floor-picker" role="tablist" aria-label="Floor">
              <button v-for="entry in FLOORS" :key="entry.key" role="tab" :aria-selected="floor === entry.key" :class="{ active: floor === entry.key }" @click="floor = entry.key">{{ entry.label }}</button>
            </div>
            <div class="look-filter" role="group" aria-label="Design look">
              <button class="look-chip" :class="{ active: look === null }" @click="look = null">All looks</button>
              <button
                v-for="entry in LOOKS"
                :key="entry.key"
                class="look-chip"
                :class="{ active: look === entry.key }"
                :title="`${entry.group} — ${entry.description}`"
                @click="look = look === entry.key ? null : entry.key"
              >
                <i class="look-dot" :style="{ background: entry.swatch }" />{{ entry.name }}
              </button>
            </div>
          </div>

          <section v-for="card in roomCards" :key="card.key" class="redesign-room">
            <header>
              <h3>{{ card.name }}</h3>
              <span class="room-dims">{{ card.dims }}</span>
              <span v-if="card.draft" class="draft-badge" title="These renders are being regenerated against docs/render-audit.md">Draft renders</span>
            </header>
            <p class="room-note">{{ card.note }}</p>
            <div class="photo-grid" :class="{ 'portrait-grid': card.portrait }">
              <button
                v-for="(image, index) in card.images"
                :key="image.src"
                class="photo-tile"
                :class="{ portrait: card.portrait, 'model-tile': index === 0 && image.title.startsWith('Model home') }"
                :aria-label="`View ${card.name} — ${image.title}`"
                @click="openRoomImage(card, index)"
              >
                <img :src="image.src" :alt="`${card.name} — ${image.title}`" loading="lazy" decoding="async" />
                <span>{{ image.title }}</span>
              </button>
            </div>
          </section>

          <section v-if="floor === 'first-floor'" class="cost-section">
            <h3>First-floor cost ranges · Modern home look</h3>
            <table class="cost-table">
              <thead>
                <tr><th>Item</th><th>Good</th><th>Better</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in FIRST_FLOOR_COSTS.rows" :key="row.item">
                  <td>{{ row.item }}</td>
                  <td>{{ row.good }}</td>
                  <td>{{ row.better }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td>{{ FIRST_FLOOR_COSTS.total.item }}</td>
                  <td>{{ FIRST_FLOOR_COSTS.total.good }}</td>
                  <td>{{ FIRST_FLOOR_COSTS.total.better }}</td>
                </tr>
              </tfoot>
            </table>
            <p class="hint">{{ FIRST_FLOOR_COSTS.caption }}</p>
          </section>
        </div>
      </section>

      <Transition name="fade">
        <div v-if="current" class="lightbox" @click.self="closeLightbox">
          <button class="lightbox-nav prev" aria-label="Previous photo" @click="step(-1)">‹</button>
          <figure>
            <img :src="current.src" :alt="current.title" />
            <figcaption><span class="eyebrow">{{ current.eyebrow }}</span><strong>{{ current.title }}</strong><small>{{ (lightboxIndex ?? 0) + 1 }} / {{ lightItems.length }}</small></figcaption>
          </figure>
          <button class="lightbox-nav next" aria-label="Next photo" @click="step(1)">›</button>
          <button class="icon-button lightbox-close" aria-label="Close photo" @click="closeLightbox">×</button>
        </div>
      </Transition>
    </div>
  </Transition>
</Teleport>
</template>
