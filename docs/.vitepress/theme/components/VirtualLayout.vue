<script setup lang="ts">
import { onScopeDispose, ref, shallowRef, useId } from "vue";
import { createVirtualizer } from "vueye-table";

import DemoFrame from "./DemoFrame.vue";

const inputId = useId();
const offset = ref(320);
const virtual = createVirtualizer({
  count: 10_000,
  estimateSize: 32,
  overscan: 2,
  getKey: (index) => `row-${index}`,
});
virtual.setViewport(offset.value, 160);
const layout = shallowRef(virtual.getWindow());
onScopeDispose(virtual.subscribe((next) => (layout.value = next)));

function move(): void {
  virtual.setViewport(offset.value, 160);
}

function measure(): void {
  const first = layout.value.items[0];
  if (first) virtual.measure(first.key, 64);
}
</script>

<template>
  <DemoFrame title="VirtualLayout.vue">
    <label :for="inputId">Viewport offset: {{ layout.offset }}px</label>
    <input
      :id="inputId"
      v-model.number="offset"
      type="range"
      min="0"
      :max="layout.totalSize - 160"
      step="32"
      @input="move"
    />
    <div class="summary">
      <p>10,000 items · 160px viewport · 2 items of overscan on each side</p>
      <button type="button" @click="measure">Measure first rendered row at 64px</button>
    </div>
    <p role="status">
      {{ layout.items.length }} rendered items. Total size: {{ layout.totalSize }}px.
    </p>
    <div class="results">
      <table aria-label="Virtual layout items">
        <thead>
          <tr>
            <th scope="col">Index</th>
            <th scope="col">Key</th>
            <th scope="col">Start</th>
            <th scope="col">Size</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in layout.items" :key="item.key">
            <td>{{ item.index }}</td>
            <td>{{ item.key }}</td>
            <td>{{ item.start }}px</td>
            <td>{{ item.size }}px</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="padding">
      Padding before: {{ layout.paddingStart }}px · after: {{ layout.paddingEnd }}px
    </p>
  </DemoFrame>
</template>

<style scoped>
label {
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}
input {
  display: block;
  width: 100%;
  margin: 16px 0;
  accent-color: var(--vp-c-brand-1);
}
.summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
p {
  margin: 12px 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}
button {
  padding: 8px 12px;
  font-size: 13px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border-radius: var(--vy-radius-sm);
}
button:hover {
  background: var(--vp-c-brand-soft);
}
button:focus-visible,
input:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 3px;
}
.results {
  overflow: auto;
  border: 1px solid var(--vy-card-border);
  border-radius: var(--vy-radius-sm);
  scrollbar-color: var(--vp-c-border) var(--vy-card);
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
th,
td {
  padding: 8px 12px;
  text-align: start;
  white-space: nowrap;
}
th {
  font-weight: 500;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
}
td {
  border-top: 1px solid var(--vy-card-border);
  color: var(--vp-c-text-1);
}
.padding {
  margin-bottom: 0;
}
</style>
