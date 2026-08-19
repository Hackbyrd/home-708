<script setup lang="ts">
defineProps<{ heading: number }>()
</script>

<template>
<div class="compass glass" aria-label="Compass">
  <div class="compass-rose" :style="{ transform: `rotate(${-heading}deg)` }">
    <span class="north">N</span><span class="east">E</span><span class="south">S</span><span class="west">W</span>
    <i class="needle" />
  </div>
  <i class="compass-dot" />
</div>
</template>
