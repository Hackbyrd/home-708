<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { createSceneController } from '../scene/adapter'
import type { SceneControllerLike } from '../types'

const emit = defineEmits<{
  ready: [controller: SceneControllerLike]
  error: [error: Error]
  selection: [payload: unknown]
  room: [payload: unknown]
  heading: [payload: unknown]
  layoutChange: [payload: unknown]
}>()

const host = ref<HTMLElement>()
let controller: SceneControllerLike | null = null
let observer: ResizeObserver | null = null

onMounted(async () => {
  try {
    controller = await createSceneController(host.value!, {
      selection: (payload) => emit('selection', payload),
      room: (payload) => emit('room', payload),
      heading: (payload) => emit('heading', payload),
      layoutChange: (payload) => emit('layoutChange', payload),
      error: (payload) => emit('error', payload instanceof Error ? payload : new Error(String(payload))),
    })
    observer = new ResizeObserver(() => controller?.resize())
    observer.observe(host.value!)
    emit('ready', controller)
  } catch (error) {
    emit('error', error instanceof Error ? error : new Error(String(error)))
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  controller?.dispose()
})
</script>

<template>
  <section ref="host" class="scene-viewport" aria-label="Interactive three-dimensional house">
    <div class="viewport-help" aria-hidden="true">Drag to orbit · scroll to zoom · right-drag to pan</div>
  </section>
</template>
