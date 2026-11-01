<script setup lang="ts">
import { ref } from "vue";
import { VueyeTable, VueyeGrid, type TableState, type ColumnPinning } from "vueye-table";

import DemoFrame from "./DemoFrame.vue";

const mode = ref<"table" | "grid">("table");
const rtl = ref(false);
const virtual = ref(true);
const sizing = ref<TableState["columnSizing"]>({});
const pinning = ref<ColumnPinning>({ start: ["name"], end: ["score"] });
const commits = ref(0);
const data = Array.from({ length: 200 }, (_, index) => ({
  id: index,
  name: `Member ${index + 1}`,
  team: ["Support", "Sales", "Engineering"][index % 3],
  city: ["Algiers", "London", "Tokyo"][index % 3],
  status: "Active",
  orders: index + 2,
  total: (index + 1) * 25,
  joined: "2026-10-01",
  score: 70 + (index % 30),
}));
const columns = [
  { id: "name", width: 140, minWidth: 96, maxWidth: 300 },
  { id: "team", width: 152, minWidth: 100, maxWidth: 320 },
  { id: "city", width: 144 },
  { id: "status", width: 120, resizable: false },
  { id: "orders", width: 100 },
  { id: "total", width: 120 },
  { id: "joined", width: 140 },
  { id: "score", width: 72, minWidth: 64, maxWidth: 180 },
];
function reset(): void {
  sizing.value = {};
  pinning.value = { start: ["name"], end: ["score"] };
  commits.value = 0;
}
</script>

<template>
  <DemoFrame title="ResizableColumns.vue">
    <div class="column-layout-demo">
      <div class="layout-controls">
        <button type="button" :aria-pressed="mode === 'table'" @click="mode = 'table'">
          Table
        </button>
        <button type="button" :aria-pressed="mode === 'grid'" @click="mode = 'grid'">Grid</button>
        <label><input v-model="virtual" type="checkbox" /> Virtual scrolling</label>
        <label><input v-model="rtl" type="checkbox" /> Right to left</label>
        <button type="button" @click="reset">Reset layout</button>
      </div>
      <p>
        Drag a header edge, or focus its resize handle and use the arrow keys. Shift changes by 50
        pixels; Enter resets.
        <span v-if="mode === 'table'">The Columns menu changes which edge a column stays on.</span>
      </p>
      <div :dir="rtl ? 'rtl' : 'ltr'" class="layout-surface">
        <VueyeTable
          v-if="mode === 'table'"
          :key="`table-${virtual}`"
          v-model:column-sizing="sizing"
          v-model:column-pinning="pinning"
          :data="data"
          :columns="columns"
          resizable-columns
          selectable
          sticky-header
          :virtual="virtual"
          :virtual-columns="virtual"
          :paginate="false"
          :pagination="false"
          max-height="18rem"
          height="18rem"
          :searchable="false"
          theme="inherit"
          @update:column-sizing="commits++"
        >
          <template #expanded="{ row }"
            >Details for {{ row.getDisplay("name") }}. Resizing keeps this disclosure column in the
            start region.</template
          >
        </VueyeTable>
        <VueyeGrid
          v-else
          :key="`grid-${virtual}`"
          v-model:column-sizing="sizing"
          v-model:column-pinning="pinning"
          :data="data"
          :columns="columns"
          :editable="false"
          resizable-columns
          sticky-header
          :virtual="virtual"
          :virtual-columns="virtual"
          :paginate="false"
          :pagination="false"
          max-height="18rem"
          height="18rem"
          theme="inherit"
          @update:column-sizing="commits++"
        />
      </div>
      <p role="status">
        {{ commits }} committed resize{{ commits === 1 ? "" : "s" }}. A drag updates this count once
        when you release it. 200 sample members.
      </p>
    </div>
  </DemoFrame>
</template>

<style scoped>
.layout-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.layout-controls button {
  padding: 8px 12px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border-radius: var(--vy-radius-sm);
  font-size: 13px;
}
.layout-controls button[aria-pressed="true"] {
  background: var(--vp-c-brand-soft);
}
.layout-controls label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.layout-controls button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
p {
  margin: 12px 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}
p:last-child {
  margin-bottom: 0;
}
.layout-surface {
  min-width: 0;
}
</style>
