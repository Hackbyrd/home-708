<script setup lang="ts">
import type { Swatch } from '../types'

defineProps<{ room: string | null; floors: Swatch[]; paints: Swatch[] }>()
const emit = defineEmits<{ finish: [kind: 'floor' | 'wall', value: string]; exit: [] }>()
</script>

<template>
<Transition name="drop">
  <div v-if="room" class="room-bar glass" aria-label="Room finishes">
    <strong>{{ room }}</strong>
    <div class="room-finish"><span>Floor</span><button v-for="item in floors" :key="item.key" class="swatch" :style="{ background: item.color }" :title="item.label" @click="emit('finish', 'floor', item.key)" /></div>
    <div class="room-finish"><span>Walls</span><button class="swatch none" title="Remove paint" @click="emit('finish', 'wall', 'reset')" /><button v-for="item in paints" :key="item.key" class="swatch" :style="{ background: item.color }" :title="item.label" @click="emit('finish', 'wall', item.key)" /></div>
    <button class="room-exit" @click="emit('exit')">← Exit room</button>
  </div>
</Transition>
</template>
