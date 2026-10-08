<script setup lang="ts">
import { computed, ref } from 'vue'
import guide from '../daylight-build.json'
import guideUrl from '../../../../docs/daylight-modern-build-guide.html?url'

const selected = ref(guide.phases.map((phase) => phase.id))
const included = computed(() => guide.phases.filter((phase) => selected.value.includes(phase.id)))
const low = computed(() => included.value.reduce((sum, phase) => sum + phase.low, 0))
const high = computed(() => included.value.reduce((sum, phase) => sum + phase.high, 0))
const money = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
const range = (a: number, b: number) => `${money(a)}–${money(b)}`
const sources = (ids: string[]) => guide.sources.filter((source) => ids.includes(source.id))
</script>

<template>
  <section class="build-guide glass" aria-label="Daylight Modern build guide">
    <header>
      <div>
        <p class="eyebrow">From the render to the real room</p>
        <h3>Build Daylight Modern</h3>
      </div>
      <a :href="guideUrl" target="_blank" rel="noopener">Open printable build guide ↗</a>
    </header>
    <p>{{ guide.intro }}</p>
    <div class="starting-point">
      <strong>Start with about $37–56k, including a 15% reserve.</strong>
      <p>{{ guide.recommendation }}</p>
      <small>{{ guide.starter.scope }}</small>
    </div>
    <p class="scope-note">{{ guide.renderScope }}</p>

    <details>
      <summary>Plan the phases and budget</summary>
      <p class="muted">{{ guide.budgetBasis }}</p>
      <p>Select phases to compare their combined allowance. This is a cost comparison; the installation sequence still needs coordination.</p>
      <div class="phase-list">
        <article v-for="phase in guide.phases" :key="phase.id">
          <label>
            <input v-model="selected" type="checkbox" :value="phase.id" :aria-label="`Include phase ${phase.id}: ${phase.name}`" />
            <span><b>Phase {{ phase.id }} · {{ phase.name }}</b><strong>{{ range(phase.low, phase.high) }}</strong></span>
          </label>
          <p>{{ phase.scope }}</p>
          <ul><li v-for="item in phase.items" :key="item">{{ item }}</li></ul>
        </article>
      </div>
      <dl class="budget-total" aria-live="polite">
        <div><dt>Selected work</dt><dd>{{ range(low, high) }}</dd></div>
        <div><dt>15% reserve</dt><dd>{{ range(low * guide.reserve, high * guide.reserve) }}</dd></div>
        <div><dt>Planning total</dt><dd>{{ range(low * (1 + guide.reserve), high * (1 + guide.reserve)) }}</dd></div>
      </dl>
      <h4>Separately priced work</h4>
      <ul><li v-for="item in guide.exclusions" :key="item">{{ item }}</li></ul>
    </details>

    <details>
      <summary>Materials and daylight strategy</summary>
      <div class="guide-grid">
        <article v-for="item in guide.sunlight" :key="item.name"><h4>{{ item.name }}</h4><p>{{ item.detail }}</p></article>
      </div>
      <div class="table-scroll">
        <table>
          <caption>Material schedule · codes match the room notes below</caption>
          <thead><tr><th>Material</th><th>Specification</th><th>Where and how to save</th></tr></thead>
          <tbody><tr v-for="item in guide.materials" :key="item.id">
            <th scope="row">{{ item.id }} · {{ item.name }}</th>
            <td>{{ item.spec }}<a v-for="source in sources(item.sourceIds)" :key="source.id" :href="source.url" target="_blank" rel="noopener">{{ source.title }} ↗</a></td>
            <td><b>{{ item.where }}</b><p>{{ item.budget }}</p></td>
          </tr></tbody>
        </table>
      </div>
    </details>

    <details>
      <summary>Custom build-outs and installation sequence</summary>
      <div class="guide-grid">
        <article v-for="item in guide.customWork" :key="item.name">
          <h4>{{ item.name }}</h4><p>{{ item.scope }}</p>
          <p><b>Save:</b> {{ item.save }}</p><p><b>Confirm before ordering:</b> {{ item.holdPoint }}</p>
        </article>
      </div>
      <h4>Build in this order</h4>
      <ol><li v-for="item in guide.procurement" :key="item">{{ item }}</li></ol>
    </details>

    <details>
      <summary>Appliances and purchase checks</summary>
      <p class="muted">{{ guide.applianceBasis }}</p>
      <div class="guide-grid">
        <article v-for="item in guide.appliances" :key="item.name">
          <p class="eyebrow">{{ item.quantity }} · Phase {{ item.phase }}</p>
          <h4>{{ item.name }}</h4><p><b>{{ item.model }}</b></p>
          <p>{{ item.allowance }}</p><p>{{ item.reason }}</p><p><b>Before ordering:</b> {{ item.check }}</p>
          <a v-for="source in sources(item.sourceIds)" :key="source.id" :href="source.url" target="_blank" rel="noopener">{{ source.title }} ↗</a>
        </article>
      </div>
    </details>
    <p class="muted">Room-specific materials, build-outs and furnishings appear beneath each Daylight Modern render. Product references checked {{ guide.date }}.</p>
  </section>
</template>

<style scoped>
.build-guide { margin: 20px 0 28px; padding: clamp(18px, 3vw, 30px); border-radius: 14px; line-height: 1.65; font-size: 14px; }
header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
h3 { margin: 4px 0; font: 500 28px Fraunces, Georgia, serif; }
h4 { margin: 10px 0 6px; font-size: 16px; }
p { margin: 10px 0; max-width: 100ch; }
a { color: var(--ink); text-decoration: underline; text-underline-offset: 3px; }
td a, article > a { display: block; margin-top: 8px; font-size: 12px; }
.starting-point { margin: 20px 0 12px; padding: 18px 22px; border-left: 3px solid var(--brass); background: rgba(176, 149, 100, .10); border-radius: 0 8px 8px 0; }
.starting-point > strong { font-size: 18px; }
.scope-note, .muted { color: var(--muted); font-size: 12px; }
details { border-top: 1px solid var(--line); padding: 15px 0; }
summary { cursor: pointer; font-weight: 600; font-size: 16px; }
summary:focus-visible, a:focus-visible, input:focus-visible { outline: 2px solid var(--brass); outline-offset: 4px; }
.phase-list, .guide-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 310px), 1fr)); gap: 14px; margin: 18px 0; }
article { border: 1px solid var(--line); border-radius: 9px; padding: 18px; min-width: 0; }
label { display: flex; gap: 12px; align-items: flex-start; cursor: pointer; }
label input { margin-top: 5px; accent-color: var(--brass); }
label b, label strong { display: block; }
label strong { color: var(--muted); font-weight: 500; }
ul, ol { padding-left: 20px; }
li { margin: 6px 0; }
.budget-total { background: var(--card); border: 1px solid var(--line); border-radius: 9px; padding: 16px 20px; max-width: 650px; }
.budget-total div { display: flex; justify-content: space-between; gap: 14px; padding: 5px 0; }
.budget-total div:last-child { border-top: 1px solid var(--line); margin-top: 7px; padding-top: 12px; font-weight: 700; }
dd { margin: 0; }
.table-scroll { overflow-x: auto; }
table { width: 100%; min-width: 650px; border-collapse: collapse; font-size: 13px; }
caption { text-align: left; padding: 16px 0; font-weight: 600; }
th, td { text-align: left; vertical-align: top; padding: 14px; border-bottom: 1px solid var(--line); }
thead th { background: var(--card); }
tbody th { width: 18%; }
td { width: 41%; }
@media (max-width: 600px) { .budget-total div { flex-direction: column; gap: 1px; } }
</style>
