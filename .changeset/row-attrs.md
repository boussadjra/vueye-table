---
"@vueye-table/headless": patch
"@vueye-table/styled": patch
"vueye-table": patch
---

New: `row-attrs` on `VueyeTable`, `VueyeGrid` and `VtGrid`, `(item, row) =>` a class, a style, and
`data-*` and `aria-*` attributes for each body row, read on every render. The row's own attributes
win on a collision and event handlers are left out. Headless rows take the same through
`DataTableRow`'s `attributes` prop and `DataGridBody`'s `row-attrs`; `rowAttributes`, `RowAttrs`
and `RowAttributes` are exported.
