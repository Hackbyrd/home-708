<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import headerMarkup from '../../../../scripts/design-library/library-header.html?raw'
import '../../../../scripts/design-library/navigation.css'

const host = ref<HTMLDivElement | null>(null)
let dispose: (() => void) | undefined

onMounted(async () => {
  // Use the same public module as the standalone library pages.
  const navigationModule = '/design-library-assets/navigation.js'
  const navigation = await import(/* @vite-ignore */ navigationModule)
  if (host.value) dispose = navigation.initializeDesignLibraryHeader(host.value)
})

onBeforeUnmount(() => { dispose?.() })
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- Header markup is a trusted repository asset. -->
  <div ref="host" class="library-header-host" v-html="headerMarkup" />
</template>

<style scoped>
.library-header-host { flex-shrink: 0; width: 100%; }
</style>
