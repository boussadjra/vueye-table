<script setup lang="ts">
import { ref, shallowRef, useId } from "vue";
import { VueyeGrid, VueyeTable, type ColumnDef } from "vueye-table";

import DemoFrame from "./DemoFrame.vue";

interface Sample {
  readonly id: number;
  readonly name: string;
  readonly amount: number;
  readonly region: string;
}
const helpId = useId();
const view = ref<"grid" | "table">("grid");
const rows = shallowRef<readonly Sample[]>(
  Array.from({ length: 100_000 }, (_, id) => ({
    id,
    name: `Sample account ${id + 1}`,
    amount: 100 + id,
    region: ["North", "South", "East", "West"][id % 4]!,
  })),
);
const tableColumns: readonly ColumnDef<Sample>[] = [
  { id: "name", header: "Account", width: 200 },
  { id: "amount", header: "Amount", type: "number", align: "end", width: 120 },
  { id: "region", header: "Region", width: 120 },
];
const gridColumns: readonly ColumnDef<Sample>[] = [
  { id: "name", header: "Account", width: 200, editable: true },
  { id: "amount", header: "Amount", type: "number", align: "end", width: 120, editable: true },
  ...Array.from(
    { length: 22 },
    (_, index): ColumnDef<Sample> => ({
      id: `metric-${index}`,
      header: `Metric ${index + 1}`,
      width: 120,
      align: "end",
      editable: false,
      accessor: (row) => row.amount + index,
      sortable: false,
    }),
  ),
];
</script>

<template>
  <DemoFrame title="VirtualComponents.vue">
    <div class="controls" aria-label="Choose the component">
      <button type="button" :aria-pressed="view === 'grid'" @click="view = 'grid'">
        Spreadsheet
      </button>
      <button type="button" :aria-pressed="view === 'table'" @click="view = 'table'">
        Data table
      </button>
    </div>
    <p :id="helpId">
      100,000 generated sample records.
      <template v-if="view === 'grid'"
        >Focus the grid, then use Ctrl+End or Ctrl+Home to jump, Page Up/Down to move, and Enter to
        edit Account or Amount. On Mac, use Command.</template
      >
      <template v-else
        >Search, sort and select records while scrolling through the full result.</template
      >
    </p>
    <VueyeGrid
      v-if="view === 'grid'"
      v-model:data="rows"
      :columns="gridColumns"
      virtual
      virtual-columns
      height="280px"
      :row-height="40"
      :overscan="3"
      :toolbar="false"
      label="Virtual sample accounts"
      :aria-describedby="helpId"
    />
    <VueyeTable
      v-else
      :data="rows"
      :columns="tableColumns"
      virtual
      height="280px"
      :row-height="40"
      :overscan="3"
      selectable
      caption="Sample accounts"
    />
  </DemoFrame>
</template>

<style scoped>
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
button {
  padding: 8px 12px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border-radius: var(--vy-radius-sm);
  font-size: 13px;
}
button:hover,
button[aria-pressed="true"] {
  background: var(--vp-c-brand-soft);
}
button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 3px;
}
p {
  margin: 12px 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}
</style>
