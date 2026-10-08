<script setup lang="ts">
import RedesignsPage from './components/RedesignsPage.vue'
function backToOptions() { window.location.href = './renders.html' }
</script>

<template>
  <RedesignsPage :open="true" @close="backToOptions" />
</template>
