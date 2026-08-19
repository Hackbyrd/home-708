<script setup lang="ts">
import type { SceneSelection } from '../types'
defineProps<{ selection: SceneSelection | null }>()
</script>

<template>
<div v-if="selection?.dimensions" class="dimension-hud" aria-live="polite">
  <strong>{{ selection.dimensions }}</strong>
  <template v-for="direction in ['N', 'S', 'E', 'W'] as const" :key="direction">
    <span v-if="selection.clearances?.[direction]">{{ direction }} {{ selection.clearances[direction] }}</span>
  </template>
</div>
</template>
