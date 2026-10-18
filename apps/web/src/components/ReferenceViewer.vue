<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BLUEPRINT_TITLE, BLUEPRINT_URL, REFERENCE_PHOTO_GROUPS, REFERENCE_PHOTOS } from '../reference'
import { WALKTHROUGH } from '../walkthrough'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

type Tab = 'photos' | 'blueprint' | 'video'
const tab = ref<Tab>('photos')
const lightboxIndex = ref<number | null>(null)
const current = computed(() => (lightboxIndex.value === null ? null : REFERENCE_PHOTOS[lightboxIndex.value] ?? null))
const count = REFERENCE_PHOTOS.length
const poster = REFERENCE_PHOTOS.find((photo) => photo.id === 'city-homes-at-crown')?.src ?? ''

function openPhoto(id: string) {
  const index = REFERENCE_PHOTOS.findIndex((photo) => photo.id === id)
  lightboxIndex.value = index >= 0 ? index : null
}

function step(delta: number) {
  if (lightboxIndex.value === null || !count) return
  lightboxIndex.value = (lightboxIndex.value + delta + count) % count
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
            <h2 id="reference-title">Photos, blueprint &amp; video</h2>
          </div>
          <div class="segmented reference-tabs" role="tablist" aria-label="Reference material">
            <button role="tab" :aria-selected="tab === 'photos'" :class="{ active: tab === 'photos' }" @click="tab = 'photos'">Photos ({{ count }})</button>
            <button role="tab" :aria-selected="tab === 'blueprint'" :class="{ active: tab === 'blueprint' }" @click="tab = 'blueprint'">Blueprint</button>
            <button role="tab" :aria-selected="tab === 'video'" :class="{ active: tab === 'video' }" @click="tab = 'video'">Video Walkthrough</button>
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

        <div v-else class="reference-body video-panel" role="tabpanel">
          <div class="blueprint-toolbar">
            <span>{{ WALKTHROUGH.title }}<template v-if="WALKTHROUGH.durationLabel"> · {{ WALKTHROUGH.durationLabel }}</template></span>
            <a v-if="WALKTHROUGH.src" :href="WALKTHROUGH.src" target="_blank" rel="noopener" class="blueprint-link">Open in new tab</a>
          </div>
          <video
            v-if="WALKTHROUGH.src"
            class="walkthrough-video"
            :src="WALKTHROUGH.src"
            :poster="poster"
            :title="WALKTHROUGH.title"
            controls
            playsinline
            preload="metadata"
          />
          <iframe
            v-else-if="WALKTHROUGH.embed"
            class="walkthrough-frame"
            :src="WALKTHROUGH.embed"
            :title="WALKTHROUGH.title"
            allow="autoplay; fullscreen; picture-in-picture"
            allowfullscreen
          />
          <div v-else class="walkthrough-empty">
            <img v-if="poster" :src="poster" alt="" />
            <div>
              <strong>The walkthrough video is not published yet.</strong>
              <p>Once the footage is hosted, add its address to <code>assets/walkthrough.json</code> and it will play here.</p>
            </div>
          </div>
          <p v-if="WALKTHROUGH.description" class="hint">{{ WALKTHROUGH.description }}</p>
        </div>
      </section>

      <Transition name="fade">
        <div v-if="current" class="lightbox" @click.self="closeLightbox">
          <button class="lightbox-nav prev" aria-label="Previous photo" @click="step(-1)">‹</button>
          <figure>
            <img :src="current.src" :alt="current.title" />
            <figcaption><span class="eyebrow">{{ current.group }}</span><strong>{{ current.title }}</strong><small>{{ (lightboxIndex ?? 0) + 1 }} / {{ count }}</small></figcaption>
          </figure>
          <button class="lightbox-nav next" aria-label="Next photo" @click="step(1)">›</button>
          <button class="icon-button lightbox-close" aria-label="Close photo" @click="closeLightbox">×</button>
        </div>
      </Transition>
    </div>
  </Transition>
</Teleport>
</template>
