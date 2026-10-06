<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import RedesignVideos from './RedesignVideos.vue'
import {
  FIRST_FLOOR_COSTS,
  FLOORS,
  LOOKS,
  LOOK_GROUPS,
  isRenderReviewed,
  modelPhoto,
  renderSrc,
  roomsOnFloor,
  type FloorKey,
  type RedesignLook,
} from '../redesigns'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const floor = ref<FloorKey>('first-floor')
const look = ref<string | null>(null) // null = all rendered looks

const activeLook = computed<RedesignLook | null>(() => LOOKS.find((entry) => entry.key === look.value) ?? null)
const visibleLooks = computed<RedesignLook[]>(() => {
  if (activeLook.value) return [activeLook.value]
  return LOOKS.filter((entry) => entry.status === 'rendered')
})
const groupedLooks = computed(() =>
  LOOK_GROUPS.map((group) => ({ group, looks: LOOKS.filter((entry) => entry.group === group) })),
)

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
  pending: boolean
}

const roomCards = computed<RoomCard[]>(() =>
  roomsOnFloor(floor.value).map((room) => {
    const images: RoomImage[] = []
    const photo = modelPhoto(room)
    if (photo) images.push({ src: photo.src, title: 'Model home · today', eyebrow: room.name })
    let pending = false
    for (const entry of visibleLooks.value) {
      const src = renderSrc(room.floor, room.key, entry.key)
      if (src) images.push({ src, title: entry.name, eyebrow: room.name })
      else pending = true
    }
    return {
      key: room.key,
      name: room.name,
      dims: room.dims,
      note: room.note,
      portrait: room.portrait ?? false,
      draft: visibleLooks.value.some((entry) => !isRenderReviewed(room.floor, room.key, entry.key)),
      images,
      pending,
    }
  }),
)

// ---- lightbox ----
interface LightItem {
  src: string
  title: string
  eyebrow: string
}
const lightItems = ref<LightItem[]>([])
const lightboxIndex = ref<number | null>(null)
const current = computed(() => (lightboxIndex.value === null ? null : lightItems.value[lightboxIndex.value] ?? null))

function openRoomImage(card: RoomCard, index: number) {
  // Arrow keys walk every visible image on the floor, room by room.
  const items: LightItem[] = []
  let start = 0
  for (const entry of roomCards.value) {
    if (entry.key === card.key) start = items.length + index
    items.push(...entry.images)
  }
  if (!items.length) return
  lightItems.value = items
  lightboxIndex.value = start
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
watch([floor, look], () => closeLightbox())
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
<Teleport to="body">
  <Transition name="fade">
    <div v-if="open" class="redesigns-page">
      <header class="redesigns-header glass">
        <div>
          <p class="eyebrow">708 · Whole-house redesign</p>
          <h2>Renders</h2>
        </div>
        <div class="segmented floor-picker" role="tablist" aria-label="Floor">
          <button v-for="entry in FLOORS" :key="entry.key" role="tab" :aria-selected="floor === entry.key" :class="{ active: floor === entry.key }" @click="floor = entry.key">{{ entry.label }}</button>
        </div>
        <button class="icon-button" aria-label="Back to the 3D home" @click="emit('close')">×</button>
      </header>

      <div class="redesigns-body">
        <div class="look-groups" role="group" aria-label="Design look">
          <button class="look-chip" :class="{ active: look === null }" @click="look = null">All rendered looks</button>
          <template v-for="entry in groupedLooks" :key="entry.group">
            <span class="look-group-label">{{ entry.group }}</span>
            <button
              v-for="item in entry.looks"
              :key="item.key"
              class="look-chip"
              :class="{ active: look === item.key, concept: item.status === 'concept' }"
              :title="item.description"
              @click="look = look === item.key ? null : item.key"
            >
              <i class="look-dot" :style="{ background: item.swatch }" />{{ item.name }}
            </button>
          </template>
        </div>

        <aside v-if="activeLook" class="look-story glass">
          <header>
            <i class="look-dot big" :style="{ background: activeLook.swatch }" />
            <div>
              <h3>{{ activeLook.name }}</h3>
              <p class="eyebrow">{{ activeLook.group }}<template v-if="activeLook.status === 'concept'"> · renders in production</template></p>
            </div>
          </header>
          <p class="look-palette">{{ activeLook.description }}</p>
          <dl>
            <div><dt>Why this direction</dt><dd>{{ activeLook.story.why }}</dd></div>
            <div><dt>How it should feel</dt><dd>{{ activeLook.story.feel }}</dd></div>
            <div><dt>Signature moves</dt><dd>{{ activeLook.story.signature }}</dd></div>
            <div><dt>Build notes</dt><dd>{{ activeLook.story.build }}</dd></div>
          </dl>
        </aside>

        <RedesignVideos v-if="look === null || look === 'modern'" :floor="floor" />

        <section v-for="card in roomCards" :key="card.key" class="redesign-room">
          <header>
            <h3>{{ card.name }}</h3>
            <span class="room-dims">{{ card.dims }}</span>
            <span v-if="card.draft" class="draft-badge" title="Some original look variants are retained from the earlier render set">Includes earlier renders</span>
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
            <div v-if="card.pending" class="photo-tile pending-tile" :class="{ portrait: card.portrait }">
              <div class="pending-art" :style="{ background: activeLook?.swatch ?? 'var(--line)' }" />
              <span>{{ activeLook?.name ?? 'Look' }} render — in production</span>
            </div>
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
