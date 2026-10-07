<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import { defineColumns, useDataTable, VtGrid, type TableIssue } from "vueye-table";

import DemoFrame from "./DemoFrame.vue";

interface Entry {
  readonly text: string;
  readonly amount: number;
  readonly note: string;
}

const seed: readonly Entry[] = Object.freeze([
  { text: "=1+1", amount: -12, note: "Formula-like text" },
  { text: "@total", amount: 4, note: "Another prefix" },
  { text: "Ordinary text", amount: 8, note: "No prefix" },
]);
const rows = shallowRef(seed);
const issues = ref<readonly TableIssue[]>([]);
const status = ref("Paste the sample to see which cells fit the limit.");
const escapeExports = ref(true);
const escapeCopies = ref(false);
const columns = defineColumns<Entry>([
  { id: "text", header: "Text", editable: true },
  { id: "amount", header: "Amount", align: "end", editable: true },
  { id: "note", header: "Note", editable: true },
]);
const table = useDataTable({
  data: rows,
  columns,
  pasteLimit: { maxCells: 5, maxLength: 128 },
  onDataChange: (next) => (rows.value = next),
  onEditIssues: (next) => (issues.value = next),
});
const csv = computed(() => {
  void table.snapshot;
  return table.exportRows({ escapeFormulas: escapeExports.value });
});
const clipboard = computed(() => {
  void table.snapshot;
  return table.copy(
    { top: 0, left: 0, bottom: 2, right: 2 },
    { escapeFormulas: escapeCopies.value },
  );
});

function reset(): void {
  rows.value = seed;
  table.setData(seed);
  issues.value = [];
  status.value = "Sample restored. Change the checkboxes to compare CSV and clipboard text.";
}

function pasteSample(): void {
  reset();
  const result = table.paste(
    { row: 0, column: 0 },
    "=2+2\t-20\tPasted note\n+subtotal\t6\tSkipped note\nLast row\t9\tSkipped too",
  );
  status.value = `${result.changes.length} cells changed in one undo step. The remaining sample cells were skipped.`;
}

function undo(): void {
  if (table.undo()) {
    issues.value = [];
    status.value = "Last edit undone. The previews now show the restored values.";
  }
}
</script>

<template>
  <DemoFrame title="ContentBoundaries.vue">
    <div class="actions">
      <button type="button" class="primary" @click="pasteSample">Paste sample</button>
      <button type="button" :disabled="!table.canUndo" @click="undo">Undo</button>
      <button type="button" @click="reset">Reset</button>
    </div>
    <p class="hint">The sample has nine cells. This demo accepts five per paste.</p>
    <VtGrid :table="table" label="Export and paste limits" column-letters />
    <div class="feedback" role="status" aria-live="polite">
      <p>{{ status }}</p>
      <p v-for="issue in issues" :key="issue.code" class="issue">
        <code>{{ issue.code }}</code
        >: {{ issue.message }}
      </p>
    </div>
    <div class="outputs">
      <section aria-label="CSV export preview">
        <label>
          <input v-model="escapeExports" type="checkbox" />
          Escape formulas in CSV
        </label>
        <pre aria-label="CSV export" tabindex="0"><code>{{ csv }}</code></pre>
      </section>
      <section aria-label="Clipboard text preview">
        <label>
          <input v-model="escapeCopies" type="checkbox" />
          Escape formulas on copy
        </label>
        <pre aria-label="Clipboard text" tabindex="0"><code>{{ clipboard }}</code></pre>
      </section>
    </div>
  </DemoFrame>
</template>

<style scoped>
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.actions button {
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border-radius: var(--vy-radius-sm);
  transition: background 0.2s var(--vy-ease);
}

.actions button:hover:not(:disabled) {
  background: var(--vp-c-brand-soft);
}

.actions .primary {
  color: var(--vp-c-bg);
  background: var(--vp-c-brand-1);
}

.actions .primary:hover {
  background: var(--vp-c-brand-2);
}

.actions button:disabled {
  color: var(--vp-c-text-3);
  cursor: not-allowed;
}

.actions button:focus-visible,
input:focus-visible,
pre:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 3px;
}

.hint,
.feedback {
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.hint {
  margin: 12px 0 16px;
}

.feedback {
  min-height: 42px;
  margin: 16px 0;
}

.feedback p {
  margin: 0;
}

.feedback .issue {
  margin-top: 6px;
  color: var(--vp-c-warning-1);
}

.outputs {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
}

.outputs section {
  min-width: 0;
}

label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

input {
  accent-color: var(--vp-c-brand-1);
}

pre {
  overflow: auto;
  padding: 12px;
  margin: 10px 0 0;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  line-height: 1.7;
  color: var(--vp-c-text-1);
  background: var(--vp-code-block-bg);
  border-radius: var(--vy-radius-sm);
  scrollbar-color: var(--vp-c-border) var(--vp-code-block-bg);
}

pre code {
  color: inherit;
}

@container (min-width: 700px) {
  .outputs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
