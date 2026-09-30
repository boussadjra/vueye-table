---
"@vueye-table/core": patch
"@vueye-table/vue": patch
"@vueye-table/headless": patch
"@vueye-table/styled": patch
"vueye-table": patch
---

Fix range filters with bounds typed as text (`{ min: "10" }`, `{ min: "2024-01-01" }`) against
number and date values, and let a range with no bounds pass empty cells. Pasting into an empty
column reads each cell's type once per column instead of once per cell.

`useDataGrid` keeps its selection on cells that still exist after a search, filter, or page change
shrinks the grid. `VueyeGrid` no longer resets a page size the user picked when the parent
controls `page`, and emits `update:pageSize`, `update:filters`, `update:hiddenColumns`, and
`state-change` like `VueyeTable`. `VueyeTable` shows `loading-text` (or a `loading` slot) instead of
the empty state while loading with no rows. The column menu closes on Escape and when focus
leaves it.

New: `cell.<column id>` slots on `VueyeGrid` and `VtGrid`, a `cell` slot and `rowIndex` and
`columnIndex` props on the headless grid, and `GridCellSlotProps`.
