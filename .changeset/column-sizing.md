---
"@vueye-table/core": minor
"@vueye-table/vue": minor
---

Add column widths to the table state. `TableState.columnSizing` holds the widths a user gave
columns, by id; `resizeColumn` and `resetColumnSize` change it, keeping widths within the new
`maxWidth` option and `minWidth`, and skipping columns marked `resizable: false`. Snapshot columns
carry the width to draw in `width`, plus `defaultWidth`, `maxWidth`, `resizable`, and `isResized`.
Invalid, unknown, or non-resizable entries are ignored and reported as `invalid_column_size`,
`unknown_column`, or `column_not_resizable`. Resizing re-runs no row pipeline stage. Complete
`TableState` literals must now include `columnSizing: {}`. The Vue binding forwards both
operations.
