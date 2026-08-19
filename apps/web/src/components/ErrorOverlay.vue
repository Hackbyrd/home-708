<script setup lang="ts">
defineProps<{ message: string | null }>()
const emit = defineEmits<{ dismiss: []; retry: [] }>()
</script>

<template>
<Transition name="lift">
  <div v-if="message" class="error-overlay" role="alert">
    <div><strong>Something interrupted the view</strong><p>{{ message }}</p></div>
    <button @click="emit('retry')">Retry</button><button aria-label="Dismiss error" @click="emit('dismiss')">×</button>
  </div>
</Transition>
</template>
