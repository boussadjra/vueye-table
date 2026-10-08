<script setup lang="ts">
import { ref, shallowRef, type VNode } from "vue";
import {
  VueyeTable,
  VueyeGrid,
  defineColumns,
  type DataTableBinding,
  type EditResult,
  type TableIssue,
  type CellEditorSlotProps,
} from "vueye-table";

import DemoFrame from "./DemoFrame.vue";

interface Entry {
  id: number;
  name: string;
  quantity: number;
  due: Date;
  active: boolean;
  status: string;
}
const mode = ref<"cell" | "row" | "grid">("cell");
const virtual = ref(false);
const rows = shallowRef<readonly Entry[]>(
  Array.from({ length: 24 }, (_, index) => ({
    id: index + 1,
    name: `Sample item ${String(index + 1).padStart(2, "0")}`,
    quantity: (index % 8) + 1,
    due: new Date("2026-10-15"),
    active: index % 2 === 0,
    status: index % 2 === 0 ? "Ready" : "Waiting",
  })),
);
let nextId = 25;
const component = ref<{ table: DataTableBinding<Entry> }>();
const notice = ref("No changes yet.");
const columns = defineColumns<Entry>([
  {
    id: "name",
    header: "Item",
    width: 190,
    editable: true,
    editor: { kind: "text", maxLength: 80 },
  },
  {
    id: "quantity",
    header: "Quantity",
    width: 140,
    editable: true,
    editor: { kind: "number", min: 1, max: 50 },
    validate: async (value) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return value === 13 ? "Quantity 13 is reserved. Choose another amount." : true;
    },
  },
  {
    id: "due",
    header: "Due",
    width: 140,
    format: (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : ""),
    editable: true,
    editor: {
      kind: "date",
      min: new Date("2026-01-01").getTime(),
      max: new Date("2026-12-31").getTime(),
    },
  },
  { id: "active", header: "Active", width: 90, editable: true, editor: { kind: "checkbox" } },
  {
    id: "status",
    header: "Status",
    width: 135,
    editable: true,
    editor: { kind: "select", options: ["Ready", "Waiting", "Done"] },
  },
]);
const createRow = (): Entry => ({
  id: nextId++,
  name: "New sample item",
  quantity: 1,
  due: new Date("2026-10-15"),
  active: false,
  status: "Ready",
});
const validateRow = (row: Entry): true | string =>
  row.status === "Done" && row.quantity < 5 ? "Done items need a quantity of at least five." : true;
const saved = (result: EditResult<unknown>): void => {
  notice.value = result.changes.length
    ? `${result.changes.length} ${result.changes.length === 1 ? "field" : "fields"} changed locally. Undo or mark saved.`
    : "No fields changed.";
};
const issues = (problems: readonly TableIssue[]): void => {
  if (problems.length)
    notice.value = [...new Set(problems.map((problem) => problem.message))].join(" ");
};
const tabEditor = (event: KeyboardEvent, editor: CellEditorSlotProps): void => {
  if (mode.value === "row") return;
  event.preventDefault();
  editor.finish(event.shiftKey ? "left" : "right");
};
const focusStatus = (vnode: VNode): void => {
  if (mode.value !== "row") (vnode.el as HTMLSelectElement | null)?.focus();
};
</script>

<template>
  <DemoFrame title="InlineEditors.vue" class="inline-editors-demo">
    <div class="controls">
      <label
        >Editing view
        <select v-model="mode">
          <option value="cell">Table cells</option>
          <option value="row">Table rows</option>
          <option value="grid">Spreadsheet</option>
        </select>
      </label>
      <label class="check"><input v-model="virtual" type="checkbox" /> Virtual rows</label>
      <button type="button" :disabled="!component?.table.canUndo" @click="component?.table.undo()">
        Undo
      </button>
      <button
        type="button"
        @click="
          component?.table.markSaved();
          notice = 'Local changes marked saved.';
        "
      >
        Mark saved
      </button>
    </div>
    <p id="inline-editing-help">
      Generated sample items.
      <template v-if="mode === 'row'"
        >Choose Edit row, change fields, then Save row. A row marked Done needs at least five
        items.</template
      ><template v-else
        >Double-click a field or press Enter to edit. Escape cancels. Tab commits and moves
        across.</template
      >
      Quantity 13 triggers a simulated refusal after a short check. Status uses an application-owned
      editor.
    </p>
    <component
      :is="mode === 'grid' ? VueyeGrid : VueyeTable"
      :key="`${mode}-${virtual}`"
      ref="component"
      v-model:data="rows"
      :columns="columns"
      :edit-mode="mode === 'grid' ? undefined : mode"
      :virtual="virtual"
      height="var(--edit-demo-height)"
      max-height="var(--edit-demo-height)"
      :row-height="52"
      :overscan="2"
      :paginate="false"
      :pagination="false"
      :searchable="false"
      :column-toggle="false"
      :toolbar="false"
      :row-numbers="false"
      :validate-row="validateRow"
      :create-row="createRow"
      add-row
      remove-rows
      aria-describedby="inline-editing-help"
      @save="saved"
      @cancel="notice = 'Draft discarded.'"
      @edit-issues="issues"
    >
      <template #editor.status="editor">
        <select
          v-bind="editor.attrs"
          :value="editor.value"
          :disabled="editor.pending"
          aria-label="Custom status"
          data-editor
          @vue:mounted="focusStatus"
          @change="editor.commit(($event.target as HTMLSelectElement).value)"
          @keydown.enter.prevent="editor.finish()"
          @keydown.esc.prevent="editor.cancel()"
          @keydown.tab="tabEditor($event, editor)"
        >
          <option>Ready</option>
          <option>Waiting</option>
          <option>Done</option>
        </select>
      </template>
    </component>
    <p class="notice" role="status">{{ notice }}</p>
  </DemoFrame>
</template>

<style scoped>
.inline-editors-demo {
  --edit-demo-height: 290px;
}
.controls {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  padding: 18px 18px 0;
}
.controls label {
  display: grid;
  gap: 5px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}
.controls .check {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-block: 9px;
}
.controls select,
.controls button {
  padding: 8px 11px;
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  font: inherit;
  font-size: 13px;
}
.controls button:disabled {
  opacity: 0.5;
  cursor: default;
}
.controls input {
  accent-color: var(--vp-c-brand-1);
}
.controls select:focus-visible,
.controls button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
#inline-editing-help,
.notice {
  margin: 12px 18px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.6;
}
:deep(.vueye-table),
:deep(.vueye-grid) {
  margin: 14px 18px;
}
@media (max-width: 640px) {
  .inline-editors-demo {
    --edit-demo-height: 250px;
  }
  .controls {
    padding: 12px 12px 0;
  }
  #inline-editing-help,
  .notice {
    margin-inline: 12px;
  }
  :deep(.vueye-table),
  :deep(.vueye-grid) {
    margin-inline: 12px;
  }
}
</style>
