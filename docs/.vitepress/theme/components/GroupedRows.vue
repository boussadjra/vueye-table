<script setup lang="ts">
import { ref, shallowRef } from "vue";
import {
  VueyeTable,
  VueyeGrid,
  defineColumns,
  type TableState,
  type VueyeTableExposed,
} from "vueye-table";

import DemoFrame from "./DemoFrame.vue";

function project(index: number) {
  const budget = 1000 + index * 20;
  const actual = budget - 150 + (index % 5) * 60;
  return {
    id: index + 1,
    name: index === 0 ? "Baseline" : index === 119 ? "Forecast" : `Project ${index + 1}`,
    region: ["EMEA", "APAC", "Americas"][Math.floor(index / 40) % 3]!,
    team: index % 2 ? "Services" : "Platform",
    owner: `Team ${(index % 4) + 1}`,
    status: "Active",
    budget,
    actual,
  };
}
type Project = ReturnType<typeof project>;
const rows = shallowRef<readonly Project[]>(
  Array.from({ length: 120 }, (_, index) => project(index)),
);
const columns = defineColumns<Project>([
  { id: "name", width: 140, editable: false },
  { id: "region", width: 96, editable: false },
  { id: "team", width: 112, editable: false },
  { id: "owner", width: 132, editable: false },
  { id: "status", width: 112, editable: false },
  { id: "budget", width: 100, type: "number", aggregate: "sum", editable: true },
  { id: "actual", width: 100, type: "number", aggregate: "sum", editable: true },
  {
    id: "variance",
    width: 100,
    accessor: (row) => row.budget - row.actual,
    aggregate: "sum",
    editable: false,
  },
]);
const table = ref<VueyeTableExposed | null>(null);
const mode = ref<"table" | "grid">("table");
const virtual = ref(true);
const footer = ref(false);
const editable = ref(false);
const pending = ref(false);
const grouping = ref<readonly string[]>(["region", "team"]);
const expanded = ref<TableState["expandedGroups"]>(true);
const pins = ref<TableState["rowPinning"]>({ top: [1], bottom: [120] });
async function append(): Promise<void> {
  const start = rows.value.length;
  async function* source() {
    yield Array.from({ length: 5 }, (_, index) => project(start + index));
  }
  pending.value = true;
  try {
    await table.value?.table.stream(source(), { batchSize: 1 });
  } finally {
    pending.value = false;
  }
}
function reset(): void {
  rows.value = Array.from({ length: 120 }, (_, index) => project(index));
  grouping.value = ["region", "team"];
  expanded.value = true;
  pins.value = { top: [1], bottom: [120] };
  footer.value = false;
  editable.value = false;
}
function updateData(value: readonly unknown[]): void {
  rows.value = value as readonly Project[];
}
</script>

<template>
  <DemoFrame title="GroupedRows.vue">
    <div class="grouped-rows-demo">
      <div class="group-controls">
        <button type="button" :aria-pressed="mode === 'table'" @click="mode = 'table'">
          Table
        </button>
        <button type="button" :aria-pressed="mode === 'grid'" @click="mode = 'grid'">Grid</button>
        <label><input v-model="virtual" type="checkbox" /> Virtual scrolling</label>
        <label><input v-model="footer" type="checkbox" /> Aggregate footers</label>
        <label><input v-model="editable" type="checkbox" /> Enable editing</label>
        <button type="button" @click="table?.table.collapseAllGroups()">Collapse all</button>
        <button type="button" @click="table?.table.expandAllGroups()">Expand all</button>
        <button type="button" :disabled="pending" @click="append">Append sample batch</button>
        <button type="button" :disabled="pending" @click="reset">Reset demo</button>
      </div>
      <p>
        Group by region and team, then collapse a header or choose aggregate footers. Baseline and
        Forecast stay outside the groups as reference rows. In Table mode, row actions move pins.
        Enable editing to change a leaf budget or actual cost; group rows remain read-only.
      </p>
      <VueyeTable
        v-if="mode === 'table'"
        :key="`table-${virtual}`"
        ref="table"
        :data="rows"
        @update:data="updateData"
        :columns="columns"
        groupable
        selectable
        row-pinning-controls
        v-model:grouping="grouping"
        v-model:expanded-groups="expanded"
        v-model:row-pinning="pins"
        :aggregate-position="footer ? 'footer' : 'group'"
        :edit-mode="editable ? 'cell' : undefined"
        :virtual="virtual"
        :virtual-columns="virtual"
        :paginate="false"
        :pagination="false"
        height="22rem"
        max-height="22rem"
        sticky-header
        theme="inherit"
        :searchable="false"
      >
        <template #expanded="{ row }"
          >Notes for {{ row.getDisplay("name") }}. Details remain in the centre region.</template
        >
      </VueyeTable>
      <VueyeGrid
        v-else
        :key="`grid-${virtual}`"
        ref="table"
        :data="rows"
        @update:data="updateData"
        :columns="columns"
        groupable
        :editable="editable"
        v-model:grouping="grouping"
        v-model:expanded-groups="expanded"
        v-model:row-pinning="pins"
        :aggregate-position="footer ? 'footer' : 'group'"
        :virtual="virtual"
        :virtual-columns="virtual"
        :paginate="false"
        :pagination="false"
        height="22rem"
        max-height="22rem"
        sticky-header
        theme="inherit"
      />
      <p role="status">
        {{ rows.length }} sample projects · {{ grouping.length }} grouping levels ·
        {{ pins.top.length }} top pin{{ pins.top.length === 1 ? "" : "s" }} ·
        {{ pins.bottom.length }} bottom pin{{ pins.bottom.length === 1 ? "" : "s" }}.
      </p>
    </div>
  </DemoFrame>
</template>

<style scoped>
.group-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.group-controls button {
  padding: 8px 12px;
  border-radius: var(--vy-radius-sm);
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  font-size: 13px;
}
.group-controls button[aria-pressed="true"] {
  background: var(--vp-c-brand-soft);
}
.group-controls button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
.group-controls button:disabled {
  opacity: 0.55;
  cursor: default;
}
.group-controls label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
p {
  margin: 12px 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}
p:last-child {
  margin-bottom: 0;
}
</style>
