<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FLOORS, ROOMS, TOUR_ORDER, renderSrc, videoSrc, type FloorKey } from '../redesigns'

const props = defineProps<{ floor: FloorKey }>()
const selected = ref('tour')
const clips = computed(() => ['tour', ...TOUR_ORDER[props.floor]].flatMap((key) => {
  const src = videoSrc(props.floor, key)
  if (!src) return []
  const room = ROOMS.find((entry) => entry.key === key)
  return [{
    key, src,
    title: key === 'tour' ? `${FLOORS.find((entry) => entry.key === props.floor)?.label} tour` : room?.name ?? key,
    poster: renderSrc(props.floor, key === 'tour' ? TOUR_ORDER[props.floor][0]! : key, 'modern'),
  }]
}))
const active = computed(() => clips.value.find((clip) => clip.key === selected.value) ?? clips.value[0])
watch(() => props.floor, () => { selected.value = 'tour' })
</script>

<template>
  <section v-if="active" class="redesign-videos glass" aria-label="Modern home video tours">
    <div class="video-heading">
      <p class="eyebrow">Modern home · In motion</p>
      <h3>{{ active.title }}</h3>
      <p>Explore each room, or watch the floor tour.</p>
    </div>
    <video :key="active.src" :src="active.src" :poster="active.poster" :aria-label="active.title" controls playsinline muted preload="metadata" />
    <div class="video-rail" role="group" aria-label="Choose a room video">
      <button v-for="clip in clips" :key="clip.key" :aria-pressed="active.key === clip.key" :class="{ active: active.key === clip.key }" @click="selected = clip.key">
        <img :src="clip.poster" alt="" loading="lazy" />
        <span>{{ clip.title }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.redesign-videos { margin: 20px 0 28px; padding: 18px; border-radius: 14px; }
.video-heading h3 { margin: 4px 0; font: 500 24px Fraunces, Georgia, serif; }
.video-heading p:last-child { margin: 7px 0 16px; color: var(--muted); font-size: 13px; }
video { display: block; width: 100%; max-height: 65vh; aspect-ratio: 16 / 9; background: #101010; border-radius: 8px; }
.video-rail { display: flex; gap: 10px; overflow-x: auto; padding: 14px 2px 4px; }
.video-rail button { flex: 0 0 148px; padding: 0; overflow: hidden; border: 2px solid transparent; border-radius: 8px; background: var(--card); color: inherit; cursor: pointer; text-align: left; }
.video-rail button.active { border-color: var(--brass); }
.video-rail img { display: block; width: 100%; height: 84px; object-fit: cover; }
.video-rail span { display: block; padding: 8px; font-size: 12px; }
</style>
