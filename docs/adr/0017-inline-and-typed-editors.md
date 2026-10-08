# ADR 0017: Inline table editing and typed component editors

Status: accepted. Implements #86; builds on ADRs 0012, 0014 and 0016.

## Decision

`VueyeTable` is read-only by default. `edit-mode="cell"` opts into editable-column cells;
`edit-mode="row"` opens one row draft at a time. Grid columns remain editable by default.
Native editors select text, decimal input, searchable select, checkbox or date from inert
`EditorSpec` metadata. Metadata never resolves component names. Explicit select options are
copied once per column definition; searches mount at most 50 options. Date fields use native
`type="date"` and ISO calendar text; number fields use `inputmode="decimal"`. Core parsing,
constraints and validators decide whether either value is accepted.

Both full components and `VtGrid` expose `editor.<id>` slots. Headless `DataGridBody` and
`DataGridCell` expose `editor`; `DataTableEditCell` does so under `DataTableEditRoot`.
`CellEditorSlotProps` supplies `row`, `column`, `value`, `draft`, `spec`, `input(text)`,
`commit(value?)`, `finish(direction?)`, `cancel()`, `issues`, `pending` and `attrs`.
`draft`/`update` remain available for existing headless slots. Directional movement now has
the explicit `finish(direction)` name; `commit("right")` means the string value `"right"`.

String commits and `input()` text pass through the column parser. Non-string commits, including
checkboxes and non-string select options, use the existing core value-edit path and preserve option types;
they still enforce editability, constraints, column/row validation, stale-row checks and undo.
Applications that need a custom parser should submit text. Slots receive no alternate mutation
callback. Application code remains responsible for not directly changing its own input objects.

`useDataGrid.submitEdit()` keeps pending/refused editors open; the existing `commitEdit()`
retains its immediate-close composable behavior. Pending UI prevents duplicate submission and
cancellation; a submitted validation batch remains core-owned. Successful cell commits restore
focus. Table Tab moves to the next editable cell, skipping read-only columns; grid movement
retains spreadsheet coordinates. Space toggles a focused grid checkbox without opening an editor.

Row fields share `table.editRow(key)`. Changes stage until Save row or Enter, then save through
one core batch and one undo step. Cancel discards only an unsubmitted draft. Rejected row
validation stays beside the row controls. Starting another row cancels the previous unsubmitted
draft; pending rows cannot be replaced. A row leaving the page discards its unsubmitted form.

`validate-row`, `async-validation`, `create-row` and `set-parent-key` are creation options.
`add-row` exposes insertion through `insertRows()`; `remove-rows` exposes per-row removal.
Row action menus offer `revert([key])`, relative to the application's `markSaved()` baseline.
`update:data` and `edit` report immutable data changes, `save` reports a completed editor
`EditResult`, `cancel` reports the abandoned row key, and `edit-issues` reports core refusals.
Grid `edit-error` is preserved as an alias. A component save means local validation completed;
it does not imply remote persistence or move the saved baseline.

## Accessibility, security and rendering

Issues render as text beside the cell, with `aria-invalid` / `aria-describedby` on native fields
and their cell; pending fields expose `aria-busy`. Custom fields bind the supplied `attrs`.
Row forms group their controls by row; a row-level message is associated with Save row.
Default rendering and clipboard paste stay plain text. The package raw-HTML boundary remains
enforced. These controls inherit the existing Vt tokens and logical spacing.

Only the active cell mounts fields in cell mode. Row mode intentionally mounts that row's
editable fields. Stable unchanged source rows and column definitions keep unrelated application
cell slots from rerendering when editing starts or commits. Virtual table rendering pins the
active cell/row through the same grid binding used by virtual spreadsheets.

## Limits

This alpha API is provisional. Custom editor keyboard/focus behavior beyond the supplied
callbacks belongs to the application. Native date-picker appearance follows the browser.
The select search is capped rather than a custom virtual listbox. Server saves, conflict
recovery, schema adapters and cross-workstream benchmarks remain application/follow-up work.
