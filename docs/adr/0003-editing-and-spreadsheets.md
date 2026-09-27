# ADR 0003: Editing and the spreadsheet model

- Status: Accepted
- Date: 2026-09-27
- Scope: `@vueye-table/core`, `@vueye-table/vue`, `@vueye-table/headless`, `vueye-table`

## Decision

### Edits never mutate

`table.edit()` takes value edits or text edits. Text goes through the column's `parse`, or through
its `type` (`text`, `number`, `boolean`, `date`) when it has none, or through the type of the
current value, or of another row's value when the cell is empty. A path column writes by copying
only the objects along its path; a computed column is writable only with `setValue`. The result
is a new array handed to `onDataChange`; the caller's array is never changed.

### Refusals are results

Each edit batch returns an `EditResult` with a status (`applied`, `partial`, `rejected`,
`unchanged`), the applied changes, and one issue per refused cell: `read_only_cell`,
`invalid_value`, `unknown_row`, or `unknown_column`. `onEditIssues` reports refusals as they
happen. Editing never throws for bad input.

### History is per batch

A batch (one edit, a paste, a clear) is one undo step. Replacing data from outside clears
history, except when the data is the array the table itself produced, which is what a `v-model`
round trip passes back.

### Addressing is positional

A spreadsheet position is a row index on the current page and a column index among visible
columns. A selection is an anchor and a focus. Copy produces tab-separated text of the shown
values; paste parses tab-separated text, quoted fields included, and writes it from the top-left
of the selection, clipped to the grid.

### Keys are commands

`gridCommand()` maps a key press to a command (move, edit, clear, select all, undo, redo, cancel)
as a pure function in core. `useDataGrid` executes commands; `DataGridRoot` keeps focus on the
grid element and points at the active cell with `aria-activedescendant`, which avoids moving DOM
focus on every arrow key.

## Deferred

Formulas, merged cells, frozen columns, virtualized rows, and fill handles. Each can be added as a
core feature without changing the model above.
