import { defineColumns, type ValidationResult } from "@vueye-table/core";
import { useDataGrid, useDataTable } from "@vueye-table/vue";
import { effectScope, nextTick, shallowRef } from "vue";

interface Order {
  readonly id: number;
  readonly parentId?: number;
  readonly status: "ready" | "shipped";
  readonly quantity: number;
}
const rows = shallowRef<readonly Order[]>([
  { id: 1, status: "ready", quantity: 2 },
  { id: 2, parentId: 1, status: "ready", quantity: 1 },
  { id: 3, status: "ready", quantity: 3 },
  { id: 4, status: "ready", quantity: 1 },
]);
const columns = defineColumns<Order>([
  { id: "status", editable: true, editor: { kind: "select", options: ["ready", "shipped"] } },
  {
    id: "quantity",
    editable: true,
    type: "number",
    validate: (value) => value > 0 || "Use a positive quantity.",
  },
]);
const scope = effectScope();
let lazySignal: AbortSignal | undefined;
const table = scope.run(() =>
  useDataTable<Order>({
    data: rows,
    columns,
    paginate: false,
    getParentKey: (row) => row.parentId,
    hasChildren: (row) => row.id === 4,
    loadChildren: (_row, signal) => {
      lazySignal = signal;
      return new Promise<readonly Order[]>((resolve) => {
        signal.addEventListener("abort", () => resolve([]), { once: true });
      });
    },
    validateRow: async (next): Promise<ValidationResult> =>
      next.status !== "shipped" || next.quantity >= 2 || "Ship at least two items.",
    onDataChange: (next) => {
      rows.value = next;
    },
  }),
)!;
const grid = scope.run(() => useDataGrid(table))!;
const draft = table.editRow(1);
draft.values.status = "shipped";
draft.setInput("quantity", "8");
table.toggleExpanded(1);
table.upsertData([{ id: 3, status: "ready", quantity: 9 }]);
const saving = draft.save();
console.log(`Draft pending: ${draft.pending}; pending cells: ${table.pendingCells.length}`);
const result = await saving;
await nextTick();
if (
  result.status !== "applied" ||
  result.changes.length !== 2 ||
  table.getRow(3)?.original.quantity !== 9
)
  throw new Error("Draft/source integration failed.");
console.log(`Saved draft: ${result.status}; changed rows: ${table.pendingChanges.updated.length}`);
table.undo();
if (table.getRow(1)?.original.status !== "ready" || table.getRow(1)?.original.quantity !== 2)
  throw new Error("Batch undo failed.");
console.log("One undo restored both fields.");
await nextTick();

const stale = table.editRow(3);
stale.values.quantity = 12;
table.upsertData([{ id: 3, status: "ready", quantity: 10 }]);
const refusal = await stale.save();
if (refusal.status !== "rejected" || table.getRow(3)?.original.quantity !== 10)
  throw new Error("Stale draft protection failed.");
console.log(`Stale draft: ${refusal.issues[0]?.code}`);

grid.focusCell({ row: 0, column: 1 });
grid.startEdit("6");
table.sort("quantity", "desc");
const edit = grid.commitEdit();
const final = edit?.completion ? await edit.completion : edit;
if (final?.status !== "applied" || table.getRow(1)?.original.quantity !== 6)
  throw new Error("Keyed grid edit failed.");
console.log(`Grid edit stayed on row 1: ${String(table.getRow(1)?.original.quantity)}`);
table.toggleExpanded(4);
await Promise.resolve();
scope.stop();
if (!lazySignal?.aborted) throw new Error("Scope cancellation failed.");
console.log("Scope cleanup aborted the native lazy-load signal.");
