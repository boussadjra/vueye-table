# Validation and changes since save

Columns can validate parsed text and direct values. Configure editor limits in the same definition so `edit()` and `paste()` enforce the limits your UI shows.

```ts
const columns = defineColumns<Line>([
  {
    id: "item",
    editable: true,
    editor: { kind: "text", maxLength: 24 },
    validate: (value) => (value.trim() ? true : "Enter an item name."),
  },
  { id: "quantity", editable: true, editor: { kind: "number", min: 1, max: 99 } },
]);
```

`EditorSpec.kind` describes text, number, select, checkbox or date controls. Optional `options` checks exact primitive membership; `min`/`max` check finite numbers or date timestamps; `maxLength` counts UTF-16 code units; `pattern` is a Unicode regular expression. Invalid constraints refuse the value with an issue. Core receives values and plain text messages and produces no HTML. Enforce your business rules and authorization again on the server; editor limits are not a substitute.

## Complete row drafts

`validateRow(next, previous)` runs once per affected row after accepted cell validation. Submit all fields in one batch so cross-field rules see the full draft. Vue supplies a typed `table.editRow(key)` buffer; see [Vue row drafts](/guide/row-drafts).

```ts
const table = useDataTable({
  data: lines,
  columns,
  validateRow: (next) => (next.end >= next.start ? true : "End must follow start."),
  onDataChange: (next) => {
    lines.value = next;
  },
});
table.edit([
  { rowKey: 1, column: "start", value: 10 },
  { rowKey: 1, column: "end", value: 11 },
]);
```

Validation returns `true`, a message, or `{ message, code? }`. A failure becomes `validation_failed`, with an optional `validationCode`. Throws/rejected promises are caught. A failed row refuses its accepted cells; other rows can apply (`partial`). `row.cellIssues` and `snapshot.issues` expose refusals until that cell is edited again. Unchanged values skip validation. Schema libraries can be wrapped in a validator; there is no direct Standard Schema or vendor dependency.

## Async validation

A validator may return a promise. `edit()` stays synchronous and returns `status: "pending"`. By default the whole async batch is held; `pendingCells` lists cells waiting for the batch, and applied values remain visible. Promises settle together, then one follow-up snapshot and `onEditIssues` call publish accepted changes/refusals. A successful batch calls `onEditIssues([])` and is one undo step.

Pending results expose `completion`, a promise of the final `EditResult`. Superseded cells are reported as `stale_draft` in that completion without publishing old-cell issues into newer snapshots. Vue `draft.save()` waits for it automatically; `grid.lastResult` follows the latest operation's completion.

`asyncValidation: "optimistic"` applies the draft immediately and rolls failed live cells back. A newer edit supersedes an older result for that cell. With `validateRow`, a newer edit supersedes the row's older validation because its cross-field draft is stale. Removing rows, replacing source/columns, undo/redo or destroying the table fences late results. Application-owned requests and side effects inside a validator still need application cancellation.

## Insert and remove rows

```ts
table.insertRows([{ id: 3, item: "Cable", quantity: 2 }], { before: 2 });
table.insertRows(); // one row from the configured createRow callback
table.removeRows([1, 2]); // one undo step; removes loaded descendants in a tree
table.undo();
```

Use stable `rowKey` values or ids on every row. Core refuses duplicate inserted keys and key edits. Inserts are atomic when new tree/key problems occur. Removal can be partial when some keys are unknown. `EditResult.rowChanges` describes inserted/removed rows; `onDataChange` publishes the new array, with an empty cell-change list for structural operations. Get persistence records through `getPendingChanges()`.

For trees, `{ parent, before? }` addresses a loaded parent's source children. `before` must name a sibling under that parent. Nested writes require an immutable `setChildren`; adjacency writes require `setParentKey(row, parent)` or incoming rows already addressed to the requested parent. The operation copies only nested paths and shares untouched branches. Unloaded lazy parents must load first. Lazy adjacency rows stay in the engine's cache; persist the returned row-change records. Cache data is cleared by foreign source replacement, as described in [Tree data](/guide/trees).

## Save and revert

```ts
const changes = table.getPendingChanges(); // inserted, updated, removed
// Revalidate and persist these records on your server.
await saveChanges(changes);
table.markSaved(); // or markSaved(acknowledgedKeys) after partial success
table.revert([1]); // restore the tracked saved values/row for this key
```

Updated records include `rowKey`, `row`, `previous`, and cell changes with their earliest previous values. Records stay keyed across sorting, filtering and pages. `row.isDirty` indicates a tracked change; pending validation has its own metadata. Insert-then-remove cancels the unsaved insertion. Reverting all changes restores saved rows and removes unsaved insertions as one undo step. A removed nested parent's saved subtree excludes unsaved children. Restore a missing parent before reverting a child on its own.

`markSaved` changes the baseline and keeps undo available. Undoing after a save creates new pending changes against that saved state. Foreign `setData` clears history and pending records; the exact array from `onDataChange` preserves them through a `v-model` round trip. Save only acknowledged data; do not mark unresolved validation as saved.

## Connect an application save API

Treat `PendingChanges<Line>` as a client proposal. An oRPC handler can authenticate the caller,
validate a bounded input schema, authorize each row/tenant, recheck SKU uniqueness and apply
inserts/updates/removals inside a Drizzle transaction. Return acknowledged keys only after
commit. Those dependencies belong to your application.

```ts
import type { PendingChanges, RowKey } from "vueye-table";

// Application adapter, implemented with your typed API client.
declare function saveOnServer(changes: PendingChanges<Line>): Promise<readonly RowKey[]>;

async function save(): Promise<void> {
  if (table.pendingCells.length) return;
  const submitted = lines.value; // caller-owned data ref from the example above
  const acknowledged = await saveOnServer(table.getPendingChanges());
  // Newer edits during the request must not be marked as already saved.
  if (lines.value !== submitted || table.pendingCells.length) return;
  table.markSaved(acknowledged);
}
```

Serialize requests or disable Save while one is pending. On rejection keep pending records and
show the server's plain text error. For partial success acknowledge only returned keys. If the
server normalizes values or detects a concurrent-write conflict, reconcile deliberately before
changing the baseline; foreign `setData` clears local history and pending records.

Try [Validated edits](/examples/grid#validated-edits) for row operations,
[inventory](/examples/inventory) for typed controls, async SKU uniqueness and guarded local
save/revert, and [department allocations](/examples/budget-tree) for editable virtual trees.
Examples simulate persistence. Decisions are recorded in
[ADR 0008](/adr/0008-validation-editors-and-persistence) and
[ADR 0012](/adr/0012-validation-and-row-operations).
