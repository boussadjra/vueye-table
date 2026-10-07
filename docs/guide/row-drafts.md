# Vue row drafts

Use `table.editRow(key)` to edit several columns before submitting one batch. The draft owns a shallow reactive bag of the row's configured editable values. Saving updates the table locally and creates one undo step; persist `table.pendingChanges` separately.

```ts
const draft = table.editRow(orderId);
draft.values.status = "shipped";
draft.setInput("quantity", quantityText);

const result = await draft.save();
if (result.status === "rejected") {
  // draft.issues contains plain messages with column ids and row keys.
}
table.undo(); // undo all accepted fields in the batch
```

`values` keys follow column ids, so a nested path is `draft.values["address.city"]`. Path values keep their row types; keys are optional because only configured editable columns are copied. Computed columns use `draft.setValue("computedId", value)`. Hidden editable columns are included. Read-only and unknown columns still refuse writes through core if explicitly supplied.

String assignments run the column parser; numeric, boolean, date and other typed assignments use value edits. Use `setInput(column, text)` for raw text that needs parsing, including invalid number/date input. It takes precedence over that column's value until `setValue(column, value)` switches back to typed input. Column constraints, `validate`, and `validateRow` then run through the same core pipeline as grid edits and paste.

Objects, arrays and dates are copied for this one row, so changing a copied nested value does not mutate source data. Nested values are not reactive: replace a value to notify a form of that change. Values that cannot be structured-cloned report `invalid_value`; explicitly replace them with `setValue` before saving. Drafts contain values and plain issue messages; render messages as text.

## Lifecycle and async validation

| Property or operation | Behavior                                                                 |
| --------------------- | ------------------------------------------------------------------------ |
| `status`              | `editing`, `saving`, `saved`, `cancelled`, or `stale`                    |
| `pending`             | Plain boolean while `save()` is waiting                                  |
| `issues`              | Plain reactive array of parse, validation or stale issues                |
| `save()`              | Promise of the final `EditResult`; repeated calls while saving share it  |
| `cancel()`            | Discards an unsubmitted draft; returns false after submission or closure |

Watch with getters: `watch(() => draft.pending, ...)`, `watch(() => draft.issues, ...)`, or `watch(() => table.pendingCells, ...)`. No new refs are exposed. The table also exposes `pendingChanges` directly for inserted/updated/removed records; call `markSaved(acknowledgedKeys)` only after persistence succeeds.

Held async validation leaves applied values visible until acceptance. Optimistic validation applies submitted values immediately and rolls failures back. `save()` waits in either mode. A fully rejected current draft can be corrected and retried. Success, an unchanged result, or partial application closes the draft. After a partial result, open a new draft for refused fields because accepted fields already changed the row.

A draft becomes stale if its row is replaced, removed or edited underneath, or a captured column definition changes. `save()` resolves rejected with `stale_draft` and preserves newer data. This check also applies while validation is pending. Sorting, paging, hiding columns, disclosure and source updates to other keys preserve a row draft. Use stable keys and immutable source updates. Incoming source writes to dirty or pending rows retain the core conflict policy described in [streaming](/guide/streaming).

Scope disposal closes drafts and resolves a waiting save as rejected even if a validator never resolves. Application requests made inside validators need their own cancellation. `table.destroy()` performs the same binding cleanup when no Vue scope owns it.

## Grid editor metadata and stable cells

```ts
const grid = useDataGrid(table);
const spec = grid.editorFor({ row: 0, column: 1 });
// For example: { kind: "select", options: ["ready", "shipped"] }
grid.startEdit();
grid.updateDraft("shipped");
const result = grid.commitEdit();
const final = result?.completion ? await result.completion : result;
```

`editorFor` returns a frozen copy of column metadata for an editable cell, or an inferred text/number/checkbox/date spec. A missing or read-only cell returns undefined. Unknown runtime kinds fall back to text and report an issue through `grid.lastResult`. The operation resolves metadata only; applications choose controls in code. Option strings and messages have no HTML rendering contract.

An active editor follows its row key and column id through sorting, column movement and unrelated source updates. Its position and focus move together. A changed, removed or invisible cell closes the editor with a stale issue. `grid.lastResult` follows async completion for the latest edit, paste or clear.

Core `edit(edits, { expectedRows: new Map([[key, originalRow]]) })` provides the same optional row check for application-prepared batches. Pending edit results expose `completion`; superseded cells appear as stale issues in that final result while newer snapshots keep their own issues.

See the [runnable Vue example](/examples/row-drafts) and [ADR 0014](/adr/0014-vue-row-drafts-and-editor-metadata) for the complete contract.
