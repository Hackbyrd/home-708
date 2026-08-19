<script setup lang="ts">
import type { SceneSelection, Swatch } from '../types'

defineProps<{ selection: SceneSelection | null; swatches: Swatch[] }>()
const emit = defineEmits<{ action: [action: string, value?: unknown] }>()
const sizeActions = [
  ['scaleDown', '⤡ −'], ['scaleUp', '⤢ +'], ['widthDown', 'W−'], ['widthUp', 'W+'],
  ['depthDown', 'D−'], ['depthUp', 'D+'], ['heightDown', 'H−'], ['heightUp', 'H+'], ['resetScale', '1:1'],
]
</script>

<template>
<Transition name="lift">
  <div v-if="selection" class="style-bar glass" aria-label="Selected item styles">
    <div class="style-heading"><div><span class="eyebrow">Selected piece</span><strong>{{ selection.label }}</strong></div><button class="icon-button" aria-label="Clear selection" @click="emit('action', 'clear')">×</button></div>
    <div v-if="swatches.length" class="style-row"><span>Finish</span><div class="swatches">
      <button v-for="swatch in swatches" :key="swatch.key" class="swatch" :style="{ background: swatch.color }" :title="swatch.label" :aria-label="`Apply ${swatch.label}`" @click="emit('action', 'finish', swatch.key)" />
    </div></div>
    <div class="style-row"><span>Size</span><div class="mini-actions"><button v-for="[action, label] in sizeActions" :key="action" @click="emit('action', action)">{{ label }}</button></div></div>
    <div v-if="selection.modular" class="style-row"><span>Build</span><div class="mini-actions"><button v-for="part in ['seat', 'chaise', 'corner', 'ottoman']" :key="part" @click="emit('action', 'sofa', part)">+ {{ part }}</button><button @click="emit('action', 'sofa', 'pop')">− Last</button></div></div>
  </div>
</Transition>
</template>
