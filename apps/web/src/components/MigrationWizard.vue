<script setup lang="ts">
import type { LayoutDocument } from '../types'
defineProps<{ open: boolean; draft: LayoutDocument | null; slotCount: number }>()
const emit = defineEmits<{ restore: []; upload: []; dismiss: [] }>()
</script>

<template>
<Teleport to="body">
  <Transition name="fade">
    <div v-if="open && draft" class="modal-backdrop">
      <section class="dialog migration-dialog glass" aria-labelledby="migration-title">
        <p class="eyebrow">Local design found</p>
        <h2 id="migration-title">Bring your layout forward</h2>
        <p>We found “{{ draft.name }}”<template v-if="slotCount"> and {{ slotCount }} named {{ slotCount === 1 ? 'slot' : 'slots' }}</template> from the previous editor.</p>
        <div class="migration-preview">
          <span><strong>{{ Object.keys(draft.edits).length }}</strong> edited pieces</span>
          <span><strong>{{ draft.added.length }}</strong> added pieces</span>
          <span><strong>{{ Object.keys(draft.rooms).length }}</strong> room finishes</span>
        </div>
        <button class="primary" @click="emit('restore')">Continue with local draft</button>
        <button @click="emit('upload')">Save draft to local JSON storage</button>
        <button class="text-button" @click="emit('dismiss')">Use the server layout</button>
      </section>
    </div>
  </Transition>
</Teleport>
</template>
