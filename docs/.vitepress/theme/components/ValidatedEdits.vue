<script setup lang="ts">
import { reactive, shallowRef, watch } from "vue";
import {
  defineColumns,
  useDataTable,
  type RowKey,
  type TableIssue,
  type ValidationResult,
} from "vueye-table";

import DemoFrame from "./DemoFrame.vue";

interface Line {
  readonly id: number;
  readonly item: string;
  readonly quantity: number;
}
const rows = shallowRef<readonly Line[]>([
  { id: 1, item: "Keyboard", quantity: 2 },
  { id: 2, item: "Monitor", quantity: 1 },
]);
const issues = shallowRef<readonly TableIssue[]>([]);
const drafts = reactive(new Map<RowKey, { item: string; quantity: string }>());
const originals = new Map<RowKey, Line>();
let nextId = 3;
const columns = defineColumns<Line>([
  {
    id: "item",
    editable: true,
    editor: { kind: "text", maxLength: 24 },
    validate: (value) =>
      new Promise<ValidationResult>((resolve) => {
        setTimeout(
          () =>
            resolve(
              value.trim() === "Reserved"
                ? "Reserved is unavailable. Choose another item."
                : value.trim()
                  ? true
                  : "Enter an item name.",
            ),
          400,
        );
      }),
  },
  { id: "quantity", editable: true, editor: { kind: "number", min: 1, max: 99 } },
]);
const table = useDataTable({
  data: rows,
  columns,
  paginate: false,
  validateRow: (next) =>
    next.item === "Bulk" && next.quantity < 10 ? "Bulk orders need at least 10 items." : true,
  createRow: () => ({ id: nextId++, item: "New item", quantity: 1 }),
  onDataChange: (next) => {
    rows.value = next;
  },
  onEditIssues: (next) => {
    issues.value = next;
  },
});
watch(
  () => table.rows,
  (current) => {
    const keys = new Set(current.map((row) => row.key));
    for (const key of drafts.keys())
      if (!keys.has(key)) {
        drafts.delete(key);
        originals.delete(key);
      }
    for (const row of current)
      if (originals.get(row.key) !== row.original) {
        drafts.set(row.key, { item: row.original.item, quantity: String(row.original.quantity) });
        originals.set(row.key, row.original);
      }
  },
  { immediate: true },
);
function apply(key: RowKey): void {
  const draft = drafts.get(key)!;
  issues.value = [];
  table.edit([
    { rowKey: key, column: "item", value: draft.item },
    { rowKey: key, column: "quantity", input: draft.quantity },
  ]);
}
function pending(key: RowKey): boolean {
  return table.pendingCells.some((cell) => cell.rowKey === key);
}
function saved(): void {
  table.markSaved();
  issues.value = [];
}
</script>

<template>
  <DemoFrame title="ValidatedEdits.vue">
    <div class="validated-edits">
      <div class="actions">
        <button type="button" @click="table.insertRows()">Add row</button>
        <button type="button" :disabled="!table.canUndo" @click="table.undo()">Undo</button>
        <button type="button" :disabled="!table.canRedo" @click="table.redo()">Redo</button>
        <button
          type="button"
          :disabled="
            !table.getPendingChanges().inserted.length &&
            !table.getPendingChanges().updated.length &&
            !table.getPendingChanges().removed.length
          "
          @click="
            table.revert();
            issues = [];
          "
        >
          Revert changes
        </button>
        <button
          type="button"
          :disabled="table.pendingCells.length > 0 || issues.length > 0"
          @click="saved"
        >
          Mark saved locally
        </button>
      </div>
      <form v-for="row in table.rows" :key="row.key" class="line" @submit.prevent="apply(row.key)">
        <label
          >Item {{ row.key
          }}<input
            v-model="drafts.get(row.key)!.item"
            :aria-label="`Item name for row ${row.key}`"
            :aria-invalid="row.cellIssues?.has('item') || undefined"
            :aria-describedby="
              row.cellIssues?.has('item') ? `validation-${row.key}-item` : undefined
            "
        /></label>
        <label
          >Quantity<input
            v-model="drafts.get(row.key)!.quantity"
            inputmode="numeric"
            :aria-label="`Quantity for row ${row.key}`"
            :aria-invalid="row.cellIssues?.has('quantity') || undefined"
            :aria-describedby="
              row.cellIssues?.has('quantity') ? `validation-${row.key}-quantity` : undefined
            "
        /></label>
        <div class="row-actions">
          <button type="submit">Apply row</button
          ><button
            type="button"
            :aria-label="`Remove row ${row.key}`"
            @click="table.removeRows([row.key])"
          >
            Remove
          </button>
        </div>
        <p class="saved-value">
          Applied: {{ row.original.item }} × {{ row.original.quantity }}
          <span>{{ row.isDirty ? "Unsaved" : "Saved baseline" }}</span>
        </p>
        <p v-if="pending(row.key)" class="feedback" role="status">
          Validating row {{ row.key }}… Applied values stay in place.
        </p>
      </form>
      <p v-if="!table.rows.length" class="feedback">No rows. Add a row or undo the deletion.</p>
      <p
        v-for="problem in issues"
        :key="`${problem.rowKey}:${problem.column}:${problem.message}`"
        :id="`validation-${problem.rowKey}-${problem.column}`"
        class="problem"
        role="alert"
      >
        Row {{ problem.rowKey }}: {{ problem.message }}
      </p>
      <p class="change-count" role="status">
        {{ table.getPendingChanges().inserted.length }} inserted ·
        {{ table.getPendingChanges().updated.length }} updated ·
        {{ table.getPendingChanges().removed.length }} removed
      </p>
      <p class="sample-note">
        Sample validation waits 400 ms. Try “Reserved” for a refusal, or “Bulk” with quantity 10.
        Mark saved locally resets the baseline; it sends no request.
      </p>
    </div>
  </DemoFrame>
</template>

<style scoped>
.validated-edits {
  color: var(--vp-c-text-1);
}
.actions,
.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.actions {
  margin-bottom: 20px;
}
button,
input {
  font: inherit;
  font-size: 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}
button {
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 160ms var(--vy-ease);
}
button:hover:not(:disabled) {
  background: var(--vp-c-brand-soft);
}
button:disabled {
  color: var(--vp-c-text-3);
  cursor: default;
}
button:focus-visible,
input:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 3px;
}
input {
  padding: 8px 10px;
  width: 100%;
  min-width: 0;
  caret-color: var(--vp-c-brand-1);
}
input[aria-invalid="true"] {
  border-color: var(--vp-c-danger-1);
}
.line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 90px auto;
  align-items: end;
  gap: 10px;
  padding: 16px 0;
  border-top: 1px solid var(--vp-c-divider);
}
label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}
.saved-value,
.feedback,
.problem,
.sample-note,
.change-count {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}
.saved-value,
.feedback {
  grid-column: 1 / -1;
}
.saved-value {
  color: var(--vp-c-text-2);
  overflow-wrap: anywhere;
}
.saved-value span {
  margin-left: 8px;
  color: var(--vp-c-brand-1);
}
.problem {
  color: var(--vp-c-danger-1);
  margin-top: 8px;
}
.change-count {
  padding: 16px 0 8px;
  font-variant-numeric: tabular-nums;
}
.sample-note {
  color: var(--vp-c-text-2);
}
@media (max-width: 640px) {
  .line {
    grid-template-columns: minmax(0, 1fr) 80px;
  }
  .row-actions {
    grid-column: 1 / -1;
  }
}
@media (prefers-reduced-motion: reduce) {
  button {
    transition: none;
  }
}
</style>
