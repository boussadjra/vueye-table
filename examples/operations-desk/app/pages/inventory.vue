<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import type { ColumnDef, DataTableBinding, TableIssue } from "vueye-table";

import { money, stockAt, warehouses, type Stock } from "../utils/operations";
const { data: initial } = await useFetch<readonly Stock[]>("/api/stock");
const rows = shallowRef<readonly Stock[]>(initial.value ?? []);
const surface = shallowRef<{ table: DataTableBinding<Stock> }>();
const message = ref(
  "Double-click a cell or press Enter to edit. Save writes the pending batch to SQLite.",
);
const failed = ref(false);
const saving = ref(false);
const stress = ref(false);
const columns: readonly ColumnDef<Stock>[] = [
  {
    id: "sku",
    header: "SKU",
    width: 180,
    editable: true,
    editor: { kind: "text", maxLength: 100 },
    validate: async (value, row) => {
      const result = await $fetch<{ available: boolean }>("/api/sku", {
        query: { sku: value, id: row.id, delay: value.endsWith("0") ? 900 : 250 },
      });
      return result.available || "This SKU already belongs to another item.";
    },
  },
  {
    id: "product",
    header: "Product",
    width: 220,
    editable: true,
    editor: { kind: "text", maxLength: 100 },
  },
  {
    id: "warehouse",
    header: "Warehouse",
    width: 150,
    editable: true,
    editor: { kind: "select", options: warehouses },
  },
  {
    id: "quantity",
    header: "On hand",
    width: 120,
    type: "number",
    editable: true,
    editor: { kind: "number", min: 0, max: 1_000_000 },
    validate: (value) => Number.isSafeInteger(value) || "Use a whole number of units.",
  },
  {
    id: "reserved",
    header: "Reserved",
    width: 120,
    type: "number",
    editable: true,
    editor: { kind: "number", min: 0 },
    validate: (value) => Number.isSafeInteger(value) || "Use a whole number of units.",
  },
  {
    id: "cost",
    header: "Unit cost",
    width: 140,
    type: "number",
    editable: true,
    editor: { kind: "number", min: 0 },
    format: (value) => money(value),
  },
  {
    id: "available",
    header: "Available",
    width: 140,
    accessor: (row) => row.quantity - row.reserved,
    editable: false,
    type: "number",
  },
  { id: "version", header: "Revision", width: 100, type: "number", editable: false },
];
const displayedColumns = computed<readonly ColumnDef<Stock>[]>(() =>
  stress.value
    ? [
        ...columns,
        ...Array.from(
          { length: 16 },
          (_, index): ColumnDef<Stock> => ({
            id: `forecast-${index}`,
            header: `Week ${index + 1}`,
            width: 120,
            type: "number",
            accessor: (row) => row.quantity + index,
            editable: false,
          }),
        ),
      ]
    : columns,
);
const pending = computed(() => {
  const batch = surface.value?.table.pendingChanges;
  return batch ? batch.inserted.length + batch.updated.length + batch.removed.length : 0;
});
const validateRow = (next: Stock) =>
  next.reserved <= next.quantity || "Reserved units cannot exceed on-hand units.";
function editIssues(issues: readonly TableIssue[]) {
  failed.value = true;
  message.value = issues.map((issue) => issue.message).join(" ");
}
function replace(data: readonly unknown[]) {
  rows.value = data as readonly Stock[];
}
function downloadCsv(csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "warehouse-stock.csv";
  link.click();
  URL.revokeObjectURL(url);
}
async function save() {
  const table = surface.value?.table;
  if (!table || !pending.value || stress.value) return;
  saving.value = true;
  failed.value = false;
  const submittedData = rows.value;
  const batch = table.getPendingChanges();
  try {
    const response = await $fetch<{ rows: Stock[]; acknowledged: string[] }>("/api/save", {
      method: "POST",
      query: { delay: 1000 },
      body: {
        inserted: batch.inserted.map((item) => item.row),
        updated: batch.updated.map((item) => ({ row: item.row, version: item.previous.version })),
        removed: batch.removed.map((item) => ({ id: item.row.id, version: item.row.version })),
      },
    });
    if (rows.value !== submittedData) {
      message.value =
        "The submitted batch was saved, but newer local edits remain pending. Reload to reconcile server revisions before saving again.";
      return;
    }
    table.markSaved(response.acknowledged);
    table.upsertData(response.rows);
    message.value = `Saved ${response.acknowledged.length} stock changes. Server revisions are now current.`;
  } catch (error) {
    failed.value = true;
    message.value =
      error instanceof Error ? error.message : "Save failed. Your changes remain pending.";
  } finally {
    saving.value = false;
  }
}
async function reload() {
  rows.value = await $fetch<Stock[]>("/api/stock");
  stress.value = false;
  failed.value = false;
  message.value = "Loaded the saved stock. Local edits and undo history were discarded.";
}
async function compete() {
  await $fetch("/api/compete", { method: "POST" });
  message.value =
    "Another clerk changed stock-1 on the server. Editing and saving its old revision must now fail.";
}
function insert() {
  const row = stockAt(2000);
  const id = `new-${Date.now()}`;
  surface.value?.table.insertRows([{ ...row, id, sku: `NEW-${Date.now()}` }], {
    before: rows.value[0]?.id,
  });
}
function stressGrid() {
  stress.value = true;
  rows.value = Array.from({ length: 100_000 }, (_, index) => Object.freeze(stockAt(index)));
  message.value =
    "Stress session: 100,000 frozen rows × 24 columns. Saving is disabled; reload to return to persistent stock.";
}
</script>

<template>
  <section>
    <h1>Inventory worksheet</h1>
    <p>
      Edit quantities, validate SKUs against the server, paste a range, and save a batch. Reserved
      stock cannot exceed on-hand stock. Two sessions editing the same revision must produce a
      conflict.
    </p>
    <div class="controls">
      <button class="primary" :disabled="saving || !pending || stress" @click="save">
        {{ saving ? "Saving…" : `Save ${pending || ""} changes` }}
      </button>
      <button :disabled="saving" @click="reload">Reload saved stock</button>
      <button :disabled="stress || saving" @click="insert">Add stock item</button>
      <button :disabled="saving || stress" @click="compete">Simulate another clerk</button>
      <button :disabled="saving || stress" @click="stressGrid">Stress 100,000 rows</button>
    </div>
    <p class="notice" :class="{ error: failed }" role="status">{{ message }}</p>
    <div class="summary">
      <span>{{ rows.length.toLocaleString() }} rows</span><span>{{ pending }} pending rows</span
      ><span>{{ surface?.table.pendingCells.length ?? 0 }} cells validating</span>
    </div>
    <div class="table-panel">
      <VueyeGrid
        ref="surface"
        :data="rows"
        :columns="displayedColumns"
        :validate-row="validateRow"
        virtual
        virtual-columns
        height="460px"
        :row-height="44"
        :overscan="3"
        :remove-rows="!stress"
        :column-letters="true"
        label="Warehouse stock worksheet"
        @update:data="replace"
        @edit-issues="editIssues"
        @export="downloadCsv"
      />
    </div>
    <p>
      Keyboard: Enter edits, Escape cancels, Tab advances, Shift selects a range, Ctrl+C/V copies
      and pastes, and Ctrl+End jumps to the final cell. Reload discards unsaved changes.
    </p>
  </section>
</template>
