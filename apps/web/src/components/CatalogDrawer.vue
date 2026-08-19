<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CatalogItem } from '../types'

const props = defineProps<{ open: boolean; items: CatalogItem[]; disabled?: boolean }>()
const emit = defineEmits<{ close: []; select: [item: CatalogItem] }>()
const query = ref('')
const selectedCategory = ref('All')
const categories = computed(() => ['All', ...new Set(props.items.map((item) => item.category))])
const filtered = computed(() => props.items.filter((item) =>
  (selectedCategory.value === 'All' || item.category === selectedCategory.value)
  && `${item.label} ${item.category}`.toLowerCase().includes(query.value.toLowerCase()),
))
const groups = computed(() => {
  const result = new Map<string, CatalogItem[]>()
  for (const item of filtered.value) result.set(item.category, [...(result.get(item.category) ?? []), item])
  return result
})
</script>

<template>
<Transition name="drawer">
  <aside v-if="open" class="catalog-drawer glass" aria-label="Furniture catalog">
    <header><div><p class="eyebrow">Furniture &amp; decor</p><h2>Catalog</h2></div><button class="icon-button" aria-label="Close catalog" @click="emit('close')">×</button></header>
    <input v-model="query" class="field search" type="search" placeholder="Search 70+ pieces…" aria-label="Search catalog" />
    <div class="category-tabs" role="tablist">
      <button v-for="category in categories" :key="category" :class="{ active: selectedCategory === category }" @click="selectedCategory = category">{{ category }}</button>
    </div>
    <div class="catalog-list">
      <section v-for="[category, entries] in groups" :key="category">
        <h3>{{ category }}</h3>
        <button v-for="item in entries" :key="item.kind" class="catalog-item" :disabled="disabled" @click="emit('select', item)">
          <span class="item-preview"><img v-if="item.thumbnail" :src="item.thumbnail" alt="" /><span v-else>{{ item.label.slice(0, 1) }}</span></span>
          <span>{{ item.label }}</span><span aria-hidden="true">＋</span>
        </button>
      </section>
      <p v-if="!filtered.length" class="empty-state">No pieces match that search.</p>
    </div>
  </aside>
</Transition>
</template>
