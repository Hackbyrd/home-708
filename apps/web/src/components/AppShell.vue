<script setup lang="ts">
defineProps<{ editing: boolean; collapsed: boolean }>()
</script>

<template>
  <main class="app-shell" :class="{ 'is-editing': editing, 'is-collapsed': collapsed }">
    <slot />
  </main>
</template>
