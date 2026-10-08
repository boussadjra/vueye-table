<script setup lang="ts">
import { ref, shallowRef } from "vue";
import {
  useDataTable,
  VueyeGrid,
  type ColumnDef,
  type DataTableBinding,
  type ExpandedState,
} from "vueye-table";

import DemoFrame from "./DemoFrame.vue";

interface Budget {
  readonly id: string;
  readonly parent: string | null;
  readonly name: string;
  readonly allocation: number;
}
const initial: readonly Budget[] = [
  { id: "plan", parent: null, name: "Sample annual plan", allocation: 160_000 },
  ...["Engineering", "Support", "Operations", "Research"].flatMap((name, department) => [
    { id: `d${department}`, parent: "plan", name, allocation: 40_000 },
    ...Array.from({ length: 8 }, (_, project) => ({
      id: `d${department}-p${project}`,
      parent: `d${department}`,
      name: `${name} project ${project + 1}`,
      allocation: 5_000,
    })),
  ]),
];
const rows = shallowRef(initial);
const expanded = ref<ExpandedState>(true);
const grid = ref<{ readonly table: DataTableBinding<Budget> } | null>(null);
const notice = ref("No saved changes yet.");
const columns: readonly ColumnDef<Budget>[] = [
  {
    id: "select",
    header: "Select",
    accessor: (row) => row.id,
    editable: false,
    sortable: false,
    width: 70,
  },
  { id: "name", header: "Department / project", width: 300, editable: false },
  {
    id: "allocation",
    header: "Allocation",
    width: 160,
    type: "number",
    editor: { kind: "number", min: 0, max: 1_000_000 },
    editable: (row) => row.parent !== null && row.parent !== "plan",
  },
];
const getParentKey = (row: Budget): string | null => row.parent;
const selection = useDataTable({
  data: rows,
  columns: [],
  rowKey: "id",
  getParentKey,
  selectionMode: "multiple",
  paginate: false,
  initialState: { expanded: true },
});
function save(): void {
  grid.value?.table.markSaved();
  notice.value = "Saved locally. No server request was made.";
}
function receive(): void {
  const result = grid.value?.table.upsertData([{ ...initial[2]!, allocation: 5_100 }]);
  notice.value = result?.issues.length
    ? result.issues.map((issue) => issue.message).join(" ")
    : "Received a simulated update for Engineering project 1.";
}
</script>

<template>
  <DemoFrame title="BudgetTree.vue" class="completion-demo">
    <div class="demo-controls">
      <label>
        <input
          type="checkbox"
          :checked="selection.allSelection === 'all'"
          :indeterminate="selection.allSelection === 'some'"
          @change="selection.toggleAll()"
        />
        Select all loaded rows
      </label>
      <button type="button" @click="save">Save locally</button>
      <button type="button" @click="grid?.table.revert()">Revert changes</button>
      <button type="button" @click="grid?.table.undo()">Undo</button>
      <button type="button" @click="receive">Receive sample update</button>
    </div>
    <p class="demo-help">
      Generated adjacency data. Edit a project allocation with Enter; parent allocations remain
      independent plan values. Department selection follows loaded descendants. Virtual rows retain
      the active cell. Edit Engineering project 1, then receive an update to see local changes
      protected by an ingestion conflict.
    </p>
    <p class="demo-status" role="status">{{ notice }}</p>
    <VueyeGrid
      ref="grid"
      v-model:data="rows"
      :columns="columns"
      row-key="id"
      :get-parent-key="getParentKey"
      v-model:expanded="expanded"
      tree-column="name"
      virtual
      height="var(--completion-height)"
      :row-height="44"
      :paginate="false"
      :pagination="false"
      :toolbar="false"
      label="Sample department allocations"
    >
      <template #cell.select="{ row }">
        <input
          type="checkbox"
          :aria-label="`Select ${(row.original as Budget).name}`"
          :checked="selection.getRow(row.key)?.selection === 'all'"
          :indeterminate="selection.getRow(row.key)?.selection === 'some'"
          @change="selection.toggleRow(row.key)"
          @click.stop
          @keydown.stop
        />
      </template>
    </VueyeGrid>
  </DemoFrame>
</template>

<style src="./completion-demos.css"></style>
